const { Queue, Worker } = require('bullmq');

const connection = require('../config/redis');

const Order = require('../models/Order');

const CourierFactory = require(
  '../services/courierFactory.service'
);

const logger = require('../config/logger');

const asyncContext = require('../utils/asyncContext');

const QUEUE_NAME = 'reconciliation-queue';
const JOB_NAME = 'reconcile-failed-orders';

const reconciliationQueue = new Queue(QUEUE_NAME, {
  connection
});

// schedule the recurring job
(async () => {
  await reconciliationQueue.add(
    JOB_NAME,
    {},
    {
      repeat: { pattern: '*/15 * * * *' },
      removeOnComplete: true,
      removeOnFail: true
    }
  );
})();

new Worker(
  QUEUE_NAME,
  async () => {

    return asyncContext.run(
      { requestId: 'RECON_JOB' },
      async () => {

        logger.info(
          'Starting reconciliation job'
        );

        const failedOrders =
          await Order.find({

            reconciliationRequired: true,

            retryCount: {
              $lt: 3
            }
          });

        for (const order of failedOrders) {

          try {

            const courier =
              CourierFactory.getCourier(
                order.courierPartner
              );

            const trackingResponse =
              await courier.trackShipment(
                order.awbNumber
              );

            order.currentStatus =
              trackingResponse.currentStatus;

            order.reconciliationRequired = false;

            await order.save();

          } catch (err) {

            order.retryCount += 1;

            order.lastRetryAt = new Date();

            order.failureReason =
              err.cause || err.message;

            await order.save();

            logger.error({

              request_id: 'RECON_JOB',

              order_id:
                order.internalOrderId,

              courier_partner:
                order.courierPartner,

              error_type:
                err.code ||
                'RECONCILIATION_FAILED',

              error:
                err.cause || err.message,

              stack: err.stack
            });

            if (order.retryCount >= 3) {
              // will mail to super admin
            }
          }
        }
      }
    );
  },
  {
    connection
  }
);

module.exports = reconciliationQueue;
