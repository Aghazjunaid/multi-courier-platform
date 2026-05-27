const UrbaneboltCourier = require(
  '../couriers/urbanebolt/UrbaneboltCourier'
);

const MockCourier = require(
  '../couriers/mockCourier/MockCourier'
);

const ApiError = require('../utils/ApiError');

const SUPPORTED = ['urbanebolt', 'mock'];

// singleton instances
const urbaneboltCourier =
  new UrbaneboltCourier();

const mockCourier = new MockCourier();

class CourierFactory {

  static getCourier(courierPartner) {

    switch (courierPartner) {

      case 'urbanebolt':
        return urbaneboltCourier;

      case 'mock':
        return mockCourier;

      default:
        throw new ApiError(
          400,
          'Unsupported courier partner',
          {
            code: 'INVALID_COURIER',
            details: {
              supported: SUPPORTED,
              received: courierPartner
            }
          }
        );
    }
  }
}

module.exports = CourierFactory;
