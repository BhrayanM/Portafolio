# Upwork Application Guide — Phase 1

> Guía paso a paso para aplicar manualmente la optimización del perfil.
> Video Introduction excluded — Phase 2.

---

## Orden recomendado

| Paso | Sección | Tiempo estimado |
|---|---|---|
| 1 | Title | 1 min |
| 2 | Overview | 3 min |
| 3 | Portfolio | 5 min |
| 4 | Skills | 3 min |
| 5 | Project Catalog | 5 min |
| | **Total** | **~17 min** |

---

## 1. Title

**Ruta en Upwork:**
Settings > Profile > Title

**Documento fuente:**
`docs/upwork/UPWORK_FINAL_PROFILE.md` — sección TITLE

**Texto a copiar:**
```
AI Automation Developer — n8n, AI Agents & CRM Workflows
```

**Validar antes de guardar:**
- [ ] Sin errores de tipeo
- [ ] Sin caracteres extraños
- [ ] El dash es un em dash (—) no un guion normal (-)

---

## 2. Overview

**Ruta en Upwork:**
Settings > Profile > Overview

**Documento fuente:**
`docs/upwork/UPWORK_FINAL_PROFILE.md` — sección OVERVIEW

**Texto a copiar:**

```
I build AI automation systems — from n8n workflows to custom AI agents — that replace manual processes and scale your operations.

I specialize in three areas:

1. AI-Powered Workflows — n8n automations that connect your tools (CRM, email, Slack, Shopify, WhatsApp) into one intelligent pipeline.

2. AI Agents — custom agents that qualify leads, analyze data, and trigger actions without human intervention.

3. CRM Automation — HubSpot and Slack integrations that keep your team synced and your leads moving.

Every system I build includes:
→ Clean architecture — scalable, documented, maintainable
→ Error handling and retry logic
→ API integration ready
→ No-code/low-code friendly for your team

My stack: n8n, OpenAI, Python, HubSpot, Twilio, WhatsApp, Slack, JavaScript, PostgreSQL, Docker.

Let me know what you're trying to automate — I'll tell you if it's a fit.
```

**Validar antes de guardar:**
- [ ] Las primeras 2 líneas venden el problema (no solo tecnología)
- [ ] Sin métricas falsas ni clientes inventados
- [ ] Sin exageraciones ni claims no verificables
- [ ] El inglés suena natural (leer en voz alta)
- [ ] Los 3 puntos usan el mismo formato (em dash —)
- [ ] Las flechas (→) se ven correctamente

---

## 3. Portfolio

**Ruta en Upwork:**
Settings > Profile > Portfolio > Add / Edit projects

**Orden correcto (de arriba a abajo):**

1. **AI Lead Qualification Engine — n8n, OpenAI, HubSpot & Slack**
2. **AI Lead Engine — Complete Automation Architecture**
3. **RecepcionVirtual — Bilingual AI Voice Receptionist**

> Si ya existen proyectos, reordenarlos. Si no, crearlos en este orden.

### Proyecto 1

**Documento fuente:**
`UPWORK_FINAL_PROFILE.md` — Portfolio > Proyecto 1

**Título:**
```
AI Lead Qualification Engine — n8n, OpenAI, HubSpot & Slack
```

**Descripción:**
```
Built an automated lead qualification system that processes incoming leads, scores them with AI, and routes them to the right CRM pipeline without human intervention.

Tech stack: n8n, OpenAI (Llama 3.3 via Groq), HubSpot, Slack, PostgreSQL

What it does:
- Receives webhook leads → sanitizes → scores with AI
- HOT leads → Slack approval → HubSpot upsert
- WARM/COLD leads → HubSpot directly
- All decisions logged to PostgreSQL with full audit trail

This is my core automation pattern — adaptable to any CRM, notification channel, or scoring model.

Screenshots available upon request.
```

**Tags/Categorías:** n8n, OpenAI, HubSpot, Automation, Lead Generation

### Proyecto 2

**Documento fuente:**
`UPWORK_FINAL_PROFILE.md` — Portfolio > Proyecto 2

**Título:**
```
AI Lead Engine — Complete Automation Architecture
```

**Descripción:**
```
Designed and built a three-layer AI automation architecture: Intake → Supervisor → Operations.

Handles lead ingestion, AI-based triage, and automated follow-up across multiple channels.

Architecture:
- Intake layer: normalizes data from any source (web forms, API, email)
- Supervisor layer: scores and routes with AI (OpenAI LLM)
- Ops layer: executes actions (Slack notification, HubSpot update, email)

Tech stack: n8n, OpenAI, PostgreSQL, Slack, HubSpot, Docker

Screenshots available upon request.
```

