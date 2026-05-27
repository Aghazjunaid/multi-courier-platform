const { Worker } = require('bullmq');

const connection = require('../../config/redis');

const orderService = require(
  '../../services/order.service'
);

const Batch = require('../../models/Batch');

const BatchItem = require(
  '../../models/BatchItem'
);

const logger = require('../../config/logger');

const asyncContext = require(
  '../../utils/asyncContext'
);

const finalizeBatchIfDone = async (batchId) => {

  const batch = await Batch.findOne({ batchId });

  if (!batch) return;

  const processed =
    batch.successCount + batch.failedCount;

  if (processed < batch.totalOrders) return;

  let finalStatus;

  if (batch.failedCount === 0) {
    finalStatus = 'COMPLETED';
  } else if (batch.successCount === 0) {
    finalStatus = 'FAILED';
  } else {
    finalStatus = 'PARTIAL_SUCCESS';
  }

  batch.status = finalStatus;
  await batch.save();
};

new Worker(
  'bulk-order-queue',

  async (job) => {

    const {
      batchId,
      order
    } = job.data;

    const requestId =
      `BULK:${batchId}:${order.order_id}`;

    return asyncContext.run(
      { requestId },
      async () => {

        try {

          const result =
            await orderService.createOrder(order);

          await BatchItem.create({
            batchId,
            orderId: order.order_id,
            status: 'SUCCESS',
            awbNumber: result.awbNumber,
            deduplicated:
              result._deduplicated || false
          });

          await Batch.findOneAndUpdate(
            { batchId },
            { $inc: { successCount: 1 } }
          );

        } catch (err) {

          logger.error({
            request_id: requestId,
            batch_id: batchId,
            order_id: order.order_id,
            courier_partner:
              order.courier_partner,
            error_type:
              err.code ||
              'BULK_ORDER_CREATE_FAILED',
            error:
              err.cause || err.message,
            stack: err.stack
          });

          await BatchItem.create({
            batchId,
            orderId: order.order_id,
            status: 'FAILED',
            reason: err.message
          });

          await Batch.findOneAndUpdate(
            { batchId },
            { $inc: { failedCount: 1 } }
          );
        }

        await finalizeBatchIfDone(batchId);
      }
    );
  },

  {
    connection,
    concurrency: Number(
      process.env.WORKER_CONCURRENCY || 20
    )
  }
);
