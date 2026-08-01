const jwt = require('jsonwebtoken');
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

/**
 * Vida de la cookie, acotada por la del token.
 *
 * `AUTH_COOKIE_MAX_AGE_MS` y `JWT_EXPIRES_IN` son dos variables independientes y
 * se habian ido separando: la cookie se emitia con Max-Age de 7 dias mientras el
 * JWT caducaba a las 24 h. Durante los 6 dias restantes el navegador seguia
 * mandando una credencial muerta, asi que la sesion "parecia" viva y **todas** las
 * peticiones respondian 401 sin que nada redirigiese al login.
 *
 * En vez de exigir que dos variables se mantengan sincronizadas a mano, la
 * caducidad se deriva del `exp` del propio token: por construccion la cookie no
 * puede sobrevivirle. `AUTH_COOKIE_MAX_AGE_MS` sigue respetandose como TECHO,
 * para poder acortar la sesion sin tocar el JWT.
 *
 * Si el token no trae `exp` (no deberia: `login` siempre lo firma con
 * `expiresIn`), se cae al valor configurado, que es el comportamiento anterior.
 */
const resolveCookieMaxAge = (token) => {
  const configured = config.cookie.maxAgeMs;
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded.exp !== 'number') return configured;

  const remainingMs = decoded.exp * 1000 - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.min(configured, remainingMs);
};

const setAuthCookie = (res, token) => {
  res.cookie(config.cookie.name, token, {
    ...cookieOptions(),
    maxAge: resolveCookieMaxAge(token),
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

module.exports = { setAuthCookie, clearAuthCookie, extractToken, cookieOptions, resolveCookieMaxAge };
