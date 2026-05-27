const Order = require('../models/Order');

const TrackingHistory = require(
  '../models/TrackingHistory'
);

const CourierFactory = require(
  './courierFactory.service'
);

const ApiError = require('../utils/ApiError');

const logger = require('../config/logger');

const asyncContext = require('../utils/asyncContext');

const getRequestId = () =>
  asyncContext.getStore()?.requestId;

class OrderService {

  async createOrder(payload) {

    // STEP 1
    // create placeholder row first
    // prevents duplicate shipment creation

    let order;

    try {

      order = await Order.create({

        internalOrderId: payload.order_id,

        courierPartner:
          payload.courier_partner,

        currentStatus: 'PROCESSING',

        requestPayload: payload
      });

    } catch (err) {

      // duplicate order
      if (err.code === 11000) {

        const existing = await Order.findOne({
          internalOrderId: payload.order_id
        });

        // transient flag — not persisted to DB
        existing._deduplicated = true;

        return existing;
      }

      throw err;
    }

    try {

      const courier =
        CourierFactory.getCourier(
          payload.courier_partner
        );

      const courierResponse =
        await courier.createShipment(payload);

      order.courierOrderId =
        courierResponse.courier_order_id;

      order.awbNumber =
        courierResponse.awb_number;

      order.currentStatus =
        courierResponse.status;

      order.responsePayload =
        courierResponse.raw;

      await order.save();

      await TrackingHistory.create({

        orderId: order._id,

        status:
          courierResponse.status,

        rawPayload:
          courierResponse.raw
      });

      return order;

    } catch (err) {

      logger.error({

        request_id: getRequestId(),

        order_id: payload.order_id,

        courier_partner:
          payload.courier_partner,

        error_type:
          err.code || 'COURIER_API_FAILURE',

        error:
          err.cause || err.message,

        stack: err.stack
      });

      order.currentStatus = 'FAILED';

      order.failureReason =
        err.cause || err.message;

      // only flag transient/upstream failures for reconciliation
      // 4xx (validation, auth) won't recover by retrying tracking
      const isTransient =
        err.code === 'COURIER_TIMEOUT' ||
        err.code === 'COURIER_UNAVAILABLE';

      order.reconciliationRequired = isTransient;

      await order.save();

      // pass ApiError through; wrap anything else
      if (err instanceof ApiError) {
        throw err;
      }

      throw new ApiError(
        500,
        'Shipment creation failed',
        {
          code: 'SHIPMENT_CREATE_FAILED',
          cause: err.message
        }
      );
    }
  }

  async trackOrder(orderId) {

    const order = await Order.findOne({
      internalOrderId: orderId
    });

    if (!order) {
      throw new ApiError(
        404,
        'Order not found',
        { code: 'ORDER_NOT_FOUND' }
      );
    }

    const courier =
      CourierFactory.getCourier(
        order.courierPartner
      );

    const trackingResponse =
      await courier.trackShipment(
        order.awbNumber
      );

    order.currentStatus =
      trackingResponse.currentStatus;

    await order.save();

    await TrackingHistory.create({

      orderId: order._id,

      status:
        trackingResponse.currentStatus,

      rawPayload: trackingResponse
    });

    return trackingResponse;
  }

  async cancelOrder(orderId) {

    const order = await Order.findOne({
      internalOrderId: orderId
    });

    if (!order) {
      throw new ApiError(
        404,
        'Order not found',
        { code: 'ORDER_NOT_FOUND' }
      );
    }

    const courier =
      CourierFactory.getCourier(
        order.courierPartner
      );

    const response =
      await courier.cancelShipment(
        order.awbNumber
      );

    order.currentStatus = 'CANCELLED';

    await order.save();

    await TrackingHistory.create({

      orderId: order._id,

      status: 'CANCELLED',

      rawPayload: response.raw
    });

    return response;
  }
}

module.exports = new OrderService();
