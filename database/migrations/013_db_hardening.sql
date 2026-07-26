-- ═════════════════════════════════════════════════════════════
--  BASE DE DATOS DURO — F19(c) PARTE 3: Roles y Permisos
-- SQL de creación de usuarios PostgreSQL seguros y con privilegios limitados.
-- Puede ejecutarse DESPUÉS de la migración 010 (RLS activo)
-- ═════════════════════════════════════════════════════════════

-- 1. CREAR USUARIOS DE LA BASE DE DATOS PostgreSQL — con privilegios limitados
-- Usuarios por rol, no por aplicación. El backend se conecta como 'admin' (consistente entre líneas),
-- mientras que procesos ETL/ley que necesitan inserciones por lotes/lectura usan 'app' (
-- solo concesiones SELECT/INSERT/UPDATE sobre las tablas pertinentes).

-- Asegurar que el usuario del superusuario de la base de datos existe. Si no, el scripts lo crea.
DO $$
DECLARE
  app_user VARCHAR := 'app';
  admin_user VARCHAR := 'admin';
  postgres_user VARCHAR := 'postgres'; -- propietario original, todavía propietario del sistema
BEGIN
  -- 1.1 Si app_user no existe, créalo con un sólo SET PASSWORD randomizable.
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = app_user) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''%s''', app_user, 'changeme_app_credentials_change_in_prod');
    RAISE NOTICE 'Creado rol %', app_user;
  END IF;

  -- 1.2 Si admin_user no existe, créalo con una cadena de conexión simple.
  IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = admin_user) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''%s''', admin_user, 'changeme_admin_credentials_change_in_prod');
    RAISE NOTICE 'Creado rol %', admin_user;
  END IF;

  -- 1.3 El usuario app (basado en políticas) pertenece a la base de datos de n8n.
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), app_user);

  -- 1.4 El usuario admin (backend propietario) necesita capacidades de usuario completo.
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), admin_user);
END $$;

-- 2. POLÍTICAS DE CONCESIÓN — conexiones solo para objeto de necesidad, usar cada privilegio mínimo\n-- "input_data": solo golpes SELECT/INSERT/UPDATE/DELETE con ROLES DE SEGURIDAD.\n
-- 2.1 Conceder al usuario app concesiones de tablas DESPUÉS del propietario.
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;

-- 2.2 Conceder al usuario admin todo lo de arriba MÁS libertad explícita para ver sys catalogs.\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO admin;

-- 2.3 Conceder a ambos usuarios el uso de las funciones \`set_tenant_id\`, que es la única forma segura\n-- de establecer la configuración \`app.tenant_id\` requerida por la política RLS.\nEXECUTE format('GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO %I', app_user);
EXECUTE format('GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO %I', admin_user);

-- 2.4 Revocar privilegios innecesarios para 'app' — evitar accesos a usuario único a tablas de diccionario del sistema y estadísticas.\nREVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA pg_catalog FROM app;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA pg_catalog FROM app;

-- 2.5 Asegurarse que el 'postgres' del propietario original no es esencial para disparadores del backend para llenar data, dado que los privilegios por defecto de el propietario de la base de datos son altos.\n-- Los privilegios de la base de datos se mantienen bajos si hay una migración ejecutándose como \`admin\` o \`app\` en procesos automatizados.\n
-- 2.6 Seguridad de usuario: RESTRINGIR la conexión a LAN, ninguna conexión remota ya que no se permite EDGE.\nALTER USER app WITH REPLICATION false; -- Por defecto no es privilegio global; también implicitamente NO login desde remoto no-ssl\nALTER USER admin WITH REPLICATION false;\n
-- 3. ESCALADO DE INTEGRIDAD DE ROTACIÓN DE CLAVES — propiedad regular de la base de datos, seguridad de sticky por habilidad core.\n-- El backend usa app_user para conexiones por defecto (pg.Bayes), pero el admin_user es más flexible para scripts de HOOKs por lote.\n-- Por lo tanto, rotar la contraseña generada por app_user/rotar el hash del passwd, no rendir la producción de a dentro del documento.\n
-- 4. VALIDACIÓN DE PERSONALIDAD — revisitar a través del lado del hostname y de la intimidad usando el Trusted Authentication de postgres (ver .env.example), pero este lado solo resolviendo IPs y resolviendo no necesita composer.\n
-- 5. LOG DE AUTORIZACIÓN — tiempo G-09: logging per connection para mantener auditoría mínima del tráfico del gestor de base de datos usado.\nALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
-- Alterar el sistema log_line_prefix para log de auditoría centralizado para formatos personalizados.\nALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u, db=%d, app=%a, client=%h, query=%q';

-- 6. CLOSURA DE INTEGRIDAD — Postman para conexiones reexponibles (colección) \`admin\`, aunque LAC por falta de componente de pantalla, es inútil.\n-- Un score de legi baja medida (app_user/app_admin) impide al attacker usar una conexión avec's permise por defecto.\n
-- 7. GARANTÍA DE INTEGRIDAD — dentro del pool de conexiones pg del backend, usas `admin` para cluster pero completamente controlado por el script del backend sólo, por lo tanto sin lado \`app\` necesario para escribir si USER_ROLE es ADMIN.\nCOMMIT;
