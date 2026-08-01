# Documentation

Index of the repository's technical documentation.

## Repository structure

```
├── README.md          # Portfolio presentation (client-facing)
├── projects/          # Case studies: problem → solution → result
├── examples/          # Sanitized n8n workflow examples (educational JSON)
├── assets/            # Architecture diagrams (diagrams/) and screenshots (screenshots/)
├── docs/              # This documentation
├── backend/           # REST API (Express): controllers, services, middleware, schemas, tests
├── frontend/          # SaaS dashboard (Next.js App Router, TypeScript)
├── database/          # SQL migrations (001–016) + seeds — RLS with FORCE
├── monitoring/        # Prometheus, Grafana, Loki, Uptime Kuma
├── scripts/           # Backup, git hooks, webhook testing
├── docker/            # NGINX config (dev and prod)
└── docker-compose*.yml
```

## Architecture and engineering

| Document | Content |
|---|---|
| [architecture.md](./architecture.md) | Lead Qualification Engine architecture (n8n): flow, persistence, verified state |
| [platform.md](./platform.md) | Multi-tenant SaaS platform: layers, security, verification and roadmap |
| [engineering-practices.md](./engineering-practices.md) | Reliability, LLM integration, multi-tenancy, security and lessons learned |
| [adr/README.md](./adr/README.md) | Architecture Decision Records — what was chosen, against what, and why |
| [patterns/webhook-ai-crm-notify.md](./patterns/webhook-ai-crm-notify.md) | The reusable pattern behind the four automation systems |

## Guides

| Document | Content |
|---|---|
| [development-setup.md](./development-setup.md) | Local development environment: URLs, test users, migrations and verification |
| [deployment-guide.md](./deployment-guide.md) | Production deployment: prerequisites, TLS, Docker stack, monitoring, backups and rollback |

## Projects

| Document | Content |
|---|---|
| [projects/README.md](../projects/README.md) | Index of automation case studies and sanitized examples |
| [projects/lead-qualification/README.md](../projects/lead-qualification/README.md) | Lead Qualification Engine |
| [projects/whatsapp-agent/README.md](../projects/whatsapp-agent/README.md) | WhatsApp Conversational Agent |
| [projects/voice-receptionist/README.md](../projects/voice-receptionist/README.md) | Bilingual Voice Receptionist |
| [projects/appointment-automation/README.md](../projects/appointment-automation/README.md) | Appointment Automation |
| [projects/whatsapp-ecommerce-agent/README.md](../projects/whatsapp-ecommerce-agent/README.md) | WhatsApp E-commerce Agent |
| [examples/README.md](../examples/README.md) | Sanitized n8n workflow examples (educational JSON) |

## Other

| Document | Content |
|---|---|
| [CHANGELOG.md](./CHANGELOG.md) | Project timeline |
| [SECURITY.md](../SECURITY.md) | Security policy and publication scope |
| [CONTACT.md](../CONTACT.md) | Contact options |

---

[⬅️ Back to repository](../README.md)
