-- ═════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY — Multi-tenant Data Isolation
--  Cada tenant solo ve sus propios datos
-- ═════════════════════════════════════════════════════════════

-- Habilitar RLS en tablas multi-tenant
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_log ENABLE ROW LEVEL SECURITY;

-- Política: leads visibles solo para su tenant
CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_scores ON scores
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_workflow_runs ON workflow_runs
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_settings ON tenant_settings
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_error_log ON error_log
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY tenant_isolation_lead_log ON lead_log
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Función para establecer tenant en sesión
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