**Tags/Categorías:** n8n, OpenAI, Automation Architecture, HubSpot

### Proyecto 3

**Documento fuente:**
`UPWORK_FINAL_PROFILE.md` — Portfolio > Proyecto 3

**Título:**
```
RecepcionVirtual — Bilingual AI Voice Receptionist
```

**Descripción:**
```
AI-powered voice receptionist that handles incoming calls 24/7 in English and Spanish.

Qualifies callers, captures lead information, and routes to the right person or takes messages — all without human intervention.

Tech stack: Twilio, OpenAI, n8n, PostgreSQL

Screenshots available upon request.
```

**Tags/Categorías:** Twilio, OpenAI, Voice AI, Automation

**Validar antes de guardar:**
- [ ] Los 3 proyectos están en el orden correcto
- [ ] Los títulos coinciden exactamente con el documento fuente
- [ ] Las descripciones no tienen errores de tipeo
- [ ] Las tecnologías asignadas coinciden con el stack real
- [ ] "Screenshots available upon request" está presente en los 3

---

## 4. Skills

**Ruta en Upwork:**
Settings > Profile > Skills

**Documento fuente:**
`docs/upwork/UPWORK_FINAL_PROFILE.md` — sección SKILLS

**Orden recomendado (Upwork permite hasta 20):**

| Prioridad | Skill |
|---|---|
| 1 | n8n |
| 2 | OpenAI API |
| 3 | Workflow Automation |
| 4 | AI Agent Development |
| 5 | CRM Automation |
| 6 | API Integration |
| 7 | HubSpot |
| 8 | Python |
| 9 | Slack |
| 10 | WhatsApp |
| 11 | Twilio |
| 12 | PostgreSQL |
| 13 | Docker |
| 14 | JavaScript |
| 15 | Artificial Intelligence |
| 16 | Automation |
| 17 | Business Process Automation |
| 18 | Prompt Engineering |
| 19 | Chatbot Development |
| 20 | Lead Generation Automation |

> Si un skill no está disponible en el catálogo de Upwork, saltar al siguiente de la lista.

**Validar antes de guardar:**
- [ ] n8n está primero
- [ ] OpenAI API está segundo
- [ ] Los 3 Automation keywords están arriba (Workflow, AI Agent, CRM)
- [ ] No hay skills duplicados
- [ ] FFmpeg está excluido (baja prioridad, no entra en top 20)

---

## 5. Project Catalog

**Ruta en Upwork:**
Project Catalog > Create/Edit Project

**Documento fuente:**
`docs/upwork/UPWORK_FINAL_PROFILE.md` — sección PROJECT CATALOG

**Título:**
```
I will build an n8n AI Agent to automate Shopify and WhatsApp workflows
```

**Categoría:**
Web Development > Automation / AI Development > Agent Development

**Precio:** $450 (mantener precio actual)

**Tiempo de entrega:** 7-14 days

**Descripción:**
```
I will build a custom n8n AI agent that automates your Shopify and WhatsApp workflows.

What the agent can do:
- Monitor Shopify orders and send WhatsApp notifications
- Answer customer inquiries about order status via WhatsApp
- Automate follow-up messages after purchase
- Escalate complex issues to your team

What's included:
- Custom n8n workflow built to your requirements
- OpenAI integration for intelligent responses
- Shopify API connection
- WhatsApp Business API via Twilio
- Error handling and logging
- 7-14 day delivery

Let me know your specific requirements before ordering.
```

**Validar antes de guardar:**
- [ ] Precio sin cambios ($450)
- [ ] Tiempo de entrega realista (7-14 días)
- [ ] Descripción deja claro que es un agente AI, no solo una integración
- [ ] Sin promesas de resultados específicos (X leads, Y% conversión)
- [ ] Categoría seleccionada correctamente
- [ ] Proyecto marcado como activo (no borrador)

---

## Checklist final

> Cambios de Phase 1 aplicados manualmente y verificados en Upwork.

- [x] **Title actualizado** — `AI Automation Developer — n8n, AI Agents & CRM Workflows`
- [x] **Overview reemplazado** — hook fuerte, 3 áreas, stack, CTA
- [x] **Portfolio actualizado** — 3 proyectos en orden correcto, descripciones finales
- [x] **Skills ordenadas** — top 20 según la lista priorizada
- [x] **Project Catalog activo** — visible y con descripción final
- [x] **Vista pública revisada** — perfil completo sin errores visibles

---

## Estado final

```
UPWORK PHASE 1 — COMPLETED
```

### Pendiente para Phase 2
- Video Introduction (grabar y subir)
- Performance Review y ajustes post-review
