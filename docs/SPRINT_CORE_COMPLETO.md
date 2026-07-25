# Sprint Core — bloques A-D

Fecha: 2026-07-25 · Rama `remediacion/v2` · Los 4 bloques cerrados, un commit por bloque.

Objetivo: avanzar **todo lo que no depende** de OpenAI, Slack, HubSpot ni Stripe.
No se creó ningún mock ni stub de esas APIs.

| Bloque | Commit | Estado |
|---|---|---|
| A — Fixes del checklist de producción | `9a241f2` | ✅ |
| B — Auth HttpOnly | `cb543ee` | ✅ |
| C — Tests sin APIs externas | `e4240d7` | ✅ |
| D — CI/CD | `5ca3fd4` | ✅ |

---

## BLOQUE A — Fixes del checklist de producción

### `scripts/backup.sh` apuntaba a un contenedor inexistente

`DB_CONTAINER="portafolio-postgres-1"`; el real es `portafolio-publico-postgres-1`.
El backup fallaba siempre. El nombre lo prefija docker compose a partir del directorio del
proyecto, así que fijarlo a mano se rompe al renombrar la carpeta → **ahora se autodetecta**,
con override por `DB_CONTAINER`.

**Segundo hallazgo, no pedido:** el script copiaba `.env` **en claro** a `./backups` en cada
ejecución. El comentario decía "cifrado simbólico — b64 ofuscado" pero era un `cp` plano, así
que las API keys quedaban legibles en disco. Ahora es **opt-in** (`BACKUP_ENV=1`) y con `chmod 600`.

**Evidencia:**

```
[INFO] Contenedor: portafolio-publico-postgres-1 · base: n8n
[INFO] DB backup: ./backups/db_20260725_060025.sql.gz
[INFO] Omitido .env (usa BACKUP_ENV=1 para incluirlo).
```

Dump de 95 KB, 246 sentencias `CREATE TABLE`/`COPY`, con `lead_log`, `error_log`, `tenants`,
`users` y `leads`.

**Restauración probada** (un backup sin restore verificado no es un backup) — restaurado en
una base desechable y luego eliminada:

```
errores de restore: 0
 lead_log | error_log | tablas
----------+-----------+--------
        1 |        10 |    123
```

### `certs/` no existía pese a lo que decía la documentación

`VALIDACION_RUNTIME.md` daba SSL por funcional. **El directorio no existe.** No se inventaron
certificados: se corrigió el documento. `docker/nginx.conf` espera
`/etc/ssl/certs/fullchain.pem` y `/etc/ssl/private/privkey.pem`, que nadie provee, y el servicio
`nginx` solo está definido en `docker-compose.prod.yml` y nunca se ha levantado.

---

## BLOQUE B — Auth HttpOnly

El JWT se guardaba en `localStorage`, donde cualquier XSS podía leerlo. Ahora viaja en una
cookie **HttpOnly** que el JavaScript de la página no puede tocar.

**Backend**

- `src/utils/authCookie.js` — `setAuthCookie` / `clearAuthCookie` / `extractToken`.
  `httpOnly` siempre; `secure` solo en producción (en local no hay TLS y el navegador
  descartaría la cookie); `sameSite` y `maxAge` configurables.
- El login **ya no devuelve el token en el cuerpo**: responde `{user}` y emite `Set-Cookie`.
- Nuevo `POST /api/auth/logout`: la cookie es HttpOnly, solo el backend puede borrarla.
- `middleware/auth.js` lee la cookie primero y acepta `Authorization: Bearer` como respaldo
  para clientes no-navegador (scripts, integraciones).
- `app.js`: `cookie-parser` + CORS con origen explícito y `credentials: true` — con cookies
  el comodín `*` no es válido.
- `rateLimit.js`: el limitador de login (5 intentos/15 min) se desactiva bajo `NODE_ENV=test`
  y su máximo es configurable. Sin esto, la sexta petición de la suite devolvía 429.

**Frontend**

- Nuevo `src/lib/api.ts` con `credentials: 'include'` y manejo de error homogéneo.
- Eliminado **todo** uso de `localStorage` para el token (login, layout, dashboard, leads, Header).
- La sesión se comprueba preguntando a `/auth/me`: ya no hay token inspeccionable desde JS.

**Evidencia** — `Set-Cookie` real del backend en marcha (JWT redactado):

