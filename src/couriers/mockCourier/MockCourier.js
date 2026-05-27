const BaseCourier = require('../base/BaseCourier');

class MockCourier extends BaseCourier {
  async authenticate() {
    return 'mock-token';
  }

  async createShipment(payload) {
    return {
      courier_order_id: `MOCK-${Date.now()}`,
      awb_number: `AWB-${Date.now()}`,
      status: 'CREATED'
    };
  }

  async trackShipment() {
    return {
      status: 'IN_TRANSIT'
    };
  }

  async cancelShipment() {
    return {
      status: 'CANCELLED'
    };
  }
}

module.exports = MockCourier;
