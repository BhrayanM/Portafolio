-- ═════════════════════════════════════════════════════════════
--  Verificación del endurecimiento aplicado
--  Requiere: 001–014 aplicadas.
-- ═════════════════════════════════════════════════════════════
--
-- Comprueba que el endurecimiento de 010–014 está realmente presente. Aborta
-- con EXCEPTION si algo falta, de modo que la migración falle en el momento
-- del despliegue y no en producción.
--
-- SOLO LECTURA. La versión original insertaba filas de prueba en lead_log y
-- error_log ('audit@example.com', 'Prueba de validación') y las dejaba
-- ahí: una migración que se ejecuta en producción contaminaba las tablas de
-- datos. Las verificaciones de abajo interrogan el catálogo del sistema.
--
-- ORIGEN DEL FALLO
--
-- El fichero estaba guardado con `\n` literales en lugar de saltos de línea,
-- así que psql leía `\n--` como una metaorden y respondía «invalid command
-- \n». Debajo de la corrupción había además cuatro errores de PL/pgSQL que
-- habrían impedido su ejecución igualmente:
--
--   · WHERE polname LIKE ... sobre la vista pg_policies. La columna se llama
--     `policyname`; `polname` pertenece al catálogo pg_policy.
--   · RAISE EXCEPTION '... esperados %% ...' — en RAISE, `%%` es un literal
--     por ciento, no un marcador de sustitución.
--   · DECLARE log_id SERIAL — SERIAL es un pseudotipo de DDL, no un tipo
--     válido para una variable PL/pgSQL.
--   · GET DIAGNOSTICS log_id = LAST_INSERTED_OID — ese elemento no existe;
--     los válidos son ROW_COUNT, RESULT_OID y PG_CONTEXT.

DO $$
DECLARE
  esperado CONSTANT INT := 6;
  actual   INT;
BEGIN
  SELECT COUNT(*) INTO actual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE 'tenant_isolation%';

  IF actual <> esperado THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: se esperaban % politicas RLS tenant_isolation, hay %',
      esperado, actual;
  END IF;

  RAISE NOTICE 'VALIDACION OK: % politicas RLS de aislamiento por tenant', actual;
END $$;

DO $$
DECLARE
  sin_rls TEXT;
BEGIN
  -- Las seis tablas multi-tenant de 010 deben tener RLS habilitada.
  SELECT string_agg(t, ', ' ORDER BY t) INTO sin_rls
  FROM unnest(ARRAY['leads','scores','workflow_runs',
                    'tenant_settings','error_log','lead_log']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = t AND rowsecurity
  );

  IF sin_rls IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: RLS no habilitada en: %', sin_rls;
  END IF;

  RAISE NOTICE 'VALIDACION OK: RLS habilitada en las 6 tablas multi-tenant';
END $$;

DO $$
DECLARE
  faltan TEXT;
BEGIN
  -- Integridad multi-tenant: la garantía la dan las claves foráneas contra
  -- tenants(id), no un CHECK. Ver la nota de 011_hardening.sql.
  SELECT string_agg(t, ', ' ORDER BY t) INTO faltan
  FROM unnest(ARRAY['users','leads','scores','error_log',
                    'tenant_settings','workflow_runs','audit_log']) AS t
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class      ct ON ct.oid = c.conrelid
    JOIN pg_class      cf ON cf.oid = c.confrelid
    JOIN pg_attribute  a  ON a.attrelid = ct.oid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND ct.relname = t
      AND cf.relname = 'tenants'
      AND a.attname  = 'tenant_id'
  );

  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: falta la FK tenant_id -> tenants(id) en: %', faltan;
  END IF;

  RAISE NOTICE 'VALIDACION OK: 7 claves foraneas tenant_id -> tenants(id)';
END $$;

DO $$
DECLARE
  faltan TEXT;
BEGIN
  -- Los cuatro triggers de auditoría de 011 deben existir y ser AFTER.
  -- pg_trigger.tgtype: bit 1 (valor 2) activo = BEFORE. Un trigger de
  -- auditoria BEFORE que devuelve NULL cancelaria la operacion auditada.
  SELECT string_agg(t, ', ' ORDER BY t) INTO faltan
  FROM unnest(ARRAY['leads_audit','users_audit',
                    'tenants_audit','workflow_runs_audit']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = t
      AND NOT tgisinternal
      AND (tgtype & 2) = 0          -- AFTER
  );

  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: triggers de auditoria ausentes o declarados BEFORE: %', faltan;
  END IF;

  RAISE NOTICE 'VALIDACION OK: 4 triggers de auditoria AFTER activos';
END $$;

DO $$
DECLARE
  mascara TEXT;
BEGIN
  SELECT column_default INTO mascara
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'error_log'
    AND column_name  = 'stack_trace';

  IF mascara IS NULL OR mascara NOT LIKE '%MASKED%' THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: error_log.stack_trace sin default enmascarado (actual: %)',
      COALESCE(mascara, 'NULL');
  END IF;

  RAISE NOTICE 'VALIDACION OK: error_log.stack_trace enmascarado por defecto';
END $$;

DO $$
DECLARE
  faltan TEXT;
BEGIN
  SELECT string_agg(r, ', ' ORDER BY r) INTO faltan
  FROM unnest(ARRAY['app','app_admin']) AS r
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);

  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: roles de servicio ausentes: %', faltan;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('app','app_admin') AND rolbypassrls) THEN
    RAISE EXCEPTION 'VALIDACION FALLIDO: un rol de servicio tiene BYPASSRLS y saltaria el aislamiento por tenant';
  END IF;

  RAISE NOTICE 'VALIDACION OK: roles app y app_admin presentes, sin BYPASSRLS';
END $$;

DO $$
BEGIN
  RAISE NOTICE 'VALIDACION COMPLETO: 6 verificaciones superadas';
END $$;
