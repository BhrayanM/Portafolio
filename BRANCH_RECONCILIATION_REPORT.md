# RECOVERY DIFF REPORT — FASE 21.2

**Comparación:** `main` (`f5f82b3`) ↔ `remediacion/v2` (`cd7a396`)
**Rama resultante:** `release/v1-production-recovery`
**Fecha:** 2026-07-26

---

## 1. Resumen cuantitativo

```
git diff main..remediacion/v2 --stat
  198 files changed, 14400 insertions(+), 5671 deletions(-)

git diff main..remediacion/v2 --name-status
  102  A   solo en remediacion/v2   (perdidos en la publicación)
   48  D   solo en main             (nunca llegaron a v2)
   48  M   en ambas, con contenido distinto
```

La rama publicada no es un subconjunto de la real ni al revés: **divergen en las dos
direcciones**. Recuperar v2 en crudo habría perdido 48 archivos, entre ellos toda la capa de
documentación de portfolio y el hook pre-commit.

---

## 2. Causa raíz confirmada

`main` es una rama **huérfana** (`public-release`, renombrada), creada con un commit inicial
squashed desde un árbol donde `.gitignore` excluía código de aplicación:

| Regla en `main` | Qué se tragó |
|---|---|
| `*apikey*`, `*api_key*` | `backend/src/routes/apiKeys.routes.js`, `backend/src/middleware/apiKey.js`, `apiKeys.controller.js`, `apiKeys.service.js` |
| `*.sql` (sin excepciones) | `database/migrations/*` (15), `database/seeds/*` (2) |
| `workflows/` **sin anclar** | `.github/workflows/ci.yml` — el CI real nunca existió en GitHub |
| `leads/` **sin anclar** | `frontend/src/app/dashboard/leads/` — la pantalla central del producto |
| `*secret*` | ficheros de configuración de test |

El propio `.gitignore` de `remediacion/v2` documenta el diagnóstico (nota «F22 R-06»). El commit
tope de esa rama es literalmente `fix(ci): track api keys files excluded by gitignore`: **la
corrección existía y nunca se propagó a la rama publicada.**

---

## 3. Archivos recuperados (102) — clasificación

### 3.1 NECESARIO PARA ARRANQUE — sin esto el sistema no corre

| Archivo | Efecto de su ausencia en `main` |
|---|---|
| `backend/src/routes/apiKeys.routes.js` | `app.js:10` lo requiere → `MODULE_NOT_FOUND`, **el proceso no arranca** |
| `backend/src/middleware/apiKey.js` | requerido por `combinedAuth.js` |
| `backend/src/controllers/apiKeys.controller.js` | — |
| `backend/src/services/apiKeys.service.js` | — |
| `database/migrations/*.sql` (15) | sin esquema: ninguna consulta del backend tiene tabla contra la que correr |
| `database/seeds/*.sql` (2) | sin tenant ni usuario admin: imposible iniciar sesión |
| `frontend/src/lib/api.ts` | capa HTTP completa (138 líneas, 8 clientes tipados) |
| `frontend/src/lib/types.ts` | DTOs del dominio (87 líneas) |
| `frontend/src/app/dashboard/leads/page.tsx` | pantalla central; el Sidebar de `main` enlazaba a un 404 |
| `frontend/src/app/dashboard/{activity,billing,integrations,marketplace,usage}/page.tsx` | 5 pantallas |
| `frontend/src/app/{error,not-found}.tsx`, `dashboard/error.tsx` | error boundaries |
| `backend/src/routes/{voice,whatsapp}.routes.js` + controllers + services | integraciones IA |
| `backend/src/lib/lead.js` | lógica de dominio de leads |
| `backend/eslint.config.js` | sin él `npm run lint` sale con **exit 2** |
| `backend/jest.config.js` | sin él no hay runner de tests |

### 3.2 NECESARIO PARA SEGURIDAD

| Archivo | Qué aporta |
|---|---|
| `backend/src/schemas/{auth,billing,lead}.schema.js` | validación Joi. En `main` `validate.js` existía y **no se usaba en ninguna ruta** |
| `backend/src/utils/authCookie.js` | JWT en cookie HttpOnly/Secure/SameSite. En `main` el token iba en `localStorage` |
| `backend/src/utils/redact.js` | redacción de datos sensibles en logs |
| `backend/src/middleware/requestId.js` | correlación de peticiones |
| `.github/workflows/ci.yml` | barrido de secretos **funcional** (ver §5) |
| `backend/tests/*.test.js` (6 suites) | 98 tests, incl. `security.test.js` y `auth.cookie.test.js` |

### 3.3 NECESARIO PARA DOCUMENTACIÓN

