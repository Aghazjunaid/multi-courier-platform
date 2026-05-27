const ApiError = require('../utils/ApiError');

module.exports = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      return next(
        new ApiError(400, 'Validation failed', {
          code: 'VALIDATION_ERROR',
          details: {
            fields: error.details.map((err) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        })
      );
    }

    next();
  };
};
