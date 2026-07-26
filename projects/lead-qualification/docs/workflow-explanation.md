# Workflow Explanation — Lead Qualification Engine

## Architecture Overview

```
[Inbound Webhook] → [Validation] → [AI Scoring] → [Category Router] → [Human Approval] → [CRM Sync] → [Follow-up]
```

## Component Breakdown

### 1. Webhook Trigger
- **Endpoint**: Authenticated HTTP POST endpoint
- **Method**: Responds with 200 immediately (fast-ACK pattern)
- **Validation**: API key verification at the edge before any processing

### 2. Payload Validation
- Schema enforcement using JSON Schema contracts
- Required fields: `email`, `name`, `source`, `interest`
- Rejects malformed payloads with 422 status and logs to error workflow

### 3. AI Scoring Layer
- Calls LLM with structured output format
- Returns: `score` (number), `temperature` (hot/warm/cold), `category`, `rationale`
- Schema validation on LLM response — malformed output goes to error path

### 4. Category Router
- Deterministic switch based on category field
- Routes: sales, support, information, partnership
- Each route has its own downstream pipeline

### 5. Human Approval Gate
- Triggered for high-value leads (Hot temperature)
- Sends approval card to Slack with AI rationale
- Waits persistently for approve/reject decision
- State survives container restarts

### 6. CRM Synchronization
- Idempotent upsert to HubSpot
- Deduplication by email (business identity)
- Writes to PostgreSQL as source of truth
- Optional Google Sheets sync for operational team

### 7. Automated Follow-up
- Scheduled cron picks pending warm/cold leads
- Generates context-aware follow-up messages
- Marks contacts as contacted to prevent duplicate outreach

## Data Flow

```
Input (Webhook)
  ↓
Step 1: Authenticate & Rate Limit
  ↓
Step 2: Validate Schema
  ↓
Step 3: Sanitize & Normalize
  ↓
Step 4: AI Enrichment (LLM)
  ↓
Step 5: Route by Category
  ├── Hot → Human Approval → CRM
  ├── Warm → Follow-up Queue → CRM
  └── Cold → Follow-up Queue → CRM
  ↓
Step 6: Notify Team (Slack)
  ↓
Output (201 Created)
```

## Error Handling

| Error Type | Behavior | Recovery |
|------------|----------|----------|
| Invalid API key | 401 response, logged attempt | N/A (client error) |
| Malformed payload | 422 response, logged to error table | Retry with corrected payload |
| LLM timeout | Retry 2x with backoff, then error path | Alert operator |
| LLM schema violation | Route to error path with full context | Manual review |
| CRM API failure | Retry 3x with exponential backoff | Dead-letter for manual sync |
| Slack API failure | Log to error table, continue pipeline | No customer impact |
