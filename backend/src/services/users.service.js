const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');

class UsersService {
  async list(tenantId) {
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, last_login_at, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return result.rows;
  }

  async getById(id, tenantId) {
    const result = await pool.query(
      'SELECT id, email, name, role, is_active, last_login_at, created_at FROM users WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('User not found');
    return result.rows[0];
  }

  async update(id, tenantId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.role) { fields.push(`role = $${idx++}`); values.push(data.role); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (fields.length === 0) return this.getById(id, tenantId);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, tenantId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx}
       RETURNING id, email, name, role, is_active`,
      [...values]
    );

    if (result.rows.length === 0) throw new NotFoundError('User not found');
    return result.rows[0];
  }
}

module.exports = new UsersService();
