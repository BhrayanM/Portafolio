const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');

class TenantsService {
  async getById(id) {
    const result = await pool.query('SELECT id, name, slug, plan, status, settings, api_keys, stripe_customer_id, stripe_subscription_id, created_at, updated_at FROM tenants WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0];
  }

  async getBySlug(slug) {
    const result = await pool.query('SELECT id, name, slug, plan, status, settings, api_keys, stripe_customer_id, stripe_subscription_id, created_at, updated_at FROM tenants WHERE slug = $1', [slug]);
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0];
  }

  async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.slug) { fields.push(`slug = $${idx++}`); values.push(data.slug); }
    if (data.settings) { fields.push(`settings = $${idx++}`); values.push(JSON.stringify(data.settings)); }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, name, slug, plan, status, settings, api_keys, stripe_customer_id, stripe_subscription_id, created_at, updated_at`,
      [...values]
    );

    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0];
  }

  async getSettings(tenantId) {
    const result = await pool.query(
      'SELECT settings FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0].settings || {};
  }

  async updateSettings(tenantId, settings) {
    const result = await pool.query(
      `UPDATE tenants SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING settings`,
      [JSON.stringify(settings), tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0].settings;
  }

  async getUsageStats(tenantId) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM leads WHERE tenant_id = $1) AS total_leads,
        (SELECT COUNT(*)::int FROM workflow_runs WHERE tenant_id = $1) AS total_runs,
        (SELECT COUNT(*)::int FROM users WHERE tenant_id = $1) AS total_users
    `, [tenantId]);
    return result.rows[0];
  }
}

module.exports = new TenantsService();
