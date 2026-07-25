# FASE 6 — Agentes IA

## Agentes Implementados

### 1. AI Sales Agent (Web Chat)

| Aspecto | Detalle |
|---------|---------|
| Webhook | `/webhook/ai-sales-chat` |
| Modelo | gpt-4o-mini (temperatura 0.5) |
| Memoria | Por sesión (session_id) |
| Tools | qualify_lead, schedule_demo, escalate_human |
| Workflow | `n8n/workflows/ai-sales-agent.json` |

**Flujo:**
```
Usuario → Chat Widget → Webhook → Session → OpenAI → Reply
```

### 2. AI WhatsApp Support Agent

| Aspecto | Detalle |
|---------|---------|
| Webhook | `/webhook/whatsapp-agent` |
| Modelo | gpt-4o-mini (temperatura 0.3) |
| ACK | Inmediato (anti-duplicación por message_id) |
| Tools | lookup_contact, create_ticket, escalate_human |
| Workflow | `n8n/workflows/ai-whatsapp-agent.json` |

**Flujo:**
```
WhatsApp → Webhook → Fast ACK → Dedup → OpenAI → Send WhatsApp
```

### 3. AI Voice Receptionist (Twilio/Vapi)

| Aspecto | Detalle |
|---------|---------|
| Webhook | `/webhook/voice-receptionist` |
| Modelo | gpt-4o-mini (temperatura 0.1) |
| Idiomas | ES, EN (detección automática) |
| Intenciones | schedule, reschedule, cancel, lookup, availability, order_status |
| Workflow | `n8n/workflows/ai-voice-agent.json` |

**Flujo:**
```
Llamada → Twilio → Webhook → Detect Language/Intent → Route → Tool → Reply
```

## System Prompts

Los prompts de sistema están en cada workflow n8n y en:
- `docs/fase-1/prompts/lead-scoring-system.md`

## Variables de Entorno

```bash
# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Twilio (Voice)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Vapi (alternativa Voice AI)
VAPI_API_KEY=
VAPI_AGENT_ID=
```
