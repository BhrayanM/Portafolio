# Security Notes — Bilingual Voice Receptionist

## Authentication

- Voice webhook endpoints authenticated via Twilio webhook signature validation
- Calendar API access uses OAuth 2.0 service account with scoped permissions
- Commerce API uses private app tokens with read-only order scope
- No credentials stored in n8n workflow exports

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TWILIO_AUTH_TOKEN` | Webhook signature verification |
| `TWILIO_ACCOUNT_SID` | Twilio API authentication |
| `CALENDAR_SERVICE_KEY` | OAuth service account JSON |
| `SHOPIFY_ACCESS_TOKEN` | Commerce read-only token |
| `LLM_API_KEY` | Voice AI provider key |
| `DATABASE_URL` | Interaction log connection |

## Data Protection

- Call audio is not stored after processing
- Transcriptions are logged without personally identifiable information
- Calendar event details are not persisted in workflow logs
- Database connection uses TLS with certificate validation
- API tokens scoped to minimum required operations

## Input Validation

- All webhook payloads validated before processing
- Twilio signature verified on every inbound webhook
- Phone numbers normalized and validated
- SQL injection prevention via parameterized queries

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Voice Webhook | 10 requests | 1 second (per number) |
| Calendar API | 100 requests | 1 minute |
| Commerce API | 30 requests | 1 minute |

## Audit Trail

- All interactions logged with: call ID, language, intent, tool used, duration, outcome
- Error events logged with full context for debugging
- Logs exclude audio content and personal data
- Retention: 90 days for interaction logs, 30 days for error logs
