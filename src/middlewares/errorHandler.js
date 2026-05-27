const asyncContext = require('../utils/asyncContext');
const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  const requestId =
    req?.requestId ||
    asyncContext.getStore()?.requestId;

  // log server errors with full context
  if (statusCode >= 500) {
    logger.error({
      request_id: requestId,
      error_type: code,
      error: err.cause || err.message,
      stack: err.stack
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || 'Something went wrong',
      request_id: requestId,
      details: err.details || {}
    }
  });
};
