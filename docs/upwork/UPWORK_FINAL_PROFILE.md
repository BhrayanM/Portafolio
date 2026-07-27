# Platform Profile Source — AI Automation Developer

> Current, evidence-based copy for freelance platforms. Use this file for Contra,
> Fiverr, and future Upwork updates. It intentionally avoids client claims,
> unverified metrics, certifications, and provider-specific LLM claims.

---

## Professional title

```
AI Automation Developer — n8n, AI Agents & CRM Workflows
```

## Headline / short bio

```
I build production-oriented AI automation systems: reliable workflows, API integrations, CRM operations, and human-in-the-loop controls.
```

## About / overview

```
I build production-oriented AI automation systems for B2B SaaS and service operations.

My work goes beyond isolated workflows: I design the orchestration, backend APIs,
database layer, integrations, and containerized infrastructure that make automation
reliable, observable, and maintainable.

Services:
- AI workflow and agent orchestration with n8n
- Lead qualification and CRM automation with human approval where it matters
- API integrations, webhook-driven systems, and backend services
- WhatsApp and voice automation with controlled human handoff
- PostgreSQL persistence, idempotent processing, error handling, and Docker deployment

Selected systems include a Lead Qualification Engine, a bilingual AI Voice Receptionist
(EN/ES), a WhatsApp Ecommerce Agent, and appointment automation.

Core stack: n8n, Node.js, Express, PostgreSQL, Docker, REST APIs, HubSpot, Twilio,
WhatsApp, Slack, Next.js, TypeScript, and LLM orchestration.

Spanish native · English professional. I build bilingual systems by design, not by translation.
```

## Services

1. AI workflow automation and agent orchestration
2. CRM and lead-operations automation
3. API and webhook integrations
4. WhatsApp and voice automation
5. Automation backends, data persistence, and deployment infrastructure

## Skills

Prioritize platform-supported equivalents in this order:

1. n8n
2. Workflow Automation
3. AI Agent Development
4. CRM Automation
5. API Integration
6. HubSpot
7. Node.js
8. PostgreSQL
9. Docker
10. Webhooks
11. REST API
12. JavaScript
13. TypeScript
14. Twilio
15. WhatsApp
16. Slack
17. Artificial Intelligence
18. Business Process Automation
19. Chatbot Development
20. Event-driven Architecture

## Portfolio

### 1. Lead Qualification Engine

**Title**

```
Lead Qualification Engine — AI Workflow, CRM Integration & Human Approval
```

**Description**

```
Designed an event-driven lead qualification system that receives leads by webhook,
sanitizes and classifies them with an LLM, routes them by category, and synchronizes
approved records with a CRM.

Key engineering patterns:
- Human approval gate for HOT leads
- Idempotent CRM upserts and deduplication by business identity
- Persistent operational records and error logging in PostgreSQL
- Scheduled follow-up for non-HOT lead paths

Stack: n8n, HubSpot, Slack, PostgreSQL, Docker, webhooks, and LLM orchestration.
```

### 2. Bilingual AI Voice Receptionist (EN/ES)

**Title**

```
Bilingual AI Voice Receptionist (EN/ES) — Scheduling & Human Escalation
```

**Description**

```
Designed a bilingual voice automation system that detects English or Spanish during
the call, validates intent, and routes requests to calendar and commerce tools.

It supports availability, booking, lookup, cancellation, rescheduling, and controlled
escalation to a person. The design prioritizes low latency, deterministic routing for
known intents, and validation before calendar writes.

Stack: n8n, voice AI, Calendar API, Shopify, WhatsApp, webhooks, and Docker.
```

### 3. WhatsApp Ecommerce Agent

**Title**

```
WhatsApp Ecommerce Agent — Order Lookup, Conversation Memory & Human Handoff
```

**Description**

```
Designed a conversational customer-support workflow for WhatsApp with real-time order
lookup, FAQ handling, persistent conversation context, and controlled human handoff.

The system uses fast acknowledgement, message-ID deduplication, bounded tool selection,
and persistent error logging to make messaging automation reliable.

Stack: n8n, Twilio WhatsApp API, Shopify, PostgreSQL, Docker, and LLM orchestration.
```

### 4. Appointment Automation

**Title**

```
Appointment Automation — CRM Synchronization & Auditable Event Handling
```

**Description**

```
Designed an event-driven post-appointment workflow that normalizes outcomes,
upserts CRM records, writes an auditable persistent log, and notifies the team.

The workflow is designed for idempotent, retry-safe processing so repeated events
converge to the same CRM state instead of creating duplicate work.

Stack: n8n, PostgreSQL, CRM APIs, webhooks, Docker, and team notifications.
```
