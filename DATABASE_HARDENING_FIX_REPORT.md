# DATABASE HARDENING FIX REPORT — FASE 21.3

**Rama:** `release/v1-production-recovery`
**Motor de validación:** PostgreSQL 15.18 (`postgres:15.18-alpine`) sobre Docker 29.6.2
**Fecha:** 2026-07-26
**Resultado:** `001`–`015` + seeds aplican con **EXIT CODE 0**

---

## 1. Causa raíz

Las cinco migraciones de endurecimiento de F19(c) **nunca se ejecutaron contra una base de
datos**. Se escribieron, se documentaron como completas en `docs/FASE19_SECURITY_HARDENING.md`
(«Estado: COMPLETO ✅») y se dieron por buenas. Los cinco fallos son de sintaxis o de semántica
elemental de PostgreSQL: aparecen en el primer segundo de la primera ejecución.

Hay tres causas encadenadas.

**1 · Los ficheros se generaron con `\n` escapados en lugar de saltos de línea reales.**
`013_db_indexes.sql` ocupaba 4 341 bytes en 9 líneas físicas. Como `--` comenta hasta el fin de
línea *real*, la mayor parte del DDL quedaba absorbida dentro de comentarios y jamás se ejecutaba.
Lo poco que asomaba, lo hacía en mitad de una sentencia. Afectaba a `013_db_hardening.sql`,
`013_db_indexes.sql` y `014_db_validation.sql`.

**2 · Se escribió SQL de otro motor y construcciones inválidas.**
`DROP INDEX <nombre> ON <tabla>` es MySQL. `CHECK (col IN (SELECT ...))` no existe en PostgreSQL.
`GRANT ... ON SCHEMA pg_temp` referencia un alias de sesión, no un esquema. `EXECUTE format(...)`
en SQL plano invoca una sentencia preparada, no ejecuta SQL dinámico.

**3 · Ninguna migración era transaccional, y eso convirtió un fallo en un bloqueo.**
Sin `BEGIN`/`COMMIT`, `psql` commitea sentencia a sentencia. `011_hardening.sql` creaba
`log_audit()` y cuatro triggers —que commiteaban— y **después** fallaba en el `CHECK` con
subconsulta. La base quedaba medio migrada: triggers instalados, restricciones no. Y el trigger
`tenants_audit` invocaba `log_audit()`, que leía `NEW.tenant_id`, columna que `tenants` no tiene.

A partir de ahí, **todo `INSERT INTO tenants` fallaba de forma permanente**: sin tenant no había
usuario administrador, y sin él no había login. Un error de sintaxis en una migración de
endurecimiento acabó impidiendo arrancar el producto.

### El defecto más grave no era el que rompía la migración

`011` declaraba los cuatro triggers de auditoría como `BEFORE ... FOR EACH ROW`, y `log_audit()`
terminaba en `RETURN NULL`. **En PostgreSQL, un trigger `BEFORE` de fila que devuelve NULL cancela
la operación.** Si el `CHECK` hubiera sido válido y la migración hubiera aplicado por completo,
cada `INSERT` en `leads`, `users`, `tenants` y `workflow_runs` se habría descartado **en silencio,
sin error**: la API respondería 201 y no se guardaría nada.

El fallo de sintaxis fue, en la práctica, lo que evitó que se desplegara una pérdida silenciosa de
datos.

---

## 2. Archivos modificados

| Antes | Después | Operación |
|---|---|---|
| `011_hardening.sql` | `011_hardening.sql` | reescrito |
| `012_db_roles.sql` | `012_db_roles.sql` | reescrito |
| `013_db_hardening.sql` | `013_db_grants.sql` | `git mv` + reescrito |
| `013_db_indexes.sql` | `014_db_indexes.sql` | `git mv` + reescrito |
| `014_db_validation.sql` | `015_db_validation.sql` | `git mv` + reescrito |

`001`–`010` **no se han tocado**. Ninguna tabla base se ha modificado: no hay `ALTER TABLE` sobre
columnas, tipos ni claves salvo el `SET DEFAULT` de enmascarado que ya estaba previsto en `011`.

### Nota sobre la numeración

El encargo pedía `001`–`017`. El repositorio contiene **15 migraciones**, con dos ficheros
compartiendo el número `013` — lo que dejaba su orden de aplicación a merced del orden alfabético
del glob. Renumerar para eliminar el duplicado da una secuencia única y sin huecos de `001` a
`015`. No he inventado dos migraciones para llegar a 017; si esperabas `016` y `017` por algo
concreto, dime qué debían contener.

---

## 3. Antes / después

### 3.1 · `011_hardening.sql` — auditoría

**Antes**

