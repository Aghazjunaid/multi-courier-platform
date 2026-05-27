const { AsyncLocalStorage } = require('node:async_hooks');

const asyncContext = new AsyncLocalStorage();

module.exports = asyncContext;
