# Portafolio SaaS — Multi-Tenant AI Automation Platform

> Production-grade architecture demonstration: multi-tenant SaaS combining workflow automation, AI-driven lead qualification, PostgreSQL multi-tenancy, and subscription billing — containerized with cloud-native observability and security patterns.

---

## Overview

**Portafolio SaaS** demonstrates end-to-end automation of the lead-to-revenue pipeline for B2B SaaS. The system integrates visual workflow automation, AI-powered lead scoring with human-in-the-loop approval, secure multi-tenant data isolation, and subscription billing — all orchestrated through a containerized, observable infrastructure.

**Core capabilities:**
- **AI Lead Qualification**: Visual workflows score inbound leads via LLM, route high-intent leads for human approval, auto-sync qualified leads to CRM
- **Multi-Tenant Architecture**: Database-level tenant isolation, scoped API keys, shared-schema efficiency
- **Subscription Billing**: Integrated checkout, customer portal, and webhook-verified lifecycle events
- **Developer Experience**: API key authentication, automation marketplace, interactive API documentation
- **Production Operations**: Reverse proxy with TLS, metrics/logs/traces stack, automated backups

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL INTEGRATIONS                              │
│  Forms ──► Webhook ──► Automation Engine ──► LLM / CRM / Notifications / DB │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EDGE LAYER (TLS, Rate Limit, WAF)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   React Dashboard   │   │   REST API Gateway  │   │   Automation Engine │
│   (Next.js 14)      │   │   (Node.js/Express) │   │   (n8n Self-Hosted) │
│   - Auth Portal     │   │   - AuthN/AuthZ     │   │   - Lead Pipeline   │
│   - Lead Management │   │   - Multi-Tenant    │   │   - AI Agents       │
│   - Billing/Usage   │   │   - API Keys        │   │   - Integrations    │
│   - API Keys Mgmt   │   │   - Billing/Market  │   │                     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL (Multi-Tenant, RLS Enforced)                │
│  Core entities: tenants, users, leads, workflows, audit, settings, keys    │
│  ✅ Row-level security as final enforcement layer                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   Cache/Queue   │   │   Message Bus   │   │   Observability │
    │   (Redis)       │   │   (RabbitMQ)    │   │   (Metrics,     │
    │                 │   │                 │   │    Logs, Uptime)│
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Automation** | n8n (self-hosted) | Visual debugging, 400+ nodes, self-hosted data control, Git-versionable workflows |
| **API Gateway** | NGINX | TLS termination, rate limiting, security headers, upstream health checks |
| **Backend** | Node.js 20 / Express 4 | Lightweight, mature ecosystem, explicit middleware control |
| **Frontend** | Next.js 14 (App Router) / Tailwind | Server components, optimized builds, type-safe API layer |
| **Database** | PostgreSQL 15 | ACID, JSONB flexibility, native RLS, proven at scale |
| **Messaging** | RabbitMQ | Reliable async processing, dead-letter queues, horizontal scaling |
| **Cache** | Redis | Session store, rate limit counters, pub/sub |
| **Billing** | Stripe | PCI compliance, global payments, webhook verification |
| **Observability** | Prometheus, Grafana, Loki, Uptime Kuma | Unified metrics/logs/uptime, alerting, multi-tenant dashboards |

---

## Technical Decisions

### Multi-Tenancy: Shared Schema with Database-Level Isolation
Chose shared-schema multi-tenancy with **row-level security policies** over separate databases or schemas because:
- **Operational simplicity**: Single database to backup, migrate, monitor, and connect
- **Resource efficiency**: Shared connection pools, reduced infrastructure overhead
- **Guaranteed isolation**: Policies enforced at the database engine level — cannot be bypassed by application bugs or raw SQL
- **Future flexibility**: High-volume tenants can migrate to dedicated schemas without application rewrites