```sql
INSERT INTO audit_log (tenant_id, ...) VALUES (
  NEW.tenant_id,                       -- rompe en `tenants`: no existe esa columna
  ...
  COALESCE(NEW.id::text, OLD.id::text) -- NEW es NULL en DELETE
);
RETURN NULL;

CREATE TRIGGER leads_audit BEFORE INSERT OR UPDATE ON leads   -- BEFORE + RETURN NULL
FOR EACH ROW EXECUTE FUNCTION log_audit();                    -- = cancela el INSERT
```

**Después**

```sql
IF TG_OP = 'DELETE' THEN rec := to_jsonb(OLD); ELSE rec := to_jsonb(NEW); END IF;
audit_res_id := rec->>'id';

IF TG_TABLE_NAME = 'tenants' THEN
  audit_tenant := audit_res_id::UUID;                  -- el tenant es la propia fila
ELSE
  audit_tenant := NULLIF(rec->>'tenant_id', '')::UUID; -- NULL si no existe, no aborta
END IF;

CREATE TRIGGER leads_audit AFTER INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION log_audit();
```

`to_jsonb(rec)->>'campo'` devuelve `NULL` cuando la columna no existe, en lugar de abortar. Es lo
que permite una sola función de auditoría para tablas con esquemas distintos.

### 3.2 · `011_hardening.sql` — integridad multi-tenant

**Antes** — siete constraints ilegales:

```sql
ALTER TABLE users ADD CONSTRAINT users_tenant_must_exist
  CHECK (tenant_id IN (SELECT id FROM tenants));   -- ERROR: cannot use subquery
```

**Después** — retiradas, con la justificación en el fichero. La garantía que se buscaba ya la dan
las claves foráneas de `001`–`009`, y la dan **mejor**: un `CHECK` solo se evalúa sobre la fila que
se escribe, así que ni siquiera detectaría el borrado posterior del tenant referenciado. Sería una
garantía aparente. Las siete FK (`users`, `leads`, `scores`, `error_log`, `tenant_settings`,
`workflow_runs`, `audit_log` → `tenants(id)`) cubren ese caso y se verifican explícitamente en
`015`.

**No se ha eliminado seguridad: se ha sustituido una comprobación imposible por la que ya estaba
en vigor, y se ha añadido una aserción que falla si alguna FK desaparece.**

### 3.3 · `011_hardening.sql` — restricción retirada

```sql
-- Antes
ALTER TABLE error_log ADD CONSTRAINT uk_error_log_unique UNIQUE (workflow_id, message);
```

Un error que se repite es el caso normal, no una anomalía. Con esa restricción, el segundo
registro del mismo fallo viola la unicidad y **el manejador de errores falla al registrar el
error**. Retirada.

### 3.4 · `012_db_roles.sql` — permisos

**Antes**

```sql
EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD ''%s''', app_user,
               'changeme_service_credentials_change_in_prod');
...
GRANT USAGE ON SCHEMA pg_catalog, pg_temp TO PUBLIC;        -- ERROR: no existe pg_temp
ALTER SYSTEM SET log_connections = on;                      -- alcance: todo el clúster
REVOKE ALL PRIVILEGES ON DATABASE postgres FROM PUBLIC;     -- otra base de datos
```

**Después**

```sql
CREATE ROLE app       NOLOGIN;
CREATE ROLE app_admin NOLOGIN;
```

Tres cambios de criterio:

- **Credenciales fuera del repositorio.** Un rol con `LOGIN` y contraseña escrita en un repo
  público es una puerta abierta, no un endurecimiento. Los roles se crean `NOLOGIN` con los
  `GRANT` ya preparados; habilitarlos en el despliegue es una sentencia:
  `ALTER ROLE app LOGIN PASSWORD '<generada>';`
- **`admin` → `app_admin`.** El nombre genérico colisiona con la cuenta `admin` de la aplicación y
  con convenciones de otras herramientas sobre el mismo clúster.
- **`ALTER SYSTEM` y el `REVOKE` cruzado, retirados.** Modifican el clúster completo y otra base de
  datos. Corresponden a la configuración del servidor, no a una migración de esquema.

Se añade lo que faltaba: `GRANT` sobre secuencias (sin él, `SERIAL` de `error_log`, `lead_log` y
`tenant_settings` no funciona para el rol `app`) y `REVOKE ALL ON SCHEMA public FROM PUBLIC`.

### 3.5 · `013_db_grants.sql`

Era un duplicado corrupto de `012` en un ~90 %. Se conserva únicamente lo que aportaba de más: el
`GRANT EXECUTE` nominal sobre `set_tenant_id(UUID)` y los atributos de rol, entre ellos
**`NOBYPASSRLS`** — el atributo que de verdad importa aquí, porque un rol con `BYPASSRLS` leería
todos los tenants ignorando las políticas de `010`.

