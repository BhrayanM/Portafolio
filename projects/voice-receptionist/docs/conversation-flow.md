# Conversation Flow — Bilingual Voice Receptionist

## Call Lifecycle

```
Incoming Call
  ↓
Twilio Voice Webhook
  ↓
Fast-ACK (200 OK)
  ↓
Language Detection (EN/ES)
  ↓
Speech-to-Text Transcription
  ↓
Intent Extraction (Rules Engine)
  ↓
Tool Selection (Deterministic Router)
  ├── Check Availability
  ├── Create Booking
  ├── Lookup Appointment
  ├── Cancel Appointment
  ├── Reschedule Appointment
  ├── Order Inquiry
  └── Escalate to Human
  ↓
Execute Tool (with latency budget)
  ↓
Generate Response (TTS, detected language)
  ↓
Send Confirmation (WhatsApp/Email)
  ↓
Log Interaction
```

## Language Detection Protocol

1. First utterance is analyzed for language markers
2. Locale context is set (EN or ES) for remaining conversation
3. Date/time/number formatting follows locale
4. All subsequent TTS output uses detected language
5. Written confirmations match language and locale

## Intent Recognition

| Intent | Trigger Phrases (EN) | Trigger Phrases (ES) |
|--------|----------------------|----------------------|
| Availability | "available", "free slot", "opening" | "disponible", "horario", "cupo" |
| Book | "book", "schedule", "appointment" | "agendar", "reservar", "cita" |
| Lookup | "my appointment", "when" | "mi cita", "cuándo" |
| Cancel | "cancel", "cancel appointment" | "cancelar", "anular" |
| Reschedule | "reschedule", "change date" | "reagendar", "cambiar fecha" |
| Order | "order", "purchase", "delivery" | "pedido", "compra", "entrega" |

## Error Recovery

| Scenario | Behavior |
|----------|----------|
| Unrecognized intent | Ask clarifying question (max 2 attempts) |
| Tool timeout | Spoken fallback: "I'm having trouble, let me transfer you" |
| Calendar API error | Log error, apologize, offer human escalation |
| Language uncertainty | Default to EN, ask for preference |
| Disconnection | Save partial state, log incomplete interaction |
