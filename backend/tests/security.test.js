const request = require('supertest');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
  // `resolveTenant` abre el ambito de tenant con el que `src/db` fija
  // `app.tenant_id` en cada consulta. Aqui basta con ejecutar el callback.
  runWithTenant: (tenantId, fn) => fn(),
  getCurrentTenantId: () => null,
}));

const { pool } = require('../src/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

const ADMIN = { id: 'a1', tenant_id: 't1', email: 'admin@test.com', name: 'Admin', role: 'admin' };
const MEMBER = { id: 'm1', tenant_id: 't1', email: 'member@test.com', name: 'Member', role: 'member' };

const tokenFor = (user) =>
  jwt.sign({ userId: user.id, tenantId: user.tenant_id, role: user.role }, config.jwt.secret, { expiresIn: '1h' });

beforeAll(() => {
  pool.query.mockImplementation(async (sql, params) => {
    if (/FROM users WHERE id/i.test(sql)) {
      const found = [ADMIN, MEMBER].find((u) => u.id === params[0]);
      return { rows: found ? [found] : [] };
    }
    if (/INSERT INTO users/i.test(sql)) {
      return { rows: [{ id: 'new1', email: params[1], name: params[3], role: 'member', tenant_id: params[0] }] };
    }
    return { rows: [] };
  });
});

// El alta dejo de ser publica. Antes, quien conociese el UUID de un
// tenant podia crearse una cuenta dentro con solo llamar a esta ruta.
describe('POST /api/auth/register — cerrado a admin', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'password123', name: 'X' });
    expect(res.status).toBe(401);
  });

  it('responde 403 con un usuario que no es admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokenFor(MEMBER)}`)
      .send({ email: 'x@example.com', password: 'password123', name: 'X' });
    expect(res.status).toBe(403);
  });

  it('ignora el tenantId del body y usa el del admin autenticado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokenFor(ADMIN)}`)
      .send({
        email: 'nuevo@example.com',
        password: 'password123',
        name: 'Nuevo',
        tenantId: '00000000-0000-0000-0000-000000000999', // tenant ajeno
      });

    expect(res.status).toBe(201);
    const insert = pool.query.mock.calls.find((c) => /INSERT INTO users/i.test(c[0]));
    expect(insert).toBeDefined();
    // El tenant del INSERT es el del admin, no el que venia en el cuerpo.
    expect(insert[1][0]).toBe(ADMIN.tenant_id);
  });

  it('rechaza contrasenas de menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokenFor(ADMIN)}`)
      .send({ email: 'x@example.com', password: 'corta7', name: 'X' });
    expect(res.status).toBe(400);
  });
});

// El tenant sale solo de la identidad verificada.
describe('resolveTenant — sin puerta trasera por cabecera', () => {
  it('no concede acceso con x-tenant-id y sin autenticacion', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('x-tenant-id', 't1');
    expect(res.status).toBe(401);
  });
});

// Algoritmo de firma fijado.
describe('JWT — algoritmo fijado', () => {
  it('rechaza un token firmado con alg "none"', async () => {
    const unsigned = jwt.sign({ userId: ADMIN.id, tenantId: ADMIN.tenant_id, role: 'admin' }, null, {
      algorithm: 'none',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${unsigned}`);
    expect(res.status).toBe(401);
  });
});
