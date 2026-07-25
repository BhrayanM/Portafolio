# FASE 1 — Motor de Automatización (Core)

## Arquitectura

```
Tally Form ──Webhook──► n8n ──► OpenAI (score + categoría)
                            │
                            ├──► HubSpot (upsert contacto)
                            │
                            ├──► Slack (notificación Hot)
                            │
                            └──► PostgreSQL (log de errores)
```

## Flujo del Workflow

```
Webhook ──► Fast ACK ──► Sanitize ──► OpenAI ──► Parse AI ──► Is Hot?
                                                                │
                                                  ┌─────────────┴─────────────┐
                                                  ▼                           ▼
                                           Human Approval              Upsert HubSpot
                                           (Slack + Wait)                  │
                                                  │                   Log PostgreSQL
                                           Check Approval                 │
                                                  │                     Done
                                        ┌─────────┴────────┐
                                        ▼                   ▼
                                   Upsert HubSpot       Done
                                        │
                                   Log PostgreSQL
                                        │
                                      Done

Error Trigger (Global) ──► Format Error ──► Log PostgreSQL
```

## Nodos del Workflow

| # | Nodo | Tipo | Propósito |
|---|------|------|-----------|
| 1 | Webhook (Tally) | Webhook | Recibe POST de Tally |
| 2 | Fast ACK | Respond to Webhook | Responde 200 inmediato (anti-duplicación) |
| 3 | Sanitize & Validate | Code | Anti-injection, extracción, validación |
| 4 | OpenAI Score Lead | HTTP Request | Clasifica lead con IA |
| 5 | Parse AI Response | Code | Extrae score/categoría del JSON |
| 6 | Is Hot? | IF | Router: Hot → Slack, Warm/Cold → HubSpot |
| 7 | Human Approval | Slack | Envía notificación con botones |
| 8 | Wait for Approval | Wait | Espera respuesta de Slack |
| 9 | Check Approval | Code | Verifica si aprobó o rechazó |
| 10 | Is Approved? | IF | Router por decisión humana |
| 11 | Upsert HubSpot | HubSpot | Crea/actualiza contacto en CRM |
| 12 | Log to PostgreSQL | PostgreSQL | Registro de ejecución |
| 13 | Error Handler | Code | Captura fallo de HubSpot |
| 14 | Error Logger | PostgreSQL | Log de error controlado |
| 15 | Error Trigger | Error Trigger | Captura errores globales |
| 16 | Log Global Error | PostgreSQL | Persiste error en DB |
| 17 | Done | NoOp | Fin del workflow |

## Configuración en n8n

### Credenciales necesarias

1. **OpenAI API**: HTTP Header Auth con header `Authorization: Bearer sk-...`
2. **HubSpot API**: Private App Token con permisos en contacts
3. **Slack API**: Bot Token con scopes: `chat:write`, `reactions:read`, `channels:history`
4. **PostgreSQL**: Conexión con user/pass al contenedor de Postgres

### Tablas PostgreSQL necesarias

```sql
CREATE TABLE IF NOT EXISTS lead_log (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  source VARCHAR(100),
  ai_score INTEGER,
  ai_category VARCHAR(10),
  ai_rationale TEXT,
  ai_business_category VARCHAR(100),
  status VARCHAR(20),
  approved_at TIMESTAMP,
  received_at BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS error_log (
  id SERIAL PRIMARY KEY,
  level VARCHAR(20),
  source VARCHAR(100),
  message TEXT,
  metadata JSONB,
  workflow_id VARCHAR(100),
  workflow_name VARCHAR(255),
  created_at BIGINT
);
```

### Variables .env para Fase 1

```bash
OPENAI_API_KEY=sk-proj-...
HUBSPOT_ACCESS_TOKEN=...
SLACK_BOT_TOKEN=...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL_ID=...
```

## Pruebas

Ver `docs/fase-1/test-harness/webhook-test.http` y `scripts/test-lead-webhook.sh`.

Casos:
1. **Lead Hot**: Debe notificar Slack → esperar aprobación → upsert HubSpot
2. **Lead Warm**: Upsert directo a HubSpot sin aprobación
3. **Lead Cold**: Upsert directo con categoría Cold
4. **Lead inválido**: Error controlado → tabla error_log
5. **Duplicado**: Mismo email → HubSpot hace upsert (no duplica)
