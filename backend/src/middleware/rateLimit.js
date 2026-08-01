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
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' } },
});

const authLimiter = rateLimit({
  skip: skipInTests,
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' } },
});

const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'API_KEY_RATE_LIMIT', message: 'Límite de API Key excedido.' } },
});

module.exports = { globalLimiter, authLimiter, apiKeyLimiter };