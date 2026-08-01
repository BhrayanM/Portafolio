# Architecture Decision Records (ADRs)

**Every structural decision is written down: what was chosen, what was rejected and
how to roll back.**

---

## Why I keep ADRs in automations

A visual workflow is easy to change. That is its superpower and its trap: six months
later nobody remembers **why** that node is where it is, and someone "fixes" it by
reintroducing the bug that node existed to prevent.

An ADR answers three questions that no diagram answers:

1. Which alternative was rejected, and why?
2. What breaks if this decision is reverted?
3. What is the rollback procedure?

**Practical consequence:** rollback is a written procedure, not an improvisation at
11 PM with a client waiting.

---

## Note on published scope

> The complete ADRs are internal documents. What is published here is the **decision
> level**: what was chosen, against what, and why. The internal "how" —parameters,
> thresholds, schemas, queries, prompts— is **not published**, because it is the
> replicable part and constitutes the commercial method.
>
> Example of the applied reduction:
> *"I chose PostgreSQL over SQLite for concurrency and durability"* — without the
> schema, the indexes, or the partitioning strategy.

---

## Decision index

| # | Decision | State | Scope |
|---|---|---|---|
| [001](#adr-001) | PostgreSQL as the system of record, not SQLite | ✅ Accepted | All |
| [002](#adr-002) | Dedicated permanent Docker network between production and the database | ✅ Accepted | Infrastructure |
| [003](#adr-003) | Input sanitization before the AI layer | ✅ Accepted | All |
| [004](#adr-004) | Deduplication by business identity, not execution ID | ✅ Accepted | All |
| [005](#adr-005) | Human-in-the-loop only where errors are expensive | ✅ Accepted | Lead Qualification |
| [006](#adr-006) | Deterministic router in code after AI output | ✅ Accepted | All |
| [007](#adr-007) | Global error workflow with database persistence | ✅ Accepted | All |
| [008](#adr-008) | Immediate ACK on channels that retry | ✅ Accepted | WhatsApp, Voice |
| [009](#adr-009) | Dual persistence: database + operational layer | ✅ Accepted | Lead Qualification |
| [010](#adr-010) | State outside the container and restart resilience | ✅ Accepted | Infrastructure |
| [011](#adr-011) | Every external write is idempotent (upsert) | ✅ Accepted | All |
| [012](#adr-012) | Human handoff pauses the thread's automation | ✅ Accepted | WhatsApp, Voice |
| [013](#adr-013) | CSRF mitigation: double-submit token + Origin + SameSite | ✅ Accepted | Backend |

---

<a id="adr-001"></a>
## ADR-001 · PostgreSQL as the system of record, not SQLite

**Context.** The orchestration needs to persist executions, business records and errors,
with several flows writing concurrently.

**Decision.** PostgreSQL as the system of record.

**Rejected alternative.** SQLite (the default and simplest option to start).

**Reason.** Concurrency and durability. SQLite locks the file under simultaneous writes
—and there are many here: webhook, follow-up cron and error workflow can coincide— and
its single-file model does not tolerate a container's lifecycle well.

**Consequences.** One more service to operate and back up, in exchange for safe
concurrent writes, queryable history and data that survives container recreation.

**Rollback.** Documented. Reverse schema migration, with the explicit warning that
reverting reintroduces locking under concurrency.

---

<a id="adr-002"></a>
## ADR-002 · Dedicated permanent Docker network between production and the database

**Context.** Intermittent connection failures after restarts: connectivity depended on
addresses that changed.

**Decision.** Dedicated permanent Docker network between the production container and
the database, resolved by service name.

**Rejected alternative.** Connection by host IP or default network.

**Reason.** Eliminates an entire class of intermittent failures. Ephemeral IPs change
after a restart; the service name does not.

**Consequences.** One explicit infrastructure artifact to maintain, in exchange for
stable connectivity independent of startup order.

**Rollback.** Documented, with the warning that reverting reintroduces intermittent
failures that are hard to diagnose (they fail sporadically, not consistently).

---

<a id="adr-003"></a>
## ADR-003 · Input sanitization before the AI layer

**Context.** Text written by strangers reaches a language model whose output drives
business logic.

**Decision.** Sanitize and scope the input **before** the model, treating user text as
*data to evaluate*, not *instructions to obey*.

**Rejected alternative.** Relying on system prompt instructions for the model to ignore
manipulation attempts.

**Reason.** Defense inside the prompt is probabilistic; sanitization at the input is
deterministic. A lead must not be able to write something in a text field that classifies
it as maximum priority or reveals the system context.

**Consequences.** One more stage to maintain, in exchange for a much smaller attack
surface.

**Rollback.** Not recommended. Reverting reopens the prompt injection vector.

> The concrete sanitization rules are not published.

---

<a id="adr-004"></a>
## ADR-004 · Deduplication by business identity, not execution ID

**Context.** The same real event arrives more than once: provider retries, double form
submissions, reprocessing after an incident.

**Decision.** Deduplicate by the identity of the **real thing** (lead email, provider
message ID, event idempotency key).

**Rejected alternative.** Deduplicating by orchestrator execution ID.

**Reason.** The execution ID changes on every retry, so it deduplicates nothing.
Business identity is stable across deliveries of the same event.

**Consequences.** An identity key must be chosen and maintained per system, in exchange
for safe reprocessing.

**Rollback.** Documented. Reverting reintroduces CRM duplicates.

> The time window and dedup registry storage backend are not published.

---

<a id="adr-005"></a>
## ADR-005 · Human-in-the-loop only where errors are expensive

**Context.** AI qualification is right most of the time, but a false "Hot" positive makes
a salesperson spend their most valuable hour on a lead that was not.

**Decision.** Human approval gate **only** for hot leads.

**Rejected alternatives.** (a) Approve everything. (b) Approve nothing.

**Reason.** Approving everything creates fatigue: people start approving without reading
and the gate stops protecting. Approving nothing lets expensive false positives through.
Gating only the segment where a mistake has real cost keeps the gate cheap and
meaningful.

**Consequences.** Hot leads have additional latency bounded by human response time, in
exchange for the team trusting the classification.

**Rollback.** Documented and low risk: a configuration change, not structural.

---

<a id="adr-006"></a>
## ADR-006 · Deterministic router in code after AI output

**Context.** Each record's destination must be decided from what the model returns.

**Decision.** The model returns **typed fields**; a router in code decides the
destination.

**Rejected alternative.** Letting the model decide the destination directly.

**Reason.** Auditability and reproducibility. A router in code can be read, versioned
and tested; the same input always produces the same destination. Additionally,
out-of-schema output fails loudly and goes to the error path instead of silently
corrupting the CRM.

**Consequences.** An explicit contract between AI and pipeline must be maintained, in
exchange for predictable behavior.

**Rollback.** Not recommended. Reverting makes routing non-reproducible.

---

<a id="adr-007"></a>
## ADR-007 · Global error workflow with database persistence

**Context.** Failures were discovered because a client complained.

**Decision.** A global error workflow that captures failures from any flow and **writes
them to an error table** with enough context to reproduce them.

**Rejected alternatives.** (a) Container logs. (b) Slack notification only.

**Reason.** Logs are lost when the container is recreated. A notification is read and
forgotten. A table can be queried, grouped by failure type and answers the question that
matters: *did this happen once or every day?*

**Consequences.** One more table to maintain and review periodically, in exchange for
real failure observability.

**Rollback.** Documented and not recommended: reverting leaves operations blind.

---

<a id="adr-008"></a>
## ADR-008 · Immediate ACK on channels that retry

**Context.** Messaging and voice providers retry the webhook if it does not respond
within their time budget. Processing with an LLM exceeds that budget almost always.

**Decision.** Acknowledge receipt immediately and process afterwards, with deduplication
as the safety net.

**Rejected alternative.** Process and respond at the end.

**Reason.** Without an immediate ACK, the provider retries and the user receives the
same response several times. It is the most visible and most damaging failure for
customer trust.

**Consequences.** The flow loses the ability to return the result in the same HTTP
response, which forces deduplication to be solid.

**Rollback.** Not recommended. Reverting reintroduces duplicate responses.

---

<a id="adr-009"></a>
## ADR-009 · Dual persistence: database + operational layer

**Context.** Engineering needs a source of truth; the business team needs a surface
where they can work and annotate.

**Decision.** Write to PostgreSQL (system of record) **and** to a spreadsheet
(operational layer), with the database as the authority.

**Rejected alternatives.** (a) Database only. (b) Spreadsheet only.

**Reason.** Database only forces the business team to request queries for everything,
and they end up keeping their own parallel spreadsheet — that is where the automation
dies. Spreadsheet only does not support concurrency or reliable history.

**Consequences.** Two destinations to keep in sync, and it is explicitly defined which
one wins when they diverge (the database).

**Rollback.** Documented and low risk: removing the operational layer does not affect
the system of record.

---

<a id="adr-010"></a>
## ADR-010 · State outside the container and restart resilience

**Context.** A container restarts: deployment, update or host failure. If state lives
in its memory, it is lost.

**Decision.** All significant state —executions, pending approvals, dedup registry,
conversation threads— lives outside the container, with automatic restart policies.

**Rejected alternative.** In-process memory state.

**Reason.** A restart cannot cost data or orphan a pending approval. It is the
difference between a demo and a production system.

**Consequences.** More infrastructure pieces to operate, in exchange for restart being a
routine operation and not an incident.

**Rollback.** Not recommended.

---

<a id="adr-011"></a>
## ADR-011 · Every external write is idempotent (upsert)

**Context.** With retries and reprocessing, the same write will execute more than once.

**Decision.** Every write to an external system is an **upsert** against a stable
identity: update if it exists, create if it does not.

**Rejected alternative.** Always create and clean duplicates later.

**Reason.** A CRM with duplicates stops being trustworthy, and when the team stops
trusting the CRM they go back to their personal spreadsheet. Cleaning up later is
recurring manual work that is never done.

**Consequences.** A stable identity must be defined per entity and per system.

**Rollback.** Not recommended.

---

<a id="adr-012"></a>
## ADR-012 · Human handoff pauses the thread's automation

**Context.** When an agent escalates a conversation, notifying the team is not enough.

**Decision.** Escalation does three things: notifies with context, **pauses the
automation on that thread** and records that there was an intervention.

**Rejected alternative.** Escalate by notification only.

**Reason.** Without a pause, the person and the bot reply at the same time to the same
customer. That destroys trust faster than not automating anything.

**Consequences.** A "thread intervened" state and an explicit criterion to return the
thread to automation are needed.

**Rollback.** Not recommended.

---

<a id="adr-013"></a>
## ADR-013 · CSRF mitigation for cookie sessions (double-submit + Origin + SameSite)

**Context.** The API authenticates via an HttpOnly cookie (`access_token`) for browsers
and via `Authorization: Bearer` for non-browser clients. CSRF is a browser-only attack:
a malicious site triggers mutating requests carrying the victim's cookies.

**Decision.** Defense in depth without changing the API contract for Bearer clients:

1. **SameSite=Lax** on the session cookie: the browser does not send the cookie on
   cross-site POSTs. Covers the default case.
2. **OWASP double-submit token** in `middleware/csrf.js`: the server issues a
   JS-readable `csrf-token` cookie; every mutating request (POST/PUT/PATCH/DELETE) with
   a session cookie must echo the token in the `x-csrf-token` header. A third-party
   site cannot read the cookie (Same-Origin Policy) nor set the header (CORS).
3. **Origin validation**: the request must be same-origin or come from an origin in
   `CORS_ORIGINS`.

Requests without a session cookie —login, Bearer clients, external webhooks (WhatsApp,
Twilio, Stripe)— are not validated: they authenticate through other means.

**Rejected alternatives.**
- **`csurf`:** unmaintained, with known CVEs.
- **`tiny-csrf`:** maintained and compatible, but designed for server-rendered forms
  (signed HttpOnly cookie with a 5-minute TTL, single-use token via `req.csrfToken()`),
  not for a JSON SPA with server-to-server clients.
- **Relying only on SameSite:** does not cover deployments with `SameSite=None`
  (frontend and API on separate subdomains, as `.env.example` documents).

**Reason.** Stateless double-submit combined with SameSite and Origin blocks the real
vector (browser with session cookie) without requiring a server session or changing the
Bearer flow.

**Consequences.** The frontend echoes the cookie in the header on every mutating request
(one line in the centralized HTTP client). Clients using the session cookie outside a
browser must echo the token like a browser does.

**Rollback.** Documented and low risk: removing the middleware leaves protection to
SameSite alone.

---

## Internal ADR format

Complete ADRs follow this template. **Implementation fields are not published.**

```
# ADR-NNN · <Decision title>

Status:        Proposed | Accepted | Superseded by ADR-NNN | Obsolete
Date:          YYYY-MM-DD
Scope:         <affected systems>

## Context
<what situation forced the decision>

## Decision
<what was chosen>

## Alternatives considered
<what was rejected and why>

## Consequences
<what is gained, what it costs, what remains pending>

## Rollback procedure
<concrete steps to revert + what breaks when reverting>

## Implementation detail        ← NOT PUBLISHED
<parameters, schemas, thresholds, queries, prompts>
```

---

<div align="center">

[⬅️ Back to the portfolio](../../README.md) · [Reusable pattern](../patterns/webhook-ai-crm-notify.md) · [SECURITY](../../SECURITY.md)

</div>
