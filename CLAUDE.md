# CLAUDE.md — Portafolio-Publico

Contexto permanente del proyecto. Se auto-carga en cada sesión: **no hay que repegar contexto**.

## ESTADO VERIFICADO (no lo re-audites)

- **n8n v2.31.6** en Docker, contenedor `portafolio-publico-n8n-1`, puerto `5678`, PostgreSQL compartido. Login REST API OK (`admin@portafolio.ai`).
- **Workflow "Lead Qualification"** (`92fIV59ijURIYfwT`, 17 nodos, 0 deshabilitados) **activo**.
- **E2E completo verificado**: WARM (exec 46 SUCCESS), HOT con aprobacion (exec 48 SUCCESS).
- `POST /webhook/lead-qualification` responde **200** con `{"received":true}` (Fast ACK). **No romper esto.**
- **IA**: Groq (`llama-3.3-70b-versatile`) vía HTTP Request node. OpenAI sin saldo (429).
- **PostgreSQL**: 10 migraciones ejecutadas, tablas `lead_log` (3 registros) y `error_log` funcionales.
- **Backend**: `/health`, `/api/auth/login`, `/api/leads` responden 200.
- **Frontend**: build Next.js 14.2.35 OK. Faltan rutas billing/invoices/usage/activity.
- **Testing**: 0 tests escritos.

### Credenciales n8n

| Credencial | ID | Estado |
|---|---|---|
| PostgreSQL DB | `1SSa86iJODaXpkD6` | Funcional |
| LLM API (Groq) — `httpHeaderAuth` | `5mpbT73GTHmK5DJ9` | Key real cargada |
| Slack API | `aEsbKrH2FsoB9UHJ` | Token real `xoxb-116...QtD`, canal `C0BJYN0QKPT` |
| HubSpot App Token | `ABfLC3myrfeFGWOW` | Token real `pat-na2-4...41c`, portal `246823552` |

> Las credenciales estan cargadas con valores reales. El E2E HOT se verifico con HubSpot (`vid: 525347024611`) y Slack (mensaje enviado al canal).

## Stack

- **Backend**: Node.js + Express, PostgreSQL (`pg` pool), JWT. Config vía `backend/src/config/index.js` (dotenv con path absoluto `__dirname`).
- **Frontend**: Next.js 14.2.35 (App Router).
- **Automatización**: n8n v2.31.6 (Docker).
- **DB**: PostgreSQL 16 (Docker), RLS habilitado.
- **Infra**: Docker Compose (`docker-compose.yml`, `docker-compose.prod.yml`), certs self-signed en `certs/`.
- **Externos**: OpenAI, Slack, HubSpot, Stripe (billing, fuera del flujo de leads).

## Fuente de verdad (leer antes de auditar)

- `docs/AUDITORIA_REALIDAD.md`
- `docs/PLAN_REMEDIACION.md`
- `docs/REMEDIACION_COMPLETA.md`
- `docs/VALIDACION_RUNTIME.md`
- `docs/SPRINT1_N8N.md`
- `docs/SPRINT2_SERVICIOS_EXTERNOS.md`
- `docs/ARQUITECTURA.md`
- `docs/PRODUCCION_CHECKLIST.md`

## Repo PÚBLICO — qué nunca se commitea

`origin` es público (`github.com/BhrayanM/Portafolio`). `SECURITY.md` §1 manda.

**Nunca a git:** exports de workflows n8n (`.json`), grafo real / Code nodes, prompts de
producción, credential IDs, tokens, URLs de webhook con host no local, cadenas de conexión
Postgres, PII.

- El export del workflow se queda en `n8n/workflows/` **sin trackear** (gitignored) como respaldo local.
- En la documentación, los IDs van redactados: `<cred-openai>`, `<cred-postgres>`,
  `<cred-slack>`, `<cred-hubspot>`, `<workflow-id>`.
- `.git/hooks/pre-commit` bloquea todo lo anterior. Vive fuera del control de versiones:
  **si clonas el repo de nuevo, hay que reinstalarlo.**

## n8n 2.x: publicar el borrador (CRÍTICO)

n8n v2.31.6 separa **borrador** (`workflow_entity.nodes`) de **versión activa**
(`workflow_entity.activeVersionId` → `workflow_history`). La ejecución usa la versión activa.

- `PATCH /rest/workflows/:id` **solo edita el borrador**: no cambia nada en runtime.
- `PATCH {"active": false}` es un **no-op silencioso** (devuelve `active: true`).
- Reiniciar el contenedor **no** recarga el borrador.

Tras cada edición del workflow hay que publicar:

```bash
POST /rest/workflows/{id}/deactivate            # body {}
POST /rest/workflows/{id}/activate              # body {"versionId": "<workflow_entity.versionId>"}
```

## Flujo Lead Qualification

```
Webhook → Fast ACK → Sanitize & Validate → OpenAI Score Lead → Parse AI Response → Is Hot?
   ├── true  → Human Approval (Slack) → Wait for Approval → Check Approval → Is Approved?
   │              ├── true  → Upsert HubSpot
   │              └── false → Done (Rejected)
   └── false → Upsert HubSpot
Upsert HubSpot → Log to PostgreSQL → Done
Error Trigger → Format Error → Log Global Error
```

**Ambas ramas convergen en HubSpot**: sin token de HubSpot no existe ningún camino E2E completo.

### Webhook-waiting (Aprobacion HOT)

El nodo `Wait for Approval` se reanuda vía GET al webhook-waiting URL con query params:
```
GET /webhook-waiting/{executionId}?signature={sig}&approved=true
```
El nodo `Check Approval` acepta `data.query?.approved`, `data.body?.approved` y `data.approved`.
Usar POST con `{"approved":true}` en body tambien funciona.

## Reglas de trabajo

- **Sé máximamente conciso**: respuestas cortas, sin relleno, sin repetir, sin resúmenes largos. Reporta solo hechos con evidencia. Mínimos tokens posibles.
- **Nada de mocks, placeholders, TODO, ni tareas marcadas OK sin evidencia** (execution ID + status `success` de n8n).
- **Checkpoint git antes de tocar archivos.**
- **No romper lo validado**: Fast ACK, webhook, estructura de nodos.
- **Ante un bloqueo**: detenerse, mostrar evidencia, proponer la solución más segura.
- **Secretos**: usar las keys desde `.env` / credenciales de n8n. **NUNCA imprimirlas** en consola ni en docs.
- Si falta una credencial: marcar la integración como `PENDIENTE - REQUIERE CREDENCIAL REAL`, documentar evidencia y continuar con las demás.
- Rol operativo: Integration Engineer + DevOps + QA.

## Comandos útiles

```bash
# Estado de contenedores
docker ps

# Login n8n REST API (requiere header browser-id en peticiones siguientes)
curl -s -c cookie.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@portafolio.ai","password":"<N8N_ADMIN_PASSWORD>"}'

# Disparar el webhook de leads
bash scripts/test-lead-webhook.sh

# Ejecuciones del workflow
curl -s -b cookie.txt "http://localhost:5678/rest/executions?filter=%7B%22workflowId%22%3A%22<workflow-id>%22%7D"
```

## Fuera de alcance actual

- **Stripe / billing**: no forma parte del flujo de leads.
