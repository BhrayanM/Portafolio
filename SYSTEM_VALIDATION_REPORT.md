# System Validation Report

**Rama:** `release/v1-production-recovery` (`f354336`)
**Entorno:** Windows 11 · Docker 29.6.2 · Node 20 · PostgreSQL 15-alpine
**Fecha:** 2026-07-26

Todas las pruebas se ejecutaron contra la rama release, no contra `main`.

---

## 1. Backend (FASE D)

| CHECK | RESULTADO | ERROR | SOLUCIÓN |
|---|---|---|---|
| `npm ci` | ✅ exit 0 | — | — |
| Dependencias usadas vs declaradas | ✅ ninguna sin declarar | — | En `main` faltaban `stripe`, `express-rate-limit`, `amqplib` en `package.json`. v2 las declara |
| `node -e "require('./src/app.js')"` | ✅ **APP CARGA OK** | — | En `main`: `MODULE_NOT_FOUND './routes/apiKeys.routes'`. Resuelto al recuperar el subsistema |
| `src/routes/apiKeys.routes.js` | ✅ existe | — | — |
| `src/middleware/apiKey.js` | ✅ existe | — | — |
| `src/middleware/security.js` | ✅ existe **y montado** (`app.js:35 securityMiddleware(app)`) | — | En `main` existía sin invocarse: helmet CSP y los 3 rate limiters eran código muerto |
| `src/middleware/validate.js` | ✅ existe **y usado** vía `src/schemas/*.schema.js` | — | En `main` no se aplicaba en ninguna ruta |
| `src/config/index.js` | ✅ carga; fail-fast en producción | — | En `main`: `JWT_SECRET \|\| 'dev-secret-change-in-production'` |
| `src/docs/swagger.js` | ✅ existe | — | — |
| `npm run lint` (ESLint 9) | ✅ exit 0 | — | En `main`: exit 2, sin `eslint.config.js` |
| `npm test` | ✅ **98 passed / 98 · 6 suites** · 4.06 s | — | En `main`: 0 tests (`--passWithNoTests`) |

Rutas montadas verificadas en `app.js`: `/api/auth`, `/api/users`, `/api/leads`, `/api/tenants`,
`/api/keys`, `/api/billing`, `/api/whatsapp`, `/api/voice`, `/api/marketplace`, `/health`,
`/api-docs`. El webhook de Stripe se monta **antes** de `express.json()` con raw body — la
verificación de firma es posible (en `main` no lo era).

---

## 2. Frontend (FASE E)

| CHECK | RESULTADO | ERROR | SOLUCIÓN |
|---|---|---|---|
| `npm ci` | ✅ exit 0 | — | — |
| `frontend/src/lib/api.ts` existe | ✅ 138 líneas | — | **No existía en `main`** |
| `activityApi` exportado | ✅ `api.ts:130` | — | — |
| `settingsApi` exportado | ✅ `api.ts:121` | — | — |
| `usageApi` exportado | ✅ `api.ts:134` | — | — |
| Todos los imports `@/lib/api` y `@/lib/types` resuelven | ✅ 10/10 símbolos | — | `activityApi`, `apiFetch`, `authApi`, `billingApi`, `leadsApi`, `logout`, `settingsApi`, `usageApi`, `LEAD_CATEGORIES`, `LEAD_CATEGORY_LABEL` |
| `npx tsc --noEmit` (strict) | ✅ exit 0 | — | — |
| `npm run build` | ✅ exit 0 · **14 rutas** | — | — |

Rutas generadas: `/`, `/_not-found`, `/login`, `/dashboard`, `/dashboard/{activity, analytics,
billing, integrations, leads, marketplace, settings, usage}`. First Load JS compartido: 87.3 kB.

En `main` sólo existían 3 páginas de dashboard, dos de ellas placeholders («próximamente»), y el
Sidebar enlazaba a `/dashboard/leads`, que devolvía 404.

---

## 3. Docker e infraestructura (FASES F y G)