| Archivo | |
|---|---|
| `docs/ARQUITECTURA.md` | arquitectura real del sistema |
| `backend/src/docs/swagger.js` | OpenAPI servido en `/api-docs` — `main` lo prometía en el README sin implementarlo |
| `docker-compose.dev.yml`, `docker/nginx.dev.conf` | stack de desarrollo |

### 3.4 OPCIONAL / NO PUBLICABLE

| Archivo | Decisión |
|---|---|
| `backend/src/services/cache.service.js` | recuperado; sin consumidor hoy |
| `backend/src/controllers/metrics.controller.js` | recuperado; habilita `/metrics` |
| `docs/AUDITORIA_*.md`, `docs/REPORTE_FASE_*.md`, `docs/SPRINT*.md`, `docs/fase-*/`, `PROGRESO.md`, `HANDOFF.md` (41 ficheros) | **NO se publican** — ver §6 |
| `CLAUDE.md`, `AGENTS.md` | **NO se publican** — contienen IDs reales de credenciales |

---

## 4. Archivos exclusivos de `main` (48) — decisión tomada

### 4.1 Restaurados sobre la rama release (38)

Commit `2b216e8`.

- **Capa de portfolio (30):** `projects/lead-qualification/**` (docs, 4 SVG, 3 ejemplos),
  `projects/voice-receptionist/**`, `projects/whatsapp-ecommerce-agent/**`,
  `projects/examples/*.json` (los 3 workflows n8n sanitizados) + su README.
- **Seguridad (1):** `scripts/githooks/pre-commit` — el artefacto mejor construido del repositorio.
- **Documentación (3):** `ENGINEERING_NOTES.md`, `docs/deployment-guide.md`,
  `.github/profile/README.md`.
- **Contenido (6):** `linkedin/*.md`.

### 4.2 Descartados deliberadamente (10)

| Archivo | Motivo |
|---|---|
| `backend/src/app.billing.addendum.js`, `app.routes.addendum.js` | 2 líneas cada uno, `app.use()` sobre un `app` fuera de scope. Nadie los importa |
| `backend/src/middleware/combinedAuth.js` | usa `router` sin declararlo; requiere un módulo inexistente |
| `backend/src/middleware/auditLog.js` | correcto pero nunca montado; v2 audita vía trigger de BD |
| `backend/src/worker.js`, `backend/Dockerfile.worker` | consumidor RabbitMQ sin RabbitMQ en ningún compose; `ai_score` con `Math.random()` |
| `.github/workflows/{backend-test,frontend-build,security-scan}.yml` | superados por `ci.yml` de v2 (ver §5) |
| `CHANGELOG_AI.md` | bitácora de agente |

### 4.3 Archivos modificados (48) — se conserva la versión de v2

Se mantiene v2 en todos los casos. Los relevantes:

| Archivo | `main` | `remediacion/v2` |
|---|---|---|
| `backend/src/app.js` | 5 rutas, `helmet()` pelado, `cors()` wildcard | 9 rutas, `securityMiddleware(app)`, CORS con allowlist, `requestId`, swagger, webhook Stripe con raw body **antes** de `express.json()` |
| `backend/src/config/index.js` | `JWT_SECRET \|\| 'dev-secret-change-in-production'` | fail-fast en producción |
| `docker/nginx.conf` | upstream `portafolio-n8n` (inexistente), certs sin montar, sin headers, sin rate limit | upstream `n8n` correcto, `/etc/nginx/ssl`, HSTS + nosniff + DENY, `limit_req_zone` |
| `backend/Dockerfile` | `npm ci` sin copiar el lockfile → build roto | copia `package-lock.json`, imagen pineada a `node:20.20.2-alpine` |
| `.env.example` | sin `DB_HOST`, sin `CORS_ORIGINS`, sin `GROQ_API_KEY` | completo y documentado |
| `README.md` | 473 líneas; ~20 afirmaciones que el código no sostiene | 255 líneas alineadas con el sistema real |
| `projects/*/README.md` | 135–164 líneas | 254–270 líneas |

---

## 5. Por qué se descarta el CI de `main`

Los 3 workflows de `main` están **rotos por construcción**:

- `backend-test.yml` → `npm run lint` con ESLint 9 y **sin `eslint.config.js`** ⇒ exit 2, job
  siempre rojo. `npm test` es `jest --passWithNoTests` sobre **cero tests**.
- `security-scan.yml` → usa `grep --include='*.{js,ts,json,...}'`. **grep no expande llaves en
  `--include`**: busca un fichero llamado literalmente `*.{js,ts,...}` y no encuentra nada. El
  barrido siempre reportaba «No obvious secrets detected». Era decorativo.

