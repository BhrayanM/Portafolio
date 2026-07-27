# Database Migration Review

**Fecha:** 2026-07-26 · **Motor:** PostgreSQL 15.18 (`postgres:15.18-alpine`)

Inventario y análisis de `database/migrations/*.sql`. El estado que se describe en la columna
«problemas» es el que tenían los ficheros **antes** de la reparación.

---

## Resumen

| | Antes | Después |
|---|---|---|
| Ficheros | 15 (con `013` duplicado) | 15 (`001`–`015`, únicos) |
| Aplican sobre BD limpia | 10 de 15 | **15 de 15** |
| Seeds | fallan | **2 de 2** |
| Exit code de la cadena completa | ≠ 0 | **0** |

---

## 001 · `001_create_tenants.sql`

- **Objetivo:** tabla raíz del modelo multi-tenant.
- **Tablas:** crea `tenants` (UUID PK, `slug` único, `plan`, `status`, `settings` JSONB,
  `api_keys` JSONB, campos de Stripe).
- **Índices:** `idx_tenants_slug`, `idx_tenants_status`.
- **Triggers / funciones / permisos:** ninguno.
- **Problemas:** ninguno bloqueante.
  `idx_tenants_slug` es redundante — `slug` ya es `UNIQUE`, lo que crea su propio índice.

## 002 · `002_create_users.sql`

- **Objetivo:** usuarios por tenant.
- **Tablas:** `users`. FK `tenant_id → tenants(id) ON DELETE CASCADE`. `UNIQUE(tenant_id, email)`.
- **Índices:** `idx_users_tenant`, `idx_users_email`.
- **Problemas:** ninguno.
  Nota: el email no es único globalmente, solo por tenant. Es coherente con el modelo.

## 003 · `003_create_leads.sql`

- **Objetivo:** entidad central del dominio.
- **Tablas:** `leads`. FK a `tenants` con CASCADE. `UNIQUE(tenant_id, dedup_key)`.
- **Índices:** `idx_leads_tenant`, y cuatro compuestos con prefijo `tenant_id`
  (`_email`, `_status`, `_category`, `_created`).
- **Problemas:** ninguno bloqueante.
  `idx_leads_tenant(tenant_id)` es redundante: cualquiera de los compuestos sirve como prefijo
  izquierdo. Se retira en `014`.

## 004 · `004_create_scores.sql`

- **Objetivo:** histórico de puntuaciones de IA por lead.
- **Tablas:** `scores`. FK a `leads` y a `tenants`, ambas CASCADE.
- **Índices:** `idx_scores_lead`, `idx_scores_tenant`.
- **Problemas:** ninguno bloqueante. `idx_scores_tenant` no sirve a ninguna consulta del backend.

## 005 · `005_create_error_log.sql`

- **Objetivo:** registro de errores de automatización.
- **Tablas:** `error_log` (`SERIAL` PK). FK `tenant_id → tenants(id) ON DELETE SET NULL`.
- **Índices:** `idx_error_log_tenant`, `_created`, `_source`.
- **Problemas:** `created_at` es `BIGINT` (epoch ms) mientras el resto del esquema usa
  `TIMESTAMP`. Inconsistencia de tipo, no bloqueante; el backend la maneja.

## 006 · `006_create_settings.sql`

- **Objetivo:** configuración clave-valor por tenant.
- **Tablas:** `tenant_settings`. `UNIQUE(tenant_id, key)`.
- **Índices:** `idx_tenant_settings_tenant`.
- **Problemas:** ninguno.
  Nota de nomenclatura: la tabla se llama `tenant_settings`, no `settings`. En la base compartida
  con n8n existe además una tabla `settings` propia de n8n. Conviene no confundirlas.

## 007 · `007_create_workflow_runs.sql`

- **Objetivo:** trazas de ejecución de automatizaciones.
- **Tablas:** `workflow_runs`. FK a `tenants` con SET NULL.
- **Índices:** `idx_workflow_runs_tenant`, `_status`, `_started`.
- **Problemas:** ninguno. La columna temporal es `started_at` (relevante: `013_db_indexes`
  intentaba indexar un `created_at` inexistente).

## 008 · `008_create_audit_log.sql`