### Authentication: Short-Lived JWT + HttpOnly Cookies + API Keys
- **User sessions**: JWT (HS256, 24h expiry) stored in HttpOnly, Secure, SameSite=Lax cookies — eliminates XSS token theft surface
- **Server-to-server**: Separate `pk_`-prefixed API keys, hashed at rest, validated via dedicated middleware
- **No refresh tokens by design**: Simpler threat model, forced re-auth improves security posture
- **Fail-fast configuration**: Production startup aborts if critical secrets (`JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, etc.) are missing

### Automation Engine: n8n over Custom Workflow Code
Selected a battle-tested visual automation platform over building a custom engine because:
- **Stakeholder visibility**: Non-technical teams can trace, debug, and modify flows without code deployments
- **Integration breadth**: 400+ pre-built nodes plus generic HTTP Request for any REST/GraphQL API
- **Data sovereignty**: Fully self-hosted, runs in the same VPC as the database, no vendor data egress
- **Version control**: Workflows export as JSON, stored in Git with credential patterns excluded via `.gitignore`

### Async Processing: Message-Driven Workers
- **Pattern**: API publishes domain events → message bus → workers consume → update state → emit completion events
- **Reliability**: Publisher confirms, consumer acknowledgments, dead-letter queues for poison messages
- **Elastic scaling**: `docker compose up --scale worker=N` adds consumers instantly without code changes

---

## Security & Reliability

### Defense in Depth

| Layer | Controls |
|-------|----------|
| **Network** | Private Docker networks, TLS 1.2+ at edge, HSTS, security headers, internal ports never exposed |
| **Application** | Helmet.js (CSP, HSTS, X-Frame), environment-specific CORS allowlists, tiered rate limiting (global, auth, API key) |
| **Authentication** | bcrypt (cost 12), short-lived JWT, API key rotation, credential encryption at rest |
| **Authorization** | Role-based access (admin/manager/member), tenant-scoped middleware, database-level enforcement as backstop |
| **Data Protection** | `.env` excluded from Git, secret patterns in `.gitignore` (`*.secret`, `*.key`, `*.pem`), automation exports never committed |
| **Secrets Management** | Zero secrets in code; production requires explicit environment variables with fail-fast validation |

### Observability Stack
- **Metrics**: Prometheus scrapes `/metrics` from API, automation engine, database exporter, node exporter
- **Logs**: Loki aggregates structured JSON logs (`tenant_id`, `trace_id`, `level`) from all containers
- **Traces**: OpenTelemetry-ready with W3C TraceContext propagation via request ID middleware
- **Alerts**: Grafana rules for error rate, latency percentiles, resource saturation, database health
- **Uptime**: Synthetic checks on `/health` endpoints every 30s with multi-channel notifications

---

## Getting Started

### Prerequisites
- Docker 24+ & Docker Compose v2
- Node.js 20 LTS (local development)
- PostgreSQL client for migrations

### Local Development

```bash
# 1. Clone
git clone https://github.com/<your-org>/portafolio-saas.git
cd portafolio-saas

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
docker compose up -d postgres automation

# 4. Run database migrations
cat database/migrations/*.sql | docker exec -i <postgres-container> psql -U <user>

# 5. Seed initial tenant & admin
cat database/seeds/*.sql | docker exec -i <postgres-container> psql -U <user>

# 6. Start API
cd backend && npm install && npm run dev

# 7. Start Dashboard
cd ../frontend && npm install && npm run dev

# 8. Import automation workflows
curl -X POST <automation-api>/workflows \
  -H "Content-Type: application/json" \
  -d @n8n/workflows/lead-qualification.json
```

### Production Deployment

```bash
# 1. Provision cloud server (recommended: dedicated VM with 4+ vCPU, 8GB RAM)
# 2. Configure DNS → Cloudflare (proxied) for TLS and WAF
# 3. On server
git clone https://github.com/<your-org>/portafolio-saas.git
cd portafolio-saas

# 4. Provision TLS certificates (Let's Encrypt via Cloudflare or ACME)
mkdir -p docker/ssl
# Place certificates in docker/ssl/

# 5. Create shared Docker network
docker network create app-net

# 6. Configure production environment
cp .env.example .env
# Fill all required production values

# 7. Deploy application stack
docker compose -f docker-compose.prod.yml up -d

# 8. Enable observability
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# 9. Schedule automated backups (daily, 3 AM)
crontab -e
# 0 3 * * * /path/to/scripts/backup.sh
```

---

## API Surface

### Authentication
```
POST   /api/auth/login          # Credentials → session cookie
POST   /api/auth/register       # Provision tenant + admin user
GET    /api/auth/me             # Current identity + tenant context
```

### Leads (Tenant-Scoped)
```
GET    /api/leads               # Filtered, paginated list
GET    /api/leads/stats         # Dashboard aggregates
GET    /api/leads/:id           # Single record
```

### Tenant Management
```
GET    /api/tenants             # Current tenant profile
PATCH  /api/tenants             # Settings update (admin)
GET    /api/tenants/usage       # Consumption metrics
```

### API Keys (Admin)
```
GET    /api/keys                # List active/revoked keys
POST   /api/keys                # Generate new key (plaintext returned once)
DELETE /api/keys                # Revoke key
```

### Billing (Stripe)
```
POST   /api/billing/checkout    # Create checkout session
GET    /api/billing/portal      # Customer portal session
POST   /api/billing/webhook     # Verified lifecycle events
```

### Marketplace
```
GET    /api/marketplace/catalog # Available automations
POST   /api/marketplace/install # Provision workflow into tenant
```

### Health
```
GET    /health                  # Liveness/readiness probe
```

> Interactive OpenAPI documentation available at `/api/docs` in development.

---

## Project Structure

```
portafolio-saas/
├── backend/                    # Express.js API Gateway
│   ├── src/
│   │   ├── config/             # Environment validation (fail-fast in production)
│   │   ├── controllers/        # Request handlers (domain-organized)
│   │   ├── middleware/         # Auth, tenant, rate limit, audit, security
│   │   ├── routes/             # Route definitions
│   │   ├── services/           # Business logic (DB, billing, automation API)
│   │   ├── utils/              # Errors, structured logging, redaction
│   │   ├── db.js               # Connection pool with tenant context
│   │   ├── app.js              # Application factory
│   │   └── index.js            # Entry point
│   ├── Dockerfile              # Multi-stage build (~25MB runtime)
│   └── package.json
│
├── frontend/                   # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── components/         # Shared UI primitives
│   │   ├── lib/                # Typed API client, auth helpers
│   │   └── middleware.ts       # Route protection, session refresh
│   ├── Dockerfile              # Standalone output, multi-stage
│   └── package.json
│
├── database/
│   ├── migrations/             # Schema, indexes, constraints, RLS policies
│   └── seeds/                  # Bootstrap data
│
├── edge/                       # NGINX configuration (TLS, rate limits, headers)
│
├── observability/              # Prometheus, Grafana, Loki, Uptime Kuma configs
│
├── scripts/                    # Backup, firewall, DNS automation helpers
│
├── docs/
│   ├── ENGINEERING_NOTES.md    # Reliability, AI, multi-tenant patterns
│   ├── ARCHITECTURE_DECISIONS.md # ADRs with rationale & rollback procedures
│   ├── patterns/
│   │   └── webhook-ai-crm-notify.md # Reusable reliability pattern
│   └── adr/
│       └── README.md           # Architecture Decision Records index
│
├── docker-compose.yml          # Development stack
├── docker-compose.prod.yml     # Production stack
├── .env.example                # Documented required variables
├── .gitignore                  # Hardened exclusion patterns
└── README.md
```

---

## Demonstrated Capabilities

| Capability | Implementation Highlights |
|------------|---------------------------|
| **Multi-Tenant Data Isolation** | Shared schema with database-enforced RLS on all tenant tables |
| **Authentication & Authorization** | JWT in HttpOnly cookies, role-based access, API key management |
| **Lead Pipeline Automation** | Visual workflow: ingestion → AI scoring → human approval → CRM sync |
| **AI Agent Orchestration** | Multi-channel agents (chat, messaging, voice) with LLM integration |
| **Subscription Billing** | Checkout, portal, webhook verification, plan enforcement |
| **Automation Marketplace** | Catalog-driven 1-click provisioning into tenant environments |
| **Production Edge Layer** | TLS termination, rate limiting, security headers, health-aware routing |
| **Full Observability** | Metrics, logs, uptime, alerting — multi-tenant aware |
| **Automated Operations** | Daily backups, infrastructure-as-code, blue-green ready |
| **CI/CD Pipeline** | Lint, type-check, test, build, security scan on every push |

---

## Environment Configuration

Key variables (full list in `.env.example`):

| Variable | Context | Notes |
|----------|---------|-------|
| `POSTGRES_PASSWORD` | Required | Database authentication |
| `AUTOMATION_ENCRYPTION_KEY` | Required | 32-char key for credential encryption |
| `JWT_SECRET` | Production | HS256 signing — fail-fast if missing |
| `STRIPE_WEBHOOK_SECRET` | Production | `whsec_...` — fail-fast if missing |
| `CORS_ORIGINS` | Production | Comma-separated, no wildcards, no localhost |
| `LLM_API_KEY` | AI features | Provider-agnostic (OpenAI/Groq/compatible) |
| `CRM_ACCESS_TOKEN` | CRM sync | Private app token with contacts scope |
| `MESSAGING_BOT_TOKEN` | Notifications | Platform-specific bot credentials |
| `VOICE_PROVIDER_*` | Voice agent | Account SID, auth token, phone number |

---

## Quality Assurance

```bash
# Backend
cd backend
npm run lint          # ESLint (strict)
npm run test          # Automated backend test runner

# Frontend
cd frontend
npx tsc --noEmit      # TypeScript strict mode
npm run build         # Production build verification

# Security
npm audit             # Dependency scanning
# GitHub Actions: SAST, secret scan, dependency review on every PR
```

---

## Related Documentation

- [Engineering Notes](ENGINEERING_NOTES.md) — Reliability, AI integration, and multi-tenant patterns
- [Architecture Decision Records](docs/adr/README.md) — ADRs with rationale and rollback procedures
- [Pattern: Webhook → AI → CRM → Notification](docs/patterns/webhook-ai-crm-notify.md) — Reusable reliability pattern
- [Security Policy](SECURITY.md) — Publication policy and controls

---

## License

MIT License — see [LICENSE](LICENSE).

---

## Author

Built as a portfolio demonstration of **production-grade SaaS architecture** — combining workflow automation, AI integration, multi-tenancy, and cloud-native operations.

**Technologies:** Node.js/Express, Next.js/React, PostgreSQL (RLS), n8n, Docker, NGINX, Stripe, Prometheus/Grafana/Loki, RabbitMQ, Redis, GitHub Actions.
