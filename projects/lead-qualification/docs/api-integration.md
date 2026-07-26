# API Integration — Lead Qualification Engine

## Webhook Endpoint

### Request

```http
POST /api/v1/leads/inbound
Content-Type: application/json
X-API-Key: {{api_key}}
```

```json
{
  "email": "contact@example.com",
  "name": "Jane Smith",
  "company": "Acme Corp",
  "phone": "+1-555-0123",
  "source": "website",
  "interest": "enterprise-plan",
  "message": "Interested in your automation platform for our sales team"
}
```

### Response (Success)

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
  "status": "received",
  "lead_id": "lq_abc123def456",
  "score": 78,
  "category": "sales",
  "temperature": "warm",
  "next_action": "followup_queue"
}
```

### Response (Validation Error)

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
```

```json
{
  "error": "validation_failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## AI Scoring Service (Internal)

### Request

```http
POST /api/v1/ai/score
Content-Type: application/json
Authorization: Bearer {{internal_token}}
```

```json
{
  "lead": {
    "email": "contact@example.com",
    "company": "Acme Corp",
    "industry": "technology",
    "employee_count": 250,
    "source": "website",
    "message": "Interested in enterprise plan"
  }
}
```

### Response

```json
{
  "score": 78,
  "temperature": "warm",
  "category": "sales",
  "rationale": "Enterprise company with clear use case and budget indication",
  "confidence": 0.89
}
```

## CRM Sync (External)

### Request

```http
PUT /crm/v1/contacts/upsert
Content-Type: application/json
Authorization: Bearer {{crm_token}}
```

```json
{
  "email": "contact@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "company": "Acme Corp",
  "phone": "+1-555-0123",
  "lead_score": 78,
  "lead_status": "warm",
  "source": "website"
}
```

### Response

```json
{
  "id": "contact_789xyz",
  "status": "updated",
  "previous_status": "new"
}
```

## Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Free | 100 requests | 1 hour |
| Pro | 1,000 requests | 1 hour |
| Enterprise | 10,000 requests | 1 hour |

Headers returned: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
