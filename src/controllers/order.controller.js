const orderService = require('../services/order.service');
const bulkOrderService = require('../services/bulkOrder.service');
const ApiResponse = require('../utils/ApiResponse');

exports.createOrder = async (req, res, next) => {
  try {
    const response = await orderService.createOrder(req.body);

    return res.status(201).json(
      new ApiResponse(true, 'Order created successfully', response)
    );
  } catch (err) {
    next(err);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    const response = await orderService.trackOrder(req.params.orderId);

    return res.json(
      new ApiResponse(true, 'Tracking fetched successfully', response)
    );
  } catch (err) {
    next(err);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const response = await orderService.cancelOrder(req.params.orderId);

    return res.json(
      new ApiResponse(true, 'Order cancelled successfully', response)
    );
  } catch (err) {
    next(err);
  }
};

exports.bulkCreateOrders = async (req, res, next) => {
  try {
    const response = await bulkOrderService.processBulkOrders(req.body.orders);

    return res.status(202).json(
      new ApiResponse(true, 'Bulk order accepted', response)
    );
  } catch (err) {
    next(err);
  }
};

exports.getBatchStatus = async (req, res, next) => {
  try {
    const response = await bulkOrderService.getBatchStatus(req.params.batchId);

    return res.json(
      new ApiResponse(true, 'Batch status fetched', response)
    );
  } catch (err) {
    next(err);
  }
};
