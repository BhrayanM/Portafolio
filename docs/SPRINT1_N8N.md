# Sprint 1: n8n Integration (Lead Qualification Workflow)

## Goal

Connect n8n (v2.31.6) to the existing backend via webhook to automate lead qualification: receive lead → sanitize → AI score → Slack approval (if HOT) → HubSpot upsert → PostgreSQL log.

## Result

**Parcialmente completado.** Workflow activo y funcional en estructura (webhook responde 200, nodos conectados correctamente), pero requiere credenciales reales de OpenAI, Slack, y HubSpot para ejecución completa.

## Components Created / Configured

### n8n Setup
- n8n v2.31.6 corriendo en Docker (contenedor `portafolio-n8n`), PostgreSQL compartido.
- Owner configurado: `admin@portafolio.ai` / `<N8N_ADMIN_PASSWORD>`.
- Login funcional vía REST API (cookie auth, `n8n-auth` JWT).

### Workflow: Lead Qualification (17 nodos)
| Node | Type | Status |
|------|------|--------|
| Webhook | n8n-nodes-base.webhook | ✅ `POST /webhook/lead-qualification` responde 200 |
| Fast ACK | n8n-nodes-base.respondToWebhook | ✅ Responde `{"received":true}` inmediato |
| Sanitize & Validate | n8n-nodes-base.code | ✅ Valida email, sanitiza campos |
| OpenAI Score Lead | n8n-nodes-base.httpRequest | ❌ **PENDIENTE - REQUIERE API KEY REAL** (401: placeholder) |
| Parse AI Response | n8n-nodes-base.code | ✅ Estructural (depende de nodo anterior) |
| Is Hot? | n8n-nodes-base.if | ✅ Clasifica HOT/WARM/COLD |
| Human Approval (Slack) | n8n-nodes-base.slack | ❌ **PENDIENTE - REQUIERE CREDENCIAL REAL** |
| Wait for Approval | n8n-nodes-base.wait | ✅ Webhook de reanudación |
| Check Approval | n8n-nodes-base.code | ✅ Evalúa aprobación/rechazo |
| Is Approved? | n8n-nodes-base.if | ✅ Rama aprobado/rechazado |
| Upsert HubSpot | n8n-nodes-base.hubspot | ❌ **PENDIENTE - REQUIERE CREDENCIAL REAL** |
| Log to PostgreSQL | n8n-nodes-base.postgres | ✅ Vinculado, prueba pendiente |
| Done | n8n-nodes-base.noOp | ✅ |
| Done (Rejected) | n8n-nodes-base.noOp | ✅ |
| Error Trigger | n8n-nodes-base.errorTrigger | ✅ Captura errores globales |
| Format Error | n8n-nodes-base.code | ✅ |
| Log Global Error | n8n-nodes-base.postgres | ✅ |

### Credentials Created
| Credential | ID | Status |
|-----------|----|--------|
| PostgreSQL DB | `<cred-postgres>` | ✅ Funcional |
| OpenAI API | `<cred-openai>` | ❌ Placeholder (`sk-place...-key`) |
| Slack API | `<cred-slack>` | ❌ Placeholder |
| HubSpot API | `<cred-hubspot>` | ❌ Placeholder |

## Bugs Fixed

### Fast ACK - Invalid JSON in Response Body
- **Problema**: expresión `={"received": true, "timestamp": $json.body.timestamp || Date.now()}` no era JSON válido por el `|| Date.now()` y por `$json.body.timestamp` resolviendo a `undefined`.
- **Solución**: simplificado a `={"received":true}` (estático). El timestamp no es necesario en un ACK inmediato.
- **Evidencia**: webhook devuelve `{"received":true}` HTTP 200.
- **Commit/Rama**: `remediacion/v2` (PATCH directo a workflow vía API).

### Dotenv Path
- `backend/src/config/index.js`: `path.resolve(__dirname, '../../../.env')`
- `backend/src/index.js`: dotenv carga con `__dirname`
- `backend/src/db.js`: usa `config.db` en vez de `process.env`

## Validation Evidence
- `POST /webhook/lead-qualification` → HTTP 200, body `{"received":true}` (14ms)
- Fast ACK node ejecuta sin error
- Sanitize & Validate node ejecuta sin error
- OpenAI falla con 401 (esperado, placeholder)
- Workflow activo: `active: true`, webhook registrado

## Blockers

1. **OpenAI API Key real**: necesaria para scoring de leads. Regenerar en https://platform.openai.com/api-keys y actualizar credential `<cred-openai>`.
2. **Slack API Token/Bot**: necesario para notificación de aprobación humana. Configurar app en Slack, obtener token, actualizar credential `<cred-slack>`.
3. **HubSpot API Key**: necesario para upsert de contactos. Obtener de HubSpot Settings > Integrations > API Key, actualizar credential `<cred-hubspot>`.

## Next Steps (Sprint 2)

1. Obtener y configurar las 3 credenciales reales.
2. Probar flujo completo: webhook → OpenAI → Slack → HubSpot → PostgreSQL.
3. Verificar tabla `lead_log` y `error_log` en PostgreSQL.
4. Documentar en `docs/SPRINT2_SERVICIOS_EXTERNOS.md`.