`ci.yml` de v2 tiene `concurrency` con cancelación, lint real, 98 tests, typecheck, build con
`NEXT_PUBLIC_API_URL` inyectada, y un barrido de secretos que **itera `git ls-files`** con
descarte de placeholders — incluido un patrón para passwords en claro sin prefijo conocido, que
es justo lo que los patrones `sk-`/`xox-`/`ghp_` no detectan.

---

## 6. Riesgos encontrados

### R-1 · Material interno en la rama recuperada — **MITIGADO**

42 ficheros versionados en v2 no son publicables:

- **4 IDs reales de credenciales n8n** (PostgreSQL, LLM, Slack, HubSpot), el **ID del portal de
  HubSpot**, el **`vid` de un contacto real** creado durante las pruebas E2E,
  y rutas de workspace privado en `CLAUDE.md`, `AGENTS.md`,
  `docs/HANDOFF.md`, `docs/CIERRE_FASE.md`, `docs/AUDITORIA_*.md` (3), `docs/FASE20_DESPLIEGUE.md`,
  `docs/FASE21_AUDITORIA_FINAL.md`. → **SECURITY.md reglas 6 y 10.**
- **`docs/fase-1/prompts/lead-scoring-system.md`**: el system prompt de producción, descrito en
  su propia cabecera como «el núcleo intelectual del sistema». → **SECURITY.md regla 5.**
- 30 ficheros más de bitácora de proceso (auditorías, planes, reportes de fase).

**Mitigación aplicada** (commit `4cc796d`): `git rm --cached` + reglas en `.gitignore`. Los
ficheros permanecen en disco para trabajo local.

### R-2 · Bloqueante de credenciales del RELEASE_CHECKLIST — **OBSOLETO, verificado**

`docs/RELEASE_CHECKLIST.md` declara veredicto 🔴 BLOQUEADO por dos passwords en claro en los
commits `4779634`, `e0a9c99`, `cb543ee`, `6c5ab82`.

**Ninguno de esos SHA existe en este repositorio** (`git cat-file -t` → *Not a valid object
name*), ni tampoco la línea base `9748baa` que el documento cita. El historial ya fue reescrito.

Verificación empírica sobre los **62 commits** alcanzables desde la rama release:

```
git grep -E 'sk-…|xox…|pat-…|ghp_…|AKIA…|BEGIN PRIVATE KEY|postgres://user:pass@' $(git rev-list HEAD)
  → 0 coincidencias

git grep -E '(password|contraseña)["\' ]*[:=]["\' ]*[A-Za-z0-9!@#$%^&*_.-]{6,}' $(git rev-list HEAD)
  → solo fixtures: 'fixture-password-no-real', 'password-incorrecta', firmas de función

git log --diff-filter=A --name-only HEAD | grep -E '^\.env$'
  → ninguno
```

**El historial de `release/v1-production-recovery` está limpio.** El checklist es un documento
desactualizado; queda fuera de la publicación por R-1.

### R-3 · Migraciones 011–014 no aplican — **ABIERTO, bloqueante**

Ver `SMOKE_TEST_REPORT.md` §4. Las 5 migraciones de hardening de BD fallan contra PostgreSQL 15,
y `011_hardening.sql` deja la base **medio migrada** de forma que impide sembrar el tenant admin.
No se corrige en esta fase (fuera de alcance declarado).

### R-4 · `DB_HOST=localhost` por defecto rompe la ruta Docker — **ABIERTO, menor**

`.env.example` trae `DB_HOST=localhost` (correcto fuera de Docker, documentado en el propio
fichero). `docker-compose.prod.yml` usa `env_file: .env` sin sobreescribirlo, así que quien copie
`.env.example` tal cual obtiene un contenedor que arranca, responde, y devuelve
`{"status":"error","db":"disconnected"}` hasta que el healthcheck lo marca unhealthy.
Verificado y luego confirmado que con `DB_HOST=postgres` el `/health` pasa a `ok`.

### R-5 · Divergencia con `origin/main` — **INFORMATIVO**

`main` local está **7 commits por delante** de `origin/main` (`6ba4f57`), todos `docs(linkedin)`.
No afecta a la rama release, pero conviene tenerlo presente al planificar el reemplazo.

---

## 7. Trazabilidad

Ramas de respaldo creadas antes de tocar nada, ninguna eliminada:

```
backup-main-before-release-recovery              f5f82b3
backup-remediacion-v2-before-release-recovery    cd7a396
backup-complete-history                          90a0a35   (preexistente)
remediacion/fase-a                               e2f66f2   (preexistente)
remediacion/v2                                   cd7a396   (intacta)
main                                             f5f82b3   (intacta)
```

Sin squash, sin rebase, sin `reset --hard`, sin reescritura de historia. Los 62 commits de
`remediacion/v2` se conservan íntegros bajo `release/v1-production-recovery`.
