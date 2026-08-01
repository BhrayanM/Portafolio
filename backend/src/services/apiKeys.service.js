const crypto = require('crypto');
const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');

class ApiKeysService {
  generateKey() {
    return `pk_${crypto.randomBytes(32).toString('hex')}`;
  }

  async create(tenantId, name) {
    const key = this.generateKey();
    const result = await pool.query(
      `UPDATE tenants
       SET api_keys = api_keys || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING api_keys`,
      [JSON.stringify([{ name, key, created_at: new Date().toISOString(), active: true }]), tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return { key, name };
  }

  async list(tenantId) {
    const result = await pool.query(
      'SELECT api_keys FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Tenant no encontrado');
    return result.rows[0].api_keys || [];
  }

  async revoke(tenantId, keyToRevoke) {
    const result = await pool.query(
      `UPDATE tenants
       SET api_keys = (
         SELECT jsonb_agg(
           CASE WHEN item->>'key' = $1 THEN jsonb_set(item, '{active}', 'false'::jsonb) ELSE item END
         ) FROM jsonb_array_elements(api_keys) AS item
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING api_keys`,
      [keyToRevoke, tenantId]
    );
    return result.rows[0]?.api_keys || [];
  }

  async validate(key) {
    const result = await pool.query(
      `SELECT id, name, slug FROM tenants
       WHERE api_keys @> $1::jsonb`,
      [JSON.stringify([{ key, active: true }])]
    );
    return result.rows[0] || null;
  }
}

module.exports = new ApiKeysService();