Retirado el `REVOKE ... IN SCHEMA pg_catalog FROM app`: revocar sobre el catálogo rompe al propio
cliente (psql, el driver `pg` y el planificador lo consultan en cada sesión) y no protege nada,
porque los catálogos ya filtran por visibilidad del rol.

### 3.6 · `014_db_indexes.sql`

**Antes**

```sql
DROP INDEX IF EXISTS idx_leads_tenant ON leads;   -- sintaxis MySQL
CREATE INDEX idx_workflow_runs_tenant_started_at ON workflow_runs(tenant_id, created_at DESC);
                                                  -- columna inexistente: es started_at
CREATE UNIQUE INDEX idx_audit_log_unique_composite
  ON audit_log(tenant_id, resource_id, action, created_at);
```

**Después**

```sql
DROP INDEX IF EXISTS idx_leads_tenant;            -- forma correcta en PostgreSQL
CREATE INDEX IF NOT EXISTS idx_workflow_runs_tenant_started_at
  ON workflow_runs(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created_at
  ON audit_log(tenant_id, created_at DESC);       -- ya no UNIQUE
```

Sobre el índice único retirado: `CURRENT_TIMESTAMP` en PostgreSQL es la marca de **inicio de
transacción**, idéntica para todo lo que ocurra dentro de ella. Dos `UPDATE` sobre la misma fila en
una transacción producen la misma tupla `(tenant_id, resource_id, 'UPDATE', created_at)` y el
segundo viola la unicidad. Como el trigger de auditoría es `AFTER` y comparte transacción, eso
**aborta la operación de negocio**. Una tabla de auditoría registra hechos; no debe poder rechazar
uno.

### 3.7 · `015_db_validation.sql`

Reescrito como verificación **de solo lectura** sobre el catálogo del sistema. La versión anterior
insertaba filas de prueba en `lead_log` y `error_log` y las dejaba ahí: una migración que se
ejecuta en producción contaminaba tablas de datos.

Corregidos además cuatro errores de PL/pgSQL que la habrían impedido ejecutar igualmente:
`pg_policies.polname` → `policyname`; `%%` → `%` en `RAISE`; `DECLARE log_id SERIAL` (pseudotipo no
válido como variable); y `GET DIAGNOSTICS ... LAST_INSERTED_OID` (elemento inexistente).

También se corrigió una verificación que **no podía fallar**: la prueba del «tenant fantasma»
hacía `RAISE EXCEPTION` dentro de un bloque cuyo `EXCEPTION WHEN OTHERS` capturaba esa misma
excepción, así que pasaba siempre.

Las seis aserciones actuales:

| # | Comprueba |
|---|---|
| 1 | Existen 6 políticas RLS `tenant_isolation_*` |
| 2 | RLS habilitada en las 6 tablas multi-tenant |
| 3 | Existen las 7 FK `tenant_id → tenants(id)` |
| 4 | Los 4 triggers de auditoría existen **y son `AFTER`** (`tgtype & 2 = 0`) |
| 5 | `error_log.stack_trace` tiene default enmascarado |
| 6 | Los roles `app` y `app_admin` existen y **no** tienen `BYPASSRLS` |

La aserción 4 es la que impide que el defecto original vuelva a entrar: si alguien redeclara un
trigger de auditoría como `BEFORE`, la migración falla en el despliegue.

---

## 4. Comandos ejecutados

Arnés de validación: crea la base desde cero, aplica fichero a fichero con `ON_ERROR_STOP=1` y
comprueba el **código de salida real** de cada `psql` (no el texto de salida).

```bash
docker compose -f docker-compose.prod.yml up -d postgres

psql -U n8n -d postgres -c "DROP DATABASE IF EXISTS mig_full;" -c "CREATE DATABASE mig_full;"

for f in database/migrations/*.sql; do
  psql -U n8n -d mig_full -v ON_ERROR_STOP=1 -q < "$f" || fail=1
done
for f in database/seeds/*.sql; do
  psql -U n8n -d mig_full -v ON_ERROR_STOP=1 -q < "$f" || fail=1
done
```

Durante la primera pasada de FASE B detecté que un grep sobre la salida daba **falsos positivos**
(el contenedor no había arrancado y el error de compose no casaba con el patrón `^ERROR`). Todos
los resultados de abajo se obtuvieron ya con verificación de exit code.

---

## 5. Resultado final

### 5.1 · Cadena completa sobre base limpia — FASE E

