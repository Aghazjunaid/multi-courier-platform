const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const orderRoutes = require('./routes/order.routes');
const healthRoutes = require('./routes/health.routes');

const errorHandler = require('./middlewares/errorHandler');
const requestIdMiddleware = require('./middlewares/requestId.middleware');

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(requestIdMiddleware);

app.use('/health', healthRoutes);
app.use('/api/v1/orders', orderRoutes);

app.use(errorHandler);

module.exports = app;
