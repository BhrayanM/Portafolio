# Case Study — Inquiries answered and viewings booked — without a missed call

> Target niche: real estate agencies and property management.
> **Important:** this case applies existing, documented systems to this niche — the
> [lead qualification engine](../lead-qualification/README.md), the
> [bilingual voice receptionist](../voice-receptionist/README.md) and the
> [appointment automation](../appointment-automation/README.md). It is not a dedicated
> project and it does not claim a real client implementation: it only reformulates
> capabilities already demonstrated in those projects.

![Bilingual voice receptionist architecture](../voice-receptionist/voice-agent-bilingual-architecture.svg)

## The problem

The phone rings while you're showing a unit or handling maintenance: a prospect asking about availability and price, or a tenant who needs to reschedule. Missed calls mean empty units stay empty longer. Inquiries arrive by phone, WhatsApp and website without any order, viewings are booked by hand, and there is no follow-up after the visit.

## The solution

The systems that already handle lead capture, qualification and scheduling for other niches, applied to real estate: every inquiry from the web and WhatsApp is captured, validated and qualified by priority, and urgent requests are flagged for human review before they enter the CRM. A bilingual voice receptionist answers when you can't — in English or Spanish — checks availability and books, cancels or reschedules viewings, and escalates to a person when needed. After the visit, the result is recorded, the CRM is updated without duplicates and the team is notified.

## The results

- [to complete with real demo data] % of calls answered outside office hours
- [to complete with real demo data] viewings booked without human involvement
- [to complete with real demo data] inquiries qualified automatically by priority
- [to complete with real demo data] duplicate contacts avoided in the CRM

## Technical stack

n8n · AI (LLM) · AI voice · Language detection (EN/ES) · Calendar API · HubSpot · Slack · PostgreSQL.

## Suggested metrics (to measure in demo)

- % of calls answered outside office hours
- Viewings booked without human involvement
- Seconds to check availability and book a viewing
- % of inquiries qualified automatically (Hot/Warm/Cold)
- % of completed viewings recorded and notified to the team

## Video script (2–3 min, recordable with Loom)

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:20 | Camera + browser open on the system dashboard | «For an agency or a property manager, every missed call is a unit that stays empty longer. This demo shows how existing automation handles inquiries and books viewings on its own.» |
| 0:20–0:55 | A web form inquiry and a WhatsApp message arrive; both are qualified as Hot/Warm/Cold on screen | «An inquiry arrives through the website and another through WhatsApp. Both are validated and qualified by priority automatically.» |
| 0:55–1:30 | A call comes in; the bilingual receptionist answers in Spanish, checks availability and books the viewing | «A prospect calls and the receptionist answers in their language. It checks availability, proposes a slot and books the viewing — no voicemail.» |
| 1:30–1:55 | A hot inquiry is flagged for human approval before entering the CRM | «Urgent inquiries are flagged for a quick human approval before they reach the CRM: the owner decides, not the system.» |
| 1:55–2:20 | The viewing is marked completed; the CRM updates and the team gets the notification | «After the visit, the result is recorded, the CRM updates without duplicates and the team is notified.» |
| 2:20–2:45 | Closing: camera + call to action | «If you're losing inquiries and viewings while you're out on site, let's run a live demo adapted to your properties. My contact info is on screen.» |

---

# Estudio de caso — Consultas atendidas y visitas agendadas — sin una llamada perdida

> Nicho objetivo: agencias inmobiliarias y administración de propiedades.
> **Importante:** este caso aplica sistemas existentes y documentados a este nicho — el
> [motor de calificación de leads](../lead-qualification/README.md), la
> [recepcionista de voz bilingüe](../voice-receptionist/README.md) y la
> [automatización post-cita](../appointment-automation/README.md). No es un proyecto
> dedicado ni se afirma una implementación para un cliente real: solo reformula capacidades
> ya demostradas en esos proyectos.

![Arquitectura de la recepcionista de voz bilingüe](../voice-receptionist/voice-agent-bilingual-architecture.svg)

## El problema

Suena el teléfono mientras estás mostrando una propiedad o atendiendo un mantenimiento: un interesado pregunta por disponibilidad y precio, o un inquilino necesita reagendar. Las llamadas perdidas significan propiedades vacías por más tiempo. Las consultas llegan por teléfono, WhatsApp y web sin ningún orden, las visitas se agendan a mano y no hay seguimiento después de la visita.

## La solución

Los sistemas que ya manejan la captura de leads, la calificación y la agenda para otros nichos, aplicados a inmobiliarias: cada consulta de la web y de WhatsApp se captura, valida y califica por prioridad, y las solicitudes urgentes se marcan para revisión humana antes de entrar al CRM. Una recepcionista de voz bilingüe contesta cuando tú no puedes —en inglés o español—, consulta disponibilidad y agenda, cancela o reagenda visitas, y escala a una persona cuando hace falta. Después de la visita, el resultado se registra, el CRM se actualiza sin duplicados y el equipo recibe la notificación.

## El resultado

- [a completar con datos reales de la demo] % de llamadas atendidas fuera de horario de oficina
- [a completar con datos reales de la demo] visitas agendadas sin intervención humana
- [a completar con datos reales de la demo] consultas calificadas automáticamente por prioridad
- [a completar con datos reales de la demo] contactos duplicados evitados en el CRM

## Stack técnico

n8n · IA (LLM) · IA de voz · Detección de idioma (EN/ES) · API de calendario · HubSpot · Slack · PostgreSQL.

## Métricas sugeridas (a medir en demo)

- % de llamadas atendidas fuera de horario de oficina
- Visitas agendadas sin intervención humana
- Segundos para consultar disponibilidad y agendar una visita
- % de consultas calificadas automáticamente (Caliente/Tibia/Fría)
- % de visitas completadas registradas y notificadas al equipo

## Guion de video (2–3 min, grabable con Loom)

| Tiempo | Qué se ve en pantalla | Qué se dice |
|---|---|---|
| 0:00–0:20 | Cámara + navegador abierto en el panel del sistema | «Para una agencia o un administrador de propiedades, cada llamada perdida es una propiedad que sigue vacía. Esta demo muestra cómo una automatización existente atiende consultas y agenda visitas por sí sola.» |
| 0:20–0:55 | Llegan una consulta del formulario web y un mensaje de WhatsApp; ambas se califican en pantalla como Caliente/Tibia/Fría | «Llega una consulta por la web y otra por WhatsApp. Ambas se validan y califican por prioridad automáticamente.» |
| 0:55–1:30 | Entra una llamada; la recepcionista bilingüe contesta en español, consulta disponibilidad y agenda la visita | «Un interesado llama y la recepcionista le contesta en su idioma. Consulta disponibilidad, propone un horario y agenda la visita — sin buzón de voz.» |
| 1:30–1:55 | Una consulta urgente se marca para aprobación humana antes de entrar al CRM | «Las consultas urgentes se marcan para una aprobación humana rápida antes de entrar al CRM: decide el dueño, no el sistema.» |
| 1:55–2:20 | La visita se marca como completada; el CRM se actualiza y el equipo recibe la notificación | «Después de la visita, el resultado se registra, el CRM se actualiza sin duplicados y el equipo recibe el aviso.» |
| 2:20–2:45 | Cierre: cámara + llamado a la acción | «Si estás perdiendo consultas y visitas mientras estás fuera en una propiedad, hagamos una demo en vivo adaptada a tus inmuebles. Mi contacto está en pantalla.» |

---

[Lead qualification](../lead-qualification/README.md) · [Voice receptionist](../voice-receptionist/README.md) · [Appointment automation](../appointment-automation/README.md) · [All projects](../README.md)
