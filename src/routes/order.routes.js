const express = require('express');
const controller = require('../controllers/order.controller');
const validate = require('../middlewares/validate.middleware');
const {
  createOrderSchema,
  bulkOrderSchema
} = require('../validators/order.validator');

const router = express.Router();

router.post('/', validate(createOrderSchema), controller.createOrder);

router.get('/:orderId/track', controller.trackOrder);

router.post('/:orderId/cancel', controller.cancelOrder);

router.post('/bulk', validate(bulkOrderSchema), controller.bulkCreateOrders);

router.get('/bulk/:batchId', controller.getBatchStatus);

module.exports = router;
