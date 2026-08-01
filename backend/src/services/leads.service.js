const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');

class LeadsService {
  async list(tenantId, filters = {}) {
    let query = 'SELECT * FROM leads WHERE tenant_id = $1';
    const params = [tenantId];
    let idx = 2;

    if (filters.status) { query += ` AND status = $${idx++}`; params.push(filters.status); }
    if (filters.category) {
      const normalized = filters.category.charAt(0).toUpperCase() + filters.category.slice(1).toLowerCase();
      query += ` AND ai_category = $${idx++}`;
      params.push(normalized);
    }
    if (filters.search) { query += ` AND (email ILIKE $${idx} OR name ILIKE $${idx} OR company ILIKE $${idx})`; params.push(`%${filters.search}%`); idx++; }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) { query += ` LIMIT $${idx++}`; params.push(parseInt(filters.limit)); }
    if (filters.offset) { query += ` OFFSET $${idx++}`; params.push(parseInt(filters.offset)); }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getById(id, tenantId) {
    const result = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Lead no encontrado');
    return result.rows[0];
  }

  async getStats(tenantId) {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'new')::int AS new,
        COUNT(*) FILTER (WHERE ai_category = 'Hot')::int AS hot,
        COUNT(*) FILTER (WHERE ai_category = 'Warm')::int AS warm,
        COUNT(*) FILTER (WHERE ai_category = 'Cold')::int AS cold,
        ROUND(AVG(ai_score))::int AS avg_score,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today
      FROM leads WHERE tenant_id = $1
    `, [tenantId]);
    return result.rows[0];
  }

  async create(tenantId, data) {
    const { email, name, company, phone, message, source } = data;
    const result = await pool.query(
      `INSERT INTO leads (tenant_id, email, name, company, phone, message, source, status, ai_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', 'Cold')
       RETURNING *`,
      [tenantId, email.toLowerCase(), name || '', company || '', phone || '', message || '', source || 'api']
    );
    return result.rows[0];
  }
}

module.exports = new LeadsService();
