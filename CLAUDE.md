# Portafolio-Publico — AI Automation Portfolio

Production-oriented AI automation platform integrating n8n, LLMs, CRM systems, and cloud-native SaaS architecture. Public portfolio repository.

---

## Stack

| Technology | Role | Location |
|------------|------|----------|
| n8n | Workflow automation | Docker container |
| Node.js / Express 4 | Backend API | `backend/` |
| Next.js 14 (App Router) / Tailwind | Frontend dashboard | `frontend/` |
| PostgreSQL 15 | Multi-tenant database | Docker container |
| Docker / Docker Compose | Container orchestration | Root compose files |
| NGINX | Edge proxy / TLS | `edge/` config |
| GitHub Actions | CI/CD | `.github/workflows/` |

---

## Commands

```bash
# Backend
cd backend && npm install              # Install dependencies
npm run dev                            # Dev server (hot reload)
npm test                               # Run tests
npm run lint                           # ESLint

# Frontend
cd frontend && npm install             # Install dependencies
npm run dev                            # Dev server
npm run build                          # Production build
npx tsc --noEmit                       # TypeScript check
npm run lint                           # Next lint

# Docker
docker compose up -d                   # Start dev stack
docker compose -f docker-compose.prod.yml up -d   # Production
docker compose down                    # Stop all

# Git (project conventions)
git add -A && git commit -m "type: message" && git push origin main
```

---

## Architecture

```
Forms / API / Voice / WhatsApp
  ↓
Edge Layer (NGINX — TLS, Rate Limit, WAF)
  ↓
Backend API (Node.js/Express)
  ↓
Automation Engine (n8n) → AI Agents → CRM / Notifications / DB
  ↓
PostgreSQL (Multi-tenant, RLS)
```

See [`README.md`](README.md) for full architecture, [`docs/deployment-guide.md`](docs/deployment-guide.md) for deployment.

---

## Sanitization Rules

**Every commit to this public repo MUST pass these checks:**

1. No `.env` files or real credentials
2. No API keys, tokens, or secrets (use `{{placeholder}}` or `$env.VAR`)
3. No private URLs, webhook URLs, IPs, or domain names
4. No client names, real company names, or PII
5. No internal prompts, system prompts, or proprietary business rules
6. No n8n credential IDs or exported credentials blocks
7. No database connection strings with credentials
8. No private SSH keys or certificates
9. No internal architecture diagrams showing real infrastructure
10. No references to `C:\AI-Automations`, `C:\Segundo-Cerebro`, or any private workspace

---

## Git Conventions

### Commit format
```
type: short imperative description

types: feat, fix, docs, ci, refactor, test, chore, style
```

### Branch naming
```
feat/description, fix/description, docs/description, ci/description
```

### Rules
- No force push to `main`
- No history rewrite on public branches
- One logical change per commit
- Pre-commit hook validates secrets automatically
- All new files must be sanitized before stage

---

## Pre-commit Checklist

Before `git commit`:

- [ ] `git status` — only intended files staged
- [ ] `git diff --cached` — review all changes for secrets
- [ ] No `.env`, `.json` with credentials, or `.pem` files
- [ ] No n8n credential blocks or real webhook URLs
- [ ] All example JSON files use placeholder data
- [ ] All image files are sanitized (no metadata with private info)
- [ ] README links point to existing files
- [ ] Markdown renders correctly (no broken syntax)

---

## Documentation Rules

### READMEs
- Include: Overview, Architecture, Workflow, Stack, Security, Impact
- Use professional language ("production-ready", "enterprise automation")
- All image paths must be relative and resolve to existing files
- Badges via `img.shields.io` only

### Examples (JSON)
- All data must be fictitious: `example.com`, `Demo Company`, `Jane Smith`
- No real email addresses, phone numbers, or IDs
- Structure should demonstrate the pattern, not reveal implementation
- Fields must be generic and descriptive

### Architecture Diagrams (SVG)
- No embedded credentials, tokens, or real endpoints
- Use `$env.VAR` or `{{placeholder}}` for any variable values
- Conceptual representations only — no implementation details
- Labels must be generic (no client names, no internal terms)

---

## n8n Sanitized Examples Rules

Files in `projects/examples/`:

1. Must NOT contain any credential blocks (`"credentials": { ... }`)
2. Must NOT contain real webhook URLs or API endpoints
3. Must NOT contain real node IDs or workflow IDs from production
4. Use `$env.VAR` for all environment-dependent values
5. Node names must be generic and descriptive
6. Prompts must be educational, not production-ready
7. Must include a comment or README stating they are educational references
8. Pre-commit hook blocks n8n workflow exports — use `--no-verify` only for intentional sanitized examples in `projects/examples/`

---

## Project Map

```
Portafolio-Publico/
├── .github/workflows/       # CI/CD
├── backend/                 # Express.js API
├── frontend/                # Next.js 14 dashboard
├── docs/                    # Technical documentation
├── projects/
│   ├── lead-qualification/  # AI Lead Scoring system
│   ├── voice-receptionist/  # Bilingual AI Voice Agent
│   ├── whatsapp-ecommerce-agent/  # WhatsApp Commerce AI
│   ├── examples/            # Sanitized n8n workflows
│   └── appointment-automation/    # Scheduling automation
├── assets/                  # Architecture diagrams
├── scripts/                 # Githooks, deployment helpers
├── docker-compose.yml       # Dev environment
├── docker-compose.prod.yml  # Production environment
└── README.md                # Main entry point
```
