/**
 * La cookie de sesion no puede sobrevivir al JWT que transporta.
 *
 * Regresion cubierta: `AUTH_COOKIE_MAX_AGE_MS` (7 dias en .env) y `JWT_EXPIRES_IN`
 * (24 h) son variables independientes y se habian desincronizado. El navegador
 * conservaba 6 dias una credencial ya caducada: la sesion parecia viva y todas las
 * peticiones respondian 401 sin que nada llevase al login.
 *
 * No se toca la base de datos ni ningun servicio externo: solo se comprueba el
 * calculo de `maxAge` a partir del `exp` del token.
 */
const jwt = require('jsonwebtoken');
const { resolveCookieMaxAge } = require('../src/utils/authCookie');
const config = require('../src/config');

const firmar = (opciones) => jwt.sign({ userId: 'x' }, 'secreto-de-prueba', opciones);

describe('resolveCookieMaxAge', () => {
  test('acota la cookie a la vida restante del token cuando este caduca antes', () => {
    const unaHora = 3600;
    const maxAge = resolveCookieMaxAge(firmar({ expiresIn: unaHora }));

    // Margen de 5 s para absorber el tiempo de ejecucion del propio test.
    expect(maxAge).toBeLessThanOrEqual(unaHora * 1000);
    expect(maxAge).toBeGreaterThan((unaHora - 5) * 1000);
    // Lo esencial: por debajo del techo configurado, no igual a el.
    expect(maxAge).toBeLessThan(config.cookie.maxAgeMs);
  });

  test('respeta el techo configurado cuando el token vive mas que el', () => {
    const treintaDias = 30 * 24 * 3600;
    const maxAge = resolveCookieMaxAge(firmar({ expiresIn: treintaDias }));

    expect(maxAge).toBe(config.cookie.maxAgeMs);
  });

  test('devuelve 0 para un token ya caducado — la cookie nace muerta', () => {
    const maxAge = resolveCookieMaxAge(firmar({ expiresIn: -60 }));
    expect(maxAge).toBe(0);
  });

  test('cae al valor configurado si el token no declara exp', () => {
    const maxAge = resolveCookieMaxAge(firmar({}));
    expect(maxAge).toBe(config.cookie.maxAgeMs);
  });

  test('cae al valor configurado ante un token ilegible, sin lanzar', () => {
    expect(resolveCookieMaxAge('esto-no-es-un-jwt')).toBe(config.cookie.maxAgeMs);
    expect(resolveCookieMaxAge('')).toBe(config.cookie.maxAgeMs);
  });
});
