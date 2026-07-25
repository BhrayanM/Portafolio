const Joi = require('joi');

const createCheckoutSchema = Joi.object({
  plan: Joi.string().valid('starter', 'growth', 'enterprise').required(),
});

module.exports = { createCheckoutSchema };
