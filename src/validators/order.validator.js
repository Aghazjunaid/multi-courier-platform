const Joi = require('joi');

exports.createOrderSchema = Joi.object({
  order_id: Joi.string().required(),

  courier_partner: Joi.string()
    .valid('urbanebolt', 'mock')
    .required(),

  amount: Joi.number().required(),

  customer: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    address: Joi.string().required()
  }).required()
});

exports.bulkOrderSchema = Joi.object({
  orders: Joi.array()
    .items(exports.createOrderSchema)
    .max(100)
    .required()
});
