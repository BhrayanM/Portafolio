# Engineering Practices

Patterns, trade-offs and lessons learned while building production-oriented automation
systems and platforms. High-level documentation: the operational *how* of each system
—parameters, thresholds, schemas— is not published (see [SECURITY.md](../SECURITY.md)).

---

## Reliability patterns

### Fast ACK + deduplication are non-negotiable for webhooks

Every provider that retries (WhatsApp, Twilio, calendars, forms) will send the same
event twice if your handler exceeds their timeout budget. The sequence that prevents
duplicate user-facing responses:

1. Validate auth → 2. ACK 200 immediately → 3. Deduplicate by provider event ID → 4. Process

Reversing steps 2 and 3 does not work: the retry arrives before the first execution
finishes deduplication. The provider's retry budget is measured in seconds; an LLM call
exceeds it by default.

### External state must survive container restarts

Conversations, pending approvals, deduplication registries, workflow execution state —
anything a user or a downstream system cares about must live outside the container. A
deployment, update or host failure cannot cost data or orphan an approval.

**Implication:** every workflow that holds state needs external storage (PostgreSQL,
Redis, or the orchestrator's own database configured for persistence). Memory-only
systems are prototypes, not production systems.

### Global error capture beats per-workflow try/catch

A single error workflow that subscribes to all failures, writes to a persistent table
with full context (input, node, error, stack) and alerts on critical thresholds answers
the only question that matters in operations: *is this a one-off or a pattern?*

Container logs disappear on recreate. Slack alerts are read and forgotten. A queryable
error table, groupable by type and date, is the only artifact that survives an incident
review.

---

## LLM integration patterns

### The model proposes, code disposes

The LLM must return structured, typed output (score, category, entities, rationale). A
deterministic router in code decides the destination. This beats letting the model pick
the destination because it is:

- **Auditable:** router logic can be read, versioned and tested
- **Reproducible:** the same input always produces the same destination
- **Cheap:** no extra model call
- **Fast:** critical for voice latency budgets
- **Fail-loud:** out-of-schema output goes to the error path instead of silently
  corrupting the CRM

### Sanitize at the gateway, not in the prompt

Input from the open internet reaches the LLM. Treat it as *data to evaluate*, not
*instructions to obey*. Sanitization and normalization at the workflow entry point are
deterministic defense; prompt instructions are probabilistic and bypassable.

**Principle, not recipe:** the concrete sanitization rules are part of the operational
method and are not published. What is public is the architectural decision: the gateway
owns safety, the model owns classification.

### Human-in-the-loop only where false positives are expensive

Approving everything causes approval fatigue → auto-approve → the gate becomes theater.
Approving nothing lets costly false positives through. The sweet spot: gate only the
segment where a mistake has real business cost (e.g., Hot leads that consume a
salesperson's prime hour).

The wait must be persistent: a container restart during human deliberation must not lose
the pending approval.

---

## Multi-tenant architecture

### Shared schema + RLS over separate databases

Chosen for operational simplicity (one database to back up, migrate and monitor),
resource efficiency (shared pools) and guaranteed isolation: RLS policies enforce
`tenant_id = current_setting('app.current_tenant')` at the engine level, unbypassable
even by raw SQL.

High-volume tenants can migrate to dedicated schemas later without application rewrites.

### API keys as first-class auth

`pk_`-prefixed keys for server-to-server communication, generated with
`crypto.randomBytes`, validated via dedicated middleware, with rotation and revocation
built in from day one. Distinct from user JWT sessions (short-lived, HttpOnly cookie).

---

## Payment integration

### Webhook verification requires the raw body

Stripe signature verification fails if Express parses JSON before the webhook handler
reads the raw body. The webhook route needs a dedicated `express.raw()` parser applied
**before** the global `express.json()`.

### Event idempotency

Every Stripe event is processed exactly once through two-layer idempotency: a
per-event key and a CRM upsert by contact identity. The exact composition of the
idempotency keys is part of the operational method and is not published.

---

## Observability

- **Prometheus** scrapes `/metrics` from the API, n8n, PostgreSQL exporter and
  node-exporter
- **Loki** aggregates structured JSON logs (`tenant_id`, `trace_id`, `level`)
- **OpenTelemetry** readiness with W3C TraceContext via the request ID middleware
- **Grafana** with alert rules for error rate, p99, saturation and DB connections
- **Uptime Kuma** with synthetic `/health` checks every 30 s

### Multi-tenant dashboards require the tenant label

All metrics and logs carry `tenant_id`. Dashboards filter by it, and alerts can be
tenant-scoped or global.

---

## Security

### Zero secrets in code, fail-fast in production

Production startup aborts if a critical secret is missing: `JWT_SECRET`,
`STRIPE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`. No defaults, no
silent fallbacks.

### Defense in depth

| Layer | Controls |
|---|---|
| Network | Private Docker networks, TLS 1.2+ at the edge, HSTS, security headers; internal ports never exposed |
| Application | Helmet (CSP, HSTS, X-Frame), per-environment CORS allowlist, tiered rate limits (global, auth, API key), CSRF via double-submit token + Origin validation on cookie-authenticated mutating requests |
| Authentication | bcrypt cost 12, JWT HS256 (24 h, no refresh tokens), API key rotation |
| Authorization | Roles (admin/manager/member), tenant-scoped middleware, RLS as final enforcement |
| Data | `.env` in `.gitignore`, secret patterns in `.gitignore` (`*.secret`, `*.key`, `*.pem`) |

---

## Lessons learned

1. **The first retry is not an edge case — it is the happy path.** Design for retries
   from the first line of webhook code.
2. **State in memory is debt.** Pay it immediately or it compounds at the worst moment.
3. **A queryable error table is worth a thousand Slack alerts.** Build it before you
   need it.
4. **LLM output is a proposal, not a command.** Validate the schema, route in code,
   fail loudly on violation.
5. **Sanitization is a gateway responsibility.** Do not push it into the prompt where
   it is probabilistic.
6. **Approval gates only where the cost of a false positive is measurable.** Everything
   else proceeds.
7. **Upsert is the only safe write pattern.** Create + dedupe-later is operational debt
   that is never repaid.
8. **A handoff without pause is worse than no automation.** The bot and the human must
   never race.
9. **RLS is your last line of defense.** Application bugs happen; the database must
   still enforce isolation.
10. **Fail-fast configuration prevents silent misconfigurations in production.** If a
    secret is missing, the process must not start.

---

## Related documents

- [Architecture Decision Records (ADRs)](./adr/README.md)
- [Pattern: Webhook → AI → CRM → Notification](./patterns/webhook-ai-crm-notify.md)
- [Lead Qualification Engine architecture](./architecture.md)
- [SaaS platform](./platform.md)
- [Security policy](../SECURITY.md)
