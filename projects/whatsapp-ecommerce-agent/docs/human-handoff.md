# Human Handoff Protocol — WhatsApp Commerce Agent

## When to Escalate

| Trigger | Example | Priority |
|---------|---------|----------|
| Customer explicitly asks | "Talk to a human" | High |
| Repeated confusion | Customer rephrases same question 3x | High |
| Out of scope | Question not covered by tools | Medium |
| Negative sentiment | Frustration or anger detected | High |
| Tool failure | All retries exhausted | Medium |
| Compliance need | Privacy, refund, or legal questions | High |

## Handoff Execution

```
Step 1: Detect escalation trigger
Step 2: Collect full conversation context
Step 3: Notify team via Slack with context summary
Step 4: Pause automation on this thread
Step 5: Mark thread as "handoff_pending"
Step 6: Send customer acknowledgment
```

## Thread Pause Mechanism

When automation is paused on a thread:

- Incoming messages from this customer are queued but not processed by AI
- Human agent receives queued messages when they pick up the thread
- Automation resumes only when human explicitly releases the thread
- Prevents dual responses (bot + human replying simultaneously)

## Context Passed to Human

```json
{
  "customer": {
    "phone": "+1-555-0123",
    "name": "Jane Smith",
    "order_history": ["#12345", "#12346"]
  },
  "conversation": [
    {"role": "customer", "message": "I need help with my order"},
    {"role": "agent", "message": "I can help! What's your order number?"},
    {"role": "customer", "message": "#12345"},
    {"role": "agent", "message": "Order #12345 is out for delivery"},
    {"role": "customer", "message": "I want to talk to a human please"}
  ],
  "escalation_reason": "customer_request",
  "tools_used": ["lookup_order"],
  "automation_paused": true
}
```

## Post-Handoff Monitoring

- Track: escalation rate, resolution time, customer satisfaction
- Review weekly for pattern improvements
- Update FAQ engine to reduce future escalations on common topics
- Flag outliers (frequent escalations from same tool/time/category)
