const { v4: uuid } = require('uuid');
const Batch = require('../models/Batch');
const BatchItem = require('../models/BatchItem');
const ApiError = require('../utils/ApiError');
const orderQueue = require('../queues/order.queue');

class BulkOrderService {
  async processBulkOrders(orders) {
    const batchId = uuid();

    await Batch.create({
      batchId,
      totalOrders: orders.length
    });

    for (const order of orders) {
      await orderQueue.add('create-order', {
        batchId,
        order
      });
    }

    return {
      batch_id: batchId,
      message: 'Orders queued successfully'
    };
  }

  async getBatchStatus(batchId) {
    const batch = await Batch.findOne({ batchId });

    if (!batch) {
      throw new ApiError(404, 'Batch not found');
    }

    const items = await BatchItem.find({ batchId }).lean();

    return {
      batch_id: batch.batchId,
      status: batch.status,
      total_orders: batch.totalOrders,
      success_count: batch.successCount,
      failed_count: batch.failedCount,
      created_at: batch.createdAt,
      updated_at: batch.updatedAt,
      items: items.map((item) => ({
        order_id: item.orderId,
        status: item.status,
        awb_number: item.awbNumber,
        reason: item.reason,
        deduplicated: item.deduplicated || false
      }))
    };
  }
}

module.exports = new BulkOrderService();
