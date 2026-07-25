# Sprint 2 — Servicios Externos (Lead Qualification E2E)

Fecha: 2026-07-25 · Rama: `remediacion/v2` · Workflow: `Lead Qualification` (`<workflow-id>`)

## Objetivo

Dejar el flujo de leads corriendo de punta a punta con credenciales reales:
`Webhook → Fast ACK → Sanitize → OpenAI (score) → Is Hot? → Human Approval (Slack) → Upsert HubSpot → Log PostgreSQL`.
Stripe fuera de alcance.

## Resultado

**Sprint 2 NO completado.** Se corrigieron 3 bugs reales de integración que impedían
cualquier ejecución (el flujo nunca había llegado a enviar un body a OpenAI), pero los
**3 DoD externos quedan bloqueados por credenciales/facturación**, no por código:

| DoD | Estado | Bloqueo |
|---|---|---|
| OpenAI devuelve score 0-100 + clasificación | ❌ Bloqueado | Key **válida** pero cuenta sin saldo (`insufficient_quota`, HTTP 429) |
| HubSpot upsert real por email (contact ID) | ❌ Bloqueado | **PENDIENTE - REQUIERE CREDENCIAL REAL** (no existe token) |
| Slack notificación real en canal | ❌ Bloqueado | **PENDIENTE - REQUIERE CREDENCIAL REAL** (no existe token) |
| Ejecución E2E completa sin errores | ❌ Bloqueado | Depende de los 3 anteriores |

## Corrección al estado asumido

El prompt asumía que las 3 keys reales ya estaban en `.env` o en n8n. **No es así.**
Y las credenciales de n8n no eran "placeholders": estaban **vacías**, con el centinela
interno `__n8n_BLANK_VALUE_<uuid>`.

Evidencia (valores nunca impresos, solo prefijos/longitudes):

```
.env  → OPENAI_API_KEY=<set, 164 chars, prefijo sk-pro...>
.env  → HUBSPOT_ACCESS_TOKEN=   (vacío)
.env  → SLACK_BOT_TOKEN=        (vacío)
.env  → SLACK_CHANNEL_ID=       (vacío)

n8n credential <cred-slack> (Slack)   → accessToken = __n8n_BLANK_VALUE_e5362baf-...
n8n credential <cred-hubspot> (HubSpot) → apiKey      = __n8n_BLANK_VALUE_...
n8n credential <cred-openai> (OpenAI)  → value       = __n8n_BLANK_VALUE_...
```

Probes en vivo con esos valores:

```
SLACK  auth.test        → HTTP 200 {"ok":false,"error":"invalid_auth"}
HUBSPOT /crm/v3/contacts → HTTP 401 Authentication credentials not found
OPENAI  /v1/models       → HTTP 401 Missing bearer authentication in header
```

## Cambios realizados

### 1. Credencial OpenAI cargada desde `.env` (nueva)

Credencial `<cred-openai>` (`httpHeaderAuth`) poblada con `Authorization: Bearer <OPENAI_API_KEY de .env>`.

Verificación de la key directamente contra OpenAI:

```
GET  /v1/models           → HTTP 200   (autenticación correcta)
POST /v1/chat/completions → HTTP 429   {"type":"insufficient_quota"}
```

**La key es real y válida. La cuenta OpenAI no tiene saldo.**

### 2. BUG REAL — El nodo OpenAI nunca enviaba body

`OpenAI Score Lead` (`n8n-nodes-base.httpRequest`, typeVersion 4.2) tenía los parámetros
`bodyType` y `body`, que **no existen** en esa versión del nodo. n8n los ignoraba y caía al
default `specifyBody: keypair` → `bodyParameters: [{name:"",value:""}]`, enviando `{"": ""}`.

```
OpenAI → HTTP 400 "you must provide a model parameter"
        request.body = {"": ""}
```

Se intentó primero `contentType:json` + `specifyBody:json` + `jsonBody`. n8n lo persistía en
BD pero el normalizador de parámetros lo revertía a `specifyBody: keypair` al cargar el
workflow (la descripción del nodo define `specifyBody` dos veces, y la segunda definición
—para `form-urlencoded`, opciones `keypair|string`— pisa el valor `json`).

**Solución aplicada:** body crudo, que no depende de `specifyBody`:

