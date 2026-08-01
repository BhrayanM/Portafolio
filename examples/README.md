# Public Automation Examples

> Sanitized, educational n8n workflow examples demonstrating the **Webhook → AI → CRM → Notification** pattern. No credentials, tokens, or private URLs are included — use these as reference blueprints for your own automations.

---

## Pattern: Webhook → AI → CRM → Notification

```
[Trigger] → [Process] → [Decide] → [Act] → [Notify]
```

### What problem does it solve?

Every B2B automation pipeline follows the same skeleton: data arrives, gets enriched and scored, a decision is made, a system of record is updated, and the right people are notified. This pattern standardizes that flow so you don't rebuild error handling, retry logic, or idempotency for every new integration.

### Architecture

| Layer | Role | Example |
|-------|------|---------|
| **Trigger** | Ingestion via webhook, schedule, or event | Inbound lead form, CRM webhook, time-based cron |
| **Process** | Transform, enrich, or classify | LLM scoring, data normalization, field mapping |
| **Decide** | Business logic routing | Score threshold, lead source, human-in-the-loop gate |
| **Act** | Write to system of record | CRM upsert, database insert, API call |
| **Notify** | Alert the right people | Slack, email, SMS, dashboard update |

### Error handling

- Failed nodes retry with exponential backoff
- Unrecoverable errors route to a global error workflow
- All errors are logged with context (workflow ID, node, timestamp)
- Poison messages are dead-lettered for manual review

### Security

- No credentials, tokens, or API keys are stored in workflow JSON — use n8n credentials vault
- Webhook endpoints require authentication via header validation
- Rate limiting is enforced at the edge layer before reaching the workflow
- Sensitive data is redacted from execution logs

---

## Examples

| Workflow | Description | Trigger |
|----------|-------------|---------|
| [Lead Scoring Demo](lead-scoring-demo.json) | Score inbound leads via LLM and route by priority | Webhook |
| [CRM Sync Demo](crm-sync-demo.json) | Bidirectional contact sync between systems | Cron / Webhook |
| [Slack Alert Demo](slack-alert-demo.json) | Send context-rich alerts to Slack channels | Webhook |

---

### Lead Scoring Demo

```
Webhook → HTTP Request (Enrich) → LLM (Score) → Switch (Route) → CRM Upsert → Slack
```

Routes leads into Hot/Warm/Cold buckets with human approval gate for Hot leads.

### CRM Sync Demo

```
Cron → HTTP Request (Fetch) → Code (Transform) → HTTP Request (Upsert) → Slack
```

Scheduled sync that fetches contacts from one system and upserts them into another with field mapping.

### Slack Alert Demo

```
Webhook → Code (Format) → Slack (Send)
```

Receives structured payloads and posts formatted alerts to Slack channels with color-coded severity.

---

## Usage

These workflows read every external value from environment variables, so there are no
credentials to import — but n8n blocks `$env` inside Code nodes by default. Without the flag
below, the auth check throws `access to env vars denied` and nothing runs.

```bash
docker run -d --name n8n -p 5678:5678 \
  -e N8N_BLOCK_ENV_ACCESS_IN_NODE=false \
  -e N8N_ENCRYPTION_KEY=<32-byte-key> \
  -e LEAD_WEBHOOK_SECRET=<shared-secret> \
  -e ALERT_WEBHOOK_SECRET=<shared-secret> \
  -e LLM_API_URL=<provider-endpoint> -e LLM_API_KEY=<key> -e LLM_MODEL=<model> \
  -e CRM_API_URL=<crm-endpoint> -e CRM_ACCESS_TOKEN=<token> \
  -e SLACK_WEBHOOK_URL=<incoming-webhook> \
  -e SOURCE_API_URL=<...> -e SOURCE_API_TOKEN=<...> \
  -e DESTINATION_API_URL=<...> -e DESTINATION_API_TOKEN=<...> \
  n8nio/n8n:2.31.6
```

1. Import the `.json` file (Workflows → Add → Import from File)
2. Set the variables above on the n8n container
3. Activate the workflow
4. Call the webhook with the shared secret:

```bash
curl -X POST http://localhost:5678/webhook/lead-inbound \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <shared-secret>" \
  -d '{"email":"jane.smith@example.com","company":"Demo Company","message":"..."}'
```

### Verified

All three were imported into a clean **n8n 2.31.6** instance and executed against local mock
endpoints. `lead-scoring-demo` was exercised across the three routing branches:

| Score returned by the model | Branch taken | CRM `status` | Slack notification |
|---|---|---|---|
| 12 | Cold | `cold` | none, by design |
| 55 | Warm | `warm` | *Warm lead — Demo (score 55)* |
| 87 | Hot | `hot` | *Hot lead — Demo (score 87)* |

Also verified: the webhook returns `202 {"received":true}` before scoring (fast-ACK), a request
without `x-webhook-secret` reaches no downstream node, an invalid `severity` is rejected by the
validation node, and a prompt-injection attempt in `message` is neutralised before the payload
reaches the model.

### Known limitation

A rejected request currently returns HTTP 200 with an empty body instead of 401/400: when the
workflow throws before reaching the `Respond to Webhook` node, n8n closes the request itself.
Nothing downstream executes — the rejection is effective — but the caller cannot tell success
from rejection by status code. Giving the auth and validation nodes an error output wired to a
dedicated `Respond 401` / `Respond 400` node fixes it, at the cost of four more nodes.

---

> **Note:** These workflows are educational references. Test thoroughly in a development environment before adapting to production.
