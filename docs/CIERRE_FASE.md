# Cierre de Fase — Lead Qualification E2E

## Estado del Proyecto

El flujo Lead Qualification opera con 4 servicios externos funcionales:
Groq, Slack, HubSpot y PostgreSQL. OpenAI sin saldo (429), reemplazado
por Groq. Stripe fuera del alcance del flujo de leads.

## Arquitectura Actual

```
POST /webhook/lead-qualification
  → Fast ACK (200 {received:true})
  → Sanitize & Validate (Code node)
  → Groq LLM (HTTP Request a api.groq.com)
  → Parse AI Response (Code node)
  → Is Hot? (IF node, typeVersion 2.2)
     ├── HOT → Slack → Wait → Check Approval → Is Approved?
     │           ├── true → Upsert HubSpot → Log → Done
     │           └── false → Done (Rejected)
     └── WARM/COLD → Upsert HubSpot → Log → Done
  → Error Trigger → Format Error → Log Global Error
```

## Dependencias

- Docker + Docker Compose
- n8n 2.31.6 (imagen n8nio/n8n:latest)
- PostgreSQL 15 Alpine
- Backend: Node.js + Express
- Frontend: Next.js 14.2.35

## Servicios Externos

| Servicio | Tipo | Estado |
|---|---|---|
| Groq (llama-3.3-70b-versatile) | LLM | Funcional |
| Slack (bot token) | Notificaciones | Funcional, canal C0BJYN0QKPT |
| HubSpot (private app token) | CRM | Funcional, portal 246823552 |
| OpenAI (gpt-4o-mini) | LLM | Sin saldo (429) |

## Variables de Entorno Requeridas

Ver `.env.example`. Variables críticas:
- `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`
- `GROQ_API_KEY` (activo) / `OPENAI_API_KEY` (sin saldo)
- `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`
- `HUBSPOT_ACCESS_TOKEN`

## Procedimiento E2E

### WARM/COLD (sin aprobacion)

```bash
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","message":"consulta generica"}'
```

### HOT (con aprobacion)

```bash
# 1. Enviar lead HOT
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"email":"hot@example.com","name":"CEO","message":"Necesito contratar urgente"}'

# 2. Obtener execution ID y signature del webhook-waiting
curl -s -b cookie.txt "http://localhost:5678/rest/executions?limit=1"

# 3. Aprobar
curl -s -G "http://localhost:5678/webhook-waiting/{execId}" \
  --data-urlencode "approved=true" \
  --data-urlencode "signature={sig}"
```

## E2E Verificados

| Tipo | Execution | HubSpot | Lead_log | Status |
|---|---|---|---|---|
| WARM | 46 | vid:525347024611 | id=3, warm | success |
| HOT | 48 | contact created | id=4, approved | success |

## Decisiones Tecnicas

1. **Groq sobre OpenAI**: OpenAI sin saldo (429). API compatible, solo
   cambiar URL y credencial. Node renombrado "OpenAI Score Lead" pero
   apunta a api.groq.com.
2. **Check Approval multi-formato**: El webhook-waiting reanuda con
   GET query params. Check Approval acepta `data.approved`,
   `data.body.approved` y `data.query.approved`.
3. **COLD→OPEN**: `hs_lead_status` asigna OPEN a COLD leads.
   UNQUALIFIED reservado para spam/descartados.
4. **PostgreSQL resolveData**: El nodo PostgreSQL usa
   `$('Parse AI Response').item.json` para evitar NULLs por
   sustitucion de item con `resolveData`.
5. **Publicacion n8n 2.x**: PATCH solo edita borrador. Requiere
   deactivate + activate explicito con versionId.

## Deuda Tecnica

- Sin tests automatizados (0 tests)
- Frontend: rutas billing/invoices/usage/activity no implementadas
- Backend: health endpoint responde pero backend no se usa en el flujo
  de leads (n8n maneja todo el pipeline)
- OpenAI con saldo: solo cambiar URL a api.openai.com y credencial
