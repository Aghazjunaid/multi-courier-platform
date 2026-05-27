const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,

  // required by BullMQ for blocking commands used by Workers
  maxRetriesPerRequest: null
});

module.exports = connection;