- **Objetivo:** rastro de auditoría.
- **Tablas:** `audit_log`. FK a `tenants` y a `users`, ambas SET NULL.
- **Índices:** `idx_audit_log_tenant`, `_user`, `_action`, `_created`.
- **Problemas:** ninguno.

## 009 · `009_create_lead_log.sql`

- **Objetivo:** log plano de leads procesados por n8n.
- **Tablas:** `lead_log` (`SERIAL` PK). FK a `tenants` con SET NULL.
- **Índices:** `idx_lead_log_email`, `_created`.
- **Problemas:** solapa parcialmente con `leads`. Es deuda de modelo, no un defecto de migración.

## 010 · `010_enable_rls.sql`

- **Objetivo:** aislamiento multi-tenant a nivel de motor.
- **Tablas:** habilita RLS en `leads`, `scores`, `workflow_runs`, `tenant_settings`, `error_log`,
  `lead_log`.
- **Políticas:** seis, `tenant_isolation_*`, todas
  `USING (tenant_id = current_setting('app.tenant_id')::UUID)`.
- **Funciones:** `set_tenant_id(UUID)`, `SECURITY DEFINER`, hace `set_config(..., true)`
  (ámbito de transacción).
- **Problemas:** ninguno bloqueante. Dos observaciones para fases posteriores:
  - Las políticas no llevan `WITH CHECK`, así que restringen lectura pero no impiden escribir una
    fila con `tenant_id` ajeno.
  - `users` y `tenants` no tienen RLS. Con el backend filtrando por `tenant_id` es funcional, pero
    la defensa en profundidad no cubre esas dos tablas.
  - RLS no aplica al propietario de las tablas salvo `FORCE ROW LEVEL SECURITY`; hoy el backend
    conecta como propietario, así que las políticas no le afectan.

---

## 011 · `011_hardening.sql` — **FALLABA**

- **Objetivo:** triggers de auditoría, integridad multi-tenant, enmascarado de logs.
- **Tablas afectadas:** `leads`, `users`, `tenants`, `workflow_runs`, `audit_log`, `error_log`,
  `scores`, `tenant_settings`.
- **Funciones:** `log_audit()` — inserta en `audit_log` desde un trigger.
- **Triggers:** `leads_audit`, `users_audit`, `tenants_audit`, `workflow_runs_audit`.
- **Índices:** 4 (dos de ellos colisionan por nombre con `013_db_indexes`).

### Problemas

| # | Gravedad | Problema |
|---|---|---|
| 1 | **Crítico** | Los cuatro triggers eran `BEFORE ... FOR EACH ROW` y `log_audit()` terminaba en `RETURN NULL`. En PostgreSQL eso **cancela la operación**. De haberse aplicado, todo `INSERT` en `leads`, `users`, `tenants` y `workflow_runs` se habría descartado en silencio, sin error. |
| 2 | **Crítico** | `log_audit()` leía `NEW.tenant_id`. La tabla `tenants` no tiene esa columna → `record "new" has no field "tenant_id"`. Bloqueaba permanentemente el alta de tenants, y con ella el seed del administrador y el login. |
| 3 | **Crítico** | Siete `CHECK (tenant_id IN (SELECT id FROM tenants))`. PostgreSQL rechaza subconsultas en `CHECK`: **este es el error que abortaba la migración** («cannot use subquery in check constraint», línea 70). |
| 4 | **Alto** | La migración no era transaccional. Al abortar en la línea 70, los pasos 1–2 ya habían commiteado: la base quedaba medio migrada, con los triggers rotos instalados. Ese es el mecanismo por el que un fallo de migración se convirtió en un bloqueo permanente del arranque. |
| 5 | **Alto** | `UNIQUE (workflow_id, message)` sobre `error_log`. Un error repetido es lo normal; el segundo registro violaba la restricción y hacía fallar al propio manejador de errores. |
| 6 | Medio | `log_audit()` no contemplaba `DELETE` (en ese caso `NEW` es NULL), pese a que `COALESCE(NEW.id, OLD.id)` revelaba la intención. |
| 7 | Bajo | `idx_leads_tenant_status` e `idx_leads_tenant_category` duplican índices de `003` y colisionan por nombre con `013_db_indexes`. |
| 8 | Bajo | `ALTER COLUMN stack_trace SET DEFAULT '[MASKED]'` solo cubre a quien omite la columna; no enmascara un valor entrante. |

