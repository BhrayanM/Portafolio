const Joi = require('joi');

// El login NO sube el minimo a 8: las cuentas creadas antes del endurecimiento pueden tener
// contrasenas de 6, y rechazarlas aqui las dejaria fuera sin poder ni intentarlo.
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

// Minimo 8 para las cuentas nuevas.
// `tenantId` ya no se acepta: el tenant sale del admin autenticado, no del
// cuerpo de la peticion. Con `stripUnknown` en el validador, si alguien lo manda
// se descarta silenciosamente antes de llegar al servicio.
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().trim().max(255).required(),
});

module.exports = { loginSchema, registerSchema };
