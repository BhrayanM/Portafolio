/**
 * BLOQUE B — autenticacion por cookie HttpOnly.
 *
 * La base de datos se sustituye por un doble: estos tests verifican el contrato HTTP
 * (Set-Cookie, httpOnly, 401 sin sesion, borrado al salir), no el acceso a datos.
 * No se simula ninguna API externa: aqui no interviene ninguna.
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

// Doble del pool de `pg`. El factory no captura nada del exterior: jest.mock se iza
// por encima de las declaraciones del archivo. La implementacion se define en beforeAll.
jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
  // F21.5: `resolveTenant` abre el ambito de tenant con el que `src/db` fija
  // `app.tenant_id` en cada consulta. Aqui basta con ejecutar el callback.
  runWithTenant: (tenantId, fn) => fn(),
  getCurrentTenantId: () => null,
}));

const { pool } = require('../src/db');
const app = require('../src/app');
const config = require('../src/config');

const USER_EMAIL = USER.email;
const COOKIE = config.cookie.name;

const cookieHeader = (res) => {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
};
const authCookie = (res) => cookieHeader(res).find((c) => c.startsWith(`${COOKIE}=`));

beforeAll(async () => {
  PASSWORD_HASH = await bcrypt.hash(PASSWORD, 10);

  pool.query.mockImplementation(async (sql, params) => {
    if (/UPDATE users SET last_login_at/i.test(sql)) return { rows: [], rowCount: 1 };

    // login(): busca por email y necesita el hash
    if (/password_hash/i.test(sql)) {
      if (params[0] !== USER_EMAIL) return { rows: [] };
      return { rows: [{ ...USER, password_hash: PASSWORD_HASH }] };
    }

    // authenticate(): busca por id, sin hash
    if (/FROM users WHERE id/i.test(sql)) {
      if (params[0] !== USER.id) return { rows: [] };
      return { rows: [USER] };
    }

    return { rows: [] };
  });
});

describe('POST /api/auth/login', () => {
  it('responde 200 y emite la cookie de sesion', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(authCookie(res)).toBeDefined();
  });

  it('la cookie es HttpOnly, con Path y SameSite', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    const cookie = authCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/SameSite/i);
  });

  it('NO devuelve el token en el cuerpo (ya no se guarda en localStorage)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    expect(res.body.token).toBeUndefined();
    expect(res.body.user).toMatchObject({ email: USER_EMAIL, role: 'admin' });
  });

  it('rechaza credenciales invalidas sin emitir cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: 'password-incorrecta' });

    expect(res.status).toBe(401);
    expect(authCookie(res)).toBeUndefined();
  });

  it('rechaza un email inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('401 sin cookie ni cabecera', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('200 usando solo la cookie', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(login));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(USER_EMAIL);
  });

  it('401 con una cookie manipulada', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE}=token-falso`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('responde 200 y vacia la cookie', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    const res = await request(app).post('/api/auth/logout').set('Cookie', authCookie(login));

    expect(res.status).toBe(200);
    const cleared = authCookie(res);
    expect(cleared).toBeDefined();
    // clearCookie emite el mismo nombre con valor vacio y fecha en el pasado.
    expect(cleared).toMatch(new RegExp(`${COOKIE}=;`));
  });

  it('tras el logout, esa cookie ya no da acceso', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    const out = await request(app).post('/api/auth/logout').set('Cookie', authCookie(login));

    // El navegador guardaria la cookie vaciada; reproducimos ese estado.
    const res = await request(app).get('/api/auth/me').set('Cookie', `${COOKIE}=`);
    expect(res.status).toBe(401);
    expect(out.status).toBe(200);
  });
});

describe('compatibilidad con Bearer (clientes no-navegador)', () => {
  it('acepta Authorization: Bearer con el token de la cookie', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: USER_EMAIL, password: PASSWORD });

    const token = authCookie(login).split('=')[1].split(';')[0];
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