```json
"contentType": "raw",
"rawContentType": "application/json",
"body": "={ \"model\": \"gpt-4o-mini\", \"messages\": [...], \"temperature\": 0.3,
            \"max_tokens\": 300, \"response_format\": {\"type\": \"json_object\"} }"
```

Se añadió `response_format: json_object` para garantizar que `Parse AI Response` reciba JSON
válido, y se corrigió el mojibake del prompt (los acentos estaban corruptos: `decisi+ï¿½+ï¿½n`).

Evidencia de que ahora sí viaja el body (ejecución 27):

```
request.body = "{\n  \"model\": \"gpt-4o-mini\",\n  \"messages\": [\n    {\"role\": \"system\", ...
OpenAI → HTTP 429 insufficient_quota   (ya no 400: el payload es correcto)
```

### 3. BUG REAL — Credencial PostgreSQL con SSL inválido

Credencial `<cred-postgres>` tenía `ssl: false` (booleano). n8n espera el **string**
`"disable"`. Con el booleano, los nodos Postgres fallaban:

```
Log Global Error → ERROR "The server does not support SSL connections"
```

Corregido a `ssl: "disable"`. Verificado: `Log Global Error` pasó a `success` e insertó filas
reales en `error_log` (ids 1-8).

### 4. BUG REAL — Todos los errores se registraban como "Unknown error"

`Format Error` leía `errorData.errorMessage` / `errorData.workflowId`, campos que no existen en
el payload del `Error Trigger` (cuya forma real es `{execution:{id,url,error:{...}}, workflow:{id,name}}`).
Resultado: `error_log` inutilizable — `message='Unknown error'`, `workflow_id=''`.

Corregido para leer la forma real y añadir `stack_trace`, `nodeName`, `httpCode`, `executionUrl`.

Antes vs. después en `error_log`:

```
id 1-7 | Unknown error                                       |                  |                   |
id 8   | The service is receiving too many requests from you | <workflow-id> | OpenAI Score Lead | 429
```

### 5. HALLAZGO OPERATIVO CRÍTICO — n8n 2.x ejecuta la versión *publicada*, no el borrador

n8n v2.31.6 separa borrador y versión activa: `workflow_entity.nodes` es el **borrador**, y la
ejecución usa `workflow_entity.activeVersionId` → snapshot en `workflow_history`.

**Editar vía `PATCH /rest/workflows/:id` no cambia nada de lo que se ejecuta.** Además,
`PATCH {"active": false}` es un **no-op silencioso** (devuelve `active: true`), y reiniciar el
contenedor tampoco recarga el borrador.

Durante ~5 iteraciones los parches parecían no aplicarse: la BD mostraba `contentType: "raw"`
mientras el snapshot de ejecución seguía mostrando `contentType: "json"`.

```
workflow_entity.versionId       = 1bc2fc16-...  (borrador, 10:27)
workflow_entity.activeVersionId = 47caeecb-...  (activo,   09:33  ← Sprint 1)
```

**Procedimiento correcto para publicar:**

```bash
POST /rest/workflows/{id}/deactivate            # body {}
POST /rest/workflows/{id}/activate              # body {"versionId": "<versionId del borrador>"}
```

Sin este paso, **cualquier cambio futuro al workflow es invisible en runtime**. Documentado
también en `CLAUDE.md`.

### 6. Workflow n8n versionado en git — ❌ REVERTIDO (ver Sprint 2.5)

Se añadió una excepción en `.gitignore` para versionar `n8n/workflows/*.json`.
**Fue un error y se revirtió.** Este repo es público (`github.com/BhrayanM/Portafolio`) y
`SECURITY.md` §1 prohíbe explícitamente publicar workflows exportados, el grafo real, los
Code nodes, los prompts de producción y los credential IDs.

Nada llegó a publicarse: los commits eran locales (`origin/main` iba muy por detrás).
Detalle y corrección en la sección **Sprint 2.5**.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `CLAUDE.md` | **Nuevo.** Estado verificado + stack + reglas, auto-cargado por sesión |
| `docs/SPRINT2_SERVICIOS_EXTERNOS.md` | **Nuevo.** Este reporte |
| `.gitignore` | Excepción para workflows → **revertida** en Sprint 2.5 |

Cambios aplicados vía API de n8n (estado en BD, no en archivos):

