# MEMORY — Reference Knowledge

Stable project information: stack, architecture, conventions, and rules.

---

## Technology Stack

| Layer | Technology | Role |
|-------|------------|------|
| Workflow | n8n | Process automation |
| Backend | Node.js / Express | REST API |
| Frontend | Next.js (App Router) / Tailwind CSS | SaaS dashboard |
| Database | PostgreSQL | Multi-tenant with RLS |
| Cache | Redis | Caching |
| Queue | RabbitMQ | Messaging |
| Containers | Docker / Docker Compose | Dev and prod orchestration |
| Proxy | NGINX | TLS, rate limiting, WAF |
| CI/CD | GitHub Actions | Tests, lint, deploy |
| AI | Groq (llama-3.3-70b-versatile) | Lead scoring |
| CRM | HubSpot | Contact management |
| Payments | Stripe | Subscriptions (test mode) |
| Monitoring | Grafana + Prometheus + Loki | Observability |

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

## Repository Structure

```
Portafolio-Publico/
├── STATE.md             # Current project status
├── AGENTS.md            # Universal multi-agent protocol
├── CLAUDE.md            # Agent instructions (local only)
├── MEMORY.md            # Stable project knowledge
├── PROJECT_STATUS.md    # Phase and task details
├── PROGRESO.md          # Chronological checkpoint log
├── DECISIONS.md         # Architecture Decision Records
├── ENGINEERING_NOTES.md # Engineering patterns and lessons
├── .github/workflows/   # CI/CD
├── backend/             # Express API
├── frontend/            # Next.js dashboard
├── docs/                # Technical documentation + CHANGELOG
├── projects/            # Automation projects
│   ├── lead-qualification/
│   ├── voice-receptionist/
│   ├── whatsapp-ecommerce-agent/
│   ├── examples/        # Sanitized n8n workflows
│   └── appointment-automation/
├── assets/              # Architecture diagrams
├── scripts/             # Githooks, helpers
├── docker/              # NGINX config, SSL
├── monitoring/          # Grafana, Prometheus, Loki
├── database/            # Migrations + seeds
└── docker-compose*.yml  # Dev and prod environments
```

## Git Conventions

- Commit format: `type: short imperative message`
- Types: feat, fix, docs, ci, refactor, test, chore, style
- Branches: `type/description` (feat/, fix/, docs/, ci/)
- No force push to `main`
- No history rewrites on public branches
- One logical change per commit
- Pre-commit hook validates secrets automatically

## Sanitization Rules (Public Repository)

1. No `.env` or real credentials
2. No API keys, tokens, secrets (use `{{placeholder}}` or `$env.VAR`)
3. No private URLs, webhooks, IPs, real domains
4. No client names, real companies, PII
5. No internal prompts, system prompts, business rules
6. No n8n credential IDs or exported blocks
7. No database connection strings with credentials
8. No SSH keys or private certificates
9. No real infrastructure diagrams
10. No references to private workspaces

## Frontend Routes

| Route | Description | Status |
|-------|-------------|--------|
| `/login` | Authentication | Complete |
| `/dashboard` | Metrics and KPIs | Complete |
| `/dashboard/leads` | Lead management | Complete |
| `/dashboard/analytics` | Visualizations | Complete |
| `/dashboard/activity` | Activity timeline | Complete |
| `/dashboard/billing` | Plans/subscription | Complete |
| `/dashboard/integrations` | External connections | Complete |
| `/dashboard/marketplace` | Workflow catalog | Complete |
| `/dashboard/usage` | Tenant consumption | Complete |
| `/dashboard/settings` | Profile and API keys | Complete |

## Development Phases

| Phase | Description |
|-------|-------------|
| Foundation | n8n, DB, Backend, Frontend, Multi-tenant, AI Agents |
| Backend & Frontend | Robust Express API + Next.js dashboard |
| Payments | Stripe integration |
| Communication | WhatsApp, Voice AI, Marketplace |
| Scale & SaaS | Scalability, Observability, Testing (103 tests) |
| Billing & Proxy | Billing normalization, enums, nginx reverse proxy |
| Security | Hardening across backend, infra, DB, frontend |
| Deployment | Production preparation |
| Audit & Release | Final audit and release |
| UI | SaaS UI overhaul (cards, sidebar, headers, login, tables) |
| Visual QA | Color consistency, skeleton loaders |
| Experience Polish | Dashboard demo, leads, analytics, marketplace, empty states |
| Profile | Upwork Profile Optimization |
| State System | Multi-Agent State Persistence System |

## Development Notes

- Git hooks are in `.git/hooks/` (not versioned)
- Production n8n workflows are NEVER uploaded
- `projects/examples/` contains sanitized educational examples
- Agent configuration files are local (gitignored)
- Demo data pattern: each page tries API for 3s, on failure → demo data with amber notice
- Build: Next.js 14.2.35 — 14/14 static pages — 0 errors
