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

1. Import the `.json` file into your n8n instance (Workflows → Add → Import from File)
2. Open the credentials vault and configure:
   - Your LLM provider API key
   - Your CRM access token
   - Your Slack webhook URL
3. Update node parameters to match your environment
4. Activate the workflow

---

> **Note:** These workflows are educational references. Test thoroughly in a development environment before adapting to production.