| CHECK | RESULTADO | ERROR | SOLUCIÓN |
|---|---|---|---|
| `docker compose config` (dev) | ✅ exit 0 | — | — |
| `docker compose -f docker-compose.prod.yml config` | ✅ 5 servicios | — | `postgres`, `portafolio-api`, `portafolio-frontend`, `n8n`, `nginx` |
| Build imagen backend | ✅ | — | v2 ya copiaba `package-lock.json`. En `main` fallaba: `npm ci` sin lockfile |
| Build imagen frontend | ❌ → ✅ | `failed to compute cache key: "/app/public": not found` (`Dockerfile:16`) | **Corregido**: `frontend/public/.gitkeep` (commit `f354336`). Rebuild en verde |
| Upstreams nginx ↔ servicios compose | ✅ 3/3 | — | `portafolio-api:3000`, `portafolio-frontend:3001`, `n8n:5678`. En `main` el tercero era `portafolio-n8n` → nginx abortaba al arrancar |
| Montaje de certificados TLS | ✅ `docker/ssl → /etc/nginx/ssl:ro` coincide con las rutas del `.conf` | — | En `main` el servicio no montaba certs y el `.conf` los buscaba en `/etc/ssl/certs` |
| `nginx -t` dentro de la red | ✅ *syntax is ok / test is successful* | — | — |
| Arranque del stack completo | ✅ 5/5 servicios up | — | `postgres` healthy, `portafolio-api` **healthy** |

**Aviso no bloqueante:** `the "listen ... http2" directive is deprecated` ×3 (nginx ≥ 1.25).
Sólo warning; el servidor arranca.

---

## 4. Base de datos — migraciones y seeds

Aplicadas con `psql -v ON_ERROR_STOP=1` sobre bases recién creadas.

| CHECK | RESULTADO | ERROR | SOLUCIÓN |
|---|---|---|---|
| `001_create_tenants.sql` … `010_enable_rls.sql` (10) | ✅ **10/10 OK** | — | — |
| RLS habilitada | ✅ en `leads`, `scores`, `error_log`, `lead_log`, `workflow_runs`, `tenant_settings` | — | — |
| `011_hardening.sql` | ❌ | `ERROR: cannot use subquery in check constraint` (línea 70) | `CHECK (tenant_id IN (SELECT id FROM tenants))` es ilegal en PostgreSQL. Debe ser una `FOREIGN KEY` |
| `012_db_roles.sql` | ❌ | `ERROR: schema "pg_temp" does not exist` (línea 70) | `GRANT USAGE ON SCHEMA pg_catalog, pg_temp TO PUBLIC` no es válido así |
| `013_db_hardening.sql` | ❌ | `ERROR: prepared statement "format" does not exist` | Fichero con `\n` escapados en lugar de saltos de línea reales |
| `013_db_indexes.sql` | ❌ | `ERROR: syntax error at or near "ON"` | Dos defectos: (a) `DROP INDEX … ON tabla` es sintaxis **MySQL**, en PostgreSQL es `DROP INDEX nombre`; (b) fichero en una sola línea con `\n` literales |
| `014_db_validation.sql` | ❌ | `invalid command \n--` | Mismo defecto de `\n` escapados |
| Numeración | ⚠️ | dos ficheros `013_*` | Orden de aplicación ambiguo |
| `seeds/001_admin_tenant.sql` (tras 001–014) | ❌ | `ERROR: record "new" has no field "tenant_id"` | Ver §4.1 |
| `seeds/002_admin_user.sql` (tras 001–014) | ❌ | `violates foreign key constraint "audit_log_tenant_id_fkey"` | Consecuencia del anterior |
| **`seeds/*` tras aplicar sólo 001–010** | ✅ **2/2 OK** · `tenants=1 users=1` | — | El sistema **sí** arranca con el esquema base |

### 4.1 Cadena de fallo aislada

`011_hardening.sql` no está envuelto en una transacción. `psql` ejecuta sentencia a sentencia:

1. Líneas 11–59: crea `log_audit()` y los triggers `leads_audit`, `users_audit`, `tenants_audit`
   → **commitean**.
2. Línea 70: `CHECK (tenant_id IN (SELECT id FROM tenants))` → **ERROR**, la migración aborta.
3. La base queda **medio migrada**: triggers instalados, constraints no.
4. `tenants_audit BEFORE INSERT ON tenants` ejecuta `log_audit()`, que lee `NEW.tenant_id`. La
   tabla `tenants` no tiene esa columna (su clave es `id`).
5. **Todo `INSERT INTO tenants` falla de forma permanente** → sin tenant → sin usuario admin →
   sin login posible.

Reproducido dos veces sobre bases limpias distintas. El resultado es idéntico.

**Conclusión:** las migraciones 011–014 nunca se ejecutaron contra una base de datos real. Se
escribieron y se dieron por buenas.

---

## 5. Smoke test end-to-end (FASE H)

Stack de producción completo levantado con certificados autofirmados de validación.

