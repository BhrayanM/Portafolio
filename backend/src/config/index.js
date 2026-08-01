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
 * Fail-fast configuration validation for production environments.
 *
 * Critical secrets (JWT, DB credentials, webhook signing keys) must be set
 * via environment variables. In production the process aborts on missing
 * values. Outside production, sensible defaults or auto-generated values
 * allow local development without a complete .env file.
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
   * Allowed CORS origins per environment.
   *
   * In production CORS_ORIGINS must be set and cannot include wildcard or
   * localhost addresses.
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
      missing.push('CORS_ORIGINS cannot include localhost in production');
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
   * Application database role without superuser privileges.
   *
   * Connecting as a non-superuser (e.g. `app`) ensures Row-Level Security policies
   * are enforced by the database engine — a superuser would bypass RLS entirely.
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
    // Without a signing secret the webhook signature cannot be verified.
    // Required in production — never defaults to an empty string.
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
    'Startup aborted: missing required environment variables in production -> ' +
      missing.join(', ') +
      '. No default values are used for secrets.'
  );
}

module.exports = config;

// Se exportan aparte del objeto de config para poder testear el parseo sin
// recargar el modulo con distintas variables de entorno.
module.exports.parseTrustProxy = parseTrustProxy;
