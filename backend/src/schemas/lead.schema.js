const Joi = require('joi');
const { CATEGORIES } = require('../lib/lead');

const createLeadSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().max(255).allow('').optional(),
  company: Joi.string().trim().max(255).allow('').optional(),
  phone: Joi.string().max(50).allow('').optional(),
  message: Joi.string().trim().max(5000).allow('').optional(),
  source: Joi.string().trim().max(100).optional(),
  // Sector de negocio, texto libre: el LLM del workflow emite valores abiertos
  // ('QA', 'Software y Tecnologia', 'Automatización'...). No es un enum cerrado;
  // el único contrato es el ancho de la columna, VARCHAR(100).
  ai_business_category: Joi.string().trim().max(100).allow('').optional(),
});

const listQuerySchema = Joi.object({
  status: Joi.string().valid('new', 'contacted', 'qualified', 'lost').optional(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  search: Joi.string().trim().max(255).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

// Paginacion de /leads/activity. El servicio ya acota los valores, pero
// se validan aqui tambien para rechazar basura con un 400 claro en vez de dejar que
// `parseInt` la convierta silenciosamente en el valor por defecto.
const activityQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

module.exports = { createLeadSchema, listQuerySchema, activityQuerySchema };
