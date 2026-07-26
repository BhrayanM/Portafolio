# n8n Workflow Patterns — Lead Qualification

## Available Patterns

### 1. Webhook Receiver Pattern

**When to use**: Ingesting data from external sources (forms, CRMs, APIs).

```
Webhook Node → IF Node (Auth Check) → Code Node (Validate) → [Continue]
```

**Key configuration**:
- Respond with 200 immediately
- Set `Response Mode` to `Last Node`
- Validate credentials in a separate path before main processing

### 2. AI Agent Pattern

**When to use**: LLM-powered decision making with structured output.

```
HTTP Request (Prepare) → OpenAI Node → Code Node (Validate Schema) → Switch Node
```

**Key configuration**:
- Use JSON Schema validation on LLM output
- Set `Response Format` to `JSON Object`
- Add Code node after LLM to validate schema compliance

### 3. Router Pattern

**When to use**: Deterministic routing based on field values.

```
Switch Node → [Route A] → [Route B] → [Route C]
```

**Key configuration**:
- Use `Code` node for complex routing logic
- Fallback route for unhandled values
- Log all routing decisions

### 4. Human Approval Pattern

**When to use**: High-stakes decisions requiring human judgment.

```
Switch → Slack Node (Send Approval) → Wait Node → Webhook Node (Response) → [Continue/Skip]
```

**Key configuration**:
- Use `Wait` node with `webhook` option for persistent pending state
- Include full context in Slack notification
- Handle timeout with default reject behavior

### 5. CRM Synchronization Pattern

**When to use**: Idempotent writes to external CRM systems.

```
Code Node (Map Fields) → HTTP Request (Upsert) → Code Node (Parse Response) → [Continue]
```

**Key configuration**:
- Use `PUT` with upsert semantics
- Handle 409 Conflict as success (idempotent)
- Retry 3x on 5xx errors with exponential backoff

## Pattern Selection Guide

| Scenario | Primary Pattern | Secondary Pattern |
|----------|----------------|-------------------|
| Lead form submission | Webhook Receiver | AI Agent |
| Lead scoring | AI Agent | Router |
| Sales vs support routing | Router | — |
| Hot lead handling | Human Approval | CRM Sync |
| CRM update | CRM Sync | Webhook Receiver |

## Error Handling Best Practices

- Every workflow should have an Error Trigger workflow configured
- Use `Error Workflow` in n8n settings to catch unhandled errors
- Log errors to PostgreSQL via HTTP Request node
- Include workflow ID, node name, timestamp, and input context in error logs
