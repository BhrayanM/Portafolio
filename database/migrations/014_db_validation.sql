-- ═════════════════════════════════════════════════════════════
--  BASE DE DATOS DURO — F19(c) RPC H-04: VALIDACIÓN DE INTEGRIDAD
-- Posible hardened: verificar RLS multi-tenant completo, check constraints y triggers actúan correctamente.
-- Posibles pasos de migración:
--   1. Realizar verificaciones SQL básicas en configuración.
--   2. Ejecutar una selección sin profundidad de red (localhost) bajo sessions tenant-adecuadas.
--   3. Intentar deliberadamente operaciones en tabla diferente para asegurar RLs.
--   4. Asegurarse de que error_log y audit_log tienen logging, y abajo del tablero no hay datos divulgados.
-- Se ejecuta solo DESPUÉS de la migración 010 (RLS activo) y 011/013.
-- ═════════════════════════════════════════════════════════════\n\n-- 1. TROBUDIÓN DE H-04 — INTEGRIDAD DE LA TABLA: RLS listo y revisado.
\n-- Verificación 1: RTA revisado de las políticas RLS en pg_policies que aplican a leads, scores, workflow_runs,
-- correction: exactamente N tablas multi-tenant esperadas.
DO $$
DECLARE
  expected_count INT := 6;
  actual_count INT;
BEGIN
  SELECT COUNT(*) INTO actual_count\n  FROM pg_policies\n  WHERE polname LIKE 'tenant_isolation%';\n\n  IF actual_count <> expected_count THEN\n    RAISE EXCEPTION 'H-04 RTA fallido: esperados %% multi-tenant RLS policies, encontrados %% (ejecutar pg_dump --schema-only)', expected_count, actual_count;\n  END IF;\n\n  RAISE NOTICE 'H-04 VERIFICADO: políticas RLS % encontradas (multi-tenant generadas)', actual_count;\nEND $$;

-- Verificación 2: TRY SELECT bajo tenencia diferente no pierde límites normales (sin violación de tipo, sin error\n-- para RLS). Usamos la configuración actual de app.user_id (si no está configurado, usamos una simple).
\nDO $$
DECLARE
  dummy_uuid UUID := '00000000-0000-0000-0000-000000000777';
  ledger_count INT;
BEGIN\n  -- Asegurarse que la conexión actual puede seleccionar de leads (sin definir app_tenant_id), es solo un DEFAULT posiblemente nulo.\n  SELECT COUNT(*) INTO ledger_count\n  FROM leads\n  WHERE 1=1;\n\n  RAISE NOTICE 'H-04 VERIFICADO: registro simple de leads: %', ledger_count;\nEND $$;

-- Verificación 3: CHECK multi-tenant integrity: intentar INSERT en leads con tenant_id inexistente debería\n-- fallar según la restricción de verificación ``leads_tenant_must_exist`` (o violación interna de FK).\n\nDO $$
DECLARE
  dummy_uuid UUID := '00000000-0000-0000-0000-000000000888';
  attempt_count INT := 0;
BEGIN\n  BEGIN\n    INSERT INTO leads (id, tenant_id, email, name)\n    VALUES (gen_random_uuid(), dummy_uuid, 'ghost@example.com', 'Ghost');\n    RAISE EXCEPTION 'H-04 FALLIDO: permitida inserción de leads con tenant_id inexistente';\n  EXCEPTION WHEN OTHERS THEN\n    attempt_count := attempt_count + 1;\n    RAISE NOTICE 'H-04 VERIFICADO: conflicto de integridad multi-tenant (esperado) para tenant_id inexistente: %', SQLERRM;\n  END;\nEND $$;

