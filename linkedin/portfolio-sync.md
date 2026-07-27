# LinkedIn ↔ Portfolio Sync System

Maps portfolio projects to LinkedIn sections and defines the sync workflow.

---

## Purpose

Ensure every project in the portfolio is accurately represented across all
LinkedIn sections. Eliminate gaps between what exists in GitHub and what
appears on the profile.

---

## Project Mapping

### Lead Qualification Engine

| Field | Detail |
|-------|--------|
| **Repo location** | `projects/lead-qualification/` |
| **Technical purpose** | Event-driven lead pipeline with LLM scoring, human approval gates, and idempotent CRM sync |
| **LinkedIn sections** | Experience (detail), Featured (#2), Projects (#1), Skills, Posts (#1, #5, #9) |
| **Keywords** | n8n, LLM Orchestration, HubSpot, PostgreSQL, Webhooks, Lead Generation, CRM Automation, Event-driven |
| **Content types** | Build Log, Architecture, Deep Dive |

### Bilingual AI Voice Receptionist (EN/ES)

| Field | Detail |
|-------|--------|
| **Repo location** | `projects/voice-receptionist/` |
| **Technical purpose** | Conversational voice AI with real-time language detection, automated scheduling, and intelligent escalation |
| **LinkedIn sections** | Experience (detail), Featured (#3), Projects (#2), Skills, Posts (#3) |
| **Keywords** | n8n, Twilio, Voice AI, Conversational AI, Bilingual, Calendar API, Docker |
| **Content types** | Build Log, Architecture |

### WhatsApp Ecommerce Agent

| Field | Detail |
|-------|--------|
| **Repo location** | `projects/whatsapp-ecommerce-agent/` |
| **Technical purpose** | Customer communication workflow with Fast-ACK protocol, message deduplication, and controlled human handoff |
| **LinkedIn sections** | Experience (detail), Projects (#3), Skills, Posts (#6, #7) |
| **Keywords** | n8n, Twilio WhatsApp API, LLM Orchestration, Shopify, PostgreSQL, Fast-ACK, Deduplication |
| **Content types** | Build Log, Deep Dive |

### Appointment Automation

| Field | Detail |
|-------|--------|
| **Repo location** | `projects/appointment-automation/` |
| **Technical purpose** | CRM sync and appointment workflow with idempotent event handling and auditable logging |
| **LinkedIn sections** | Experience (detail), Projects (#4), Skills, Posts (#9) |
| **Keywords** | n8n, PostgreSQL, CRM API, Docker, Webhooks, Idempotent |
| **Content types** | Deep Dive |

### Cross-cutting patterns (apply to all projects)

| Pattern | LinkedIn section | Content type |
|---------|-----------------|--------------|
| Webhook-driven architecture | Skills, Experience (patterns list) | Deep Dive |
| Human-in-the-loop design | Skills, Experience (patterns list) | Deep Dive |
| Idempotent processing | Skills, Experience (patterns list) | Deep Dive |
| Event-driven automation | Skills, Experience (patterns list) | Architecture |
| Input sanitization at gateway | Experience (patterns list) | — |
| Structured logging and observability | Experience (patterns list) | — |

---

## Sync Workflow

```
[TRIGGER] New project added to portfolio
              │
              ▼
    ┌─────────────────────────────┐
    │ 1. Validate in GitHub       │
    │    - README exists           │
    │    - Architecture documented │
    │    - Code/patterns visible   │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 2. Extract metadata         │
    │    - Stack used              │
    │    - Architecture            │
    │    - Technical patterns      │
    │    - Design decisions        │
    └─────────┬───────────────────┘
              │
              ▼
    ┌──────────────────────────────────────┐
    │ 3. Update local documentation        │
    │                                      │
    │  linkedin/profile.md                 │
    │    ├── Experience (new entry)         │
    │    ├── Skills (add technologies)      │
    │    └── Timeline (add row)             │
    │                                      │
    │  linkedin/branding.md                │
    │    └── Keywords (add new keywords)    │
    │                                      │
    │  linkedin/content-log.md             │
    │    └── Log the update                 │
    │                                      │
    │  linkedin/content-strategy.md        │
    │    └── Add post ideas                 │
    └─────────┬────────────────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 4. Generate LinkedIn draft  │
    │    Use post template from   │
    │    content-strategy.md      │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 5. Apply Verification Rules │
    │    See content-strategy.md  │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 6. Human review & approve   │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 7. Publish on LinkedIn      │
    └─────────┬───────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │ 8. Log in content-log.md    │
    │    Title, date, notes       │
    └─────────────────────────────┘
```

### Per-section update matrix

| Portfolio change | profile.md | branding.md | content-log.md | content-strategy.md |
|-----------------|------------|-------------|----------------|---------------------|
| New project | Experience + Skills + Timeline | Keywords | Entry logged | New post ideas |
| New pattern learned | Skills (patterns list) | — | Entry logged | New post ideas |
| New certification | Certifications | Keywords | Entry logged | Career post idea |
| Stack change | Skills + About (stack) | Keywords | Entry logged | — |
| Portfolio README updated | — | — | — | Update existing ideas |

---

## Update Rules

### Stack changes
- New major technology used in a project → add to Skills
- Technology removed from all projects → remove from Skills
- Stack change must be present in at least 1 project README

### New project added
- Git repo must exist with README, architecture, and code
- Project description → Experience (new entry under freelance)
- Project technologies → Skills
- Project name → Timeline table
- Must generate at least 1 Build Log post idea

### New pattern discovered
- Pattern must be documented in project README or engineering notes
- Pattern → Experience (patterns list) + Skills
- Must generate 1 Deep Dive post idea

### New certification earned
- Must have verifiable credential (badge, certificate URL, or issuer verification)
- Certification → Certifications section
- Must generate 1 Career Journey post idea

### Content publication
- Every published post → logged in content-log.md with date and title
- No post without passing Content Verification Rules
- Max 3 hashtags per post

### General rules
- No evidence in GitHub → no claim on LinkedIn
- No invented clients, users, companies, or outcomes
- No metrics not present in public portfolio documentation
- Headline, About, and Experience title require human approval before changes

---

## Content Generation Rules

| Portfolio trigger | Content to generate | Template |
|------------------|-------------------|----------|
| New project | 1 Build Log + 1 Architecture post | Template 1 + Template 3 |
| New pattern | 1 Deep Dive post | Template 2 |
| New certification | 1 Career Journey post | Template 2 (career variant) |
| Monthly (no triggers) | 1 Learning reflection post | Template 2 (career variant) |

---

## Verification Checklist

Before any LinkedIn update from portfolio changes:

- [ ] Project exists in GitHub with README and documentation
- [ ] Stack extracted matches project README
- [ ] No invented clients, users, or companies
- [ ] No unverifiable metrics or outcomes
- [ ] Technical patterns are real and documented
- [ ] Language is English (USA)
- [ ] profile.md updated with new information
- [ ] content-log.md entry created
- [ ] branding.md keywords reviewed
- [ ] Post ideas added to content-strategy.md
