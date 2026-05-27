class BaseCourier {
  async authenticate() {
    throw new Error('authenticate method not implemented');
  }

  async createShipment(payload) {
    throw new Error('createShipment method not implemented');
  }

  async trackShipment(payload) {
    throw new Error('trackShipment method not implemented');
  }

  async cancelShipment(payload) {
    throw new Error('cancelShipment method not implemented');
  }
}

module.exports = BaseCourier;
