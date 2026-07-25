# CLAUDE.md — Portafolio-Publico

Contexto permanente del proyecto. Se auto-carga en cada sesión: **no hay que repegar contexto**.

## ESTADO VERIFICADO (no lo re-audites)

- **n8n v2.31.6** en Docker, contenedor `portafolio-publico-n8n-1`, puerto `5678`, PostgreSQL compartido. Login REST API OK (`admin@portafolio.ai`).
- **Workflow "Lead Qualification"** (`92fIV59ijURIYfwT`, 17 nodos) **activo**.
- `POST /webhook/lead-qualification` responde **200** con `{"received":true}` (Fast ACK). **No romper esto.**
- El flujo avanza hasta el nodo OpenAI. Fallo 401 histórico = credencial vacía (ver abajo).
- **PostgreSQL**: 10 migraciones ejecutadas, 9 tablas, seeds insertados, RLS activo (6 políticas). Credencial n8n `1SSa86iJODaXpkD6` funcional.
- **Backend**: `/health`, `/api/auth/login`, `/api/leads` responden 200.
- **Frontend**: build Next.js 14.2.35 OK. Faltan rutas billing/invoices/usage/activity.
- **Testing**: 0 tests escritos.

### Credenciales n8n

| Credencial | ID | Estado |
|---|---|---|
| PostgreSQL DB | `1SSa86iJODaXpkD6` | Funcional |
| OpenAI API (`httpHeaderAuth`) | `5mpbT73GTHmK5DJ9` | Key real cargada desde `.env` (Sprint 2) |
| Slack API | `aEsbKrH2FsoB9UHJ` | **PENDIENTE — REQUIERE CREDENCIAL REAL** |
| HubSpot API | `nsmboIIIBBp8pCRW` | **PENDIENTE — REQUIERE CREDENCIAL REAL** |

> Las credenciales "placeholder" en realidad estaban **vacías**: contenían el centinela
> `__n8n_BLANK_VALUE_<uuid>` de n8n, no una key falsa.

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
curl -s -b cookie.txt "http://localhost:5678/rest/executions?filter=%7B%22workflowId%22%3A%2292fIV59ijURIYfwT%22%7D"
```

## Fuera de alcance actual

- **Stripe / billing**: no forma parte del flujo de leads.
