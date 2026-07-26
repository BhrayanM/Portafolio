const request = require('supertest');

jest.mock('../src/db', () => ({
  pool: { query: jest.fn() },
  // F21.5: `resolveTenant` abre el ambito de tenant con el que `src/db` fija
  // `app.tenant_id` en cada consulta. Aqui basta con ejecutar el callback.
  runWithTenant: (tenantId, fn) => fn(),
  getCurrentTenantId: () => null,
}));

const { pool } = require('../src/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

const USER = {
  id: 'u1',
  tenant_id: 't1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'admin',
};

const TOKEN = jwt.sign(
  { userId: USER.id, tenantId: USER.tenant_id, role: USER.role },
  config.jwt.secret,
  { expiresIn: '1h' }
);

const authHeader = `Bearer ${TOKEN}`;

beforeAll(() => {
  pool.query.mockImplementation(async (sql, params) => {
    // Auth middleware: busca usuario por id
    if (/FROM users WHERE id/i.test(sql)) {
      if (params[0] !== USER.id) return { rows: [] };
      return { rows: [USER] };
    }
    // Stats query (FILTER indica es stats, no list)
    if (/FILTER/i.test(sql)) {
      return { rows: [{ total: 10, new: 5, hot: 2, warm: 3, cold: 5, avg_score: 45, today: 3 }] };
    }
    // Lead list
    if (/FROM leads/i.test(sql)) {
      return { rows: [] };
    }
    if (/INSERT INTO leads/i.test(sql)) {
      return {
        rows: [{
          id: 1,
          tenant_id: params[0],
          email: params[1],
          name: params[2],
          company: params[3],
          phone: params[4],
          message: params[5],
          source: params[6],
          status: 'new',
          ai_category: 'COLD',
          created_at: new Date().toISOString(),
        }],
      };
    }
    return { rows: [] };
  });
});

describe('GET /health', () => {
  it('responde 200 con status ok cuando DB responde', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('version');
  });

  it('responde 503 cuando DB falla', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.db).toBe('disconnected');
  });
});

describe('GET /api/metrics', () => {
  // F19(a) H-07: la ruta era publica y filtraba hostname, PID, version de Node y
  // plataforma. Ahora exige autenticacion; el test refleja el nuevo contrato.
  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(401);
  });

  it('responde con metricas del proceso con token valido', async () => {
    const res = await request(app)
      .get('/api/metrics')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('process');
    expect(res.body).toHaveProperty('memory');
    expect(res.body).toHaveProperty('os');
  });
});

describe('GET /api/leads/stats', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app).get('/api/leads/stats');
    expect(res.status).toBe(401);
  });

  it('responde 200 con token valido', async () => {
    const res = await request(app)
      .get('/api/leads/stats')
      .set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10);
  });
});

describe('GET /api/leads (list)', () => {
  it('filtra por category=HOT conservando el canonico HOT (F18.2)', async () => {
    await request(app)
      .get('/api/leads?category=HOT')
      .set('Authorization', authHeader);
    const call = pool.query.mock.calls.find(c => c[0] && c[0].includes('ai_category'));
    expect(call).toBeDefined();
    expect(call[1]).toContain('HOT');
  });

  it('filtra por category=COLD conservando el canonico COLD (F18.2)', async () => {
    await request(app)
      .get('/api/leads?category=COLD')
      .set('Authorization', authHeader);
    const call = pool.query.mock.calls.find(c => c[0] && c[0].includes('ai_category'));
    expect(call).toBeDefined();
    expect(call[1]).toContain('COLD');
  });

  it('rechaza 400 una categoria fuera del enum canonico (F18.2)', async () => {
    const res = await request(app)
      .get('/api/leads?category=Hot')
      .set('Authorization', authHeader);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/leads', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app)
      .post('/api/leads')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(401);
  });

  it('responde 400 si falta email', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', authHeader)
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('responde 400 si email invalido', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', authHeader)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('responde 201 creando lead', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Authorization', authHeader)
      .send({ email: 'lead@example.com', name: 'Lead Test' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('lead@example.com');
    expect(res.body.status).toBe('new');
  });
});

describe('GET /api/billing/plans', () => {
  it('responde con lista de planes sin auth', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('tiene los slugs correctos: starter, growth, enterprise', async () => {
    const res = await request(app).get('/api/billing/plans');
    const slugs = res.body.map(p => p.slug).sort();
    expect(slugs).toEqual(['enterprise', 'growth', 'starter']);
  });
});

describe('POST /api/billing/checkout', () => {
  it('responde 401 sin token', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .send({ plan: 'starter' });
    expect(res.status).toBe(401);
  });

  it('responde 400 con plan invalido', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ plan: 'invalid-plan' });
    expect(res.status).toBe(400);
  });

  it('responde 400 con plan vacio', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('acepta plan growth (C-01: schema y service unificados)', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', authHeader)
      .send({ plan: 'growth' });
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });
});

describe('GET /api/nonexistent', () => {
  it('responde 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