---

## 012 · `012_db_roles.sql` — **FALLABA**

- **Objetivo:** roles de servicio con privilegio mínimo.
- **Permisos:** crea `app` y `admin`; `GRANT CONNECT`, `USAGE ON SCHEMA public`, CRUD sobre todas
  las tablas, `EXECUTE` sobre todas las funciones; `ALTER DEFAULT PRIVILEGES`;
  `REVOKE ALL ... FROM PUBLIC`.
- **Tablas / triggers / índices:** ninguno.

### Problemas

| # | Gravedad | Problema |
|---|---|---|
| 1 | **Crítico** | `GRANT USAGE ON SCHEMA pg_catalog, pg_temp TO PUBLIC;` — **error que abortaba la migración** («schema "pg_temp" does not exist»). `pg_temp` es un alias de sesión, no un esquema referenciable. La sentencia era además un no-op: `USAGE` sobre `pg_catalog` ya lo tiene `PUBLIC`. |
| 2 | **Alto** | Dos roles creados `WITH LOGIN PASSWORD` y la contraseña escrita literalmente en el fichero, en un repositorio público. Un rol con login y credencial conocida es lo contrario de un endurecimiento. |
| 3 | Alto | `ALTER SYSTEM SET log_connections / log_disconnections / log_line_prefix` — escribe en `postgresql.auto.conf`, afecta a todo el clúster, exige superusuario y necesita reload. No pertenece a una migración de esquema. |
| 4 | Medio | `REVOKE ... ON DATABASE postgres FROM pg_monitor / PUBLIC` — opera sobre **otra base de datos** del clúster. |
| 5 | Medio | El rol se llama `admin`: colisiona conceptualmente con la cuenta `admin` de la aplicación y con convenciones de otras herramientas del clúster. |
| 6 | Medio | Los roles no los usa nadie: el backend conecta con `POSTGRES_USER`, propietario del esquema. Sin migrar el backend, la reducción de privilegios es solo andamiaje. |
| 7 | Bajo | `COMMIT;` final sin `BEGIN` previo. |

---

## 013 · `013_db_hardening.sql` — **FALLABA** *(renombrado a `013_db_grants.sql`)*

- **Objetivo declarado:** roles y permisos. En la práctica, duplicado de `012`.

### Problemas

| # | Gravedad | Problema |
|---|---|---|
| 1 | **Crítico** | Fichero guardado con secuencias `\n` **literales** en lugar de saltos de línea. Como `--` comenta hasta el fin de línea *real*, la mayor parte del DDL quedaba dentro de comentarios y no se ejecutaba nunca. |
| 2 | **Crítico** | `EXECUTE format(...)` en SQL plano, fuera de un bloque `DO`. En SQL, `EXECUTE` invoca una sentencia preparada → **error que abortaba la migración**: «prepared statement "format" does not exist». |
| 3 | **Alto** | Duplicado de `012` en un ~90 %: mismos roles, mismas contraseñas literales, mismos `GRANT`, mismos `ALTER SYSTEM`. |
| 4 | **Alto** | Compartía el número `013` con `013_db_indexes.sql`. El orden de aplicación quedaba a merced del orden alfabético del glob. |
| 5 | Medio | `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA pg_catalog FROM app` — revocar sobre el catálogo rompe al cliente (psql, el driver y el planificador lo consultan en cada sesión) y no protege nada. |

---

## 014 · `013_db_indexes.sql` — **FALLABA** *(renumerado a `014_db_indexes.sql`)*

- **Objetivo:** consolidar índices sueltos en compuestos con prefijo `tenant_id`.
- **Índices:** ~13 `CREATE`, ~12 `DROP`.

### Problemas