| Objeto | Cambio |
|---|---|
| Credencial `<cred-openai>` | Key real de OpenAI desde `.env` |
| Credencial `<cred-postgres>` | `ssl: false` → `"disable"` |
| Nodo `OpenAI Score Lead` | Body raw JSON + `response_format` + prompt sin mojibake |
| Nodo `Format Error` | Lee el payload real del Error Trigger |
| Nodo `Log Global Error` | Añadida columna `stack_trace` |
| Workflow `<workflow-id>` | Versión publicada = borrador actual |

## Comandos

```bash
# Login n8n (requiere header browser-id en las llamadas siguientes)
curl -s -c cookie.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@portafolio.ai","password":"<N8N_ADMIN_PASSWORD>"}'

# Disparar el webhook
curl -s -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"email":"sprint2.test@acme-corp.com","name":"Laura Fernandez","company":"Acme Corp",
       "phone":"+34600111222","message":"Necesito contratar urgente...","source":"web-form"}'

# Publicar el borrador (IMPRESCINDIBLE tras cada edición)
curl -s -X POST http://localhost:5678/rest/workflows/<workflow-id>/deactivate -d '{}'
curl -s -X POST http://localhost:5678/rest/workflows/<workflow-id>/activate \
  -d '{"versionId":"<versionId del borrador>"}'

# Evidencia en BD
docker exec portafolio-publico-postgres-1 psql -U n8n -d n8n -c "select * from error_log order by id;"
docker exec portafolio-publico-postgres-1 psql -U n8n -d n8n -c "select count(*) from lead_log;"
```

## Evidencia (execution IDs)

Webhook y Fast ACK siguen intactos: `HTTP 200` + `{"received":true}` en **todas** las pruebas.

| Exec | Resultado | Lectura |
|---|---|---|
| 11 | error | OpenAI HTTP 400 `you must provide a model parameter`, body `{"": ""}` → bug #2 |
| 13, 15 | error | Igual tras primer intento `jsonBody`; `Log Global Error` falla por SSL → bug #3 |
| 16 | success | Post-fix SSL: `Log Global Error` inserta `error_log` id=1 |
| 19, 21, 23, 25 | error | Snapshot seguía con `specifyBody: keypair` pese a BD correcta → hallazgo #5 |
| **27** | error | **Tras publicar versión: body correcto enviado.** OpenAI HTTP 429 `insufficient_quota` |
| **29** | error | **Tras fix Format Error:** `error_log` id=8 con mensaje real, nodo y httpCode 429 |

Nodos con `success` confirmado en ejecución 29: `Webhook`, `Fast ACK`, `Sanitize & Validate`,
`Error Trigger`, `Format Error`, `Log Global Error`.

Estado de tablas: `error_log` = 8 filas · `lead_log` = **0 filas** (el flujo nunca llega
a `Log to PostgreSQL`, que está detrás de `Upsert HubSpot`).

## Errores y solución

| # | Error | Causa | Solución | Estado |
|---|---|---|---|---|
| 1 | OpenAI 401 | Credencial n8n vacía (`__n8n_BLANK_VALUE_`) | Cargar key de `.env` | ✅ Resuelto |
| 2 | OpenAI 400 `must provide a model parameter` | `bodyType`/`body` inexistentes en httpRequest 4.2 | `contentType: raw` + `rawContentType` + `body` | ✅ Resuelto |
| 3 | `The server does not support SSL connections` | Credencial PG con `ssl: false` (bool) | `ssl: "disable"` (string) | ✅ Resuelto |
| 4 | `error_log` con "Unknown error" | `Format Error` leía campos inexistentes | Leer forma real del Error Trigger | ✅ Resuelto |
| 5 | Los parches no surtían efecto | n8n 2.x ejecuta `activeVersionId`, no el borrador | `deactivate` + `activate {versionId}` | ✅ Resuelto |
| 6 | OpenAI 429 `insufficient_quota` | Cuenta OpenAI sin saldo | Requiere acción humana (facturación) | ❌ **Bloqueado** |
| 7 | Slack `invalid_auth` | No existe token en `.env` ni en n8n | Requiere credencial real | ❌ **Bloqueado** |
| 8 | HubSpot 401 | No existe token en `.env` ni en n8n | Requiere credencial real | ❌ **Bloqueado** |

## Pendientes (requieren acción humana)

