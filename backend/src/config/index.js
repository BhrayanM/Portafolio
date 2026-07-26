const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

/**
 * Valor de `trust proxy` de Express.
 *
 * Por defecto **desactivado**: confiar en `X-Forwarded-For` sin un proxy delante
 * permitiria a cualquier cliente falsear su IP en la cabecera y saltarse el rate
 * limiter. Solo se activa donde de verdad hay un proxy (nginx), via TRUST_PROXY.
 *
 * Acepta: vacio/'false'/'0' -> false · un numero -> nº de saltos de proxy
 * (`TRUST_PROXY=1` con nginx delante) · cualquier otra cadena se pasa tal cual a
 * Express ('loopback', una subred, una lista separada por comas).
 */
function parseTrustProxy(raw) {
  const value = String(raw ?? '').trim();
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value;
}

/**
 * F19(a) H-02 — Arranque en fallo rapido.
 *
 * Antes, los secretos tenian un valor por defecto en el codigo
 * (`'dev-secret-change-in-production'`, `'postgres'`, credenciales de rabbit).
 * En un repo publico eso significa que un despliegue al que se le olvide una
 * variable arranca **igual**, firmando tokens con una cadena que cualquiera puede
 * leer en GitHub: se pueden forjar JWTs de admin de cualquier tenant.
 *
 * Ahora en produccion no hay valor por defecto: si falta algo, el proceso no
 * arranca. Fuera de produccion se sigue pudiendo trabajar sin .env completo.
 */
const missing = [];
function requiredInProd(name, value, when = true) {
  if (isProd && when && !String(value || '').trim()) missing.push(name);
  return value;
}

/**
 * Secreto de firma del JWT.
 *
 * En produccion es obligatorio. Fuera de produccion, si no esta definido se genera
 * uno **aleatorio en cada arranque**: nunca vuelve a haber un secreto conocido
 * escrito en el codigo. Efecto secundario buscado: al reiniciar en dev, las sesiones
 * anteriores dejan de valer.
 */
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.trim()) return fromEnv;
  requiredInProd('JWT_SECRET', fromEnv);
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Origenes permitidos por CORS (D-01).
 *
 * Se mantiene la lista blanca por entorno. En produccion `CORS_ORIGINS` es
 * obligatoria y no puede quedar abierta: ni `*` ni localhost, que dejaria entrar
 * a cualquier frontend levantado en la maquina de la victima.
 */
function resolveCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  requiredInProd('CORS_ORIGINS', raw);

  const origins = (raw || 'http://localhost:3001,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProd) {
    if (origins.includes('*')) {
      missing.push("CORS_ORIGINS no puede ser '*' en produccion");
    }
    if (origins.some((o) => /localhost|127\.0\.0\.1/.test(o))) {
      missing.push('CORS_ORIGINS no puede incluir localhost en produccion');
    }
  }
  return origins;
}

const config = {
  port: parseInt(process.env.API_PORT) || 3000,
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv,
  isProd,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  jwt: {
    secret: resolveJwtSecret(),
    // D-02: 24h, sin refresh tokens. Antes eran 7d.
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithms: ['HS256'],
  },

  cookie: {
    name: process.env.AUTH_COOKIE_NAME || 'access_token',
    secure: isProd,
    sameSite: process.env.AUTH_COOKIE_SAMESITE || 'lax',
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    maxAgeMs: parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS) || 24 * 60 * 60 * 1000,
  },

  corsOrigins: resolveCorsOrigins(),

  /**
   * F21.5 — `DB_USER` / `DB_PASSWORD` permiten que el backend conecte con un rol de
   * aplicacion sin privilegios de propietario (`app`, creado NOLOGIN en la
   * migracion 012 y habilitado en el despliegue). POSTGRES_USER queda para las
   * migraciones y el mantenimiento, que si necesitan ser propietario.
   *
   * NO ES OPCIONAL. `POSTGRES_USER` en la imagen oficial de PostgreSQL es
   * SUPERUSUARIO, y un superusuario ignora RLS aunque las tablas tengan FORCE ROW
   * LEVEL SECURITY (verificado en F21.5: `rolsuper=t`, `rolbypassrls=t`). Mientras
   * el backend conecte con el, las politicas de la migracion 016 no filtran nada y
   * el aislamiento entre tenants depende solo del `WHERE tenant_id` del codigo.
   *
   * Con `DB_USER=app` —NOSUPERUSER y NOBYPASSRLS— el motor impone el aislamiento:
   * sin contexto de tenant se ven 0 filas, y un INSERT con tenant ajeno se rechaza.
   */
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'n8n',
    password: requiredInProd(
      'POSTGRES_PASSWORD',
      process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD
    ),
    database: process.env.POSTGRES_DB || 'n8n',
  },

  stripe: {
    // D-05(a): sin secret no se puede verificar la firma de los webhooks, y con la
    // cadena vacia la firma pasa a ser **forjable por cualquiera** (ver H-01).
    // En produccion es obligatorio; no se inventa ningun valor.
    webhookSecret: requiredInProd('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET),
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  rabbitmq: {
    enabled: process.env.RABBITMQ_ENABLED === 'true',
    // Sin credenciales por defecto en el codigo: solo se exige si esta habilitado.
    url: requiredInProd('RABBITMQ_URL', process.env.RABBITMQ_URL, process.env.RABBITMQ_ENABLED === 'true'),
  },
};

if (missing.length > 0) {
  throw new Error(
    'Arranque abortado: faltan variables de entorno obligatorias en produccion -> ' +
      missing.join(', ') +
      '. No se usan valores por defecto para secretos.'
  );
}

module.exports = config;

// Se exportan aparte del objeto de config para poder testear el parseo sin
// recargar el modulo con distintas variables de entorno.
module.exports.parseTrustProxy = parseTrustProxy;
