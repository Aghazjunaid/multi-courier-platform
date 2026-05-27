const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({

  batchId: {
    type: String,
    required: true,
    unique: true
  },

  totalOrders: Number,

  successCount: {
    type: Number,
    default: 0
  },

  failedCount: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: [
      'PROCESSING',
      'COMPLETED',
      'PARTIAL_SUCCESS',
      'FAILED'
    ],
    default: 'PROCESSING'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'Batch',
  batchSchema
);