1. **OpenAI — añadir saldo.** La key funciona; la cuenta no tiene crédito.
   https://platform.openai.com/settings/organization/billing → verificar en
   `POST /v1/chat/completions` (debe dar 200, no 429).
2. **Slack Bot Token** (`xoxb-...`) con scopes `chat:write` (+ `chat:write.public` si el canal
   es público y el bot no es miembro), y **`SLACK_CHANNEL_ID`**. Poner en `.env` y en la
   credencial `<cred-slack>`.
3. **HubSpot Private App Token** (`pat-...`) con scopes `crm.objects.contacts.read` y
   `crm.objects.contacts.write`. Poner en `.env` y en la credencial `<cred-hubspot>`.

Con las 3 credenciales, el resto del flujo ya está listo para ejecutarse; queda por verificar
en runtime (nunca se han podido ejecutar): `Parse AI Response`, `Is Hot?`, `Human Approval (Slack)`,
`Wait for Approval`, `Check Approval`, `Is Approved?`, `Upsert HubSpot`, `Log to PostgreSQL`, `Done`.

### Riesgo conocido no verificable aún

`Wait for Approval` (rama HOT) pausa la ejecución hasta un webhook de reanudación. La rama HOT
**no puede completarse de forma desatendida**: requiere que alguien pulse el botón en Slack.
Para una prueba E2E automatizada conviene usar un lead COLD/WARM, que va directo a
`Is Hot? (false) → Upsert HubSpot → Log to PostgreSQL`.

## Nivel de confianza

**Global Sprint 2: 35%** — objetivo no alcanzado; los 3 DoD externos siguen bloqueados.

