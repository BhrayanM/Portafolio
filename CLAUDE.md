# CLAUDE.md — Portafolio-Publico

Permanent project context for AI development agents. Auto-loads on each session.

## PERSISTENT STATE PROTOCOL

**Every AI agent MUST read `STATE.md` (< 30s) at session start.**

1. **Operational State (repository root)**:
   - `STATE.md`: Project snapshot.
   - `PROJECT_STATUS.md`: Phases and tasks.
   - `PROGRESO.md`: Chronological checkpoint.
   - `MEMORY.md`: Stable knowledge.
   - `DECISIONS.md`: ADR registry.
   - `ENGINEERING_NOTES.md`: Technical notes.
2. **Permanent Knowledge (external directory)**:
   - Store reusable learnings, prompts, templates, and resolved errors.
3. **On task completion**:
   - Update `STATE.md`, `PROJECT_STATUS.md`, `PROGRESO.md`, `MEMORY.md` with full chronology.

---

## VERIFIED STATE

- **Git**: branch `release/v1-publication-ready`. Origin: `github.com/BhrayanM/Portafolio`.
- **n8n v2.31.6** in Docker, PostgreSQL backend.
- **Workflow "Lead Qualification" active**.
- **E2E verified**: WARM (exec 46 SUCCESS), HOT (exec 48 SUCCESS), COLD (exec 49 SUCCESS).
- **AI**: Groq (`llama-3.3-70b-versatile`) via HTTP Request node.
- **PostgreSQL**: 16 migrations (`001`–`016`) + 2 seeds.
- **Backend**: routes respond 200. 103 tests passing.
- **Frontend**: Next.js 14.2.35 build OK. 13 routes.

## Stack

- **Backend**: Node.js + Express, PostgreSQL (`pg` pool), JWT (HttpOnly cookie).
- **Frontend**: Next.js 14.2.35 (App Router), Tailwind CSS, TypeScript strict, lucide-react.
- **Automation**: n8n v2.31.6 (Docker).
- **DB**: PostgreSQL 15 (Docker), RLS enabled.
- **Infra**: Docker Compose (postgres, n8n, redis, rabbitmq, nginx).
- **Externals**: Groq, HubSpot, Slack, Stripe (scaffolding for WhatsApp Cloud API, Twilio).

## Source of Truth

- `STATE.md` (dynamic state)
- `AGENTS.md` (universal multi-agent protocol)
- `docs/ARQUITECTURA.md`

## Public Repo — Never Commit

**Never to git:** n8n workflow exports (.json), real graph / Code nodes, production prompts, tokens, webhook URLs with non-local hosts, Postgres connection strings, PII.

- `.env` in `.gitignore`.
- Pre-commit hook active (secret scanning).
- Agent config files are local (gitignored).

## Frontend Routes (14 total)

`/login`, `/dashboard`, `/dashboard/leads`, `/dashboard/analytics`, `/dashboard/activity`, `/dashboard/billing`, `/dashboard/integrations`, `/dashboard/marketplace`, `/dashboard/usage`, `/dashboard/settings`, error.tsx, not-found.tsx

## Backend API Structure

`/api/auth/*`, `/api/leads/*`, `/api/billing/*`, `/api/whatsapp/*`, `/api/voice/*`, `/api/marketplace/*`, `/api/users/*`, `/api/tenants/*`, `/api/keys/*`, `/health`

## Known Technical Debt

- WhatsApp/Voice require Meta/Twilio accounts
- Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) empty — deployment prerequisite
- RabbitMQ worker placeholder
- 0 frontend tests