| CHECK | RESULTADO |
|---|---|
| `GET /health` directo en el contenedor | ✅ `{"status":"ok","version":"1.0.0","db":"connected"}` |
| `GET /health` **a través de nginx** (`Host: api.example.com`, TLS) | ✅ `status: ok`, `db: connected` |
| `GET /login` a través de nginx (`Host: example.com`) | ✅ HTTP 200 |
| Redirección HTTP → HTTPS | ✅ `301 → https://example.com/` |
| `GET /api/leads` sin token | ✅ **HTTP 401** — autenticación activa |
| `POST /api/auth/login` con payload inválido | ✅ **HTTP 400** — validación Joi activa |
| `POST /api/auth/login` credenciales erróneas | ✅ **HTTP 401** |
| `GET /api-docs/` | ✅ **HTTP 200** — Swagger sirviendo |
| Healthcheck del contenedor API | ✅ `healthy` |
| Cabeceras de seguridad | ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Server: nginx` sin versión, sin `X-Powered-By` |

**Observación menor:** HSTS, X-Frame-Options y nosniff se emiten **duplicados** (nginx `add_header`
+ helmet en la app). Sin impacto funcional; conviene dejar una sola fuente.

### Incidencia de configuración detectada

Con `.env` copiado literalmente de `.env.example`, el primer arranque devolvió
`{"status":"error","db":"disconnected"}`. Causa: `DB_HOST=localhost`, correcto fuera de Docker
(y así lo documenta el propio fichero) pero inválido dentro de la red de compose. Con
`DB_HOST=postgres` pasa a `ok`. No es un bug de código; sí es una trampa de despliegue, porque el
contenedor arranca y responde antes de que el healthcheck lo marque unhealthy.

---

## 6. Verificación del `.gitignore` (FASE C)

`git check-ignore -v` sobre cada ruta.

**Necesarios — deben estar accesibles: 10/10 ✅**

`database/migrations/001_create_tenants.sql` · `database/seeds/002_admin_user.sql` ·
`backend/src/routes/apiKeys.routes.js` · `backend/src/middleware/apiKey.js` ·
`frontend/src/lib/api.ts` · `frontend/src/app/dashboard/leads/page.tsx` ·
`.github/workflows/ci.yml` · `backend/eslint.config.js` · `backend/jest.config.js` · `SECURITY.md`

**Sensibles — deben estar bloqueados: 12/12 ✅**

`.env` · `.env.production` · `backend/.env` · `server.pem` · `private.key` · `credentials.json` ·
`n8n/workflows/lead-qualification.json` · `leads.csv` · `docker/ssl/privkey.pem` · `cookie.txt` ·
`backup.sql` · `dump.sql`

**Material interno — bloqueado tras la corrección: 6/6 ✅**

`CLAUDE.md` · `AGENTS.md` · `docs/HANDOFF.md` · `docs/fase-1/prompts/lead-scoring-system.md` ·
`docs/AUDITORIA_REALIDAD.md` · `docs/RELEASE_CHECKLIST.md`

**Públicos — siguen accesibles tras la corrección: 6/6 ✅**

`docs/ARQUITECTURA.md` · `docs/adr/README.md` · `docs/deployment-guide.md` ·
`docs/patterns/webhook-ai-crm-notify.md` · `database/migrations/010_enable_rls.sql` ·
`frontend/src/lib/api.ts`

---

## 7. Barrido de secretos sobre el historial completo

62 commits alcanzables desde `release/v1-production-recovery`:

| CHECK | RESULTADO |
|---|---|
| Tokens con prefijo (`sk-`, `xox*-`, `pat-`, `ghp_`, `AKIA`) | ✅ 0 coincidencias |
| Claves privadas PEM | ✅ 0 coincidencias |
| Cadenas de conexión PostgreSQL con credenciales embebidas | ✅ 0 coincidencias |
| Passwords en claro | ✅ sólo fixtures (`fixture-password-no-real`, `password-incorrecta`) |
| `.env` versionado en algún momento | ✅ ninguno |
| SHA citados como bloqueantes en `RELEASE_CHECKLIST.md` | ✅ **no existen** — historial ya reescrito |

---

## 8. Resultado consolidado

| Fase | Estado |
|---|---|
| D — Backend | ✅ arranca, lint limpio, 98/98 tests |
| E — Frontend | ✅ typecheck limpio, build 14 rutas, imports resueltos |
| F — Docker | ✅ tras corregir `frontend/public` |
| G — Infraestructura | ✅ upstreams, certificados, `nginx -t`, stack completo arriba |
| H — Smoke test | ✅ 10/10 comprobaciones end-to-end |
| C — `.gitignore` | ✅ 34/34 verificaciones |
| **Base de datos** | ⚠️ **001–010 + seeds OK · 011–014 fallan** |

**Un único bloqueante abierto: las migraciones 011–014.** Todo lo demás está en verde.
