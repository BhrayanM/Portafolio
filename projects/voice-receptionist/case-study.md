# Case Study — A receptionist who never clocks out — and speaks English and Spanish

> Target niche: home services & trades in the U.S. (plumbing, HVAC, electrical, repair).
> This case combines the [voice receptionist](README.md) and the
> [post-appointment automation](../appointment-automation/README.md) projects.
> It only reformulates what those projects already do.

![Bilingual voice agent architecture](voice-agent-bilingual-architecture.svg)

## The problem

The job runs late and the phone rings at 7 p.m. or on a Saturday. If you don't answer, the homeowner calls your competitor. And many of your customers speak Spanish: leaving a message on an English-only voicemail doesn't always work. After the appointment, notes get lost, the CRM isn't updated, and your team doesn't hear how the job went.

## The solution

A voice receptionist that answers when you can't, detects whether the caller speaks English or Spanish, and responds in their language. It understands what they need: checks your calendar, books, cancels or reschedules appointments, and escalates to a person when the case calls for it. When the appointment closes, the system records the outcome, updates the CRM with no duplicate contacts, and notifies your team.

## The results

- [to complete with real demo data] % of calls answered outside business hours
- [to complete with real demo data] appointments booked with no human involvement
- [to complete with real demo data] % of calls handled in the right language (English/Spanish)
- [to complete with real demo data] cancellations or reschedules handled by the system

## Technical stack

AI voice, language detection, calendar API · n8n, CRM, PostgreSQL.

## Suggested metrics (to measure in demo)

- % of calls answered outside business hours
- Appointments booked with no human involvement
- Time to check availability and book (seconds)
- % of calls with correct language detection (English/Spanish)
- Cancellations and reschedules handled by the system

## Video script (2–3 min, recordable with Loom)

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:20 | Camera + a phone ringing on screen | «It's 7 p.m., the job ran late, and the phone is still ringing. Who answers? I'll show you a voice receptionist that works 24/7 and speaks English and Spanish.» |
| 0:20–0:55 | Incoming call: the AI receptionist answers, the customer speaks Spanish, and the language detection shows on screen | «The customer calls and the system detects instantly that they're speaking Spanish. The receptionist handles them in their language and asks what they need.» |
| 0:55–1:30 | The receptionist checks the calendar, proposes a time slot and confirms the booking; the calendar updates live | «The receptionist checks your calendar in real time, proposes a slot, and confirms the appointment. No waiting, no voicemail: the customer hangs up with their visit booked.» |
| 1:30–1:55 | An escalated call: the receptionist transfers to a person | «If the customer needs something that requires a person, the call escalates automatically. The system knows when to hand it over.» |
| 1:55–2:20 | The appointment is marked completed; the CRM updates and the team gets the notification | «When the appointment closes, the outcome is recorded, the CRM updates with no duplicate contacts, and your team gets the notification. Zero paperwork.» |
| 2:20–2:45 | Closing: camera + call to action | «No call gets lost, in any language. If you want to see it working with your own calendar, book a live demo. My contact info is on screen.» |

---

# Estudio de caso — Una recepcionista que nunca se va a casa — y habla inglés y español

> Nicho objetivo: servicios del hogar y oficios en EE.UU. (plomería, HVAC/climatización, electricistas, reparaciones).
> Este caso combina la [recepcionista de voz](README.md) y la
> [automatización post-cita](../appointment-automation/README.md).

![Arquitectura del agente de voz bilingüe](voice-agent-bilingual-architecture.svg)

## El problema

El trabajo se alarga y el teléfono suena a las 7 de la tarde o el sábado. Si no contestas, el cliente llama a tu competencia. Y muchos de tus clientes hablan español: dejar el mensaje en el buzón de voz en inglés no siempre funciona. Después de la cita, los apuntes se pierden, el CRM no se actualiza y tu equipo no se entera de cómo salió el trabajo.

## La solución

Una recepcionista de voz que contesta cuando tú no puedes, detecta si el cliente habla inglés o español y lo atiende en su idioma. Entiende qué necesita: consulta tu agenda, agenda, cancela o reagenda citas y, si el caso lo amerita, escala la llamada a una persona. Cuando la cita se cierra, el sistema registra el resultado, actualiza el CRM sin duplicar contactos y notifica al equipo.

## El resultado

- [a completar con datos reales de la demo] % de llamadas atendidas fuera de horario
- [a completar con datos reales de la demo] citas agendadas sin intervención humana
- [a completar con datos reales de la demo] % de llamadas atendidas en el idioma correcto (inglés/español)
- [a completar con datos reales de la demo] cancelaciones o reagendaciones resueltas por el sistema

## Stack técnico

IA de voz, detección de idioma, API de calendario · n8n, CRM, PostgreSQL.

## Métricas sugeridas (a medir en demo)

- % de llamadas atendidas fuera de horario
- Citas agendadas sin intervención humana
- Tiempo para consultar disponibilidad y agendar (segundos)
- % de llamadas con detección correcta de idioma (inglés/español)
- Cancelaciones y reagendaciones resueltas por el sistema

## Guion de video (2–3 min, grabable con Loom)

| Tiempo | Qué se ve en pantalla | Qué se dice |
|---|---|---|
| 0:00–0:20 | Cámara + teléfono sonando en pantalla | «Son las 7 de la tarde, el trabajo se alargó y el teléfono sigue sonando. ¿Quién contesta? Te muestro una recepcionista de voz que trabaja 24/7 y habla inglés y español.» |
| 0:20–0:55 | Llamada entrante: la recepcionista de voz contesta, el cliente habla en español y el sistema muestra la detección de idioma | «El cliente llama y el sistema detecta al instante que habla español. La recepcionista lo atiende en su idioma y le pregunta qué necesita.» |
| 0:55–1:30 | La recepcionista consulta la agenda, propone un horario y confirma la cita; se ve el calendario actualizándose en vivo | «La recepcionista revisa tu agenda en tiempo real, propone un horario y confirma la cita. Sin esperas, sin buzón de voz: el cliente cuelga con su visita asegurada.» |
| 1:30–1:55 | Una llamada escalada: la recepcionista transfiere a una persona | «Si el cliente necesita algo que requiere a una persona, la llamada escala automáticamente. El sistema sabe cuándo delegar.» |
| 1:55–2:20 | La cita se marca como completada; el CRM se actualiza y el equipo recibe la notificación | «Cuando se cierra la cita, el resultado se registra, el CRM se actualiza sin duplicar contactos y tu equipo recibe el aviso. Cero papeleo.» |
| 2:20–2:45 | Cierre: cámara + llamado a la acción | «Ninguna llamada se pierde, en ningún idioma. Si quieres verla trabajar con tu propio calendario, agenda una demo en vivo. Mi contacto está en pantalla.» |

---

[Back to project README](README.md) · [Appointment automation project](../appointment-automation/README.md) · [All projects](../README.md)
