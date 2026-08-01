/**
 * Protección CSRF por doble envío de token: toda petición mutante con cookie de
 * sesión debe repetir en `x-csrf-token` el valor de la cookie `csrf-token`
 * emitida por el servidor. Además se valida Origin (same-origin o CORS_ORIGINS).
 *
 * Las peticiones sin cookie de sesión (login, clientes Bearer, webhooks externos)
 * y los métodos seguros no se validan, solo reciben la cookie si falta.
 */
const request = require('supertest');
const bcrypt = require('bcrypt');

const PASSWORD = 'fixture-password-no-real';
let PASSWORD_HASH;

const USER = {
  id: '11111111-1111-1111-1111-111111111111',
  tenant_id: '22222222-2222-2222-2222-222222222222',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
};

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
  runWithTenant: (tenantId, fn) => fn(),
  getCurrentTenantId: () => null,
}));

const { pool } = require('../src/db');
const app = require('../src/app');
const config = require('../src/config');

const COOKIE = config.cookie.name;
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

const cookiePair = (res, name) => {
  const raw = res.headers['set-cookie'] || [];
  const entry = raw.find((c) => c.startsWith(`${name}=`));
  if (!entry) return null;
  return `${name}=${decodeURIComponent(entry.split(';')[0].slice(name.length + 1))}`;
};

const cookieValue = (res, name) => {
  const pair = cookiePair(res, name);
  return pair ? pair.slice(name.length + 1) : null;
};

// Cabecera Cookie completa: sesión + token CSRF (lo que haría el navegador).
const sessionCookies = (res) => `${cookiePair(res, COOKIE)}; ${cookiePair(res, CSRF_COOKIE)}`;

beforeAll(async () => {
  PASSWORD_HASH = await bcrypt.hash(PASSWORD, 10);

  pool.query.mockImplementation(async (sql, params) => {
    if (/UPDATE users SET last_login_at/i.test(sql)) return { rows: [], rowCount: 1 };
    if (/password_hash/i.test(sql)) {
      if (params[0] !== USER.email) return { rows: [] };
      return { rows: [{ ...USER, password_hash: PASSWORD_HASH }] };
    }
    if (/FROM users WHERE id/i.test(sql)) {
      if (params[0] !== USER.id) return { rows: [] };
      return { rows: [USER] };
    }
    return { rows: [] };
  });
});

async function login() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: USER.email, password: PASSWORD });
  return res;
}

describe('emisión de la cookie csrf-token', () => {
  it('el login emite la cookie csrf-token además de la de sesión', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(cookiePair(res, CSRF_COOKIE)).toBeTruthy();
  });

  it('una petición segura sin cookie recibe la cookie csrf-token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(cookiePair(res, CSRF_COOKIE)).toBeTruthy();
  });
});

describe('CSRF — doble envío en peticiones mutantes con sesión', () => {
  it('rechaza 403 sin cabecera x-csrf-token', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookies(loginRes))
      .set('Origin', config.corsOrigins[0]);

    expect(res.status).toBe(403);
  });

  it('rechaza 403 con un token que no coincide con la cookie', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookies(loginRes))
      .set('x-csrf-token', 'token-inventado')
      .set('Origin', config.corsOrigins[0]);

    expect(res.status).toBe(403);
  });

  it('acepta con cookie de sesión, token válido y Origin en la allowlist CORS', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookies(loginRes))
      .set('x-csrf-token', cookieValue(loginRes, CSRF_COOKIE))
      .set('Origin', config.corsOrigins[0]);

    expect(res.status).toBe(200);
  });

  it('acepta una petición same-origin con token válido', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Host', 'localhost:3000')
      .set('Cookie', sessionCookies(loginRes))
      .set('x-csrf-token', cookieValue(loginRes, CSRF_COOKIE))
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
  });

  it('acepta un cliente no-navegador: cookie de sesión + token válido y sin Origin', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookies(loginRes))
      .set('x-csrf-token', cookieValue(loginRes, CSRF_COOKIE));

    expect(res.status).toBe(200);
  });

  it('rechaza 403 con token válido y Origin no autorizado', async () => {
    const loginRes = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookies(loginRes))
      .set('x-csrf-token', cookieValue(loginRes, CSRF_COOKIE))
      .set('Origin', 'https://sitio-malicioso.example.com');

    expect(res.status).toBe(403);
  });
});

describe('CSRF — fuera de alcance del middleware', () => {
  it('no filtra métodos seguros: GET con cookie y Origin no autorizado pasa', async () => {
    const loginRes = await login();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookies(loginRes))
      .set('Origin', 'https://sitio-malicioso.example.com');

    expect(res.status).toBe(200);
  });

  it('no filtra peticiones sin cookie: la capa de autenticación sigue mandando', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'https://sitio-malicioso.example.com')
      .send({ email: 'x@example.com', password: 'password123', name: 'X' });

    // El middleware CSRF no la bloquea; la autenticación responde 401.
    expect(res.status).toBe(401);
  });
});