| # | Gravedad | Problema |
|---|---|---|
| 1 | **Crítico** | `DROP INDEX <nombre> ON <tabla>` es sintaxis **MySQL**. En PostgreSQL los nombres de índice son únicos por esquema y la forma es `DROP INDEX [IF EXISTS] <nombre>`, sin tabla → **error que abortaba la migración**: «syntax error at or near "ON"». |
| 2 | **Crítico** | Mismo defecto de `\n` literales: 4 341 bytes en 9 líneas físicas. Casi todo el DDL era inerte. |
| 3 | **Alto** | Número `013` duplicado con `013_db_hardening.sql`. |
| 4 | **Alto** | `CREATE UNIQUE INDEX idx_audit_log_unique_composite ON audit_log(tenant_id, resource_id, action, created_at)`. `CURRENT_TIMESTAMP` es la marca de **inicio de transacción**: dos `UPDATE` sobre la misma fila dentro de una transacción generan la misma tupla y el segundo viola la unicidad. Como el trigger de auditoría es `AFTER` y comparte transacción, **aborta la operación de negocio**. Una tabla de auditoría no debe poder rechazar un hecho. |
| 5 | Medio | `CREATE INDEX ... ON workflow_runs(tenant_id, created_at DESC)` — la columna no existe; en `007` se llama `started_at`. |
| 6 | Bajo | `CREATE INDEX` sin `IF NOT EXISTS`: no reaplicable. |

---

## 015 · `014_db_validation.sql` — **FALLABA** *(renumerado a `015_db_validation.sql`)*

- **Objetivo:** verificar el endurecimiento (H-04).
- **Naturaleza:** bloques `DO $$` con aserciones.

### Problemas

| # | Gravedad | Problema |
|---|---|---|
| 1 | **Crítico** | `\n` literales. psql interpretaba `\n--` como metaorden → **error que abortaba la migración**: «invalid command \n». |
| 2 | **Alto** | `WHERE polname LIKE 'tenant_isolation%'` sobre la vista `pg_policies`. Esa vista expone `policyname`; `polname` es del catálogo `pg_policy`. |
| 3 | **Alto** | Insertaba filas de prueba en `lead_log` y `error_log` (`audit@example.com`, «Prueba de validación H-04») y las dejaba ahí. Una migración que corre en producción contaminaba tablas de datos. |
| 4 | **Alto** | La prueba del «tenant fantasma» hacía `RAISE EXCEPTION` dentro de un bloque cuyo `EXCEPTION WHEN OTHERS` capturaba también esa excepción: la verificación **pasaba siempre**, detectase o no el fallo. |
| 5 | Medio | `DECLARE log_id SERIAL` — `SERIAL` es un pseudotipo de DDL, no válido como tipo de variable PL/pgSQL. |
| 6 | Medio | `GET DIAGNOSTICS log_id = LAST_INSERTED_OID` — ese elemento no existe (válidos: `ROW_COUNT`, `RESULT_OID`, `PG_CONTEXT`). |
| 7 | Medio | `RAISE EXCEPTION '... esperados %% ...'` — en `RAISE`, `%%` es un literal por ciento, no un marcador de sustitución. |

---

## Observaciones transversales

1. **Ninguna de las cinco migraciones `011`–`014` llegó a ejecutarse jamás contra una base de
   datos.** Los cinco fallos son de sintaxis o de semántica básica de PostgreSQL, y aparecen en la
   primera ejecución.

2. **Ninguna migración era transaccional.** Sin `BEGIN`/`COMMIT`, `psql` commitea sentencia a
   sentencia: un fallo a mitad deja el esquema en un estado intermedio. Es lo que convirtió el
   error de `011` en un bloqueo permanente del arranque en lugar de un fallo limpio.

3. **El procedimiento de aplicación documentado es frágil.** `docs/deployment-guide.md` propone
   `cat database/migrations/*.sql | psql`, sin `ON_ERROR_STOP=1`: un fallo no detiene el flujo y
   el operador ve un código de salida 0. Recomendación: aplicar fichero a fichero con
   `-v ON_ERROR_STOP=1` y comprobar el código de salida de cada uno.

4. **No hay tabla de control de migraciones.** Nada registra qué se aplicó. La reparación deja las
   migraciones idempotentes (`IF EXISTS` / `IF NOT EXISTS` / `CREATE OR REPLACE`), lo que mitiga el
   problema pero no lo sustituye.
