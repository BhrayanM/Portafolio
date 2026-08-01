const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');
// Fuente única del enum de clasificación: el mismo helper que usan los Code nodes
// de n8n. Canónico = HOT/WARM/COLD en mayúsculas, tal y como n8n escribe en `leads`.
const { normalizeCategory } = require('../lib/lead');

class LeadsService {
  async list(tenantId, filters = {}) {
    let query = 'SELECT * FROM leads WHERE tenant_id = $1';
    const params = [tenantId];
    let idx = 2;

    if (filters.status) { query += ` AND status = $${idx++}`; params.push(filters.status); }
    if (filters.category) {
      query += ` AND ai_category = $${idx++}`;
      params.push(normalizeCategory(filters.category));
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
        COUNT(*) FILTER (WHERE ai_category = 'HOT')::int AS hot,
        COUNT(*) FILTER (WHERE ai_category = 'WARM')::int AS warm,
        COUNT(*) FILTER (WHERE ai_category = 'COLD')::int AS cold,
        ROUND(AVG(ai_score))::int AS avg_score,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today
      FROM leads WHERE tenant_id = $1
    `, [tenantId]);
    return result.rows[0];
  }

  /**
   * Actividad reciente: el rastro que deja el workflow de n8n.
   *
   * `frontend/src/lib/api.ts` ya llamaba a `/leads/activity` y el backend no
   * montaba la ruta: la pantalla `/dashboard/activity` respondia 404 y mostraba su
   * banner de error. Se implementa contra `lead_log`, que es donde el nodo
   * "Log to PostgreSQL" del workflow escribe cada lead procesado.
   *
   * `leads` (alta por API) y `lead_log` (procesado por n8n) son tablas distintas a
   * proposito: la primera es el recurso del CRM, la segunda es la traza de
   * ejecucion con el veredicto del modelo. La pantalla de actividad quiere la
   * segunda.
   *
   * Se devuelven exactamente los campos del tipo `LeadLogEntry` del frontend, ni
   * uno mas: `message` puede traer texto libre del formulario y no pinta en un
   * listado de actividad.
   */
  async getActivity(tenantId, filters = {}) {
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

    const result = await pool.query(
      `SELECT id, email, name, source, status, ai_score, created_at
         FROM lead_log
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return result.rows;
  }

  async create(tenantId, data) {
    const { email, name, company, phone, message, source, ai_business_category } = data;
    const result = await pool.query(
      `INSERT INTO leads (tenant_id, email, name, company, phone, message, source, status, ai_category, ai_business_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', 'COLD', $8)
       RETURNING *`,
      [tenantId, email.toLowerCase(), name || '', company || '', phone || '', message || '', source || 'api',
        ai_business_category || 'General']
    );
    return result.rows[0];
  }
}

module.exports = new LeadsService();
