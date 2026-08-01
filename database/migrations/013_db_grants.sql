-- ═════════════════════════════════════════════════════════════
--  PARTE 3 — Permisos finos y atributos de rol
--  Requiere: 012 aplicada (roles app / app_admin existentes).
-- ═════════════════════════════════════════════════════════════
--
-- ORIGEN DE ESTE FICHERO
--
-- Se llamaba 013_db_hardening.sql y era, en un 90 %, una copia literal de
-- 012_db_roles.sql: creaba los mismos roles con las mismas contraseñas,
-- repetía los mismos GRANT y volvía a ejecutar los mismos ALTER SYSTEM.
--
-- Encima estaba corrupto. El fichero se guardó con secuencias `\n` literales
-- en lugar de saltos de línea reales, así que la mayoría de sentencias
-- quedaban absorbidas por el comentario `--` de la línea anterior y nunca se
-- ejecutaban. La primera que sí quedaba a la vista era:
--
--     EXECUTE format('GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO %I', app_user);
--
-- fuera de un bloque DO. En SQL plano, EXECUTE significa «ejecuta una
-- sentencia preparada», de ahí el error original:
-- «prepared statement "format" does not exist».
--
-- Reparación: se elimina todo lo duplicado y se conserva únicamente lo que
-- esta migración aportaba de más — el permiso explícito sobre set_tenant_id()
-- y los atributos de rol. Renombrada a 013_db_grants.sql para resolver el
-- número 013 duplicado que compartía con la migración de índices.

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. EXECUTE EXPLÍCITO SOBRE set_tenant_id()
-- ─────────────────────────────────────────────────────────────
-- 012 concede EXECUTE sobre todas las funciones existentes. Este GRANT
-- nominal sobrevive a un REVOKE masivo posterior y deja constancia de que es
-- una dependencia deliberada: set_tenant_id() es la única vía admitida para
-- fijar app.tenant_id, del que dependen todas las políticas RLS de 010.

GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO app, app_admin;

-- ─────────────────────────────────────────────────────────────
-- 2. ATRIBUTOS DE ROL
-- ─────────────────────────────────────────────────────────────
-- Explícito por claridad de auditoría: ninguno de los dos roles de servicio
-- puede abrir una conexión de replicación ni crear bases o roles. Son los
-- valores por defecto; se declaran para que una revisión de permisos no
-- tenga que asumirlos.

ALTER ROLE app       NOREPLICATION NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE app_admin NOREPLICATION NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- NOBYPASSRLS es el atributo que importa aquí: sin él, un rol con BYPASSRLS
-- leería todos los tenants ignorando las políticas de 010.

-- ─────────────────────────────────────────────────────────────
-- 3. NOTAS DE REPARACIÓN
-- ─────────────────────────────────────────────────────────────
--
-- Retirado · el bloque DO que volvía a crear los roles app y admin con
--            contraseñas literales. Duplicaba 012 y reintroducía las
--            credenciales que 012 retira.
--
-- Retirado · GRANT USAGE ON SCHEMA public / GRANT SELECT... — idénticos a 012.
--
-- Retirado · REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA pg_catalog FROM app
--            REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA pg_catalog FROM app
--
--   Revocar sobre pg_catalog rompe el propio funcionamiento del cliente: psql,
--   el driver pg y el planificador consultan el catálogo en cada sesión. Y no
--   protege nada: los catálogos ya filtran por visibilidad del rol.
--
-- Retirado · ALTER SYSTEM SET log_connections / log_disconnections /
--            log_line_prefix — repetición literal de 012, con el mismo
--            problema de alcance (clúster completo, requiere superusuario).
--            Corresponde a la configuración del servidor.

COMMIT;
