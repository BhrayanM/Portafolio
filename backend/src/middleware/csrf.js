const crypto = require('crypto');
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
 *   2. Doble envío de token (OWASP): el servidor emite una cookie `csrf-token`
 *      legible por JS; el frontend la devuelve en la cabecera `x-csrf-token` en
 *      toda petición mutante. Un sitio externo no puede leer la cookie (Same
 *      Origin Policy) ni fijar la cabecera (CORS). Cubre los despliegues con
 *      SameSite=None (frontend y API en subdominios distintos).
 *   3. Validación de Origin: la petición debe ser same-origin o venir de un
 *      origen de CORS_ORIGINS.
 *
 * Solo se validan peticiones mutantes (POST/PUT/PATCH/DELETE) con cookie de
 * sesión. Los clientes no-navegador usan Authorization: Bearer sin cookie, y los
 * webhooks externos (WhatsApp, Twilio, Stripe) se autentican por otros medios:
 * este middleware los ignora. Se elige el doble envío sobre librerías como
 * `csurf` (sin mantenimiento, con CVEs conocidos) porque no añade estado en el
 * servidor y no cambia el contrato de la API para clientes Bearer.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

function isSameOrigin(origin, req) {
  return origin === `${req.protocol}://${req.headers.host}`;
}

function issueCsrfToken(res) {
  res.cookie(CSRF_COOKIE, crypto.randomBytes(32).toString('hex'), {
    // No HttpOnly a propósito: el SPA debe leerla para devolverla en x-csrf-token.
    httpOnly: false,
    secure: config.isProd,
    sameSite: config.cookie.sameSite || 'lax',
    maxAge: config.cookie.maxAgeMs,
    path: '/',
  });
}

function csrfProtection(req, res, next) {
  const hasSessionCookie = Boolean(req.cookies && req.cookies[config.cookie.name]);

  // Peticiones seguras y peticiones sin sesión (login, clientes Bearer, webhooks
  // externos): se emite el token si falta, sin validar.
  if (!MUTATING_METHODS.has(req.method) || !hasSessionCookie) {
    if (!req.cookies || !req.cookies[CSRF_COOKIE]) issueCsrfToken(res);
    return next();
  }

  // Petición mutante con sesión: validación de Origin (capa 3).
  const origin = req.headers.origin;
  if (origin && !isSameOrigin(origin, req) && !config.corsOrigins.includes(origin)) {
    return next(
      new ForbiddenError('Origen rechazado: petición con cookie de sesión desde un origen no autorizado')
    );
  }

  // Doble envío (capa 2): la cabecera debe reproducir la cookie emitida.
  if (!req.cookies[CSRF_COOKIE] || !req.headers[CSRF_HEADER]) {
    return next(new ForbiddenError('Token CSRF ausente'));
  }
  if (req.headers[CSRF_HEADER] !== req.cookies[CSRF_COOKIE]) {
    return next(new ForbiddenError('Token CSRF inválido'));
  }

  return next();
}

module.exports = { csrfProtection };
