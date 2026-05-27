const { v4: uuid } = require('uuid');

const asyncContext = require('../utils/asyncContext');

module.exports = (req, res, next) => {
  const requestId = uuid();
  req.requestId = requestId;

  asyncContext.run({ requestId }, () => next());
};
