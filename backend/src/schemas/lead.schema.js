const Joi = require('joi');

const createLeadSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().max(255).allow('').optional(),
  company: Joi.string().trim().max(255).allow('').optional(),
  phone: Joi.string().max(50).allow('').optional(),
  message: Joi.string().trim().max(5000).allow('').optional(),
  source: Joi.string().trim().max(100).optional(),
});

const listQuerySchema = Joi.object({
  status: Joi.string().valid('new', 'contacted', 'qualified', 'lost').optional(),
  category: Joi.string().valid('HOT', 'WARM', 'COLD').optional(),
  search: Joi.string().trim().max(255).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

module.exports = { createLeadSchema, listQuerySchema };
