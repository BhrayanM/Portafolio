# Security Notes — Lead Qualification Engine

## Authentication

- All webhook endpoints require API key authentication via `X-API-Key` header
- API keys are generated per tenant and hashed with bcrypt (cost factor 12) before storage
- Internal services communicate via short-lived JWT tokens
- No credentials are stored in workflow definitions

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `LEAD_WEBHOOK_API_KEY` | Inbound webhook authentication |
| `LLM_API_KEY` | Provider API key for AI scoring |
| `CRM_API_URL` | CRM endpoint base URL |
| `CRM_ACCESS_TOKEN` | CRM authentication token |
| `SLACK_WEBHOOK_URL` | Slack notification channel |
| `DATABASE_URL` | PostgreSQL connection string |

## Input Validation

- All payload fields are sanitized before reaching the LLM
- SQL injection prevention via parameterized queries
- No executable content is stored or evaluated
- Field length limits enforced at the edge

## Least Privilege

| Integration | Scope | Justification |
|-------------|-------|---------------|
| CRM API | `contacts:write` | Only upsert contacts |
| Slack API | `chat:write` | Only send messages to specific channel |
| LLM API | Model inference | No data retention or training |
| Database | Schema-scoped user | Limited to lead-related tables |

## Data Protection

- TLS 1.2+ for all external API communications
- Secrets never logged — redaction middleware in backend
- Error logs exclude request body content
- Database encryption at rest
- Regular credential rotation schedule

## Security Headers (Edge Proxy)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | Restricted by environment |
