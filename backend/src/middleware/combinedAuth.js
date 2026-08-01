const { authenticate } = require('./auth');
const { authenticateApiKey } = require('./apiKey');

/**
 * Middleware para rutas que aceptan JWT (cookie o Bearer) o API Key.
 *
 * Antes este archivo hacia `router.use(...)` sobre un `router` que nunca se definia:
 * habria lanzado ReferenceError en cuanto alguien lo importara. Nadie lo usaba todavia.
 * Ahora exporta la cadena de middlewares, que es como Express espera consumirla.
 */
const combinedAuth = [authenticate, authenticateApiKey];

module.exports = { combinedAuth };
