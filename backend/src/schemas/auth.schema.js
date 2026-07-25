const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  name: Joi.string().trim().max(255).required(),
  tenantId: Joi.string().uuid().optional(),
});

module.exports = { loginSchema, registerSchema };