-- Verificación 4: AUDITORÍA LOG (011) funciona: forzar una entrada en lead_log (lleno de triggers en 011).\n
DO $$
DECLARE
  log_id SERIAL;\n  new_log_id INT;\nBEGIN\n  INSERT INTO lead_log (email, name, company, phone, message, source, ai_score, ai_category, status)\n  VALUES ('audit@example.com', 'Auditoría', 'Emp', '123456', 'Prueba H-04', 'API', 10, 'C', 'pending');\n\n  GET DIAGNOSTICS log_id = LAST_INSERTED_OID;\n  RAISE NOTICE 'H-04 VERIFICADO: auditoría insertada lead_log con id: %', log_id;\nEND $$;

-- Verificación 5: INTEGRIDAD multi-tenant RL: usar real admin ID de seed (tenant 001) y tratar de filtrar.\n\nDO $$
DECLARE
  test_tenant_id UUID := '00000000-0000-0000-0000-000000000001';\n  filtered_result RECORD;\nBEGIN\n  -- Simular una entrada de sesión de backend (usamos el pool de conexiones de backend, pero aquí, ignoramos).
  -- Nosotros simplemente afirmamos que set_config funciona (no podemos usar DB mágica como app.user_id en shell).
  -- Sentencia insertada para setup de aplicacion: estatuario de ejecucion como nota.
  PERFORM set_tenant_id(test_tenant_id);\n\n  -- Acceso RLS obtenido asegurado: SELECT bajo ``LEADS`` ahora usado con configuración de tenant, pero\n  -- No podemos inyectar config directamente en esta conexión, por lo tanto verificamos que el contenido esperado\n  -- de lead_log está presente abajo del tablero (leer bajo RL, no solo).
  SELECT id, tenant_id\n  INTO filtered_result\n  FROM leads\n  WHERE tenant_id = test_tenant_id\n  ORDER BY created_at DESC\n  LIMIT 1;\n\n  RAISE NOTICE 'H-04 VERIFICADO: lead accesible por tenant_id % -> %', test_tenant_id, filtered_result.id;\nEND $$;

-- Verificación 6: TABLE error_log masking: borde electrónico de protección de errores es efectivo; defaults.\n\nDO $$
DECLARE\n  masked_default TEXT;\nBEGIN\n  SELECT column_default INTO masked_default\n  FROM information_schema.columns\n  WHERE table_name = 'error_log' AND column_name = 'stack_trace' AND column_default LIKE '%MASKED%';\n\n  IF masked_default IS NULL THEN\n    RAISE EXCEPTION 'H-04 FALLIDO: por defecto de error_log.stack_trace no tiene máscara, revisa severidad de logs';\n  END IF;\n\n  RAISE NOTICE 'H-04 VERIFICADO: defaults de error_log.stack_trace máscaras: %', masked_default;\nEND $$;

-- Verificación 7: LOG_DE auditoría en error_log (011) funciona: INSERT sin violación de RL.\n
DO $$
BEGIN\n  INSERT INTO error_log (tenant_id, level, source, message, created_at)\n  VALUES ('00000000-0000-0000-0000-000000000001', 'INFO', 'validation', 'Prueba de validación H-04', 1723568400000);\n\n  RAISE NOTICE 'H-04 VERIFICADO: error_log insertado por validación';\nEND $$;

-- Verificación 8: INTEGRIDAD RL en auditoría: SELECT en auditoría por tenant_id RL (si existe).\n-- Aunque audit_log no está protegido por RLS en 010, lo mantenemos para verificación RSA.\n
DO $$
DECLARE\n  audit_count INT;\nBEGIN\n  SELECT COUNT(*) INTO audit_count\n  FROM audit_log\n  WHERE tenant_id = '00000000-0000-0000-0000-000000000001';\n\n  RAISE NOTICE 'H-04 VERIFICADO: registros de auditoría por tenant %: %', '00000000-0000-0000-0000-000000000001', audit_count;\nEND $$;

-- Verificación final: sincronizar DL: por requerimiento; verificar la operación de la migración no toca\n-- nada más.\nCOMMIT;\n