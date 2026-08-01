const config = require('../src/config');
const { parseTrustProxy } = require('../src/config');

// `trust proxy` decide si Express resuelve req.ip desde X-Forwarded-For.
// Es lo que hace que el rate limiter cuente por cliente y no por IP del proxy,
// asi que el valor por defecto es una decision de seguridad, no un detalle.
describe('config.trustProxy', () => {
  it('viene DESACTIVADO por defecto (sin TRUST_PROXY en el entorno)', () => {
    // Sin proxy delante, confiar en X-Forwarded-For dejaria a cualquier cliente
    // falsear su IP por cabecera y estrenar cubo de rate limit en cada peticion.
    expect(config.trustProxy).toBe(false);
  });

  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['0', false],
  ])('trata %p como false', (input, expected) => {
    expect(parseTrustProxy(input)).toBe(expected);
  });

  it('convierte un numero al numero de saltos de proxy', () => {
    // TRUST_PROXY=1 es el caso de docker-compose.local.yml: solo nginx delante.
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
  });

  it('deja pasar cadenas de configuracion de Express tal cual', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('acepta true explicito aunque sea el valor mas permisivo', () => {
    expect(parseTrustProxy('true')).toBe(true);
  });
});
