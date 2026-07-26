# Architecture Decision Records (ADRs)

**Each structural decision is recorded: what was chosen, what was rejected, and how to roll back.**

---

## Why ADRs in Automation

A visual workflow is easy to change—that's its power and its trap. Six months later no one remembers **why** a node sits where it does, and someone "fixes" it, reintroducing the bug that node existed to prevent.

An ADR answers three questions no diagram answers:

1. What alternative was rejected and why?
2. What breaks if this decision is reverted?
3. What is the rollback procedure?

**Practical consequence:** rollback is a documented procedure, not a 23:00 improvisation with a client waiting.

---

## Publication Scope

> Complete ADRs are internal documents. Here the **decision level** is published: what was chosen, against what, and why. **Implementation detail—parameters, thresholds, schemas, queries, prompts—is not published**, because it constitutes the commercial method.

Example of the reduction applied:
> *"Chose PostgreSQL over SQLite for concurrency and durability"* — without schema, indexes, or partitioning strategy.

---

## Decision Index

| # | Decision | Status | Scope |
|---|----------|--------|-------|
| [001](#adr-001) | PostgreSQL as system of record, not SQLite | ✅ Accepted | All |
| [002](#adr-002) | Dedicated permanent Docker network between production and database | ✅ Accepted | Infrastructure |
| [003](#adr-003) | Input sanitization before AI layer | ✅ Accepted | All |
| [004](#adr-004) | Deduplication by business identity, not execution ID | ✅ Accepted | All |
| [005](#adr-005) | Human-in-the-loop only where error is costly | ✅ Accepted | Lead Qualification |
| [006](#adr-006) | Deterministic router in code after AI output | ✅ Accepted | All |
| [007](#adr-007) | Global Error Workflow with database persistence | ✅ Accepted | All |
| [008](#adr-008) | Immediate ACK on channels that retry | ✅ Accepted | WhatsApp, Voice |
| [009](#adr-009) | Dual persistence: database + operational layer | ✅ Accepted | Lead Qualification |
| [010](#adr-010) | State outside container, restart resilience | ✅ Accepted | Infrastructure |
| [011](#adr-011) | All external writes idempotent (upsert) | ✅ Accepted | All |
| [012](#adr-012) | Human handoff pauses automation on that thread | ✅ Accepted | WhatsApp, Voice |

---

## ADR-001 · PostgreSQL as System of Record, Not SQLite

**Context.** Orchestration must persist executions, business records, and errors, with multiple flows writing simultaneously.

**Decision.** PostgreSQL as system of record.

**Rejected Alternative.** SQLite (simpler default).

**Reason.** Concurrency and durability. SQLite locks the file under simultaneous writes—and here they happen: webhook, follow-up cron, and error workflow can coincide—and its single-file model tolerates container lifecycle poorly.

**Consequences.** One more service to operate and back up, in exchange for safe concurrent writes, queryable history, and data that survives container recreation.

**Rollback.** Documented. Reverse schema migration, with explicit warning that reverting reintroduces lock contention under concurrency.

---

## ADR-002 · Dedicated Permanent Docker Network Between Production and Database

**Context.** Intermittent connection failures after restarts: connectivity depended on addresses that changed.

**Decision.** Dedicated permanent Docker network between production container and database, with service-name resolution.

**Rejected Alternative.** Host IP or default network.

**Reason.** Eliminates an entire class of intermittent failures. Ephemeral IPs change on restart; service name does not.

**Consequences.** Explicit infrastructure artifact to maintain, in exchange for stable connectivity independent of start order.

**Rollback.** Documented, with warning that reverting reintroduces hard-to-diagnose sporadic failures (they fail intermittently, not consistently).

---

## ADR-003 · Input Sanitization Before AI Layer

**Context.** Text written by strangers reaches a language model whose output drives business logic.

**Decision.** Sanitize and constrain input **before** the model, treating user text as data to evaluate, not instruction to obey.

**Rejected Alternative.** Trusting the system prompt for the model to ignore manipulation attempts.

**Reason.** Defense inside the prompt is probabilistic; sanitization at ingress is deterministic. A lead must not be able to write something in a text field that classifies them as maximum priority or reveals system context.

**Consequences.** Additional stage to maintain, in exchange for a much smaller attack surface.

**Rollback.** Not recommended. Reverting reopens the prompt injection vector.

> Concrete sanitization rules are not published.

---

## ADR-004 · Deduplication by Business Identity, Not Execution ID

**Context.** The same real event arrives more than once: provider retries, double form submit, reprocess after incident.

**Decision.** Deduplicate by the identity of the **real thing** (lead email, provider message ID, event idempotency key).

**Rejected Alternative.** Deduplicate by orchestrator execution identifier.

**Reason.** Execution ID changes on every retry, so it deduplicates nothing. Business identity is stable across deliveries of the same event.

**Consequences.** Must choose and maintain an identity key per system, in exchange for safe reprocessing.

**Rollback.** Documented. Reverting reintroduces CRM duplicates.

> Deduplication window and storage backend are not published.

---

## ADR-005 · Human-in-the-Loop Only Where Error Is Costly

**Context.** AI classification is right most of the time, but a false-positive "Hot" makes a salesperson invest their most valuable hour in a lead that wasn't hot.

**Decision.** Human approval gate **only** for Hot leads.

**Rejected Alternatives.** (a) Approve everything. (b) Approve nothing.

**Reason.** Approving everything causes fatigue: people start approving on autopilot and the gate stops protecting. Approving nothing lets costly false positives through. Approving only the segment where error has real cost keeps the gate cheap and meaningful.

**Consequences.** Hot leads have bounded additional latency from human response, in exchange for team trust in the classification.

**Rollback.** Documented and low-risk: a configuration change, not structural.

---

## ADR-006 · Deterministic Router in Code After AI Output

**Context.** Must decide destination of each record based on model output.

**Decision.** Model returns **typed fields**; a router in code decides destination.

**Rejected Alternative.** Model decides destination directly.

**Reason.** Auditability and reproducibility. A router in code is readable, versioned, and tested; same input always produces same destination. An off-schema output fails loudly and goes to the error path, instead of silently contaminating the CRM.

**Consequences.** Must maintain an explicit contract between AI and pipeline, in exchange for predictable behavior.

**Rollback.** Not recommended. Reverting makes routing non-reproducible.

---

## ADR-007 · Global Error Workflow with Database Persistence

**Context.** Failures were discovered because a client complained.

**Decision.** A global error workflow captures failures from any flow and **writes them to an error table** with enough context to reproduce.

**Rejected Alternatives.** (a) Container logs. (b) Slack notification only.

**Reason.** Logs disappear when the container is recreated. A notification is read and forgotten. A table is queried, grouped by failure type, and answers the only question that matters in operations: *did this happen once or does it happen every day?*

**Consequences.** One more table to maintain and prune periodically, in exchange for real failure observability.

**Rollback.** Documented and not recommended: reverting leaves operations blind.

---

## ADR-008 · Immediate ACK on Channels That Retry

**Context.** Messaging and voice providers retry the webhook if it doesn't respond within their time budget. Processing with an LLM exceeds that budget almost always.

**Decision.** Acknowledge receipt immediately and process afterward, with deduplication as safety net.

**Rejected Alternative.** Process and respond at the end.

**Reason.** Without immediate ACK, the provider retries and the user receives the same response multiple times. It's the most visible and most damaging failure for end-user trust.

**Consequences.** Flow loses the ability to return the result in the same HTTP response, which forces deduplication to be solid.

**Rollback.** Not recommended. Reverting reintroduces duplicate responses.

---

## ADR-009 · Dual Persistence: Database + Operational Layer

**Context.** Engineering needs a source of truth; the sales team needs a surface where they can work and annotate.

**Decision.** Write to PostgreSQL (system of record) **and** a spreadsheet (operational layer), with the database as authority.

**Rejected Alternatives.** (a) Database only. (b) Spreadsheet only.

**Reason.** Database-only forces the sales team to request queries for everything, and they end up keeping their own parallel sheet—where automation dies. Spreadsheet-only doesn't support concurrency or reliable history.

**Consequences.** Two destinations to keep synchronized, with explicit definition of which wins on divergence (the database).

**Rollback.** Documented and low-risk: removing the operational layer doesn't affect the system of record.

---

## ADR-010 · State Outside Container, Restart Resilience

**Context.** A container restarts: deploy, update, or host failure. If state lives in its memory, it's lost.

**Decision.** All meaningful state—executions, pending approvals, deduplication registry, conversational threads—lives outside the container, with auto-restart policies.

**Rejected Alternative.** In-process memory state.

**Reason.** A restart cannot cost data or orphan a pending approval. It's the difference between a demo and a production system.

**Consequences.** More infrastructure pieces to operate, in exchange for restart being a routine operation, not an incident.

**Rollback.** Not recommended.

---

## ADR-011 · All External Writes Idempotent (Upsert)

**Context.** With retries and reprocessing, the same write executes more than once.

**Decision.** Every write to an external system uses **upsert** against a stable identity: if it exists, update; if not, create.

**Rejected Alternative.** Always create and clean duplicates later.

**Reason.** A CRM with duplicates loses trust, and when the team stops trusting the CRM they go back to their personal sheet. Cleaning later is recurring manual work that never gets done.

**Consequences.** Must define a stable identity per entity and per system.

**Rollback.** Not recommended.

---

## ADR-012 · Human Handoff Pauses Automation on That Thread

**Context.** When an agent escalates a conversation, notifying the team isn't enough.

**Decision.** Escalation does three things: notifies with context, **pauses automation on that thread**, and records that intervention occurred.

**Rejected Alternative.** Escalate by notifying only.

**Reason.** Without pause, the person and the bot reply to the same customer at the same time. That destroys trust faster than not automating at all.

**Consequences.** Requires an "intervened thread" state and explicit criteria for returning to automation.

**Rollback.** Not recommended.

---

## Internal ADR Template

Complete ADRs follow this template. **Implementation fields are not published.**

```
# ADR-NNN · <Decision Title>

State:        Proposed | Accepted | Superseded by ADR-NNN | Obsolete
Date:         YYYY-MM-DD
Scope:        <affected systems>

## Context
<what situation forced the decision>

## Decision
<what was chosen>

## Alternatives Considered
<what was rejected and why>

## Consequences
<what is gained, what costs, what remains pending>

## Rollback Procedure
<concrete steps to revert + what breaks on revert>

## Implementation Detail        ← NOT PUBLISHED
<parameters, schemas, thresholds, queries, prompts>
```

---

<div align="center">

[⬅️ Back to Portfolio](../README.md) · [Engineering Notes](../ENGINEERING_NOTES.md) · [Pattern Library](../patterns/webhook-ai-crm-notify.md) · [SECURITY](../SECURITY.md)

</div>