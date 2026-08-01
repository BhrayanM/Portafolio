const config = require('../config');
const { ForbiddenError } = require('../utils/errors');

/**
 * Protección CSRF para sesiones basadas en cookie (JWT en cookie HttpOnly).
 *
 * CSRF es un ataque exclusivo de navegador: un sitio malicioso dispara peticiones
 * contra la API con las cookies de la víctima. Defensa por capas:
 *
 *   1. SameSite=Lax en la cookie de sesión (config.cookie.sameSite): el navegador
 *      no envía la cookie en POST cross-site. Cubre el caso normal.
 *   2. Este middleware — valida el Origin en peticiones mutantes con cookie: solo
 *      se aceptan origenes same-origin o listados en CORS_ORIGINS. Cubre los
 *      despliegues con SameSite=None (frontend y API en subdominios distintos,
 *      como documenta .env.example).
 *   3. Los clientes no-navegador (integraciones, scripts) usan
 *      Authorization: Bearer y no envían cookie: este middleware los ignora.
 *
 * Se elige validación de Origin sobre tokens CSRF de doble envío o librerías como
 * `csurf` (sin mantenimiento, con CVEs conocidos) porque no añade estado, no cambia
 * el contrato de la API y el navegador siempre envía Origin en POST/PUT/PATCH/DELETE.
 * Una petición sin Origin no puede venir de un navegador y no es un vector CSRF.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(origin, req) {
  return origin === `${req.protocol}://${req.headers.host}`;
}

function csrfProtection(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();
  if (!req.cookies || !req.cookies[config.cookie.name]) return next();

  const origin = req.headers.origin;
  if (!origin) return next();
  if (isSameOrigin(origin, req)) return next();
  if (config.corsOrigins.includes(origin)) return next();

  return next(
    new ForbiddenError('Origen rechazado: petición con cookie de sesión desde un origen no autorizado')
  );
}

module.exports = { csrfProtection };
