const rateLimit = require('express-rate-limit');
const config = require('../config');

// En la suite de tests el limitador se desactiva: varios casos hacen login repetido
// y con max=5 el sexto devolvia 429. En produccion sigue activo con los mismos valores.
const skipInTests = () => config.nodeEnv === 'test';

const globalLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Try again in 15 minutes.' } },
});

const authLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts. Try again in 15 minutes.' } },
});

// El alta de usuarios es admin-only, pero se limita igual:
// una credencial de admin filtrada no debe poder crear cuentas en bucle.
const registerLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'REGISTER_RATE_LIMIT', message: 'Too many registrations. Try again in 15 minutes.' } },
});

// `apiKeyLimiter` se retiro: estaba definido y no se aplicaba en
// ninguna ruta. Un limitador de adorno da una sensacion de proteccion que no existe.
module.exports = { globalLimiter, authLimiter, registerLimiter };