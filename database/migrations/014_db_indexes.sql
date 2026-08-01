-- ═════════════════════════════════════════════════════════════
--  F19(c) PARTE 4 — Estrategia de índices multi-tenant
--  Requiere: 001–013 aplicadas.
--  Reparada en F21.3. Ver docs/DATABASE_MIGRATION_AUDIT.md.
-- ═════════════════════════════════════════════════════════════
--
-- ORIGEN DE ESTE FICHERO
--
-- Se llamaba 013_db_indexes.sql y compartía número con 013_db_hardening.sql,
-- lo que dejaba el orden de aplicación a merced del orden alfabético.
-- Renumerada a 014.
--
-- Estaba guardada con secuencias `\n` literales en vez de saltos de línea:
-- 4 341 bytes en 9 líneas físicas. La mayor parte del DDL quedaba dentro de
-- comentarios y no se ejecutaba nunca. Lo poco que asomaba usaba sintaxis
-- MySQL —  `DROP INDEX <nombre> ON <tabla>` — que PostgreSQL rechaza:
-- el error original era «syntax error at or near "ON"». En PostgreSQL los
-- nombres de índice son únicos por esquema y la forma correcta es
-- `DROP INDEX [IF EXISTS] <nombre>`, sin tabla.
--
-- CRITERIO
--
-- Todas las consultas del backend filtran por tenant_id: es la primera
-- columna de cada índice compuesto. Un índice sobre (tenant_id) suelto es
-- redundante cuando existe (tenant_id, X), porque PostgreSQL puede usar el
-- prefijo izquierdo del compuesto. Se retiran esos y se conservan los
-- compuestos que sirven a patrones reales.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. leads
-- ─────────────────────────────────────────────────────────────
-- 003 creó: idx_leads_tenant(tenant_id), idx_leads_email(tenant_id,email),
--           idx_leads_status, idx_leads_category, idx_leads_created.
-- Los tres últimos ya eran compuestos con el prefijo correcto: se renombra el
-- criterio, no se recrean. Solo sobra el índice sobre tenant_id suelto.

DROP INDEX IF EXISTS idx_leads_tenant;

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status     ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_category   ON leads(tenant_id, ai_category);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created_at ON leads(tenant_id, created_at DESC);

DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_category;
DROP INDEX IF EXISTS idx_leads_created;

-- ─────────────────────────────────────────────────────────────
-- 2. scores
-- ─────────────────────────────────────────────────────────────
-- Un score siempre se busca por su lead. idx_scores_tenant(tenant_id) suelto
-- no sirve a ninguna consulta del backend.

DROP INDEX IF EXISTS idx_scores_tenant;

CREATE INDEX IF NOT EXISTS idx_scores_lead        ON scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_scores_lead_tenant ON scores(lead_id, tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 3. workflow_runs
-- ─────────────────────────────────────────────────────────────
-- 007 indexaba tenant_id, status y started_at por separado. Las consultas
-- reales combinan tenant con estado o con orden temporal.

CREATE INDEX IF NOT EXISTS idx_workflow_runs_tenant_status     ON workflow_runs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_tenant_started_at ON workflow_runs(tenant_id, started_at DESC);

DROP INDEX IF EXISTS idx_workflow_runs_tenant;
DROP INDEX IF EXISTS idx_workflow_runs_status;
DROP INDEX IF EXISTS idx_workflow_runs_started;

-- F21.3 · el original ordenaba por `created_at`, columna que workflow_runs no
-- tiene (007 la llama `started_at`). Habría fallado con «column does not
-- exist» de haber llegado a ejecutarse.

-- ─────────────────────────────────────────────────────────────
-- 4. users
-- ─────────────────────────────────────────────────────────────
-- Se mantienen los de 002. El login busca por email; la lista de usuarios de
-- un tenant, por tenant_id. UNIQUE(tenant_id, email) de 002 ya da el índice
-- compuesto para el par.

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);

-- ─────────────────────────────────────────────────────────────
-- 5. tablas de apoyo
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, key);

CREATE INDEX IF NOT EXISTS idx_lead_log_tenant_email      ON lead_log(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_lead_log_tenant_created_at ON lead_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_log_tenant_created_at ON error_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_tenant_source     ON error_log(tenant_id, source);

-- ─────────────────────────────────────────────────────────────
-- 6. audit_log
-- ─────────────────────────────────────────────────────────────
-- Consulta habitual: la traza de un tenant en orden cronológico inverso.

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created_at ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource          ON audit_log(resource, resource_id);

-- F21.3 · Retirado
--
--     CREATE UNIQUE INDEX idx_audit_log_unique_composite
--       ON audit_log(tenant_id, resource_id, action, created_at);
--
-- El índice era UNIQUE y `created_at` toma el valor de CURRENT_TIMESTAMP, que
-- en PostgreSQL es la marca de INICIO DE TRANSACCIÓN, no del instante de la
-- sentencia: es idéntico para todo lo que ocurra dentro de la misma
-- transacción. Dos UPDATE sobre la misma fila en una transacción producen la
-- misma tupla (tenant_id, resource_id, 'UPDATE', created_at) y el segundo
-- viola la unicidad — abortando la operación de negocio, porque el trigger de
-- auditoría de 011 es AFTER y forma parte de la misma transacción.
--
-- Una tabla de auditoría registra hechos; no debe poder rechazar uno. Se
-- sustituye por el índice no único de arriba, que da el mismo rendimiento de
-- consulta sin la restricción.

COMMIT;
