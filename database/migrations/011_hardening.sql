-- ═════════════════════════════════════════════════════════════
--  PARTE 1 — Auditoría e integridad en la capa de datos
--  Requiere: 001–010 aplicadas (RLS activo).
-- ═════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. AUDITORÍA — registro inmutable de cambios críticos
-- ─────────────────────────────────────────────────────────────
--
-- Tres defectos corregidos respecto de la versión original:
--
--   a) Los triggers eran BEFORE y la función terminaba en RETURN NULL.
--      En PostgreSQL, un trigger BEFORE ... FOR EACH ROW que devuelve NULL
--      CANCELA la operación. Tal como estaba, cualquier INSERT en leads,
--      users, tenants o workflow_runs se habría descartado en silencio.
--      Son AFTER: la auditoría registra hechos consumados y su valor de
--      retorno se ignora.
--
--   b) La función leía NEW.tenant_id directamente. La tabla `tenants` no
--      tiene esa columna (su clave es `id`), así que el trigger sobre
--      tenants fallaba con «record "new" has no field "tenant_id"» y
--      bloqueaba permanentemente el alta de tenants — con ello, el seed
--      del tenant administrador y por tanto el login.
--      Se resuelve con to_jsonb(rec)->>'tenant_id', que devuelve NULL si la
--      columna no existe en lugar de abortar; para `tenants` el tenant
--      auditado es su propio id.
--
--   c) No contemplaba DELETE: en un trigger de borrado NEW es NULL. Se
--      selecciona el registro de referencia según TG_OP.

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  rec          JSONB;
  audit_tenant UUID;
  audit_res_id TEXT;
BEGIN
  -- Registro de referencia: el nuevo salvo en DELETE, donde solo hay OLD.
  IF TG_OP = 'DELETE' THEN
    rec := to_jsonb(OLD);
  ELSE
    rec := to_jsonb(NEW);
  END IF;

  audit_res_id := rec->>'id';

  -- Deliberadamente NO se usa current_setting('app.tenant_id'): la entrada
  -- pertenece al tenant DEL REGISTRO, no al que ejecuta la operación. Así un
  -- borrado no queda atribuido a un tenant que no es su dueño.
  IF TG_TABLE_NAME = 'tenants' THEN
    audit_tenant := audit_res_id::UUID;      -- el tenant es la propia fila
  ELSE
    audit_tenant := NULLIF(rec->>'tenant_id', '')::UUID;
  END IF;

  INSERT INTO audit_log (
    tenant_id, user_id, action, resource, resource_id,
    details, ip_address, user_agent, created_at
  ) VALUES (
    audit_tenant,
    NULL,
    TG_OP,
    TG_TABLE_NAME,
    audit_res_id,
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object('data', to_jsonb(NEW))
      WHEN 'UPDATE' THEN jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
      WHEN 'DELETE' THEN jsonb_build_object('old', to_jsonb(OLD))
    END,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
  );

  RETURN NULL;   -- irrelevante en AFTER; explícito para dejarlo claro
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Idempotencia: la migración debe poder reaplicarse sobre una base ya migrada.
DROP TRIGGER IF EXISTS leads_audit         ON leads;
DROP TRIGGER IF EXISTS users_audit         ON users;
DROP TRIGGER IF EXISTS tenants_audit       ON tenants;
DROP TRIGGER IF EXISTS workflow_runs_audit ON workflow_runs;

CREATE TRIGGER leads_audit         AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER users_audit         AFTER INSERT           ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER tenants_audit       AFTER INSERT           ON tenants
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER workflow_runs_audit AFTER INSERT OR UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ─────────────────────────────────────────────────────────────
-- 2. INTEGRIDAD MULTI-TENANT
-- ─────────────────────────────────────────────────────────────
--
-- La versión original declaraba siete constraints de la forma
--
--     CHECK (tenant_id IN (SELECT id FROM tenants))
--
-- que PostgreSQL rechaza («cannot use subquery in check constraint»), y con
-- razón: un CHECK se evalúa solo sobre la fila que se escribe, así que no
-- podría detectar el borrado posterior del tenant referenciado. Sería una
-- garantía aparente.
--
-- La integridad que se buscaba YA está impuesta, y de forma más fuerte, por
-- las claves foráneas declaradas en 001–009:
--
--   users.tenant_id           → tenants(id) ON DELETE CASCADE     (002)
--   leads.tenant_id           → tenants(id) ON DELETE CASCADE     (003)
--   scores.tenant_id          → tenants(id) ON DELETE CASCADE     (004)
--   error_log.tenant_id       → tenants(id) ON DELETE SET NULL    (005)
--   tenant_settings.tenant_id → tenants(id) ON DELETE CASCADE     (006)
--   workflow_runs.tenant_id   → tenants(id) ON DELETE SET NULL    (007)
--   audit_log.tenant_id       → tenants(id) ON DELETE SET NULL    (008)
--
-- Las FK cubren el caso que el CHECK no cubría y admiten NULL donde la
-- columna es opcional, que es exactamente la semántica pretendida. No se
-- añade nada: se documenta y se verifica en 015_db_validation.sql.

-- ─────────────────────────────────────────────────────────────
-- 3. PROTECCIÓN DE DATOS EN LOGS
-- ─────────────────────────────────────────────────────────────
-- Un stack trace sin enmascarar puede arrastrar rutas, tokens en query
-- strings o fragmentos de payload. El default cubre a quien inserta sin
-- especificar la columna; el enmascarado del valor entrante es
-- responsabilidad de backend/src/utils/redact.js.

ALTER TABLE error_log ALTER COLUMN stack_trace SET DEFAULT '[MASKED]';

-- ─────────────────────────────────────────────────────────────
-- 4. NOTAS DE REPARACIÓN
-- ─────────────────────────────────────────────────────────────
--
-- Retirado · ALTER TABLE error_log ADD CONSTRAINT uk_error_log_unique
--            UNIQUE (workflow_id, message)
--
--   Un error que se repite es el caso normal, no una anomalía: el mismo
--   workflow fallando dos veces por el mismo motivo es precisamente lo que
--   hay que registrar. Con esa constraint el segundo INSERT viola la unicidad
--   y el manejador de errores falla al registrar el error. Se retira porque
--   rompe la función de la tabla; la deduplicación, si se quiere, va en la
--   consulta (GROUP BY) o en una columna `occurrences`.
--
-- Movido · los cuatro CREATE INDEX de esta migración pasan a
--          014_db_indexes.sql, que es donde se gestiona la estrategia de
--          índices. Dos de ellos (idx_leads_tenant_status,
--          idx_leads_tenant_category) colisionaban por nombre con los que
--          crea esa migración.

COMMIT;