```
HTTP/1.1 200 OK
Set-Cookie: access_token=<JWT>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
{"user":{"email":"admin@portafolio.ai","role":"admin", ...}}
```

| Comprobación | Resultado |
|---|---|
| `/auth/me` con cookie | 200 |
| `/auth/me` sin cookie | 401 |
| `POST /auth/logout` | 200 + `access_token=; Expires=Thu, 01 Jan 1970` |
| `npx tsc --noEmit` (frontend) | sin errores |
| `backend/tests/auth.cookie.test.js` | **11/11 verdes** |

---

## BLOQUE C — Tests sin APIs externas

La lógica de sanitización, parseo de score y clasificación vivía **solo dentro de los Code nodes
de n8n**, fuera del repo y por tanto sin poder testearse. Se extrajo a
`backend/src/lib/lead.js` como implementación de referencia (funciones puras, sin red).

`backend/tests/lead.test.js` — **48 casos**: validación de email, límites de longitud,
saneamiento de teléfono, normalización de score y categoría, degradado a COLD ante JSON
inválido, rama `Is Hot?`, `status` escrito en `lead_log` y dos flujos completos (HOT y COLD).

### Corrección de comportamiento heredado

El nodo validaba el email **antes** de recortarlo, así que `" ana@example.com "` se rechazaba —
algo habitual en formularios y payloads pegados a mano. Ahora se recorta primero.

El Code node se sincronizó con el módulo y **se publicó** la nueva versión del workflow.

**Evidencia en runtime:**

| Caso | Resultado |
|---|---|
| Email entre espacios (exec **37**) | Pasa la sanitización y llega a OpenAI → falla 429 `insufficient_quota`, que es el bloqueo de credencial conocido |
| Email inválido (exec **38**) | Sigue rechazándose → `error_log` id 11, nodo `Sanitize & Validate` |

> ⚠️ `backend/src/lib/lead.js` y los Code nodes son **dos copias**. n8n no puede importar módulos,
> así que la sincronía es manual. Están alineados ahora mismo; anotado en `HANDOFF.md`.

---

## BLOQUE D — CI/CD

`.github/workflows/ci.yml`, en cada push y PR:

| Job | Pasos |
|---|---|
| `backend` | `npm ci` → `npm run lint` → `npm test` (Node 20, sin base de datos) |
| `frontend` | `npm ci` → `tsc --noEmit` → `npm run build` |
| `secrets` | Replica la política del pre-commit sobre el árbol versionado |

El job `secrets` existe porque **`.git/hooks/` no se clona**: el hook local no protege a nadie
más. Filtra placeholders para no fallar con `.env.example`.

### Lint: no existía configuración

`npm run lint` fallaba (ESLint 9 requiere flat config). Se añadió `backend/eslint.config.js` y
aparecieron **6 errores reales preexistentes**, todos corregidos:

| Archivo | Problema |
|---|---|
| `src/app.billing.addendum.js`, `src/app.routes.addendum.js` | Fragmentos muertos que usaban un `app` inexistente, sin referencias; su contenido ya estaba en `app.js`. **Eliminados** |
| `src/middleware/combinedAuth.js` | `router.use()` sobre un `router` que nunca se definía: **habría lanzado `ReferenceError`** al importarlo. Nadie lo usaba aún. Ahora exporta la cadena de middlewares |
| `tenant.js`, `leads.routes.js`, `auth.service.js` | 3 variables asignadas y nunca usadas |

### `.env.example`

Faltaban **11 variables** que el código lee. Añadidas `NODE_ENV`, `LOG_LEVEL`, `DB_HOST`,
`DB_PORT`, `AUTH_COOKIE_NAME/SAMESITE/DOMAIN/MAX_AGE_MS`, `CORS_ORIGINS`,
`AUTH_RATE_LIMIT_MAX`, `RABBITMQ_URL`. Verificado: **0 variables usadas sin declarar**.

**Evidencia:** `npm run lint` limpio · `npm test` 59/59 · YAML válido (3 jobs) · job de secretos
simulado en local → `Sin secretos detectados en el arbol versionado`.

> El CI **nunca ha corrido en GitHub**: no se ha hecho push. `origin/main` sigue en `e2cadc3`.

---

## Estado de los tests

