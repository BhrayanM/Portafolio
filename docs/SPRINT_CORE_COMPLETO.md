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

---

# E2E con credenciales reales — 2026-07-25

## Probes de credenciales

| Servicio | Presente en `.env` | Probe | Status |
|---|---|---|---|
| **LLM — Groq** | sí | `POST /openai/v1/chat/completions`, `llama-3.3-70b-versatile` → **HTTP 200**, respuesta `"ok"` | ✅ PASA |
| LLM — OpenAI | sí | `POST /v1/chat/completions` → **HTTP 429 `insufficient_quota`** (cuenta sin saldo) | ❌ se usa Groq |
| **Slack** | sí | `auth.test` → `ok=true`, team `AI Automation Lab`, bot `n8n_leads_bot_avanzad` | ✅ PASA |
| **HubSpot** | sí | `GET /crm/v3/objects/contacts` → **HTTP 200** | ✅ PASA |
| **Stripe** | sí | `GET /v1/balance` → **HTTP 200**, `livemode=false` | ✅ PASA |

Notas de los probes:

- **Groq responde 403 (Cloudflare error 1010) al User-Agent por defecto de `urllib`.** No es un
  problema de credencial: con `User-Agent: curl/8.0.0` devuelve 200. El nodo HTTP de n8n lleva
  ahora esa cabecera explícita.
- **Slack: el bot ya estaba en `#nuevo-canal`** (`C0BJYN0QKPT`), verificado publicando un mensaje
  real. No hizo falta invitarlo. `conversations.list` devuelve `missing_scope` (falta
  `channels:read`), por eso la comprobación se hizo publicando.
- **`SLACK_CHANNEL_ID` estaba vacía.** `.env` tiene claves duplicadas: la segunda aparición
  (vacía) pisaba a la primera. Corregido a `C0BJYN0QKPT`.

## Bugs encontrados al ejecutar el flujo real

Tres defectos más del mismo patrón que los anteriores: **parámetros escritos para otra versión
del nodo**, que n8n descarta en silencio.

### BUG #6 — Los nodos IF enrutaban mal: todo iba a la rama HOT

`Is Hot?` e `Is Approved?` eran `typeVersion 1` pero con parámetros en formato v2
(`conditions.conditions[]`). IF v1 espera `conditions.string[]`; al no encontrarlo evalúa un
conjunto vacío de condiciones con combinador AND, que da **TRUE**.

Consecuencias reales:

- Un lead **WARM** (score 60) se fue a `Human Approval (Slack)` — evidencia: exec 41.
- `Is Approved?` habría marcado **cualquier** lead como aprobado sin leer la respuesta humana.

Solución: ambos nodos a `typeVersion 2.2`. Verificado: el WARM siguiente fue directo a HubSpot.

### BUG #7 — El nodo HubSpot no enviaba ningún campo y usaba el tipo de credencial equivocado

Tres problemas encadenados:

1. El nodo llevaba un parámetro `properties`, que **no existe** en `contact:upsert`. n8n lo
   descartaba y solo enviaba el email. El parámetro real es `additionalFields`, con claves
   camelCase propias del nodo (`firstName`, `companyName`, `phoneNumber`, `leadStatus`, `message`).
2. Escribía `hs_score`, `hs_message` y `hs_source`, que **no existen en el portal** (verificado
   contra `/crm/v3/properties/contacts`: 403 propiedades, ninguna de esas tres).
   `hubspotscore` sí existe pero es de **solo lectura**, y `hs_lead_status` es un **enum cerrado**
   (`NEW`, `OPEN`, `IN_PROGRESS`, `OPEN_DEAL`, `UNQUALIFIED`, …), así que `HOT`/`WARM`/`COLD`
   habrían sido rechazados.
3. La credencial era del tipo legacy `hubspotApi` (API Key), pero el token es un **private app
   token** (`pat-`), que requiere el tipo `hubspotAppToken` y `authentication: appToken`.

Solución: credencial nueva de tipo `hubspotAppToken`, `additionalFields` con claves válidas, y
mapeo `HOT→NEW`, `WARM→OPEN`, `COLD→UNQUALIFIED`. El score, la categoría y el motivo de la IA
van al campo `message`, que sí existe y es escribible.

> Ese mapeo de `leadStatus` es una decisión de negocio que tomé para desbloquear el E2E.
> Cámbialo si tu equipo usa otra semántica.

### BUG #8 — `Log to PostgreSQL` insertaba todo a null

`Upsert HubSpot` tiene `resolveData: true`, así que **sustituye el item** por el contacto de
HubSpot. El nodo Postgres seguía leyendo `$json.email`, que ya no existía:

```
null value in column "email" of relation "lead_log" violates not-null constraint
Failing row contains (2, null, null, ..., cold, null, null, ...)
```

Solución: leer los campos desde `$('Parse AI Response').item.json`, y los flags de aprobación
desde `Check Approval` protegidos con `.isExecuted` (solo existen en la rama HOT).

## E2E rama WARM — ✅ COMPLETO

```bash
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e.warm4@example.com","name":"Marta Ruiz","company":"Example Corp",
       "phone":"+34600555111","message":"Hola, estoy comparando opciones de automatizacion...",
       "source":"e2e-warm"}'
```

**Execution 46 — `success`.** Todos los nodos en verde y por la rama correcta (sin pasar por Slack):

```
Webhook → Fast ACK → Sanitize & Validate → OpenAI Score Lead → Parse AI Response
        → Is Hot? → Upsert HubSpot → Log to PostgreSQL → Done
```

La IA (Groq, `llama-3.3-70b-versatile`) devolvió `score 60`, `WARM`, categoría
`Automatización`.

**Fila real en `lead_log`:**

```
 id |         email         |    name    |   company    | ai_score | ai_category | status | source
----+-----------------------+------------+--------------+----------+-------------+--------+----------
  3 | e2e.warm4@example.com | Marta Ruiz | Example Corp |       60 | WARM        | warm   | e2e-warm
```

**Contacto real en HubSpot — contact ID `525380986565`:**

```
email: e2e.warm4@example.com · firstname: Marta · lastname: Ruiz
company: Example Corp · phone: +34600555111 · hs_lead_status: OPEN
message: [IA] score 60/100 · WARM · Automatización · Motivo: ...
```

## E2E rama HOT — ⏸ EN ESPERA DE APROBACIÓN

**Execution 47 — `waiting`.** Clasificado correctamente: `score 98`, `HOT`, categoría
`Automatización de leads`. Mensaje publicado en `#nuevo-canal`.

### ⚠️ No se puede aprobar pulsando en Slack

El nodo Slack publica **texto plano, sin botones interactivos**. Y añadirlos no bastaría: la
interactividad de Slack exige una *Request URL* pública a la que Slack pueda llamar, y n8n está
en `localhost`. Es el mismo bloqueo de dominio ya documentado.

Mientras tanto, la aprobación se hace llamando al webhook de reanudación en local:

```bash
# Aprobar
curl -X POST http://localhost:5678/webhook-waiting/47/direct \
  -H "Content-Type: application/json" -d '{"approved": true}'

# Rechazar
curl -X POST http://localhost:5678/webhook-waiting/47/direct \
  -H "Content-Type: application/json" -d '{"rejected": true}'
```

`Check Approval` lee `approved` / `rejected` del cuerpo. Tiempo de espera: 24 h.

Para que el botón de Slack funcione de verdad hacen falta: dominio público + HTTPS,
`WEBHOOK_URL` de n8n apuntando a ese dominio, y un nodo Slack con bloques interactivos cuya
Request URL apunte al endpoint de reanudación.
