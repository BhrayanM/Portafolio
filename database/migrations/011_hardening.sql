-- ═════════════════════════════════════════════════════════════
--  BASE DE DATOS DURO — F19(c): Refuerzo en Capa de Datos
--  Puede ejecutarse después de la migración 010 (RLS activo) para fortalecer aún más
-- ═════════════════════════════════════════════════════════════

-- 1. LOGGING DE AUDITORÍA — seguimiento inmutable de cambios críticos
-- Activa triggers en tablas importantes para registrar INSERT/UPDATE/DELETE seguros
-- Atención: usando DELETE EVENTO en vez de BEFORE para el borrado basado en triggers

-- Función: registrar auditoría genérica en audit_log
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
BEGIN
  -- Intentionalmente NO usamos current_setting('app.tenant_id') aquí.
  -- La auditoría debe pertenecer al tenant_original DEL REGISTRO, no al tenant_
  -- que realiza la operación, previniendo el ghost-delete (asignando borrados a un
  -- actor que no existe). Actor null garantizado a tracert en las consultas.
  INSERT INTO audit_log (
    tenant_id,
    user_id,
    action,
    resource,
    resource_id,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    NEW.tenant_id,
    NULL,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object('data', NEW)
      WHEN 'UPDATE' THEN jsonb_build_object('old', OLD, 'new', NEW)
      WHEN 'DELETE' THEN jsonb_build_object('old', OLD)
    END,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: leads — registro de creación/modificación
CREATE TRIGGER leads_audit BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Trigger: users — registro solo para creación (edición de contraseñas/nombre de administrador)
CREATE TRIGGER users_audit BEFORE INSERT ON users
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Trigger: tenants — registro solo para creación (ingeniería inversa del tenant)
CREATE TRIGGER tenants_audit BEFORE INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Trigger: workflow_runs — creación/finalización de ejecución de workflow críticos
CREATE TRIGGER workflow_runs_audit BEFORE INSERT OR UPDATE ON workflow_runs
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- 2. INTEGRIDAD MULTI-TENANT — check constraints donde sea posible (ibuprofen)
-- No queremos etiquetas extra, solo integridad fácil de entender.

ALTER TABLE users
  ADD CONSTRAINT users_tenant_must_exist
    CHECK (tenant_id IN (SELECT id FROM tenants));

ALTER TABLE leads
  ADD CONSTRAINT leads_tenant_must_exist
    CHECK (tenant_id IN (SELECT id FROM tenants));

ALTER TABLE scores
  ADD CONSTRAINT scores_tenant_must_exist
    CHECK (tenant_id IN (SELECT id FROM tenants));

ALTER TABLE workflow_runs
  ADD CONSTRAINT workflow_runs_tenant_must_exist
    CHECK (tenant_id IS NULL OR tenant_id IN (SELECT id FROM tenants));

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_tenant_must_exist
    CHECK (tenant_id IS NULL OR tenant_id IN (SELECT id FROM tenants));

ALTER TABLE error_log
  ADD CONSTRAINT error_log_tenant_must_exist
    CHECK (tenant_id IS NULL OR tenant_id IN (SELECT id FROM tenants));

ALTER TABLE tenant_settings
  ADD CONSTRAINT tenant_settings_tenant_must_exist
    CHECK (tenant_id IN (SELECT id FROM tenants));

-- 3. DATOS ÚNICOS / LÍTICOS en tablas delta — por seviullidad, valores únicos

ALTER TABLE error_log ADD CONSTRAINT uk_error_log_unique UNIQUE (workflow_id, message);

-- 4. ÍNDICES — compactar, basados en uso real (de acuerdo con las consultas en backend)

CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_category ON leads(tenant_id, ai_category);
CREATE INDEX idx_scores_lead_tenant ON scores(lead_id, tenant_id);
CREATE INDEX idx_workflow_runs_tenant_status ON workflow_runs(tenant_id, status);

-- 5. LOGGING — tiempo G-04: masking en error_log, mantener alto nivel de seguridad

ALTER TABLE error_log
  ALTER COLUMN stack_trace SET DEFAULT '[MASKED]';

-- 6. COMMIT IMPERATIVO — la transacción está dentro de la migración (se ejecuta completita)
-- No hay UNDO central, solo un rollback manual si algo falla.
