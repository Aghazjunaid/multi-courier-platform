module.exports = {

  createOrderPayload: (payload) => ({

    customerCode: 'UEBCUS0008',

    orderNumber: payload.order_id,

    declaredValue: payload.amount,

    itemDescription: 'BOOKS',

    collectableValue: payload.amount,

    height: 10,
    length: 12,
    breadth: 10,

    pieces: 1,
    weight: 1.1,

    serviceType: 'SDD',

    payMode: 'COD',

    rtnCity: 'Govindpura',
    rtnName: 'Warehouse',

    consCity: payload.customer.city || 'Surat',
    consName: payload.customer.name,

    rtnEmail: 'warehouse@test.com',

    rtnState: 'BHOPAL',

    shprCity: 'Govindpura',
    shprName: 'Warehouse',

    consEmail:
      payload.customer.email ||
      'customer@test.com',

    consState:
      payload.customer.state || 'GUJRAT',

    rtnMobile: 9999999999,

    shprEmail: 'warehouse@test.com',

    shprState: 'BHOPAL',

    consMobile: payload.customer.phone,

    rtnAddress:
      'Warehouse Address',

    rtnAddressType: 'Seller',

    rtnCountry: 'INDIA',

    rtnPincode: 122017,

    shprMobile: 9999999999,

    consAddress: payload.customer.address,

    consAddressType: 'Home',

    consCountry: 'INDIA',

    consPincode:
      payload.customer.pincode || 122001,

    invoiceNumber:
      `INV-${payload.order_id}`,

    invoiceDate: '2024-10-02',

    shprAddress: 'Warehouse Address',

    shprAddressType: 'Seller',

    shprCountry: 'INDIA',

    shprPincode: 122001,

    invoiceValue: payload.amount,

    itemQuantity: 1
  }),

  normalizeTrackingResponse: (data) => ({

    awb: data.awbNumber,

    orderNumber: data.orderNumber,

    currentStatus:
      data.currentStatusCodeDescription,

    currentLocation:
      data.currentLocation,

    scans: data.scans
  })
};
