const BaseCourier = require('../base/BaseCourier');

const client = require('./urbanebolt.client');

const mapper = require('./urbanebolt.mapper');

const retry = require('../../utils/retry');

const statusMap = require('../../utils/statusMap');

const ApiError = require('../../utils/ApiError');

class UrbaneboltCourier extends BaseCourier {

  constructor() {
    super();
    this.token = null;
  }

  // map any underlying error into a normalized ApiError
  // raw upstream message goes into `cause` (for DB/logs) — never exposed to client
  normalizeError(err) {

    // already normalized
    if (err instanceof ApiError) return err;

    // axios timeout / network — no response from server
    if (
      err.code === 'ECONNABORTED' ||
      !err.response
    ) {
      return new ApiError(
        504,
        'Courier service timed out',
        {
          code: 'COURIER_TIMEOUT',
          cause: err.message
        }
      );
    }

    const status = err.response?.status;

    if (status === 401 || status === 403) {
      return new ApiError(
        502,
        'Courier authentication failed',
        {
          code: 'COURIER_AUTH_FAILED',
          cause: err.message
        }
      );
    }

    if (status >= 400 && status < 500) {
      return new ApiError(
        502,
        'Courier rejected the request',
        {
          code: 'COURIER_VALIDATION_ERROR',
          cause:
            err.response?.data
              ? JSON.stringify(err.response.data)
              : err.message
        }
      );
    }

    if (status >= 500) {
      return new ApiError(
        502,
        'Courier service unavailable',
        {
          code: 'COURIER_UNAVAILABLE',
          cause: err.message
        }
      );
    }

    return new ApiError(
      502,
      'Courier error',
      {
        code: 'COURIER_UNKNOWN',
        cause: err.message
      }
    );
  }

  async authenticate() {

    try {

      const response = await client.post(
        '/api/v1/auth/getToken/',
        {
          username:
            process.env.URBANEBOLT_USERNAME,

          password:
            process.env.URBANEBOLT_PASSWORD
        }
      );

      const accessToken =
        response.data?.access_token;

      // fail loudly instead of sending `Bearer undefined` downstream
      if (!accessToken) {
        throw new ApiError(
          502,
          'Courier authentication failed',
          {
            code: 'COURIER_AUTH_FAILED',
            cause:
              'Auth response missing access_token'
          }
        );
      }

      this.token = accessToken;

      return this.token;

    } catch (err) {

      throw this.normalizeError(err);
    }
  }

  async makeAuthenticatedRequest(fn) {

    try {

      if (!this.token) {
        await this.authenticate();
      }

      return await fn();

    } catch (err) {

      // automatic re-authentication (one retry)
      if (err.response?.status === 401) {

        await this.authenticate();

        return fn();
      }

      throw err;
    }
  }

  async createShipment(payload) {

    try {

      const mappedPayload =
        mapper.createOrderPayload(payload);

      const response = await retry(async () => {

        return this.makeAuthenticatedRequest(

          () => client.post(
            '/api/v1/services/manifest/',

            [mappedPayload],

            {
              headers: {
                Authorization:
                  `Bearer ${this.token}`
              }
            }
          )
        );

      });

      const data = response.data;

      if (data.successResponse?.length > 0) {

        const shipment =
          data.successResponse[0];

        return {
          courier_order_id:
            shipment.orderNumber,

          awb_number:
            shipment.awbNumber,

          shipping_label:
            shipment.shippingLabel,

          route_code:
            shipment.routeCode,

          customer_code:
            shipment.customerCode,

          status: 'CREATED',

          raw: data
        };
      }

      if (data.errorResponse?.length > 0) {

        throw new ApiError(
          502,
          'Courier rejected the order',
          {
            code: 'COURIER_VALIDATION_ERROR',
            cause:
              data.errorResponse[0].message
          }
        );
      }

      throw new ApiError(
        502,
        'Unexpected courier response',
        {
          code: 'COURIER_UNKNOWN',
          cause: JSON.stringify(data)
        }
      );

    } catch (err) {

      throw this.normalizeError(err);
    }
  }

  async trackShipment(awbNumber) {

    try {

      const response =
        await this.makeAuthenticatedRequest(

          () => client.get(
            `/api/v1/services/tracking-pub/?awb=${awbNumber}`,
            {
              headers: {
                Authorization:
                  `Bearer ${this.token}`
              }
            }
          )
        );

      const trackingData =
        response.data.data;

      return {
        awb:
          trackingData.awbNumber,

        orderNumber:
          trackingData.orderNumber,

        currentStatus:
          statusMap[
            trackingData.currentStatusCode
          ] || 'UNKNOWN',

        currentLocation:
          trackingData.currentLocation,

        scans: trackingData.scans,

        raw: response.data
      };

    } catch (err) {

      throw this.normalizeError(err);
    }
  }

  async cancelShipment(awbNumber) {

    try {

      const response =
        await this.makeAuthenticatedRequest(

          () => client.post(
            '/api/v1/services/cancel/',

            {
              awbs: String(awbNumber)
            },

            {
              headers: {
                Authorization:
                  `Bearer ${this.token}`
              }
            }
          )
        );

      const data = response.data;

      if (data.successResponse?.length > 0) {

        return {
          status: 'CANCELLED',
          raw: data
        };
      }

      if (data.failureResponse?.length > 0) {

        throw new ApiError(
          502,
          'Courier rejected the cancellation',
          {
            code: 'COURIER_VALIDATION_ERROR',
            cause:
              data.failureResponse[0].message
          }
        );
      }

      throw new ApiError(
        502,
        'Unexpected courier response',
        {
          code: 'COURIER_UNKNOWN',
          cause: JSON.stringify(data)
        }
      );

    } catch (err) {

      throw this.normalizeError(err);
    }
  }
}

module.exports = UrbaneboltCourier;
