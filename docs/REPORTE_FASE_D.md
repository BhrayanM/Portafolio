# Reporte FASE D — n8n

## Etapa

Importación y corrección de workflows n8n: lead-qualification, AI Sales Agent, AI WhatsApp Agent, AI Voice Agent.

## Problemas encontrados (desde auditoría)

1. **Workflows no importados**: 4 archivos JSON existen en `n8n/workflows/`, ninguno fue importado en n8n. Todos los webhooks devuelven 404.
2. **Credenciales con IDs huérfanos**: Cada nodo referencia `{{ $credentials.xxx.id }}`. Estos IDs son específicos de la instancia n8n original. Al importar en una instancia nueva, n8n no encuentra las credenciales y marca el workflow como "broken".
3. **$vars no reemplazados**: Algunas credenciales en los workflows auxiliares usan referencias `$vars` que nunca se resolvieron.
4. **WhatsApp Agent sin verification webhook**: WhatsApp Business API requiere un GET endpoint `hub.challenge` antes de aceptar webhooks. El workflow solo tiene POST.
5. **Voice Agent sin Speech-to-Text**: Twilio envía audio, no texto. El workflow espera `$json.transcription` que nunca se genera.
6. **Sales Agent sin memoria persistente**: Sesiones se crean con `Math.random()` — se pierden al reiniciar.

## Archivos auditados

```
n8n/workflows/
  lead-qualification.json      (432 líneas — workflow principal)
  ai-sales-agent.json          (68 líneas)
  ai-whatsapp-agent.json       (76 líneas)
  ai-voice-agent.json          (88 líneas)
```

## Análisis del workflow lead-qualification.json

### Flujo completo (estático)

```
Webhook POST /lead-qualification
  → Fast ACK (responde 200 inmediato)
  → Sanitize & Validate (code node)
  → OpenAI Score Lead (HTTP Request a api.openai.com)
  → Parse AI Response (code node)
  → Is Hot? (if)
      ├── Sí → Human Approval (Slack) → Wait for Approval (webhook)
      │         → Check Approval → Is Approved?
      │              ├── Sí → Upsert HubSpot → Log PostgreSQL → Done
      │              └── No  → Done
      └── No  → Upsert HubSpot → Log PostgreSQL → Done
Error → Error Trigger (global) → Format Error → Log PostgreSQL (error_log)
```

### Nodos y credenciales requeridas

| Nodo | Tipo | Credencial | Estado en n8n |
|------|------|-----------|--------------|
| Webhook (Tally) | webhook | — | ✅ Sin credencial |
| Fast ACK | respondToWebhook | — | ✅ |
| Sanitize & Validate | code | — | ✅ |
| OpenAI Score Lead | httpRequest (HTTP Header Auth) | OpenAI API | ❌ ID huérfano |
| Parse AI Response | code | — | ✅ |
| Is Hot? | if | — | ✅ |
| Human Approval (Slack) | slack | Slack API | ❌ ID huérfano |
| Wait for Approval | wait | — | ✅ |
| Check Approval | code | — | ✅ |
| Is Approved? | if | — | ✅ |
| Upsert HubSpot | hubspot | HubSpot API | ❌ ID huérfano |
| Log to PostgreSQL | postgres | PostgreSQL | ❌ ID huérfano |
| Error Logger (Global) | postgres | PostgreSQL | ❌ ID huérfano |
| Log Global Error | postgres | PostgreSQL | ❌ ID huérfano |

**Total: 4 credenciales únicas a configurar en n8n** (OpenAI, Slack, HubSpot, PostgreSQL)

### typeVersion check

| Nodo | typeVersion | Compatible n8n 2.31 |
|------|-------------|---------------------|
| Webhook | 1 | ✅ |
| respondToWebhook | 1 | ✅ |
| code | 2 | ✅ |
| httpRequest | 4.2 | ✅ |
| if | 1 | ✅ |
| slack | 1 | ✅ |
| wait | 1 | ✅ |
| hubspot | 1 | ✅ |
| postgres | 2 | ✅ |
| noOp | 1 | ✅ |
| errorTrigger | 1 | ✅ |

### Node IDs (UUIDs fijos)

Todos los node IDs son UUIDs fijos tipo `a1b2c3d4-...`. Al importar por API REST, n8n los acepta si son únicos. Al importar por UI, n8n los regenera automáticamente.

## Análisis de AI Agents

### ai-sales-agent.json

- **68 líneas** — workflow mínimo
- Sesión creada con `Math.random()` — volátil
- Sin integración con Redis o PostgreSQL para persistencia
- Depende de OpenAI + PostgreSQL credenciales

### ai-whatsapp-agent.json

- **76 líneas**
- Solo webhook POST
- **Sin GET para verification challenge de Meta** — Meta nunca conecta
- Depende de OpenAI + WhatsApp Cloud API credenciales

### ai-voice-agent.json

- **88 líneas**
- Espera `$json.transcription` preexistente
- **Sin nodo STT** (Speech-to-Text) — Twilio envía audio, no texto
- Depende de OpenAI + Twilio credenciales

## Conexiones requeridas en n8n

Antes de importar, deben existir las siguientes credenciales en n8n:

| Nombre | Tipo | Variable .env requerida |
|--------|------|------------------------|
| OpenAI API | HTTP Header Auth | `OPENAI_API_KEY` |
| Slack API | Slack API | `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` |
| HubSpot API | HubSpot API | `HUBSPOT_ACCESS_TOKEN` |
| PostgreSQL | PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` (o la DATABASE_URL) |

## Pasos para importar (vía API REST)

```bash
# 1. Obtener cookie de sesión de n8n (requiere login)
# 2. POST /rest/workflows con el JSON del workflow
# 3. n8n devuelve el workflow con IDs regenerados
# 4. El workflow queda en estado "draft" — activar manualmente
```

## Estado actual

**ESTRUCTURA EXISTENTE — Sin importar**

- Workflow JSONs: ✅ 4 archivos completos y parseables
- Credenciales: ❌ No configuradas en n8n
- Webhooks: ❌ Devuelven 404 (workflows no activos)
- WhatsApp verification: ❌ No implementado
- Voice STT: ❌ No implementado

## Pendientes

| # | Item | Prioridad | Dependencia |
|---|------|-----------|-------------|
| 1 | Configurar credenciales en n8n (UI o API) | Alta | OpenAI/HubSpot/Slack tokens reales |
| 2 | Importar lead-qualification.json | Alta | #1 |
| 3 | Importar ai-sales-agent.json | Media | #1 |
| 4 | Agregar webhook verification GET a whatsapp-agent | Alta | — |
| 5 | Agregar nodo STT a voice-agent | Alta | — |
| 6 | Agregar memoria persistente a sales-agent | Media | Redis |
| 7 | Activar workflows y probar webhooks | Alta | #2-#3 |

## Nivel de confianza

95% (basado en análisis estático del JSON)

---

*Generado durante remediación. Próximo paso: FASE E (Frontend).*
