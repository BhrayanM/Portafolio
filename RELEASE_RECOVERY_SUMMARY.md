# Release Recovery Summary

**Fase:** 21.2 — Release Recovery & Production Alignment
**Rama candidata:** `release/v1-production-recovery`
**Base:** `remediacion/v2` (`cd7a396`, 62 commits) + 3 commits de recuperación
**Fecha:** 2026-07-26

---

## Problema encontrado

`main` no representaba la versión real del proyecto.

La rama publicada contenía una versión mutilada del sistema: el backend no arrancaba
(`MODULE_NOT_FOUND` al requerir `./routes/apiKeys.routes`), no había esquema de base de datos, no
había capa HTTP en el frontend, no había tests ni configuración de lint, y las dos imágenes Docker
fallaban al construir. Al mismo tiempo, el `README.md` describía con precisión un sistema
completo: RLS, cookies HttpOnly, API keys, OpenAPI, métricas, colas.

Ambas cosas eran ciertas a la vez. El sistema descrito existía —en `remediacion/v2`— pero nunca
llegó a publicarse. La documentación no exageraba sobre el sistema construido; describía un
sistema distinto del que se publicó.

| | `main` | `remediacion/v2` |
|---|---|---|
| Commits | 16 | 62 |
| Backend arranca | ❌ | ✅ |
| Tests | 0 | 98 |
| Migraciones SQL | 0 | 17 |
| Páginas de dashboard | 3 (2 stubs) | 10 |
| `frontend/src/lib/api.ts` | no existe | 138 líneas |
| Subsistema API Keys | no existe | completo |
| Build Docker | ❌ ×2 | ✅ (tras 1 fix) |

---

## Causa raíz

`.gitignore` bloqueó archivos críticos durante la publicación.

`main` es una rama **huérfana** creada con un commit squashed desde un árbol cuyo `.gitignore`
excluía código de aplicación. Cuatro reglas causaron la pérdida:

| Regla | Se tragó |
|---|---|
| `*apikey*`, `*api_key*` | los 4 archivos del subsistema de API Keys |
| `*.sql` sin excepciones | las 17 migraciones y seeds |
| `workflows/` **sin anclar** | `.github/workflows/ci.yml` — el CI real nunca existió en GitHub |
| `leads/` **sin anclar** | `frontend/src/app/dashboard/leads/` — la pantalla central del producto |

Un patrón de gitignore sin `/` inicial casa con cualquier directorio de ese nombre a cualquier
profundidad. `workflows/` no sólo protegía los exports de n8n: también borraba el pipeline de CI.

La corrección ya existía: el commit tope de `remediacion/v2` se titula literalmente
`fix(ci): track api keys files excluded by gitignore`. Nunca se propagó a la rama publicada.

---

## Recuperación realizada

### Archivos recuperados: 102 desde `remediacion/v2`

**Necesarios para arrancar (63):** subsistema API Keys completo (routes, controller, service,
middleware) · 15 migraciones + 2 seeds · `frontend/src/lib/api.ts` y `types.ts` · 7 páginas de
dashboard (`leads`, `activity`, `billing`, `integrations`, `marketplace`, `usage`) · error
boundaries (`error.tsx`, `not-found.tsx`) · rutas y servicios de voice y whatsapp ·
`eslint.config.js` · `jest.config.js`.

**Necesarios para seguridad (12):** schemas Joi de validación · `authCookie.js` (JWT en cookie
HttpOnly) · `redact.js` · `requestId.js` · `.github/workflows/ci.yml` · 6 suites de test (98 tests).

**Necesarios para documentación (4):** `docs/ARQUITECTURA.md` · `swagger.js` ·
`docker-compose.dev.yml` · `nginx.dev.conf`.

**Opcionales (23):** `cache.service.js` · `metrics.controller.js` · documentación de fases.

### Archivos restaurados desde `main`: 38

`remediacion/v2` tampoco era completa: 48 archivos existían sólo en `main`. Se recuperaron los que
aportan valor (commit `2b216e8`):

- Capa de portfolio completa: `projects/**` con documentación, 8 diagramas SVG, ejemplos JSON, y
  los 3 workflows n8n sanitizados de `projects/examples/`.
- `scripts/githooks/pre-commit` — el barrido de secretos local.
- `ENGINEERING_NOTES.md`, `docs/deployment-guide.md`, `.github/profile/README.md`, `linkedin/*`.

### Archivos descartados deliberadamente: 10

Código muerto o superado: los dos `*.addendum.js` (`app.use()` fuera de scope), `combinedAuth.js`
(usa `router` sin declararlo), `auditLog.js` (nunca montado), `worker.js` + `Dockerfile.worker`
(consumidor RabbitMQ sin RabbitMQ, con `ai_score` calculado por `Math.random()`), y los 3
workflows de CI de `main` — superados por `ci.yml` de v2, cuyo barrido de secretos sí funciona
(el de `main` usaba `grep --include='*.{js,ts,…}'`, que no expande llaves y no escaneaba nada).

### Material interno excluido de la publicación: 42 archivos

Commit `4cc796d`. `remediacion/v2` versionaba material no publicable:

- **IDs reales de credenciales n8n**, el ID del portal de HubSpot, el `vid` de un contacto real y
  rutas de workspace privado en `CLAUDE.md`, `AGENTS.md` y 6 documentos más → SECURITY.md reglas
  6 y 10.
- **`docs/fase-1/prompts/lead-scoring-system.md`**: el system prompt de producción, descrito en su
  propia cabecera como «el núcleo intelectual del sistema» → SECURITY.md regla 5.
- 33 documentos de bitácora interna (auditorías, planes de remediación, reportes de fase).

Se sacaron del índice con `git rm --cached`: siguen en disco para trabajo local.

