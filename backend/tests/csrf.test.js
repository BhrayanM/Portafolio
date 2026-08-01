/**
 * Protección CSRF: peticiones mutantes con cookie de sesión solo se aceptan
 * con Origin same-origin o en la allowlist CORS (config.corsOrigins).
 *
 * CSRF es un ataque de navegador: quien usa Bearer (clientes no-navegador) o no
 * manda cookie no se ve afectado. Las peticiones sin Origin no pueden venir de un
 * navegador (siempre lo envían en POST/PUT/PATCH/DELETE) y pasan.
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
const authCookie = (res) =>
  res.headers['set-cookie'].find((c) => c.startsWith(`${COOKIE}=`));

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
  return authCookie(res);
}

describe('CSRF — validación de Origin en peticiones mutantes con cookie', () => {
  it('rechaza 403 un POST con cookie y Origin no autorizado', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', 'https://sitio-malicioso.example.com');

    expect(res.status).toBe(403);
  });

  it('acepta un POST con cookie y Origin en la allowlist CORS', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', config.corsOrigins[0]);

    expect(res.status).toBe(200);
  });

  it('acepta un POST same-origin', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Host', 'localhost:3000')
      .set('Cookie', cookie)
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
  });

  it('acepta un POST con cookie y sin Origin (cliente no-navegador)', async () => {
    const cookie = await login();
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(res.status).toBe(200);
  });

  it('no filtra métodos seguros: GET con cookie y Origin no autorizado pasa', async () => {
    const cookie = await login();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie)
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
