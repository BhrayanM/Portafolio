-- ═════════════════════════════════════════════════════════════
--  F19(c) PARTE 2 — Roles de base de datos con privilegio mínimo
--  Requiere: 001–011 aplicadas.
--  Reparada en F21.3. Ver docs/DATABASE_MIGRATION_AUDIT.md.
-- ═════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. ROLES DE SERVICIO
-- ─────────────────────────────────────────────────────────────
--
--   app    lectura/escritura sobre el esquema de la aplicación. Destinado al
--          pool de conexiones del backend.
--   app_admin  operaciones por lotes y verificación. Mismo alcance de datos,
--          separado para poder auditar y revocar de forma independiente.
--
-- F21.3 · dos cambios respecto de la versión original:
--
--   a) Los roles se creaban con LOGIN y una contraseña literal escrita en el
--      fichero ('changeme_service_credentials_change_in_prod'). Este es un
--      repositorio público: un rol con LOGIN y credencial conocida es una
--      puerta abierta, no un endurecimiento. Se crean NOLOGIN. Las
--      credenciales se asignan en el despliegue, fuera de git:
--
--          ALTER ROLE app       LOGIN PASSWORD '<generada>';
--          ALTER ROLE app_admin LOGIN PASSWORD '<generada>';
--
--      Los GRANT quedan preparados: habilitar el acceso es una sola sentencia.
--
--   b) El rol se llamaba `admin`. Es un nombre genérico que colisiona
--      conceptualmente con la cuenta `admin` de la aplicación (tabla users) y
--      con convenciones de otras herramientas sobre el mismo clúster. Pasa a
--      `app_admin`, que dice a qué pertenece.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    CREATE ROLE app NOLOGIN;
    RAISE NOTICE 'Creado rol app (NOLOGIN)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
    RAISE NOTICE 'Creado rol app_admin (NOLOGIN)';
  END IF;
END $$;

-- CONNECT no admite el formato %I sobre current_database() en SQL plano.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app',       current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_admin', current_database());
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. PRIVILEGIOS SOBRE EL ESQUEMA
-- ─────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO app, app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO app;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO app, app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- Las tablas creadas después de esta migración heredan los mismos permisos.
-- Sin esto, cada migración futura exigiría un GRANT manual.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app, app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app, app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO app, app_admin;

-- ─────────────────────────────────────────────────────────────
-- 3. RETIRADA DE PRIVILEGIOS IMPLÍCITOS
-- ─────────────────────────────────────────────────────────────
-- PostgreSQL concede EXECUTE sobre funciones a PUBLIC por defecto. Cualquier
-- rol con conexión podría invocar set_tenant_id() y fijar app.tenant_id a un
-- tenant ajeno, que es justo lo que RLS debe impedir.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT  USAGE ON SCHEMA public TO app, app_admin;

-- ─────────────────────────────────────────────────────────────
-- 4. NOTAS DE REPARACIÓN (F21.3)
-- ─────────────────────────────────────────────────────────────
--
-- Retirado · GRANT USAGE ON SCHEMA pg_catalog, pg_temp TO PUBLIC
--
--   Causa del fallo original: «schema "pg_temp" does not exist». `pg_temp` no
--   es un esquema real sino un alias de sesión al esquema temporal, y no se
--   puede referenciar en un GRANT. Además la sentencia era un no-op: USAGE
--   sobre pg_catalog ya está concedido a PUBLIC por defecto.
--
-- Retirado · REVOKE ALL PRIVILEGES ON DATABASE postgres FROM pg_monitor
--            REVOKE ALL PRIVILEGES ON DATABASE postgres FROM PUBLIC
--
--   Operaban sobre la base `postgres`, no sobre la de la aplicación. Una
--   migración no debe modificar permisos de otra base de datos del clúster.
--
-- Movido · ALTER SYSTEM SET log_connections / log_disconnections /
--          log_line_prefix
--
--   ALTER SYSTEM escribe en postgresql.auto.conf: afecta a TODO el clúster,
--   exige superusuario y requiere reload para surtir efecto. No pertenece a
--   una migración de esquema. Va en la configuración del servidor; en el
--   compose, como `command: postgres -c log_connections=on ...`.
--
-- Nota · el backend se conecta hoy con POSTGRES_USER (propietario del
--        esquema), no con `app`. Estos roles quedan preparados pero sin uso.
--        Migrar el backend a `app` es lo que convierte esta migración en una
--        reducción real de privilegios; hasta entonces es andamiaje.

COMMIT;
