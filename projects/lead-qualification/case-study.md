# Case Study — Never let a customer wait: every request sorted the moment it arrives

> Target niche: home services & trades in the U.S. (plumbing, HVAC, electrical, repair).
> Technical details: see the [project README](README.md). Follow-up from the original project
> description — this text only reformulates what the project already does.

![Lead qualification workflow](lead-qualification-workflow-diagram.svg)
![System architecture](system-architecture.svg)

## The problem

You're under a sink or on a roof with your hands full and the phone rings — another job lost to voicemail. Web forms and WhatsApp messages pile up, and you end up answering in arrival order, not by urgency or value. A homeowner with a burst pipe waits behind someone who just asked for a quote.

## The solution

A system that gathers every request —web form and WhatsApp— into one place, checks that the details are correct, and sorts each lead automatically with AI as Hot, Warm or Cold. Hot leads (emergency, high value) are flagged for a quick human review before they enter your CRM; the rest are routed and stored with no duplicates. You get the alert about the urgent job and decide where to send your crew, instead of digging through the pile.

## The results

- [to complete with real demo data] leads processed per day with zero manual work
- [to complete with real demo data] % of leads classified automatically
- [to complete with real demo data] duplicates avoided in the CRM
- [to complete with real demo data] response time to a hot lead

## Technical stack

n8n, AI (LLM), HubSpot, Slack, PostgreSQL.

## Suggested metrics (to measure in demo)

- Leads processed per day
- % of leads classified automatically (Hot/Warm/Cold)
- Time between lead arrival and classification (seconds)
- Duplicates prevented on CRM entry
- Response time to Hot leads (minutes)

## Video script (2–3 min, recordable with Loom)

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:20 | Camera + browser open on the system dashboard | «If your phone rings while your hands are in a pipe, this demo is for you. I'll show you how a trades business captures, sorts and responds to every request without touching the phone.» |
| 0:20–0:50 | A web contact form is submitted and a WhatsApp message arrives | «Here are two requests: one from your website form, one from WhatsApp. Both land in the same system, get checked automatically, and are sorted within seconds.» |
| 0:50–1:25 | The flow runs on screen: the lead appears and the AI assigns Hot/Warm/Cold with visible reasoning | «The system reads the request, validates the details, and classifies it. This one is a water leak with urgency: it's flagged Hot automatically. Quote requests come out as Warm or Cold.» |
| 1:25–1:55 | The Hot lead triggers a Slack alert with an approval button; it's approved and enters the CRM | «A Hot lead goes through human review before it enters your CRM: you decide, not the system. One click approves it and it's ready for tomorrow's job.» |
| 1:55–2:20 | In the CRM: the contact saved once, no duplicates, plus the Warm/Cold list | «In the CRM everything lives in one place, with no duplicate contacts. Not a single message gets lost, and you decide which customer to call first.» |
| 2:20–2:45 | Closing: camera + contact details on screen | «If you're losing calls and requests while you're out on jobs, book a live demo with your own data. My contact info is on screen.» |

---

# Estudio de caso — Nunca más un cliente esperando: cada solicitud clasificada al instante

> Nicho objetivo: servicios del hogar y oficios en EE.UU. (plomería, HVAC/climatización, electricistas, reparaciones).
> Detalles técnicos: ver el [README del proyecto](README.md).

![Flujo de calificación de leads](lead-qualification-workflow-diagram.svg)
![Arquitectura del sistema](system-architecture.svg)

## El problema

Estás debajo de un lavabo o en un tejado con las manos ocupadas y suena el teléfono: otra llamada que termina en el buzón de voz. Los mensajes de WhatsApp y los formularios de tu web se acumulan, y al final respondes por orden de llegada, no por urgencia ni valor. Un cliente con una fuga urgente espera detrás de alguien que solo quería un presupuesto.

## La solución

Un sistema que reúne cada solicitud —formulario web y WhatsApp— en un solo lugar, verifica que los datos sean correctos y clasifica cada lead automáticamente como Caliente, Tibio o Frío con IA. Los leads calientes (avería, urgencia, alto valor) se marcan para aprobación rápida por una persona antes de entrar a tu CRM; el resto se enruta y se guarda sin duplicados. Tú recibes el aviso de lo urgente y decides a qué trabajo ir, en vez de ordenar la pila de mensajes.

## El resultado

- [a completar con datos reales de la demo] leads procesados al día sin trabajo manual
- [a completar con datos reales de la demo] % de leads clasificados automáticamente
- [a completar con datos reales de la demo] duplicados evitados en el CRM
- [a completar con datos reales de la demo] tiempo de reacción ante un lead caliente

## Stack técnico

n8n, IA (LLM), HubSpot, Slack, PostgreSQL.

## Métricas sugeridas (a medir en demo)

- Leads procesados por día
- % de leads clasificados automáticamente (Caliente/Tibio/Frío)
- Tiempo entre la llegada del lead y su clasificación (segundos)
- Duplicados evitados al entrar al CRM
- Tiempo de respuesta a leads Calientes (minutos)

## Guion de video (2–3 min, grabable con Loom)

| Tiempo | Qué se ve en pantalla | Qué se dice |
|---|---|---|
| 0:00–0:20 | Cámara + navegador abierto en el panel del sistema | «Si tu teléfono suena mientras tienes las manos en una tubería, esta demo es para ti. Te enseño cómo un negocio de oficios captura, clasifica y responde cada solicitud sin tocar el teléfono.» |
| 0:20–0:50 | Se envía un formulario web de contacto y llega un mensaje de WhatsApp | «Aquí tienes dos solicitudes: una viene del formulario de la web y otra de WhatsApp. Las dos llegan al mismo sistema, se revisan solas y se clasifican en segundos.» |
| 0:50–1:25 | El flujo se ejecuta en pantalla: el lead aparece y la IA asigna Caliente/Tibio/Frío con la justificación visible | «El sistema lee la solicitud, valida los datos y la clasifica. Esta es una fuga de agua con urgencia: automáticamente queda como lead caliente. Las consultas de presupuesto salen como tibias o frías.» |
| 1:25–1:55 | El lead caliente genera un aviso en Slack con botón de aprobación; se aprueba y entra al CRM | «Un lead caliente pasa por revisión humana antes de entrar al CRM: tú decides, no el sistema. Con un clic se aprueba y queda listo para el trabajo del día.» |
| 1:55–2:20 | En el CRM: contacto guardado una sola vez, sin duplicados, y la lista de leads tibios/fríos | «En el CRM todo queda en un solo lugar, sin contactos duplicados. Ni un solo mensaje se pierde, y tú decides a qué cliente atender primero.» |
| 2:20–2:45 | Cierre: cámara + datos de contacto en pantalla | «Si estás perdiendo llamadas y solicitudes mientras trabajas, agenda una demo en vivo con tus propios datos. Mi contacto está en pantalla.» |

---

[Back to project README](README.md) · [All projects](../README.md)
