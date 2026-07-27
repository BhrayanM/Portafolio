# Engineering Notes

**High-level technical observations from building and operating production automation systems.**

These notes capture patterns, trade-offs, and lessons learned—without implementation specifics.

---

## Reliability Patterns That Pay Off

### Fast ACK + Deduplication Is Non-Negotiable for Webhooks

Every provider that retries (WhatsApp, Twilio, calendars, form endpoints) will send the same event twice if your handler exceeds their timeout. The sequence that prevents duplicate user-facing responses:

1. Validate auth → 2. ACK 200 immediately → 3. Deduplicate by provider event ID → 4. Process

Reversing steps 2 and 3 doesn't work—retry arrives before the first execution finishes dedup. The provider's retry budget is measured in seconds; LLM calls exceed it by default.

### External State Must Survive Container Restarts

Conversations, pending approvals, deduplication registries, workflow execution state—anything a user or downstream system cares about—must live outside the container. A deployment, update, or host failure cannot cost data or orphan an approval.

**Implication:** every n8n workflow that holds state needs external storage (PostgreSQL, Redis, or n8n's own DB configured for persistence). Memory-only workflows are prototypes, not production systems.

### Global Error Capture Beats Per-Workflow Try/Catch

A single error workflow that subscribes to all failures, writes to a persistent table with full context (input, node, error, stack), and alerts on critical thresholds answers the only question that matters in ops: *is this a one-off or a pattern?*

Container logs disappear on recreate. Slack alerts are read and forgotten. A queryable error table with grouping by type/date is the only artifact that survives an incident review.

---

## AI Integration Patterns

### The Model Proposes, Code Disposes

The LLM should return structured, typed output (score, category, entities, rationale). A deterministic router in code decides the destination. This beats letting the model pick the destination because:

- **Auditable:** router logic is readable, versioned, testable
- **Reproducible:** same input → same destination, always
- **Cheap:** no extra model call
- **Fast:** critical for voice latency budgets
- **Fail-loud:** schema violation routes to error path instead of silently corrupting CRM

### Sanitize at the Gateway, Not in the Prompt

Input from the open internet reaches the LLM. Treat it as data to evaluate, not instructions to obey. Sanitization/normalization at the workflow entry point is deterministic defense; prompt instructions are probabilistic and bypassable.

**Principle, not recipe:** the specific sanitization rules are proprietary. What's public is the architectural decision: the gateway owns safety, the model owns classification.

### Human-in-the-Loop Only Where False Positives Are Expensive

Approving everything causes approval fatigue → auto-approve → gate becomes theater. Approving nothing lets costly false positives through. The sweet spot: gate only the segment where a mistake has real business cost (e.g., Hot leads that consume a salesperson's prime hour).

The wait must be persistent: container restart during human deliberation must not lose the pending approval.

---

## Multi-Tenant Architecture

### Shared Schema + RLS > Separate Databases for SaaS

Chosen for operational simplicity (one DB to backup/migrate/monitor), resource efficiency (shared pools), and guaranteed isolation (RLS policies enforce `tenant_id = current_setting('app.current_tenant')` at the engine level—unbypassable even by raw SQL).

High-volume tenants can migrate to dedicated schemas later without application rewrites.

### API Keys as First-Class Auth, Not Afterthought

Separate `pk_`-prefixed keys for server-to-server, hashed at rest, validated via dedicated middleware. Distinct from user JWT sessions (short-lived, HttpOnly cookies). Rotation and revocation built in from day one.

---

## Billing Integration

### Webhook Verification Requires Raw Body

Stripe webhook signature verification fails if Express parses JSON before the webhook handler reads the raw body. The webhook route needs a dedicated `express.raw()` body parser applied **before** the global `express.json()`.

### Idempotency Key Composition Is Proprietary

The exact composition of idempotency keys (event source + stable fields) is not published. What's public: every Stripe event is processed exactly once via dual-layer idempotency (event-level key + CRM upsert by contact identity).

---

## Observability

### Metrics, Logs, Traces as Default, Not Afterthought

- **Prometheus** scrapes `/metrics` from API, n8n, PostgreSQL exporter, node-exporter
- **Loki** aggregates structured JSON logs (`tenant_id`, `trace_id`, `level`)
- **OpenTelemetry** readiness with W3C TraceContext via request ID middleware
- **Grafana** alert rules for error rate, p99 latency, saturation, DB connections
- **Uptime Kuma** synthetic `/health` checks every 30s with multi-channel alerts

### Multi-Tenant Dashboards Require Tenant Label

All metrics and logs carry `tenant_id`. Dashboards filter by it. Alerts can be tenant-scoped or global.

---

## Security

### Zero Secrets in Code, Fail-Fast in Production

Production startup aborts if critical secrets are missing: `JWT_SECRET`, `STRIPE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`. No defaults, no silent fallbacks.

### Defense in Depth Layers

| Layer | Controls |
|-------|----------|
| Network | Private Docker networks, TLS 1.2+ at edge, HSTS, security headers, internal ports never exposed |
| Application | Helmet.js (CSP, HSTS, X-Frame), per-environment CORS allowlists, tiered rate limiting (global, auth, API key) |
| Auth | bcrypt cost 12, JWT HS256 (24h, no refresh tokens by design), API key rotation |
| Authorization | Role-based (admin/manager/member), tenant-scoped middleware, RLS as final enforcement |
| Data | `.env` in `.gitignore`, secret patterns in `.gitignore` (`*.secret`, `*.key`, `*.pem`) |

---

## Lessons Learned (Condensed)

1. **The first retry is not an edge case—it's the happy path.** Design for retries from the first line of webhook code.
2. **State in memory is debt.** Pay it immediately or it compounds at the worst moment.
3. **An error table you can query is worth a thousand Slack alerts.** Build it before you need it.
4. **LLM output is a proposal, not a command.** Validate the schema, route in code, fail loud on violation.
5. **Sanitization is a gateway responsibility.** Don't push it into the prompt where it's probabilistic.
6. **Approval gates only where the cost of a false positive is measurable.** Everything else proceeds.
7. **Upsert is the only safe write pattern.** Create+dedupe-later is operational debt that never gets repaid.
8. **Handoff without pause is worse than no automation.** The bot and the human must never race.
9. **RLS is your last line of defense.** Application bugs happen; the database must still enforce isolation.
10. **Fail-fast configuration prevents silent misconfigurations in production.** If a secret is missing, the process should not start.

---

## Multi-Agent State Persistence

### State Over Memory: Two-System Architecture for AI Continuity

When multiple LLM agents (Claude Code, OpenCode, Codex, Cursor, Gemini, ChatGPT) work on the same project sequentially, each agent starts with zero context from the previous session. The solution is not a larger model context window — it's a persistent file-based architecture decoupled from any single AI's memory.

**System 1 — Operational State (`Portafolio-Publico`):**
Answers "where are we now?" in under 30 seconds. `STATE.md` is the entry point with a fixed schema: project, date, local time, last agent, last commit, branch, current phase, blockers, next step. Supporting files (`AGENTS.md`, `PROJECT_STATUS.md`, `PROGRESO.md`, `MEMORY.md`, `DECISIONS.md`, `ENGINEERING_NOTES.md`) provide depth without bloating the entry point.

**System 2 — Permanent Knowledge (`Segundo-Cerebro`):**
Answers "what have we learned that outlives this project?" Organized by category (Aprendizaje, Workflows, Prompts, Recursos, Errores-Soluciones). Never contains project daily status.

**Key decisions:**
- `STATE.md` must be the first file read — under 30s or the protocol fails.
- `AGENTS.md` acts as the universal protocol contract, not a memory dump.
- Every task completion triggers a two-way decision: does this update System 1 (project state) or System 2 (permanent knowledge)?
- Chronological log entries are appended, never edited in-place. History is sacred.
- Compatible with any agent that reads Markdown — zero dependency on internal model memory, tool-specific features, or cloud sync.

---

## Related Documentation

- [Architecture Decision Records](../adr/README.md)
- [Pattern: Webhook → AI → CRM → Notification](../patterns/webhook-ai-crm-notify.md)
- [Project: Lead Qualification Engine](../../projects/lead-qualification/README.md)
- [Project: WhatsApp Conversational Agent](../../projects/whatsapp-agent/README.md)
- [Project: Voice Receptionist](../../projects/voice-receptionist/README.md)
- [Security Policy](../../SECURITY.md)
- [STATE.md — Estado Operativo](../../STATE.md)
- [AGENTS.md — Protocolo Universal Multi-Agente](../../AGENTS.md)
- [MEMORY.md — Conocimiento Estable](../../MEMORY.md)