```
  OK    001_create_tenants.sql        OK    009_create_lead_log.sql
  OK    002_create_users.sql          OK    010_enable_rls.sql
  OK    003_create_leads.sql          OK    011_hardening.sql
  OK    004_create_scores.sql         OK    012_db_roles.sql
  OK    005_create_error_log.sql      OK    013_db_grants.sql
  OK    006_create_settings.sql       OK    014_db_indexes.sql
  OK    007_create_workflow_runs.sql  OK    015_db_validation.sql
  OK    008_create_audit_log.sql
--- seeds ---
  OK    001_admin_tenant.sql
  OK    002_admin_user.sql
--- verificacion ---
tenants=1 users=1 audit_log=2
EXIT_CODE_GLOBAL=0
```

`audit_log=2` no es decorativo: prueba que los triggers reparados **disparan de verdad** (alta del
tenant + alta del usuario). Antes, ese mismo trigger impedía crear el tenant.

### 5.2 · Aserciones de `015`

```
NOTICE:  H-04 OK: 6 politicas RLS de aislamiento por tenant
NOTICE:  H-04 OK: RLS habilitada en las 6 tablas multi-tenant
NOTICE:  H-04 OK: 7 claves foraneas tenant_id -> tenants(id)
NOTICE:  H-04 OK: 4 triggers de auditoria AFTER activos
NOTICE:  H-04 OK: error_log.stack_trace enmascarado por defecto
NOTICE:  H-04 OK: roles app y app_admin presentes, sin BYPASSRLS
NOTICE:  H-04 COMPLETO: 6 verificaciones superadas
```

### 5.3 · Prueba negativa

Una verificación que no puede fallar no verifica nada. Redeclarando un trigger como `BEFORE`:

```
ERROR:  H-04 FALLIDO: triggers de auditoria ausentes o declarados BEFORE: leads_audit
```

Reaplicando `011` y `015`, vuelve a exit 0.

### 5.4 · Idempotencia

Reaplicar `011`–`015` sobre una base ya migrada: **5 de 5 en exit 0**. Todas usan
`CREATE OR REPLACE`, `DROP ... IF EXISTS` y `CREATE ... IF NOT EXISTS`.

### 5.5 · Sistema completo — FASE F

Stack de producción levantado (5 servicios) contra la base con las 15 migraciones y los seeds:

| Prueba | Resultado |
|---|---|
| `GET /health` vía nginx TLS | ✅ `{"status":"ok","db":"connected"}` |
| `GET /api-docs/` | ✅ HTTP 200 |
| `POST /api/auth/login` | ✅ HTTP 200 · cookie `access_token` marcada **HttpOnly** |
| `POST /api/leads` | ✅ **HTTP 201** · lead creado con UUID y `tenant_id` correcto |
| `GET /api/leads?limit=5` | ✅ HTTP 200 · devuelve el lead |
| `GET /api/leads/:id` | ✅ HTTP 200 |
| `GET /api/leads/stats` | ✅ `{"total":1,"new":1,"cold":1,"today":1}` |
| Auditoría en el sistema real | ✅ 4 entradas: `INSERT tenants`, `INSERT users` ×2, `INSERT leads`, todas con `tenant_id` correcto |
| Tests backend | ✅ **98 passed / 98** · 6 suites |

El login usó un usuario de prueba creado en la base efímera con un hash generado al vuelo: la
contraseña del seed `admin@portafolio.ai` no está en el repositorio ni en su historial, y así debe
seguir.

Al terminar: `docker compose down -v`, y borrados `.env` y `docker/ssl` de validación.

---

## 6. Estado

**Cerrada.** El bloqueante que quedaba abierto en `RELEASE_RECOVERY_SUMMARY.md` está resuelto y
verificado end-to-end.

```
database limpia + 001–015 + seeds + tests = PASS
```

Sin merge a `main`. La rama `release/v1-production-recovery` sigue siendo la candidata.

### Pendiente, fuera del alcance de esta fase

1. **El backend conecta como propietario del esquema**, no como `app`. Hasta que se migre, los
   roles de `012`/`013` son andamiaje y RLS no se aplica al backend (las políticas no afectan al
   propietario salvo `FORCE ROW LEVEL SECURITY`).
2. **Las políticas RLS de `010` no llevan `WITH CHECK`**: restringen la lectura, pero no impiden
   escribir una fila con `tenant_id` ajeno.
3. **`users` y `tenants` no tienen RLS.**
4. **No hay tabla de control de migraciones.** La idempotencia lo mitiga; no lo sustituye.
5. **`docs/deployment-guide.md` sigue documentando** `cat database/migrations/*.sql | psql`, sin
   `ON_ERROR_STOP=1`. Ese procedimiento es el que permitió que F19(c) se cerrara sin ejecutar
   nada: un fallo no detiene el flujo y el operador ve código de salida 0.
6. **`ALTER SYSTEM SET log_connections / log_disconnections / log_line_prefix`**, retirados de las
   migraciones, deben ir a la configuración del servidor si se quiere ese logging.
