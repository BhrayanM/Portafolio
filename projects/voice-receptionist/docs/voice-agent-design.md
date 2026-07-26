# Voice Agent Design — Bilingual Voice Receptionist

## Design Principles

### 1. Latency-First Architecture

Voice interactions have strict timing constraints. Every component is designed to fit within sub-second budgets.

```
User speaks (1-2s)
  ↓ STT (0.5s)
  ↓ Intent detection (0.1s)
  ↓ Tool execution (1.5s max)
  ↓ TTS generation (0.5s)
  ↓ Response playback
Total target: < 4s round trip
```

### 2. Deterministic Before Generative

Rules engine handles known patterns. LLM is reserved for ambiguous or novel queries. This reduces latency, cost, and unpredictability.

### 3. Graceful Degradation

Every tool has a timeout and fallback. Silence is never an acceptable response — the agent always says something useful even if a tool fails.

## Tool Design Specifications

| Tool | Max Latency | Fallback Behavior |
|------|-------------|-------------------|
| Check Availability | 2s | "I'm having trouble checking, please try again later" |
| Create Booking | 2s | Log intent, offer callback |
| Lookup Appointment | 2s | Offer to transfer to human |
| Cancel Appointment | 2s | Confirm cancellation, log |
| Reschedule | 3s | Offer manual rescheduling |
| Order Inquiry | 3s | Offer email update instead |
| Escalate Human | 1s | Immediate handoff |

## Memory & Context

- Session memory: current call only (ephemeral)
- Interaction log: persistent in PostgreSQL
- Context carried through conversation: language, intent history, confirmed entities
- No sensitive data stored in conversation memory

## Bilingual Architecture

```
[Audio Input]
  ↓
Language Detection Model
  ├── EN → EN TTS Engine → EN Confirmation Templates
  └── ES → ES TTS Engine → ES Confirmation Templates
  ↓
Shared Logic Layer (language-independent)
  ↓
Calendar / Commerce / Handoff
```

## Scaling Considerations

- Multiple concurrent calls handled via Docker Compose scale
- Each call runs as an independent n8n execution
- Database connection pooling for interaction logging
- Monitoring via call duration, success rate, and tool latency metrics
