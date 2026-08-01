# Platform — AI Lead Automation Platform

Technical documentation of the multi-tenant lead capture and qualification platform
(backend, frontend and database included in this repository). The described capabilities
are verified through local execution, automated tests and CI.

## Architecture

```
Form · WhatsApp · Voice · API
        │
   NGINX  — TLS 1.2/1.3 · HSTS · rate limit 10 r/s · security headers
        ├──────────────► Next.js 16  (dashboard, 11 pages)
        └──────────────► Express     (REST API, 9 route groups)
                              │
                              ├── n8n  — automation workflows
                              │        └── LLM → HubSpot → Slack
                              └── PostgreSQL 15
                                     multi-tenant · RLS with FORCE · 16 migrations
```

## Layers

| Layer | Technology | State |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), strict TypeScript, Tailwind | 11 pages, green build (CI) |
| **Backend** | Node.js 20, Express 4, REST API | 9 route groups, OpenAPI at `/api-docs` |
| **Database** | PostgreSQL 15, multi-tenant | 16 migrations + 2 seeds, **RLS active with FORCE** |
| **Automation** | n8n 2.31.6 self-hosted | Sanitized examples in `examples/` |
| **AI** | LLM orchestration over HTTP | Scoring with structured output and deterministic router |
| **CRM** | HubSpot | Idempotent upsert |
| **Notifications** | Slack | Incoming webhook |
| **Payments** | Stripe | Checkout + webhook with signature verification |
| **Infrastructure** | Docker Compose, NGINX | Images pinned to exact patches |
| **Testing** | Jest + Supertest | **113 tests**, CI with lint + typecheck + build + secret scan |

## Security

- **Session in `HttpOnly + Secure + SameSite` cookie** — the JWT is not accessible from
  JavaScript.
- **Multi-tenant isolation enforced by the engine.** `FORCE ROW LEVEL SECURITY` on the
  multi-tenant tables and a connection role without owner privileges. Without tenant
  context, a query returns zero rows; an `INSERT` with a foreign `tenant_id` is rejected.
- **Fail-fast startup** — in production the process aborts if `JWT_SECRET`,
  `CORS_ORIGINS`, `POSTGRES_PASSWORD` or `STRIPE_WEBHOOK_SECRET` is missing. No default
  secrets.
- **Joi input validation** on every writing route.
- Rate limiting by IP, CORS allowlist, Helmet, and audit triggers in the database.

## Local verification

```bash
cd backend  && npm run lint && npm test        # 113 tests
cd frontend && npx tsc --noEmit && npm run build
docker compose -f docker-compose.prod.yml build
```

## Backup

```bash
./scripts/backup.sh
```

## Roadmap

Declared here, and **not** presented as implemented anywhere else in the repository:

| Item | Real state |
|---|---|
| Redis (cache / distributed rate limit) | `cache.service.js` exists; no consumer or compose service |
| RabbitMQ (async processing) | Service declared in compose; no producer or worker |
| Google Sheets · Shopify | Production system integrations; no code in this repository |
| API keys hashed at rest | Today they are stored in clear in `tenants.api_keys` |
| HMAC signature on WhatsApp and Twilio webhooks | Pending; only the verification handshake today |
| Observability (Prometheus · Grafana · Loki) | Configuration in `monitoring/`; targets not re-validated |
| Frontend tests | None |
| Migration tracking table | Migrations are idempotent, but nothing records which were applied |

## Related documents

- [Lead Qualification Engine architecture](./architecture.md)
- [Reusable pattern](./patterns/webhook-ai-crm-notify.md)
- [ADRs](./adr/README.md)
- [Deployment guide](./deployment-guide.md)
- [SECURITY.md](../SECURITY.md)
