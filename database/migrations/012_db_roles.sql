-- ═════════════════════════════════════════════════════════════
--  BASE DE DATOS DURO — F19(c) PARTE 2: Usuarios de Base de Datos Seguros
-- Puede ejecutarse después de la migración 010 (RLS activo) para reforzar la seguridad
-- ═════════════════════════════════════════════════════════════

-- 1. USUARIOS DE LA BASE DE DATOS — service roles sin acceso general a la raíz
-- Usuarios con privilegios mínimos necesarios para el funcionamiento y la migración
-- Rutas externas de CRUD de controlan acceden a través de la conexión de pool pg del backend

DO $$
DECLARE
  app_user VARCHAR := 'app';
  admin_user VARCHAR := 'admin';
  postgres_user VARCHAR := current_user;
BEGIN
  -- Si app_user no existe, créalo con privilegios limitados
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = app_user) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''%s''', app_user, 'changeme_service_credentials_change_in_prod');
    RAISE NOTICE 'Creado rol %', app_user;
  END IF;

  -- Si admin_user no existe, créalo con privilegios limitados
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = admin_user) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''%s''', admin_user, 'changeme_admin_credentials_change_in_prod');
    RAISE NOTICE 'Creado rol %', admin_user;
  END IF;

  -- Los privilegios son intencionalmente limitados: solo conexiones para las bases de datos necesarias
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), app_user);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), admin_user);
END $$;

-- 2. PRIVILEGIOS — ROTACIÓN de clave, todo mínimo por necesidad
-- El backend (+ scripts de migración) se conecta con las credenciales de ADMIN que ya existen,
-- por lo que los privilegios de ADMIN deben incluir EXECUTE para las funciones y para set_config,
-- porque son la única manera legitima de establecer app.tenant_id durante la migración o runtime.

GRANT USAGE ON SCHEMA public TO app, admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app;
GRANT INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app, admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT,UPDATE,DELETE ON TABLES TO app;

-- 3. RETRACCION de accesos innecesarios (similar a un RAISE FAIL):
-- Nodo pg_rewind usaría una conexión con los valores por defecto; aprisionar la aplicacion
-- con NETWORK como queremos.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 4. SEGURIDAD: la autorización del superusuario como funciona (performante en local)
-- El backend se ejecuta como app_user. Admin para escrituras por lotes/verificación del sistema,
-- owner como mismo: string \\"jwt_secret, jwt_signer&#93;", solo backend escribe del root.

-- Nota: Como no puedo cambiar el owner, configuro escenarios donde root (postgres) tiene más privilegios
-- de los que necesita, minimizando el daño potencial si la contraseña se ve en algún lugar,
-- porque el agente solo necesita ejecutarse como un servicio con DB_DATA.

REVOKE ALL PRIVILEGES ON DATABASE postgres FROM pg_monitor;
REVOKE ALL PRIVILEGES ON DATABASE postgres FROM PUBLIC;

-- 5. LOGGING DE AUTORIZACIÓN (si está habilitado)
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u, db=%d, app=%a, client=%h, query=%q';

-- 6. PROTECCIÓN DE MASTER: sin vista general, roles limitados
GRANT USAGE ON SCHEMA pg_catalog, pg_temp TO PUBLIC;
-- EXCLUIR pg_hba.conf si existe (no puede ser editado aquí)

-- 7. IMPORTANTE: nunca ALTER ROLE a pwd que el backend (config de app) no conoce.
-- 'app_user' es el propietario del pool de conexiones pg y está monitoreado/contenido por app service.

COMMIT;