### Corrección de publicación aplicada: 1

Commit `f354336` — `frontend/public/.gitkeep`. El Dockerfile hacía
`COPY --from=builder /app/public ./public` sobre un directorio inexistente; git no versiona
directorios vacíos y el build de la imagen fallaba. Es un defecto de empaquetado: se añade el
directorio en lugar de tocar el Dockerfile.

### `.gitignore`

`remediacion/v2` **ya traía corregidas** todas las reglas que causaron el incidente: `/n8n/workflows/`
y `/leads/` anclados, y excepciones explícitas `!database/migrations/*.sql` y
`!database/seeds/*.sql`. Sólo se añadió el bloque de contexto de agente y bitácora interna que sí
tenía `main`.

---

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `npm ci` backend | ✅ exit 0 |
| Dependencias usadas vs declaradas | ✅ ninguna sin declarar |
| `node -e "require('./src/app.js')"` | ✅ **la app carga** |
| `npm run lint` (ESLint 9) | ✅ exit 0 |
| `npm test` | ✅ **98 passed / 98** · 6 suites |
| `npm ci` frontend | ✅ exit 0 |
| `activityApi` / `settingsApi` / `usageApi` | ✅ existen y resuelven |
| Todos los imports `@/lib/*` | ✅ 10/10 símbolos resueltos |
| `npx tsc --noEmit` (strict) | ✅ exit 0 |
| `npm run build` | ✅ **14 rutas** generadas |
| `docker compose config` (dev y prod) | ✅ válidos |
| `docker compose build` | ✅ tras corregir `frontend/public` |
| Upstreams nginx ↔ servicios | ✅ 3/3 |
| `nginx -t` en la red de compose | ✅ *test is successful* |
| Stack completo arriba | ✅ 5/5 servicios · API `healthy` |
| `GET /health` vía nginx TLS | ✅ `status: ok`, `db: connected` |
| `GET /login` vía nginx | ✅ HTTP 200 |
| Redirección HTTP → HTTPS | ✅ 301 |
| `GET /api/leads` sin token | ✅ HTTP 401 |
| `POST /api/auth/login` inválido / erróneo | ✅ HTTP 400 / 401 |
| `GET /api-docs/` | ✅ HTTP 200 |
| Cabeceras de seguridad | ✅ HSTS, X-Frame-Options DENY, nosniff, sin `X-Powered-By` |
| `git check-ignore` | ✅ 34/34 |
| Barrido de secretos en 62 commits | ✅ 0 hallazgos |
| Migraciones 001–010 + seeds | ✅ 12/12 · `tenants=1 users=1` |
| Migraciones 011–014 | ❌ **5/5 fallan** |

Detalle completo en `SMOKE_TEST_REPORT.md`.

---

## Estado final

### READY WITH FIXES

La recuperación cumplió su objetivo: **el sistema arranca, se construye, se despliega y responde
end-to-end**. De los 11 hallazgos críticos de la auditoría FASE 21, la rama release resuelve 10
sin escribir código nuevo — estaban ya resueltos en `remediacion/v2` y sólo hacía falta
publicarlos.

Queda **un bloqueante**, descubierto por el smoke test y no por la auditoría documental:

> **Las migraciones 011–014 no aplican contra PostgreSQL 15, y `011_hardening.sql` deja la base
> medio migrada de forma que impide sembrar el tenant administrador.**

`011` no está envuelto en una transacción: crea la función `log_audit()` y tres triggers, y
después falla en un `CHECK (tenant_id IN (SELECT id FROM tenants))`, que PostgreSQL no permite.
Los triggers quedan instalados. `tenants_audit` invoca `log_audit()`, que lee `NEW.tenant_id` —
columna que la tabla `tenants` no tiene. A partir de ahí, **todo `INSERT INTO tenants` falla de
forma permanente**: sin tenant no hay usuario admin, y sin usuario admin no hay login.

Los otros cuatro fallos son independientes: `012` hace un `GRANT` inválido sobre `pg_temp`;
`013_db_indexes` usa `DROP INDEX … ON tabla`, que es sintaxis MySQL; y `013_db_indexes` y `014`
están guardados en una sola línea con `\n` escapados en lugar de saltos de línea reales. Además
hay dos ficheros numerados `013`, lo que deja el orden de aplicación ambiguo.

Estas cinco migraciones nunca se ejecutaron contra una base de datos. Se escribieron y se dieron
por buenas.

**El alcance del daño está acotado:** aplicando sólo `001`–`010` el sistema arranca completo, con
RLS habilitada en las seis tablas multi-tenant y los seeds funcionando (`tenants=1 users=1`).
Verificado dos veces sobre bases limpias.

### Lo que esta fase no tocó, por diseño

No se corrigieron las migraciones, ni los tres bugs de los workflows n8n, ni el `DB_HOST` por
defecto, ni la duplicación de cabeceras de seguridad, ni el aviso de `listen … http2` deprecado.
El encargo era recuperar y validar, no endurecer.

### Antes del merge a `main`

1. **Arreglar `011`–`014`** (bloqueante). Mínimo: envolver cada migración en `BEGIN/COMMIT`,
   sustituir el `CHECK` con subconsulta por una `FOREIGN KEY`, reescribir los dos ficheros con
   saltos de línea reales, corregir la sintaxis MySQL, y renumerar el `013` duplicado.
2. **Verificar el ciclo completo** con `001`–`014` + seeds sobre una base limpia.
3. **Decidir sobre `origin/main`**, que está 7 commits por detrás del `main` local (todos
   `docs(linkedin)`).
4. **Revisar el README de v2** (255 líneas) contra el sistema recuperado antes de publicarlo.

No se ha hecho merge a `main`. `release/v1-production-recovery` queda como candidata oficial.