| Elemento | Confianza | Base |
|---|---|---|
| Diagnóstico de credenciales (vacías, no placeholder) | 100% | Probes en vivo contra las 3 APIs |
| Key OpenAI válida, cuenta sin saldo | 100% | `/v1/models` 200 vs `/v1/chat/completions` 429 |
| Fix body OpenAI (#2) | 95% | Body correcto confirmado en exec 27; falta un 200 real |
| Fix SSL PostgreSQL (#3) | 100% | 8 filas insertadas en `error_log` |
| Fix Format Error (#4) | 100% | Fila id=8 con mensaje/nodo/httpCode reales |
| Procedimiento de publicación (#5) | 100% | `activeVersionId` cambia y el runtime obedece |
| Fast ACK / webhook intactos | 100% | HTTP 200 `{"received":true}` en todas las pruebas |
| Rama Slack/HubSpot/lead_log | 0% | Nunca ejecutadas |

---

# Sprint 2.5 — Trabajo sin dependencias externas

Fecha: 2026-07-25 · Sin tocar OpenAI / Slack / HubSpot (siguen bloqueados por credenciales).

## 1. Persistencia verificada

### `Log Global Error` → `error_log` ✅

Error controlado disparado con un email inválido (`Sanitize & Validate` lanza la excepción):

```bash
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"email":"esto-no-es-un-email","name":"Test Error Controlado","source":"qa-controlled-error"}'
# HTTP 200 {"received":true}   (Fast ACK intacto)
```

```
 id |            message            |   workflow_id    |        node         | exec_id
----+-------------------------------+------------------+---------------------+---------
  9 | Invalid email format [line 9] | <workflow-id>    | Sanitize & Validate | 31
 10 | Invalid email format [line 9] | <workflow-id>    | Sanitize & Validate | 35
```

La fila 10 confirma que sigue escribiendo **después** del cambio de mapeo (punto siguiente).

### `Log to PostgreSQL` → `lead_log` ✅ (tras corregir un bug nuevo)

Este nodo nunca se había ejecutado: está detrás de `Upsert HubSpot`, que no tiene credencial.
Al aislarlo apareció un bug real.

### BUG REAL #5 — Los nodos Postgres ignoraban su mapeo de columnas

Ambos nodos (`n8n-nodes-base.postgres`, typeVersion 2) llevaban `columns` (string separado por
comas) + `values` (objeto). **Ninguno de los dos es parámetro de esa versión del nodo.** n8n los
descartaba y usaba el default `dataMode: autoMapInputData`, mapeando las claves del JSON de
entrada directamente a columnas:

```
Log to PostgreSQL -> ERROR "Column 'receivedAt' does not exist in selected table"
```

`Log Global Error` sobrevivía **por coincidencia**: las claves que emite `Format Error`
(`level`, `source`, `message`, `metadata`, `workflow_id`, `workflow_name`, `created_at`)
coinciden exactamente con los nombres de columna. Cualquier renombrado lo habría roto en silencio.

Mismo patrón que el bug #2 del nodo OpenAI: **parámetros escritos para otra versión del nodo**.

**Solución:** `dataMode: defineBelow` + `valuesToSend` con mapeo explícito columna → expresión
(12 columnas en `lead_log`, 8 en `error_log`).

**Verificación** — se ejecutó el nodo real (mismos parámetros, mismo credential, misma tabla) con
un trigger manual, porque el camino del webhook no puede alcanzarlo sin HubSpot. No se simuló
ninguna API externa: la escritura en Postgres es real.

```
execution id=34 status=success
```

```sql
select id, email, name, company, ai_score, ai_category, ai_business_category, status, source
from lead_log order by id;
```

```
 id |             email             |      name       |  company   | ai_score | ai_category | ai_business_category | status |     source
----+-------------------------------+-----------------+------------+----------+-------------+----------------------+--------+-----------------
  1 | qa.persistencia@sprint25.test | QA Persistencia | Sprint 2.5 |       42 | WARM        | QA                   | warm   | qa-persistencia
```

La expresión de `status` se resolvió correctamente a `warm`. Los workflows temporales usados para
la prueba se eliminaron (quedan solo los 3 originales). **La fila 1 de `lead_log` es una fila de
QA: bórrala cuando quieras.**

### Lo que sigue sin verificarse

`Log to PostgreSQL` está probado **como nodo**, no dentro del flujo completo. Las expresiones
`{{ $json.approved }}` y `{{ $json.approvedAt }}` vienen de `Check Approval` (rama Slack) y solo
podrán comprobarse cuando exista credencial de Slack. La columna `approved_at` se retiró del
mapeo porque en la rama WARM/COLD siempre es nula.

## 2. Versionado del workflow — corregido de raíz

**Problema detectado:** el Sprint 2 había añadido `n8n/workflows/*.json` a git. Este repo es
**público** y `SECURITY.md` §1 lo prohíbe. El commit incluía el grafo completo, los Code nodes,
el prompt literal de scoring y los credential IDs.

**Nada se publicó:** `origin/main` estaba en `e2cadc3` y los commits eran locales.

**Corrección aplicada:**

1. Revertida la excepción del `.gitignore`; `workflows/` vuelve a estar ignorado.
2. Reescrito el commit que los añadía para que **no contenga** los 4 `.json`: no quedan en el historial.
3. Redactados los credential IDs y el workflow ID en `CLAUDE.md`, `docs/SPRINT1_N8N.md` y este
   documento (`<cred-openai>`, `<cred-postgres>`, `<cred-slack>`, `<cred-hubspot>`, `<workflow-id>`).
4. El export sigue en disco en `n8n/workflows/` como respaldo local **no trackeado**.

### Barrera permanente: `.git/hooks/pre-commit`

Bloquea el commit si en los archivos **en stage** detecta:

| # | Regla | Ejemplo que bloquea |
|---|---|---|
| 1 | Archivos de entorno (salvo `.env.example` / `.template` / `.sample`) | `.env`, `backend/.env.local` |
| 2 | Exports de workflows n8n por ruta | `n8n/workflows/*.json`, `workflows/*.json` |
| 3 | Cualquier `.json` con nodos `n8n-nodes-*`, aunque esté en otra ruta | export renombrado |
| 4 | Tokens: OpenAI `sk-`, Slack `xox[baprs]-`, HubSpot `pat-`, GitHub `ghp_`, AWS `AKIA…` | `sk-proj-…` |
| 5 | Claves privadas PEM | `-----BEGIN … PRIVATE KEY-----` |
| 6 | Credential IDs de n8n: bloque `credentials` de un export, o clave de tipo (`slackApi`, `hubspotApi`, `httpHeaderAuth`, `postgres`) seguida de un `id` | fragmento de export |
| 7 | URLs de webhook con host **no local** (`localhost` / `127.0.0.1` sí se permiten) | `https://<host-remoto>/webhook/<path>` |
| 8 | Cadenas de conexión Postgres con credenciales | `postgresql://user:pass@host:5432/db` |

Los valores de ejemplo evidentes (`tu_`, `your`, `example`, `${VAR}`, `<placeholder>`, `changeme`…)
**no** bloquean, para que `.env.example` y la documentación sigan siendo commiteables.
Escape deliberado: `git commit --no-verify`.

**Pruebas del hook:**

| Caso | Resultado |
|---|---|
| `git add -f n8n/workflows/lead-qualification.json` | ❌ bloqueado (3 reglas: ruta, nodos n8n, credential IDs) |
| `git add -f .env` | ❌ bloqueado (3 reglas: nombre, `sk-`, cadena Postgres) |
| Archivo con `sk-` / `xoxb-` / `pat-` / `ghp_` / `AKIA` / webhook remoto / DSN Postgres | ❌ bloqueado (7 reglas) |
| DSN Postgres realista con clave real | ❌ bloqueado |
| `.env.example`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PLAN_REMEDIACION.md`, `docs/REPORTE_FASE_F.md` | ✅ pasan (solo placeholders) |

> El hook vive en `.git/hooks/`, que **no se versiona**: no se propaga al clonar.
> Para un equipo habría que moverlo a `.githooks/` y fijar `git config core.hooksPath .githooks`.

### Verificación de que nada sensible está trackeado

```bash
git check-ignore -v .env n8n/workflows/lead-qualification.json n8n/data
#   .gitignore:19:*.env        .env
#   .gitignore:65:workflows/   n8n/workflows/lead-qualification.json
#   .gitignore:98:data/        n8n/data

git ls-files | grep -iE '(^|/)\.env($|\.)|n8n/workflows/|\.pem$|\.key$|credentials'
#   .env.example   <- unico resultado, y solo con placeholders
```

Barrido de secretos sobre **todos** los archivos trackeados: 4 coincidencias, las 4 placeholders
(`sk-proj-tu_key…`, `postgresql://user:pass@`, `postgresql://${VAR}…`) en `.env.example`,
`docs/IMPLEMENTATION_PLAN.md`, `docs/PLAN_REMEDIACION.md` y `docs/REPORTE_FASE_F.md`.
**Ningún secreto real trackeado.**

## 3-4. Documentación

- `docs/ARQUITECTURA.md` — propósito, stack, diagrama Mermaid, arranque con Docker y estado real
  de cada integración. Va en `docs/` y no en `README.md`: el README es el portafolio público, y
  mezclar ahí "OpenAI pendiente por saldo" con el badge de "sistemas en producción" sería confuso.
- `docs/PRODUCCION_CHECKLIST.md` — HTTPS, dominio, variables de entorno, rotación de credenciales,
  backups de PostgreSQL, monitoreo y logs, separando lo hecho de lo pendiente.

## Qué sigue esperando credenciales

Sin cambios respecto al Sprint 2 — **ningún avance de Sprint 2.5 los desbloquea**:

| Integración | Estado | Necesita |
|---|---|---|
| OpenAI | `PENDIENTE - REQUIERE CREDENCIAL REAL` (saldo) | Añadir crédito; la key ya es válida |
| Slack | `PENDIENTE - REQUIERE CREDENCIAL REAL` | Bot token `xoxb-` (`chat:write`) + `SLACK_CHANNEL_ID` |
| HubSpot | `PENDIENTE - REQUIERE CREDENCIAL REAL` | Private app token `pat-` (contacts read/write) |

Nodos que nunca se han ejecutado: `Parse AI Response`, `Is Hot?`, `Human Approval (Slack)`,
`Wait for Approval`, `Check Approval`, `Is Approved?`, `Upsert HubSpot`, `Done`.

## Confianza Sprint 2.5

| Elemento | Confianza | Base |
|---|---|---|
| `error_log` escribe con nodo / mensaje / execution ID | 100% | Filas 9 y 10, execs 31 y 35 |
| `lead_log` escribe con mapeo explícito | 100% | Fila 1, exec 34 `success` |
| Bug #5 (mapeo de columnas Postgres) | 100% | Error reproducido y resuelto |
| Workflows fuera de git, sin rastro en el historial | 100% | `git log --all -- 'n8n/workflows/*'` vacío |
| Hook bloquea lo que debe, sin falsos positivos | 95% | 5 casos probados; una regex siempre es mejorable |
| `Log to PostgreSQL` dentro del flujo completo | 0% | Requiere HubSpot |
