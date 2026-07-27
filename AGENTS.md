# AGENTS.md — Universal Protocol and Persistent System Memory

> This file defines the mandatory READ/WRITE protocol for any AI development agent.
> Do not summarize, compact, or remove historical entries or critical IDs.
> Preserve permanently between sessions.

---

## MANDATORY STARTUP PROTOCOL FOR ALL AI

BEFORE making any modifications to code or documentation, EVERY AI MUST read in this exact order:

1. `STATE.md` — Current operational state (< 30 seconds).
2. `PROJECT_STATUS.md` — Phase detail and pending tasks.
3. `PROGRESO.md` — Chronological checkpoint and completed tasks.
4. `MEMORY.md` — Stable knowledge, stack, paths, architecture.
5. `DECISIONS.md` — Architecture decision records (ADRs).
6. `ENGINEERING_NOTES.md` — Engineering patterns and technical notes.

---

## TWO-SYSTEM MEMORY ARCHITECTURE

Two independent systems that MUST NEVER be mixed:

### SYSTEM 1: Operational State (repository root)
- **Purpose:** Contains ONLY the dynamic state of the current project.
- **Answers:** What phase are we in? What was completed? What is in progress? What is next? What decisions were made? What did the last AI do?
- **Control files:** `STATE.md`, `PROJECT_STATUS.md`, `PROGRESO.md`, `MEMORY.md`, `DECISIONS.md`, `ENGINEERING_NOTES.md`.

### SYSTEM 2: Permanent Knowledge (external directory)
- **Purpose:** Contains ONLY reusable assets for future projects.
- **Structure:**
  - `00_Inbox` — Initial captures
  - `01_Ideas` — Concepts and drafts
  - `02_Aprendizaje` — Reusable technical concepts
  - `03_Proyectos` — Project references
  - `04_Workflows` — Flows and automation patterns
  - `05_Prompts` — Tested and reusable prompts
  - `06_Clientes` — Service and proposal templates
  - `07_Recursos` — Templates, libraries, cheatsheets
  - `08_Ventas` — Acquisition strategies
  - `09_Errores-Soluciones` — Solutions to specific errors
- **Rule:** NEVER store daily project status here.

---

## CLOSE AND HANDOFF PROTOCOL

Upon completing any task (phase, feature, integration, audit, bugfix, refactor, doc):

1. **Does this knowledge belong to this project?**
   - YES → Update: `STATE.md`, `PROJECT_STATUS.md`, `PROGRESO.md`, `MEMORY.md`.
   - If there was a technical decision → Update `DECISIONS.md`.
   - If there are new technical notes/patterns → Update `ENGINEERING_NOTES.md`.

2. **Will this knowledge serve future projects?**
   - YES → Update or create the corresponding entry in the external knowledge directory (appropriate folder: `02_Aprendizaje`, `04_Workflows`, `05_Prompts`, `07_Recursos`, `09_Errores-Soluciones`, etc.).

3. **Chronology Format (NEVER DELETE HISTORY):**
   Every new entry must be appended at the end maintaining chronological order with the format:
   - **Date:** YYYY-MM-DD
   - **Local time:** HH:MM:SS
   - **Agent responsible:** [AI Name / Model]
   - **Objective:** [Brief description]
   - **Result:** [Summary of what was completed]
   - **Files modified:** [List of files]
   - **Next step:** [Recommended action for next AI]

---

## Verified State

- **E2E HOT verified**: Execution 48 SUCCESS, lead_log id=4 status=approved
- **COLD → OPEN**: leadStatus mapped to OPEN (not UNQUALIFIED) — lead_log id=5 verified
- **WARM**: Execution 46 SUCCESS verified
- **.env in .gitignore**: Confirmed
- **Pre-commit hook active**: Secret scanning on every commit
- **Multi-Agent State Persistence System**: Active in `STATE.md` + `AGENTS.md` protocol

---

## Stack

- **Backend**: Node.js + Express + PostgreSQL (pg pool)
- **Frontend**: Next.js 14.2.35 (App Router) + Tailwind CSS + TypeScript strict
- **Automation**: n8n v2.31.6 (Docker), Lead Qualification workflow active
- **DB**: PostgreSQL 16 (Docker), RLS enabled, 16 migrations
- **AI**: Groq (`llama-3.3-70b-versatile`) via HTTP Request — active
- **CRM**: HubSpot (upsert contacts by email)
- **Payments**: Stripe (test keys, webhook without secret)
- **Infra**: Docker Compose (postgres, n8n, redis, rabbitmq, nginx)

---

## Branches and Commits

- **Branch**: `release/v1-publication-ready`
- **Origin**: `github.com/BhrayanM/Portafolio` (public, NO commit secrets)
- **Key commits**: See `docs/CHANGELOG.md` for milestone history.

---

## Security Rules

- **Never commit to git**: n8n exports (.json), real graph / Code nodes, production prompts, tokens, webhook URLs with non-local hosts, Postgres connection strings, PII
- **Secrets**: Only in `.env`, which is in `.gitignore`
- **Pre-commit**: Active with secret scanning

---

## Architectural Notes

- Lead Qualification: Webhook → Fast ACK → Sanitize → Groq Score → HOT/WARM/COLD → HubSpot → PostgreSQL
- HOT goes through Slack Approval before HubSpot
- Both branches (HOT approved + WARM/COLD) converge at HubSpot Upsert
- Without HubSpot token there is no complete E2E path
- Multi-Agent State Persistence: Every agent must read `STATE.md` before acting and update `STATE.md` + `PROJECT_STATUS.md` + `PROGRESO.md` + `MEMORY.md` upon completion.
