const config = require('../config');

/**
 * Opciones de la cookie de sesion.
 *
 * httpOnly: JavaScript no puede leerla -> un XSS ya no puede robar el token.
 * sameSite: mitiga CSRF. 'lax' permite navegacion normal; usar 'none' + secure si el
 *           frontend vive en otro dominio.
 * secure:   solo se envia por HTTPS. Desactivado en desarrollo porque no hay TLS local.
 */
const cookieOptions = () => {
  const opts = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
  };
  if (config.cookie.domain) opts.domain = config.cookie.domain;
  return opts;
};

const setAuthCookie = (res, token) => {
  res.cookie(config.cookie.name, token, {
    ...cookieOptions(),
    maxAge: config.cookie.maxAgeMs,
  });
};

// Para borrar, las opciones deben coincidir con las del alta (salvo maxAge/expires).
const clearAuthCookie = (res) => {
  res.clearCookie(config.cookie.name, cookieOptions());
};

/**
 * Extrae el JWT de la peticion.
 * Prioriza la cookie; acepta `Authorization: Bearer` como respaldo para clientes
 * no-navegador (scripts, integraciones) que no manejan cookies.
 */
const extractToken = (req) => {
  const fromCookie = req.cookies && req.cookies[config.cookie.name];
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);

  return null;
};

module.exports = { setAuthCookie, clearAuthCookie, extractToken, cookieOptions };
