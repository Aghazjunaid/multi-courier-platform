class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);

    this.statusCode = statusCode;
    this.code = options.code || 'ERROR';
    this.details = options.details || {};

    // raw upstream / internal context — NOT exposed to clients
    this.cause = options.cause;
  }
}

module.exports = ApiError;
