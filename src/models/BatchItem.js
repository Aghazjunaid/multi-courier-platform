const mongoose = require('mongoose');

const batchItemSchema = new mongoose.Schema({

  batchId: {
    type: String,
    required: true,
    index: true
  },

  orderId: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      'PROCESSING',
      'SUCCESS',
      'FAILED'
    ],
    default: 'PROCESSING'
  },

  awbNumber: String,

  reason: String,

  deduplicated: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'BatchItem',
  batchItemSchema
);
