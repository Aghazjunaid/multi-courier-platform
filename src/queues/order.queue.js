const { Queue } = require('bullmq');
const connection = require('../config/redis');

const orderQueue = new Queue('bulk-order-queue', {
  connection
});

module.exports = orderQueue;
