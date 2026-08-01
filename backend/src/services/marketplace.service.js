const { pool } = require('../db');
const { NotFoundError } = require('../utils/errors');

class MarketplaceService {
  getCatalog() {
    return [
      { id: 'lead-qualification', name: 'Lead Qualification', description: 'Automatic AI lead qualification', price: 'included', file: 'lead-qualification.json' },
      { id: 'whatsapp-agent', name: 'WhatsApp Agent', description: 'Agente de soporte conversacional por WhatsApp', price: 'pro', file: 'ai-whatsapp-agent.json' },
      { id: 'voice-receptionist', name: 'Voice Receptionist', description: 'Bilingual 24/7 virtual receptionist', price: 'pro', file: 'ai-voice-agent.json' },
      { id: 'sales-chat', name: 'Sales Chat', description: 'Chat de ventas con IA para sitio web', price: 'included', file: 'ai-sales-agent.json' },
    ];
  }

  async install(tenantId, workflowId) {
    const catalog = this.getCatalog();
    const item = catalog.find((w) => w.id === workflowId);
    if (!item) throw new NotFoundError('Automation not found');

    // Verificar plan
    const tenant = await pool.query('SELECT plan FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) throw new NotFoundError('Tenant no encontrado');

    const plan = tenant.rows[0].plan;
    const proPlans = ['growth', 'enterprise'];
    if (item.price === 'pro' && !proPlans.includes(plan)) {
      throw new Error('The Starter plan does not include this automation. Upgrade to Growth or Enterprise.');
    }

    // Registrar instalación
    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, `marketplace_${workflowId}`, JSON.stringify({ installed: true, installed_at: new Date().toISOString() })]
    );

    // Registrar en workflow_runs
    await pool.query(
      `INSERT INTO workflow_runs (tenant_id, workflow_name, status, trigger_type)
       VALUES ($1, $2, 'active', 'marketplace_install')`,
      [tenantId, item.name]
    );

    return { success: true, workflow: item };
  }

  async getInstalled(tenantId) {
    const result = await pool.query(
      `SELECT key, value FROM tenant_settings WHERE tenant_id = $1 AND key LIKE 'marketplace_%'`,
      [tenantId]
    );

    return result.rows.map((row) => ({
      id: row.key.replace('marketplace_', ''),
      ...row.value,
    }));
  }
}

module.exports = new MarketplaceService();
