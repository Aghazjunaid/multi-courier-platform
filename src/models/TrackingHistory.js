const mongoose = require('mongoose');

const trackingHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },

    status: String,
    rawPayload: Object
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TrackingHistory', trackingHistorySchema);
