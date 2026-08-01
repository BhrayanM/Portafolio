-- ═════════════════════════════════════════════════════════════
--  Activación real del aislamiento multi-tenant
--  Requiere: 001–015 aplicadas.
-- ═════════════════════════════════════════════════════════════
--
-- POR QUÉ EXISTE ESTA MIGRACIÓN
--
-- La comprobación previa mostró que las políticas RLS de `010_enable_rls.sql`
-- **no tenían ningún efecto sobre la aplicación**. Reproducción:
--
--   -- conectado como el propietario de las tablas, que es como conectaba el backend
--   SELECT count(*) FROM leads;                        -- 2 filas, de 2 tenants
--   SELECT set_tenant_id('...0001'); SELECT count(*);  -- 2 filas  <- ignora la política
--
-- PostgreSQL **no aplica políticas RLS al propietario de la tabla** salvo que se
-- declare FORCE ROW LEVEL SECURITY. El backend conectaba con POSTGRES_USER, que es
-- el propietario, así que el aislamiento entre tenants dependía por completo del
-- `WHERE tenant_id = $1` de la capa de servicios: un solo SELECT sin ese filtro era
-- una fuga entre tenants, sin ninguna red debajo.
--
-- Esta migración cierra las dos mitades del problema en la base de datos. La otra
-- mitad —que el backend conecte con un rol no propietario y fije el tenant en cada
-- petición— está en `backend/src/db.js` y `backend/src/middleware/tenant.js`.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. FALLO CERRADO CUANDO NO HAY CONTEXTO DE TENANT
-- ─────────────────────────────────────────────────────────────
--
-- Las políticas de 010 usan `current_setting('app.tenant_id')` sin el segundo
-- argumento. Si la variable no está definida, PostgreSQL **lanza una excepción**
-- ("unrecognized configuration parameter"), no devuelve NULL. Con FORCE RLS activo
-- eso convierte cualquier consulta sin contexto en un error 500.
--
-- Con `missing_ok = true` la variable ausente vale NULL, la comparación es NULL, y
-- la política no deja pasar ninguna fila. Es decir: **sin contexto de tenant no se
-- ve nada**, que es el comportamiento seguro. Un fallo de cableado se manifiesta
-- como "no hay datos", nunca como "aquí están los de otro".

DROP POLICY IF EXISTS tenant_isolation_leads         ON leads;
DROP POLICY IF EXISTS tenant_isolation_scores        ON scores;
DROP POLICY IF EXISTS tenant_isolation_workflow_runs ON workflow_runs;
DROP POLICY IF EXISTS tenant_isolation_settings      ON tenant_settings;
DROP POLICY IF EXISTS tenant_isolation_error_log     ON error_log;
DROP POLICY IF EXISTS tenant_isolation_lead_log      ON lead_log;

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_scores ON scores
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_workflow_runs ON workflow_runs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_settings ON tenant_settings
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_error_log ON error_log
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

CREATE POLICY tenant_isolation_lead_log ON lead_log
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::UUID);

-- Nota sobre WITH CHECK: las políticas son `FOR ALL` y no lo declaran, así que
-- PostgreSQL reutiliza la expresión de USING como WITH CHECK. Verificado en ejecución:
-- un INSERT con `tenant_id` ajeno se rechaza con
-- «new row violates row-level security policy». No hace falta declararlo aparte.

-- ─────────────────────────────────────────────────────────────
-- 2. FORCE ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
--
-- Sin esto, el propietario de la tabla ignora las políticas. Con esto, las cumple
-- igual que cualquier otro rol.
--
-- Consecuencia deliberada: a partir de aquí, **también las tareas de mantenimiento
-- que corran como propietario** deben fijar `app.tenant_id` para leer estas seis
-- tablas. Es el precio de que la garantía sea real.
--
-- ATENCIÓN — FORCE RLS **no** alcanza a un superusuario ni a un rol con BYPASSRLS.
-- Verificado sobre esta misma migración:
--
--   SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'n8n';
--   -- n8n | t | t        <- POSTGRES_USER de la imagen postgres es SUPERUSUARIO
--
--   SET ROLE app; SELECT count(*) FROM leads;                          -- 0
--   SET ROLE app; SELECT set_config('app.tenant_id', '<A>', false);
--                 SELECT count(*) FROM leads;                          -- 1
--
-- Es decir: activar FORCE RLS es necesario pero **no suficiente**. Mientras el
-- backend conecte con POSTGRES_USER seguirá viéndolo todo. El paso 4 no es una
-- recomendación de higiene, es la otra mitad de esta migración.

ALTER TABLE leads           FORCE ROW LEVEL SECURITY;
ALTER TABLE scores          FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs   FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE error_log       FORCE ROW LEVEL SECURITY;
ALTER TABLE lead_log        FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 3. VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  sin_force TEXT;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO sin_force
  FROM unnest(ARRAY['leads','scores','workflow_runs',
                    'tenant_settings','error_log','lead_log']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = t AND relrowsecurity AND relforcerowsecurity
  );

  IF sin_force IS NOT NULL THEN
    RAISE EXCEPTION 'FORCE RLS FALLIDO: FORCE ROW LEVEL SECURITY ausente en: %', sin_force;
  END IF;

  RAISE NOTICE 'OK: FORCE RLS activo en las 6 tablas multi-tenant';
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 4. PASO DE DESPLIEGUE REQUERIDO (fuera de esta migración)
-- ─────────────────────────────────────────────────────────────
--
-- **Sin este paso, el aislamiento por tenant NO está activo.**
--
-- `012_db_roles.sql` crea el rol `app` como NOLOGIN a propósito: este repositorio
-- es público y no puede contener credenciales. Para que el backend conecte con él
-- hay que habilitarlo en el despliegue, una sola vez:
--
--     ALTER ROLE app LOGIN PASSWORD '<generada, fuera de git>';
--
-- y declarar en el `.env` del backend:
--
--     DB_USER=app
--     DB_PASSWORD=<la misma>
--
-- Si `DB_USER` no se define, el backend conecta con POSTGRES_USER, que en la imagen
-- oficial de PostgreSQL es **superusuario** y por tanto ignora RLS por completo:
-- las políticas de esta migración quedarían decorativas, igual que antes.
--
-- `app` es NOSUPERUSER y NOBYPASSRLS por `013_db_grants.sql`, y `015` lo verifica.
