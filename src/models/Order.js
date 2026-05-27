const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  internalOrderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  courierPartner: {
    type: String,
    required: true
  },

  courierOrderId: String,

  awbNumber: String,

  currentStatus: {
    type: String,
    enum: [
      'PROCESSING',
      'CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
      'FAILED'
    ],
    default: 'PROCESSING'
  },

  requestPayload: {
    type: Object,
    required: true
  },

  responsePayload: Object,

  failureReason: String,

  retryCount: {
    type: Number,
    default: 0
  },

  reconciliationRequired: {
    type: Boolean,
    default: false
  },

  lastRetryAt: Date

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Order',
  orderSchema
);
