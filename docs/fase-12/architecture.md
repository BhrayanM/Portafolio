# FASE 12 — Marketplace de Automatizaciones

## Automatizaciones Disponibles

| Automatización | Precio | Workflow n8n |
|---------------|--------|-------------|
| Lead Qualification | Incluido | `n8n/workflows/lead-qualification.json` |
| WhatsApp Agent | Incluido Pro+ | `n8n/workflows/ai-whatsapp-agent.json` |
| Voice Receptionist | Incluido Pro+ | `n8n/workflows/ai-voice-agent.json` |
| Sales Chat | Incluido | `n8n/workflows/ai-sales-agent.json` |
| Appointment Automation | Incluido | Próximamente |
| Invoice Automator | Add-on | Próximamente |
| Email Sequencer | Add-on | Próximamente |

## API de Instalación

```http
POST /api/marketplace/install
Content-Type: application/json
Authorization: Bearer <token>

{
  "workflow": "lead-qualification",
  "tenant_id": "uuid"
}
```

## Flujo de Instalación 1-click

```
Usuario → Marketplace → "Instalar"
                        ↓
          Backend → n8n API → Importar workflow JSON
                        ↓
          Configurar webhooks con tenant_id
                        ↓
          Activar workflow
                        ↓
          Registrar en workflow_runs
                        ↓
          "Automatización instalada correctamente"
```

## Arquitectura

```
Marketplace
    │
    ├── Catálogo de automatizaciones (JSON)
    │
    ├── Instalador (Backend → n8n REST API)
    │   POST /rest/workflows → Importar JSON
    │   PATCH /rest/workflows/:id → Configurar
    │   POST /rest/workflows/:id/activate → Activar
    │
    └── Tracking de uso por tenant
```