```
Test Suites: 2 passed, 2 total
Tests:       59 passed, 59 total
```

11 de autenticación por cookie + 48 de lógica de leads. Ninguno toca la red.

---

## PENDIENTE - REQUIERE MIS KEYS

Nada de los bloques A-D desbloquea esto. Es el trabajo manual final.

### 1. OpenAI — falta saldo, no la key

La key de `.env` **es válida**: `GET /v1/models` → 200. Pero `POST /v1/chat/completions` →
**429 `insufficient_quota`**. La cuenta no tiene crédito.

→ Añadir saldo en https://platform.openai.com/settings/organization/billing
→ Verificar: `POST /v1/chat/completions` debe dar 200, no 429.

### 2. Slack — no existe token

`SLACK_BOT_TOKEN` y `SLACK_CHANNEL_ID` están **vacías** en `.env`, y la credencial de n8n
contenía el centinela `__n8n_BLANK_VALUE_`. `auth.test` → `invalid_auth`.

→ Bot token `xoxb-` con scope `chat:write` (y `chat:write.public` si el canal es público y el
bot no es miembro), más el `SLACK_CHANNEL_ID`.

### 3. HubSpot — no existe token

`HUBSPOT_ACCESS_TOKEN` **vacía**; API → 401.

→ Private app token `pat-` con `crm.objects.contacts.read` y `crm.objects.contacts.write`.

### 4. Stripe — fuera del flujo de leads

`STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` sin valor. El backend hace inicialización
perezosa, así que su ausencia no tumba el servidor. No bloquea el flujo de leads.

### 5. ⚠️ Sin dominio público, la rama HOT no se puede completar

**Esto no se arregla con un token.** El nodo `Wait for Approval` pausa la ejecución hasta
recibir una llamada de vuelta a su webhook de reanudación. Con n8n en `localhost:5678`, **Slack
no puede alcanzarlo**: el botón de aprobación no tiene forma de despertar la ejecución.

Aunque cargues el token de Slack, la rama HOT queda colgada en `Wait for Approval` hasta agotar
el tiempo. Hace falta:

1. Dominio público apuntando a n8n.
2. HTTPS (ver `docs/PRODUCCION_CHECKLIST.md` §1 — `certs/` no existe).
3. `WEBHOOK_URL` de n8n configurada con ese dominio, para que genere URLs de reanudación
   alcanzables desde fuera.

**Para un primer E2E sin dominio:** usar un lead WARM/COLD, que va directo
`Is Hot? (false) → Upsert HubSpot → Log to PostgreSQL` y no pasa por Slack. Eso sí valida
OpenAI + HubSpot + persistencia de punta a punta.

### Nodos que nunca se han ejecutado

`Parse AI Response`, `Is Hot?`, `Human Approval (Slack)`, `Wait for Approval`, `Check Approval`,
`Is Approved?`, `Upsert HubSpot`, `Done`.

Su lógica pura **sí** está cubierta por tests (`Parse AI Response`, `Is Hot?`), pero nunca han
corrido dentro del flujo real.

---

## Confianza

**Global bloques A-D: 88%.** Lo entregado está verificado con evidencia reproducible. El 12%
restante es lo que no se puede comprobar sin credenciales ni sin que el CI corra en GitHub.

| Elemento | Confianza | Base |
|---|---|---|
| Backup corregido y restore probado | 100% | Dump + restauración con 0 errores y conteos correctos |
| `certs/` documentado según la realidad | 100% | El directorio no existe; verificado |
| Auth HttpOnly (backend) | 100% | 11 tests + `Set-Cookie` real + 401 sin cookie |
| Auth HttpOnly (frontend) | 85% | `tsc` limpio y sin `localStorage`, pero **no se probó en un navegador** |
| Lógica de leads (`lib/lead.js`) | 100% | 48 tests sobre funciones puras |
| Sincronía módulo ↔ Code nodes de n8n | 80% | Alineados hoy; son copias manuales y pueden divergir |
| Lint limpio y errores reales corregidos | 100% | `npm run lint` sin salida |
| `.env.example` completo | 100% | 0 variables usadas sin declarar |
| CI funciona en GitHub | 60% | YAML válido y job de secretos simulado en local, pero **nunca ejecutado en Actions** |
| Flujo E2E de leads | 0% | Bloqueado por credenciales |
