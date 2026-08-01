# Tool Calling Pattern — WhatsApp Commerce Agent

## Architecture

The agent uses a bounded tool-calling loop where the LLM selects from a predefined set of tools. Each tool is single-purpose with a clear input/output contract.

```
[Customer Message + Memory]
  ↓
LLM Classifier → Intent
  ↓
Tool Selector (deterministic mapping)
  ↓
Execute Tool with timeout
  ↓
Parse Result
  ↓
LLM Response Generator
  ↓
Send Reply
```

## Available Tools

### `lookup_order`

| Property | Value |
|----------|-------|
| **Purpose** | Fetch real-time order status |
| **API** | Shopify REST Admin API |
| **Input** | `order_id: string` |
| **Output** | Status, tracking, ETA, items |
| **Timeout** | 5s |
| **Retry** | 2x exponential backoff |

### `faq_engine`

| Property | Value |
|----------|-------|
| **Purpose** | Answer common customer questions |
| **Source** | Vectorized knowledge base |
| **Input** | `query: string` |
| **Output** | Answer text, confidence score |
| **Timeout** | 3s |
| **Fallback** | Escalate if confidence < 0.7 |

### `product_search`

| Property | Value |
|----------|-------|
| **Purpose** | Search product catalog |
| **API** | Catalog search API |
| **Input** | `query: string`, `max_results: number` |
| **Output** | Product list (name, price, stock) |
| **Timeout** | 3s |
| **Pagination** | Max 5 results per query |

### `qualify_lead`

| Property | Value |
|----------|-------|
| **Purpose** | Evaluate purchase intent |
| **API** | CRM lookup + LLM scoring |
| **Input** | `customer_id: string`, `conversation_context: object` |
| **Output** | Intent score, segment, suggested next action |
| **Timeout** | 4s |

### `escalate_human`

| Property | Value |
|----------|-------|
| **Purpose** | Transfer to human agent |
| **Trigger** | Explicit request, repeated confusion, out of scope |
| **Action** | Notify team + pause automation on thread |
| **Context** | Full conversation history passed to human |

## Cost Optimization

- Tools are called only when needed (not on every message)
- Conversation memory reduces redundant lookups
- FAQ engine resolves ~60% of queries without API calls
- Timeout prevents runaway costs from hanging external services

## Error Handling

| Error | Action |
|-------|--------|
| Tool timeout | Log error, apologize, offer to escalate |
| API 4xx | Inform customer, suggest alternative |
| API 5xx | Retry 2x, then apologize and escalate |
| Invalid tool input | Log validation error, re-prompt customer |
| Missing tool | Fall back to human handoff |
