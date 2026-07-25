const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' } },
});

const apiKeyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { error: { code: 'API_KEY_RATE_LIMIT', message: 'Límite de API Key excedido.' } },
});

module.exports = { globalLimiter, authLimiter, apiKeyLimiter };
