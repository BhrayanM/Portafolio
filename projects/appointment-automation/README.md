<div align="center">

# Appointment Automation

**Lo que pasa después de la cita, automatizado: CRM sincronizado, registro auditable y equipo notificado.**

[![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![CRM](https://img.shields.io/badge/CRM_upsert-FF7A59?style=flat-square&logo=hubspot&logoColor=white)](#)

[![Estado](https://img.shields.io/badge/estado-demostración-2ea44f?style=flat-square)](#)
[![Idempotente](https://img.shields.io/badge/idempotente-sí-blueviolet?style=flat-square)](#)
[![Auditable](https://img.shields.io/badge/registro-auditable-0aa?style=flat-square)](#)

</div>

---

## El problema

La cita es el momento fácil. Lo difícil es **lo que viene después**.

En la mayoría de los equipos, el post-cita vive en la cabeza de alguien: *"creo que quedó
en pensarlo"*, *"lo apunté en un papel"*, *"¿alguien actualizó el CRM?"*. Resultado:

- El CRM refleja una realidad de hace tres semanas.
- Nadie puede responder cuántas citas terminaron en venta, porque el dato no existe.
- El mismo contacto aparece dos veces porque dos personas lo cargaron a mano.
- Un evento reenviado por el sistema de calendario duplica todo el registro.

---

## La solución en una frase

Un flujo disparado al cerrar la cita que **normaliza el resultado**, hace **upsert
idempotente en el CRM**, **persiste un registro auditable** y **notifica al equipo** — de
forma que reprocesar el mismo evento deja todo exactamente igual.

---

## Arquitectura conceptual

```mermaid
flowchart TD
    A["📅 Evento de cita cerrada<br/><i>webhook o disparador programado</i>"] --> B["🧼 Normalización<br/>del resultado"]
    B --> C{"¿Payload<br/>completo?"}
    C -- No --> C1["Camino de error<br/>con contexto"]
    C -- Sí --> D["🔑 Cálculo de clave<br/>de idempotencia"]
    D --> E{"¿Evento ya<br/>procesado?"}
    E -- Sí --> E1["Descartar<br/>sin efectos"]
    E -- No --> F["🔗 Upsert en CRM<br/><i>por identidad de contacto</i>"]
    F --> G[("🗄️ Registro persistente<br/>en PostgreSQL")]
    G --> H["🔔 Notificación<br/>al canal del equipo"]
    G --> I{"¿El resultado<br/>abre seguimiento?"}
    I -- Sí --> J["Encola tarea<br/>de seguimiento"]
    I -- No --> K["Cierra el ciclo"]

    L["🚨 Error Workflow global"] -.captura fallos.-> M[("Tabla de errores<br/>en PostgreSQL")]

    style D fill:#412991,color:#fff
    style F fill:#FF7A59,color:#fff
    style G fill:#4169E1,color:#fff
    style L fill:#8b1a1a,color:#fff
    style M fill:#8b1a1a,color:#fff
```

---

## El corazón del sistema: idempotencia

Este flujo es el más simple de los cuatro y, precisamente por eso, el que mejor ilustra un
principio que la mayoría de las automatizaciones ignoran.

**El mismo evento va a llegar dos veces.** No es una hipótesis: es lo que pasa cuando un
sistema de calendario reintenta, cuando alguien pulsa "guardar" dos veces, o cuando se
reprocesa un lote tras un incidente.

Un flujo no idempotente convierte cada reintento en un contacto duplicado, una nota
duplicada y una notificación duplicada. Un flujo idempotente lo absorbe sin efecto.

```mermaid
flowchart LR
    subgraph SIN ["❌ Sin idempotencia"]
        direction TB
        A1["Evento"] --> B1["Crear contacto"]
        A2["Evento repetido"] --> B2["Crear contacto"]
        B1 --> C1[("2 contactos<br/>2 notas<br/>2 avisos")]
        B2 --> C1
    end

    subgraph CON ["✅ Con idempotencia"]
        direction TB
        D1["Evento"] --> E1["Upsert por identidad"]
        D2["Evento repetido"] --> E2["Clave ya vista<br/>→ sin efecto"]
        E1 --> F1[("1 contacto<br/>1 nota<br/>1 aviso")]
        E2 --> F1
    end

    style C1 fill:#8b1a1a,color:#fff
    style F1 fill:#1a6b2a,color:#fff
```

Se aplican **dos capas** de protección, porque una sola no basta:

| Capa | Qué hace | Qué protege |
|---|---|---|
| **Clave de idempotencia del evento** | Descarta la re-entrega antes de tocar nada | Notificaciones y efectos secundarios duplicados |
| **Upsert por identidad de contacto** | El CRM converge al mismo estado | Contactos duplicados aunque la primera capa falle |

> La composición concreta de la clave de idempotencia no se publica.

---

## Recorrido por etapas

### 1. Disparo

El flujo arranca al cerrarse la cita. La fuente del evento se abstrae detrás de una etapa
de normalización, de forma que cambiar de sistema de calendario **no obliga a rehacer el
resto del flujo**.

### 2. Normalización del resultado

El resultado de la cita se convierte en un conjunto acotado de valores tipados. Un campo de
texto libre no puede alimentar la lógica de negocio: si el resultado no encaja en el
vocabulario definido, el registro va al camino de error en vez de escribirse a medias.

### 3. Upsert en el CRM

Escritura idempotente por identidad de contacto: si existe se actualiza, si no se crea.
Además del contacto, se sincroniza el resultado de la cita como dato consultable — no como
una nota que nadie lee.

### 4. Registro persistente

Cada cita procesada deja fila en PostgreSQL: qué se decidió, cuándo y qué hizo el sistema
después.

**Por qué una base de datos y no solo el CRM:** el CRM guarda el estado *actual* del
contacto. La base de datos guarda la *historia* de lo que pasó, que es lo que permite
responder "¿cuántas citas terminaron en venta el trimestre pasado?" sin depender de que
nadie haya editado un campo.

### 5. Notificación

El canal del equipo recibe el resumen. **Después** de escribir en los sistemas de registro,
no antes: si la escritura falla, nadie recibe un aviso de algo que no ocurrió.

### 6. Seguimiento condicional

Si el resultado abre seguimiento, se encola. Si cierra el ciclo, no se hace nada — y "no
hacer nada" también queda registrado.

---

## Decisiones de ingeniería

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Doble capa de idempotencia | Solo upsert | El upsert protege el CRM, no las notificaciones ni los efectos secundarios |
| Notificar después de persistir | Notificar primero | Evita avisar de algo que luego falló al escribirse |
| Resultado tipado | Texto libre del comercial | La lógica de negocio no puede depender de cómo alguien redactó una nota |
| Registro en PostgreSQL además del CRM | Solo CRM | El CRM guarda estado actual; la BD guarda historia y permite analítica |
| Normalización desacoplada de la fuente | Acoplar al calendario concreto | Cambiar de proveedor no obliga a rehacer el flujo completo |
| Camino de error explícito | Escribir lo que se pueda | Una escritura parcial es peor que ninguna: parece correcta y no lo es |

📄 Contexto adicional en el [registro de ADRs](../../docs/adr/README.md).

---

## Comportamiento operativo

| Propiedad | Comportamiento |
|---|---|
| **Idempotencia** | Reprocesar N veces deja el sistema igual que procesarlo una vez |
| **Sin duplicados en CRM** | Garantizado por identidad de contacto, no por confiar en la fuente |
| **Auditabilidad** | Toda cita procesada es consultable con su resultado y su fecha |
| **Todo o nada** | Un payload incompleto va al camino de error; nunca se escribe a medias |
| **Independencia del proveedor** | La normalización aísla al resto del flujo de la fuente del evento |

---

## Fragmento ilustrativo

> ⚠️ **Genérico y no funcional de extremo a extremo.** Muestra la *forma* del guardián de
> idempotencia. No contiene la composición real de la clave, el vocabulario de resultados
> de negocio ni el mapeo de campos del CRM.

```js
// ILUSTRATIVO — el guardián de idempotencia va ANTES de cualquier efecto secundario.

async function handleAppointmentEvent(event, store, crm, notifier) {
  const key = buildIdempotencyKey(event); // composición no publicada

  const firstTime = await store.claim(key);
  if (!firstTime) {
    return { status: 'skipped', reason: 'already_processed' };
  }

  // Upsert: converge al mismo estado sin importar cuántas veces se ejecute.
  await crm.upsertContact({
    identity: event.contactIdentity,
    outcome: event.normalizedOutcome,
  });

  await store.recordAppointment(key, event);

  // La notificación va al final: solo se avisa de lo que ya quedó escrito.
  await notifier.send(buildSummary(event));

  return { status: 'processed' };
}
```

---

## Qué NO encontrarás en este repositorio

- El workflow n8n exportado ni el grafo real de nodos y conexiones.
- La composición de la clave de idempotencia.
- El vocabulario de resultados de negocio ni el mapeo de campos del CRM.
- Las reglas que deciden cuándo se abre seguimiento.
- Credenciales, IDs de calendario, IDs de canal, cadenas de conexión.

Ver [SECURITY.md](../../SECURITY.md).

---

<div align="center">

**¿Automatizas lo que pasa después de la cita?**
[CONTACT.md](../../CONTACT.md)

[⬅️ Volver al portafolio](../../README.md) · [Patrón reutilizable](../../docs/patterns/webhook-ai-crm-notify.md) · [ADRs](../../docs/adr/README.md)

</div>
