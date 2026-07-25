# Reporte FASE F — Servicios Externos

## Etapa

Verificación de conexiones reales con servicios externos: OpenAI, HubSpot, Slack, Stripe, Redis, RabbitMQ, Twilio, WhatsApp.

## Estado de cada servicio

| Servicio | Variable .env | Valor actual | Estado | ¿Bloqueante? |
|----------|-------------|-------------|--------|-------------|
| **PostgreSQL** | `POSTGRES_PASSWORD` | `clavesegura123` | ✅ Funcional (verificado) | No |
| **n8n** | `N8N_ENCRYPTION_KEY` | `clavesegura421` | ✅ Funcional (verificado) | No |
| **JWT** | `JWT_SECRET` | `7b2e3502...` (64 hex) | ✅ Generado real | No |
| **OpenAI** | `OPENAI_API_KEY` | `sk-proj-tu_key_aqui` | ❌ Placeholder | Sí — IA no funciona |
| **HubSpot** | `HUBSPOT_ACCESS_TOKEN` | Vacío | ❌ No configurado | Sí — CRM no conecta |
| **Slack** | `SLACK_BOT_TOKEN` | Vacío | ❌ No configurado | Sí — notificaciones rotas |
| **Stripe** | `STRIPE_SECRET_KEY` | Vacío | ❌ No configurado | Sí — facturación rota |
| **Redis** | `REDIS_HOST` | `redis` | ❌ Sin contenedor Docker | Medio — escalabilidad |
| **RabbitMQ** | No existe en .env | — | ❌ Sin contenedor ni config | Bajo — worker.js |
| **WhatsApp** | `WHATSAPP_TOKEN` | Vacío | ❌ No configurado | Medio — agente WhatsApp |
| **Twilio** | `TWILIO_ACCOUNT_SID` | Vacío | ❌ No configurado | Medio — agente voz |
| **Grafana** | `GRAFANA_ADMIN_PASSWORD` | `changeme` | ❌ Placeholder | Bajo — monitoring |

## Dónde se usa cada servicio en el código

| Servicio | Código que lo requiere | Archivo |
|----------|----------------------|---------|
| OpenAI | HTTP Request a api.openai.com | lead-qualification.json (n8n) |
| OpenAI | API call en chat completion | ai-sales-agent.json (n8n) |
| HubSpot | Upsert Contact | lead-qualification.json (n8n) |
| Slack | Send Message (aprobación humana) | lead-qualification.json (n8n) |
| PostgreSQL | Insert lead_log + error_log | lead-qualification.json (n8n) |
| PostgreSQL | Pool connection | backend/src/db.js |
| Stripe | createCheckoutSession + webhooks | backend/src/services/billing.service.js |
| Redis | Cache/session (FASE 13) | Mencionado en docs |
| RabbitMQ | Cola de procesamiento de leads | backend/src/worker.js |
| WhatsApp | Webhook + send message | ai-whatsapp-agent.json (n8n) |
| Twilio | Voice webhook + transcription | ai-voice-agent.json (n8n) |

## Análisis

**3 servicios funcionales**: PostgreSQL, n8n, JWT. Suficiente para que el backend auth y DB funcionen.

**9 servicios no funcionales**: Todos requieren tokens/keys reales de terceros que no están disponibles en el .env. De estos, 4 son bloqueantes para el flujo principal:
1. OpenAI — Sin esto, el scoring de leads no funciona
2. HubSpot — Sin esto, el CRM no recibe leads
3. Slack — Sin esto, las aprobaciones humanas no llegan
4. Stripe — Sin esto, la facturación no funciona

**Dependencias Docker no desplegadas**:
- Redis: No hay contenedor en docker-compose.yml
- RabbitMQ: No hay contenedor ni configuración

## Dependencias de servicio para el flujo completo

```
Formulario web
  → n8n webhook (POST /lead-qualification)
    → OpenAI (scoring)           ← REQUIERE API KEY
    → Slack (aprobación Hot)     ← REQUIERE TOKEN
    → HubSpot (upsert contact)   ← REQUIERE TOKEN
    → PostgreSQL (lead_log)      ← ✅ FUNCIONAL
```

## Estado actual

**3/12 funcional (25%)**

| Categoría | Total | Funcionales | % |
|-----------|-------|-------------|---|
| Core (PostgreSQL, JWT, n8n) | 3 | 3 | 100% |
| IA (OpenAI) | 1 | 0 | 0% |
| CRM (HubSpot) | 1 | 0 | 0% |
| Notificaciones (Slack) | 1 | 0 | 0% |
| Facturación (Stripe) | 1 | 0 | 0% |
| Mensajería (WhatsApp, Twilio) | 2 | 0 | 0% |
| Infra (Redis, RabbitMQ) | 2 | 0 | 0% |
| Monitoring (Grafana) | 1 | 0 | 0% |

## Pendientes

| # | Item | Prioridad | Dependencia externa |
|---|------|-----------|-------------------|
| 1 | Configurar OPENAI_API_KEY real en .env | Alta | Cuenta OpenAI con crédito |
| 2 | Configurar HUBSPOT_ACCESS_TOKEN real | Alta | Cuenta HubSpot |
| 3 | Configurar SLACK_BOT_TOKEN + SLACK_SIGNING_SECRET | Alta | App de Slack creada |
| 4 | Configurar STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET | Alta | Cuenta Stripe |
| 5 | Crear Price IDs en Stripe Dashboard | Alta | Cuenta Stripe |
| 6 | Agregar servicio Redis a docker-compose.yml | Media | — |
| 7 | Agregar servicio RabbitMQ a docker-compose.yml | Baja | — |
| 8 | Configurar tokens de WhatsApp/Twilio | Media | Meta + Twilio accounts |

## Nivel de confianza

100%

---

*Generado durante remediación. Próximo paso: FASE G (Testing) y generación de REMEDIACION_COMPLETA.md.*
