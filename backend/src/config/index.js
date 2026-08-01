const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  port: parseInt(process.env.API_PORT) || 3000,
  host: process.env.API_HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Cookie de sesion: el JWT viaja aqui, no en localStorage (no accesible desde JS).
  cookie: {
    name: process.env.AUTH_COOKIE_NAME || 'access_token',
    // secure solo en produccion: en local no hay HTTPS y el navegador descartaria la cookie.
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.AUTH_COOKIE_SAMESITE || 'lax',
    domain: process.env.AUTH_COOKIE_DOMAIN || undefined,
    maxAgeMs: parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000,
  },

  // Origenes permitidos para CORS con credenciales. Con cookies no se puede usar '*'.
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'n8n',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'n8n',
  },
};
