// F20 — Requisitos de arranque para despliegue.
//
// La deuda que cierra este fichero: `STRIPE_WEBHOOK_SECRET` sigue vacia y no se
// inventa ningun valor de relleno (el secreto real lo emite Stripe). Lo que si se
// puede verificar sin credencial es que el sistema **falla en cerrado** cuando
// falta, y eso es exactamente lo que se prueba aqui:
//
//   1. En produccion el proceso ni arranca (config aborta con la lista de faltantes).
//   2. Fuera de produccion arranca, pero el webhook rechaza en vez de verificar la
//      firma contra la cadena vacia — que seria forjable por cualquiera (H-01).
//
// Se fija la variable a '' ANTES de cualquier require: dotenv no pisa claves que ya
// existen en process.env, asi que esto neutraliza el .env real del desarrollador y
// el test da el mismo resultado en cualquier maquina y en CI.
process.env.STRIPE_WEBHOOK_SECRET = '';

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
  // F21.5: `resolveTenant` abre el ambito de tenant con el que `src/db` fija
  // `app.tenant_id` en cada consulta. Aqui basta con ejecutar el callback.
  runWithTenant: (tenantId, fn) => fn(),
  getCurrentTenantId: () => null,
}));

const billingService = require('../src/services/billing.service');

describe('STRIPE_WEBHOOK_SECRET — rechazo sin secreto', () => {
  it('constructEvent falla en cerrado en vez de verificar contra la cadena vacia', () => {
    // Con clave vacia, cualquiera puede calcular el mismo HMAC-SHA256 y forjar una
    // firma valida: por eso "no configurado" tiene que ser un rechazo, no un pase.
    expect(() => billingService.constructEvent(Buffer.from('{}'), 't=1,v1=deadbeef')).toThrow(
      /Webhook de Stripe no configurado/
    );
  });

  it('el rechazo es 503 STRIPE_WEBHOOK_NOT_CONFIGURED, no un 200 silencioso', () => {
    try {
      billingService.constructEvent(Buffer.from('{}'), 't=1,v1=deadbeef');
      throw new Error('deberia haber lanzado');
    } catch (err) {
      expect(err.statusCode).toBe(503);
      expect(err.code).toBe('STRIPE_WEBHOOK_NOT_CONFIGURED');
    }
  });
});

// Arranque en produccion: `backend/src/config/index.js` acumula las variables que
// faltan y lanza al final. Se recarga el modulo con un entorno controlado en vez de
// levantar el proceso entero.
describe('config — arranque en produccion (fail fast)', () => {
  const saved = { ...process.env };

  const PROD_ENV = {
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(64),
    // No puede ser '*' ni localhost en produccion (D-01).
    CORS_ORIGINS: 'https://portafolio.example',
    POSTGRES_PASSWORD: 'pg-password-de-prueba',
    RABBITMQ_ENABLED: 'false',
  };

  function loadConfigWith(overrides) {
    let loaded;
    jest.isolateModules(() => {
      Object.assign(process.env, PROD_ENV, overrides);
      loaded = require('../src/config');
    });
    return loaded;
  }

  afterEach(() => {
    process.env = { ...saved };
  });

  it('aborta el arranque si falta STRIPE_WEBHOOK_SECRET', () => {
    expect(() => loadConfigWith({ STRIPE_WEBHOOK_SECRET: '' })).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  it('el mensaje deja claro que no se usan valores por defecto para secretos', () => {
    expect(() => loadConfigWith({ STRIPE_WEBHOOK_SECRET: '' })).toThrow(
      /No se usan valores por defecto para secretos/
    );
  });

  it('arranca cuando el secreto esta presente', () => {
    const cfg = loadConfigWith({ STRIPE_WEBHOOK_SECRET: 'whsec_valor_de_prueba' });
    expect(cfg.stripe.webhookSecret).toBe('whsec_valor_de_prueba');
    expect(cfg.isProd).toBe(true);
  });
});
