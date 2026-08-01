# Registro de decisiones de arquitectura (ADRs)

**Cada decisión estructural queda escrita: qué se eligió, qué se descartó y cómo se
vuelve atrás.**

---

## Por qué mantengo ADRs en automatizaciones

Un workflow visual es fácil de cambiar. Ese es su superpoder y su trampa: seis meses
después nadie recuerda **por qué** ese nodo está donde está, y alguien lo "arregla"
reintroduciendo el bug que ese nodo existía para prevenir.

Un ADR responde tres preguntas que ningún diagrama responde:

1. ¿Qué alternativa se descartó y por qué?
2. ¿Qué se rompe si se revierte esta decisión?
3. ¿Cuál es el procedimiento de vuelta atrás?

**Consecuencia práctica:** el rollback es un procedimiento escrito, no una improvisación a
las 23:00 con un cliente esperando.

---

## Nota sobre el alcance publicado

> Los ADRs completos son documentos internos. Aquí se publica el **nivel decisión**: qué se
> eligió, contra qué y por qué. **El "cómo" interno —parámetros, umbrales, esquemas,
> consultas, prompts— no se publica**, porque es la parte replicable y constituye el método
> comercial.
>
> Ejemplo de la reducción aplicada:
> *"Elegí PostgreSQL sobre SQLite por concurrencia y durabilidad"* — sin el esquema, sin los
> índices, sin la estrategia de particionado.

---

## Índice de decisiones

| # | Decisión | Estado | Ámbito |
|---|---|---|---|
| [001](#adr-001) | PostgreSQL como sistema de registro, no SQLite | ✅ Aceptada | Todos |
| [002](#adr-002) | Red Docker dedicada y permanente entre producción y base de datos | ✅ Aceptada | Infraestructura |
| [003](#adr-003) | Saneamiento de entrada antes de la capa de IA | ✅ Aceptada | Todos |
| [004](#adr-004) | Deduplicación por identidad de negocio, no por ID de ejecución | ✅ Aceptada | Todos |
| [005](#adr-005) | Human-in-the-loop solo donde el error es caro | ✅ Aceptada | Lead Qualification |
| [006](#adr-006) | Router determinista en código tras la salida de la IA | ✅ Aceptada | Todos |
| [007](#adr-007) | Error Workflow global con persistencia en base de datos | ✅ Aceptada | Todos |
| [008](#adr-008) | ACK inmediato en canales que reintentan | ✅ Aceptada | WhatsApp, Voz |
| [009](#adr-009) | Doble persistencia: base de datos + capa operativa | ✅ Aceptada | Lead Qualification |
| [010](#adr-010) | Estado fuera del contenedor y resiliencia a reinicios | ✅ Aceptada | Infraestructura |
| [011](#adr-011) | Toda escritura externa es idempotente (upsert) | ✅ Aceptada | Todos |
| [012](#adr-012) | El handoff a humano pausa la automatización del hilo | ✅ Aceptada | WhatsApp, Voz |
| [013](#adr-013) | Mitigación de CSRF: SameSite + validación de Origin | ✅ Aceptada | Backend |

---

<a id="adr-001"></a>
## ADR-001 · PostgreSQL como sistema de registro, no SQLite

**Contexto.** La orquestación necesita persistir ejecuciones, registros de negocio y
errores, con varios flujos escribiendo a la vez.

**Decisión.** PostgreSQL como sistema de registro.

**Alternativa descartada.** SQLite (opción por defecto y más simple de arrancar).

**Razón.** Concurrencia y durabilidad. SQLite bloquea el archivo bajo escrituras
simultáneas —y aquí las hay: webhook, cron de seguimiento y error workflow pueden coincidir—
y su modelo de archivo único no tolera bien el ciclo de vida de un contenedor.

**Consecuencias.** Un servicio más que operar y respaldar, a cambio de escrituras
concurrentes seguras, historia consultable y datos que sobreviven a recrear el contenedor.

**Rollback.** Documentado. Migración inversa del esquema, con la advertencia explícita de
que revertir reintroduce el bloqueo bajo concurrencia.

---

<a id="adr-002"></a>
## ADR-002 · Red Docker dedicada y permanente entre producción y base de datos

**Contexto.** Fallos intermitentes de conexión tras reinicios: la conectividad dependía de
direcciones que cambiaban.

**Decisión.** Red Docker dedicada y permanente entre el contenedor de producción y el de
base de datos, con resolución por nombre de servicio.

**Alternativa descartada.** Conexión por IP del host o red por defecto.

**Razón.** Elimina una clase entera de fallos intermitentes. Las IPs efímeras cambian tras
un reinicio; el nombre de servicio no.

**Consecuencias.** Un artefacto de infraestructura explícito que mantener, a cambio de
conectividad estable e independiente del orden de arranque.

**Rollback.** Documentado, con advertencia de que revertir reintroduce fallos intermitentes
difíciles de diagnosticar (fallan de forma esporádica, no consistente).

---

<a id="adr-003"></a>
## ADR-003 · Saneamiento de entrada antes de la capa de IA

**Contexto.** Texto escrito por desconocidos llega a un modelo de lenguaje cuya salida
dirige lógica de negocio.

**Decisión.** Sanear y acotar la entrada **antes** del modelo, tratando el texto del usuario
como dato a evaluar y no como instrucción a obedecer.

**Alternativa descartada.** Confiar en las instrucciones del sistema del prompt para que el
modelo ignore intentos de manipulación.

**Razón.** La defensa dentro del prompt es probabilística; el saneamiento en la entrada es
determinista. Un lead no debe poder escribir en un campo de texto algo que lo clasifique
como máxima prioridad o que revele el contexto del sistema.

**Consecuencias.** Una etapa adicional que mantener, a cambio de una superficie de ataque
mucho menor.

**Rollback.** No recomendado. Revertir reabre el vector de inyección de prompt.

> Las reglas concretas de saneamiento no se publican.

---

<a id="adr-004"></a>
## ADR-004 · Deduplicación por identidad de negocio, no por ID de ejecución

**Contexto.** El mismo evento real llega más de una vez: reintentos del proveedor, doble
envío del formulario, reprocesos tras incidente.

**Decisión.** Deduplicar por la identidad de la **cosa real** (email del lead, message ID
del proveedor, clave de idempotencia del evento).

**Alternativa descartada.** Deduplicar por identificador de ejecución del orquestador.

**Razón.** El ID de ejecución cambia en cada reintento, así que no deduplica nada. La
identidad de negocio es estable entre entregas del mismo evento.

**Consecuencias.** Hay que elegir y mantener una clave de identidad por sistema, a cambio de
que el reprocesamiento sea seguro.

**Rollback.** Documentado. Revertir reintroduce duplicados en el CRM.

> La ventana temporal y el backend de almacenamiento del registro de dedup no se publican.

---

<a id="adr-005"></a>
## ADR-005 · Human-in-the-loop solo donde el error es caro

**Contexto.** La calificación por IA acierta la mayoría de las veces, pero un falso positivo
"Hot" hace que un comercial invierta su hora más valiosa en un lead que no lo era.

**Decisión.** Gate de aprobación humana **solo** para leads calientes.

**Alternativas descartadas.** (a) Aprobar todo. (b) No aprobar nada.

**Razón.** Aprobar todo genera fatiga: la gente empieza a aprobar sin leer y el gate deja de
proteger. No aprobar nada deja pasar falsos positivos caros. Aprobar solo el segmento donde
el error tiene coste real mantiene el gate barato y significativo.

**Consecuencias.** Los leads calientes tienen una latencia adicional acotada por la
respuesta humana, a cambio de que el equipo confíe en la clasificación.

**Rollback.** Documentado y de bajo riesgo: es un cambio de configuración, no estructural.

---

<a id="adr-006"></a>
## ADR-006 · Router determinista en código tras la salida de la IA

**Contexto.** Hay que decidir el destino de cada registro según lo que devuelve el modelo.

**Decisión.** El modelo devuelve **campos tipados**; un router en código decide el destino.

**Alternativa descartada.** Que el modelo decida directamente el destino.

**Razón.** Auditabilidad y reproducibilidad. Un router en código se lee, se versiona y se
prueba; la misma entrada produce siempre el mismo destino. Además, una salida fuera de
esquema falla de forma ruidosa y va al camino de error, en vez de contaminar el CRM en
silencio.

**Consecuencias.** Hay que mantener un contrato explícito entre IA y pipeline, a cambio de
comportamiento predecible.

**Rollback.** No recomendado. Revertir hace el enrutamiento no reproducible.

---

<a id="adr-007"></a>
## ADR-007 · Error Workflow global con persistencia en base de datos

**Contexto.** Los fallos se descubrían porque un cliente reclamaba.

**Decisión.** Un workflow de error global que captura fallos de cualquier flujo y los
**escribe en una tabla de errores** con contexto suficiente para reproducirlos.

**Alternativas descartadas.** (a) Logs del contenedor. (b) Solo notificación a Slack.

**Razón.** Los logs se pierden al recrear el contenedor. Una notificación se lee y se
olvida. Una tabla se consulta, se agrupa por tipo de fallo y responde la pregunta que
importa: *¿esto pasó una vez o pasa todos los días?*

**Consecuencias.** Una tabla más que mantener y depurar periódicamente, a cambio de
observabilidad real de fallos.

**Rollback.** Documentado y no recomendado: revertir deja la operación a ciegas.

---

<a id="adr-008"></a>
## ADR-008 · ACK inmediato en canales que reintentan

**Contexto.** Los proveedores de mensajería y voz reintentan el webhook si no responde
dentro de su presupuesto de tiempo. Procesar con un LLM excede ese presupuesto casi siempre.

**Decisión.** Confirmar la recepción de inmediato y procesar después, con deduplicación
como red de seguridad.

**Alternativa descartada.** Procesar y responder al final.

**Razón.** Sin ACK inmediato, el proveedor reintenta y el usuario recibe la misma respuesta
varias veces. Es el fallo más visible y más dañino para la confianza del cliente final.

**Consecuencias.** El flujo pierde la capacidad de devolver el resultado en la misma
respuesta HTTP, lo que obliga a que la deduplicación sea sólida.

**Rollback.** No recomendado. Revertir reintroduce respuestas duplicadas.

---

<a id="adr-009"></a>
## ADR-009 · Doble persistencia: base de datos + capa operativa

**Contexto.** Ingeniería necesita una fuente de verdad; el equipo comercial necesita una
superficie donde pueda trabajar y anotar.

**Decisión.** Escribir en PostgreSQL (sistema de registro) **y** en una hoja de cálculo
(capa operativa), con la base de datos como autoridad.

**Alternativas descartadas.** (a) Solo base de datos. (b) Solo hoja de cálculo.

**Razón.** Solo base de datos obliga al equipo comercial a pedir consultas para todo, y
terminan llevando su propia hoja paralela —ahí muere la automatización—. Solo hoja de
cálculo no soporta concurrencia ni historia fiable.

**Consecuencias.** Hay dos destinos que mantener sincronizados, y se define explícitamente
cuál manda cuando divergen (la base de datos).

**Rollback.** Documentado y de bajo riesgo: retirar la capa operativa no afecta al sistema
de registro.

---

<a id="adr-010"></a>
## ADR-010 · Estado fuera del contenedor y resiliencia a reinicios

**Contexto.** Un contenedor se reinicia: por despliegue, por actualización o por fallo del
host. Si el estado vive en su memoria, se pierde.

**Decisión.** Todo estado significativo —ejecuciones, aprobaciones pendientes, registro de
dedup, hilos conversacionales— vive fuera del contenedor, con políticas de reinicio
automático.

**Alternativa descartada.** Estado en memoria del proceso.

**Razón.** Un reinicio no puede costar datos ni dejar una aprobación pendiente huérfana. Es
la diferencia entre una demo y un sistema en producción.

**Consecuencias.** Más piezas de infraestructura que operar, a cambio de que reiniciar sea
una operación rutinaria y no un incidente.

**Rollback.** No recomendado.

---

<a id="adr-011"></a>
## ADR-011 · Toda escritura externa es idempotente (upsert)

**Contexto.** Con reintentos y reprocesos, la misma escritura va a ejecutarse más de una vez.

**Decisión.** Toda escritura a un sistema externo se hace por **upsert** contra una
identidad estable: si existe se actualiza, si no se crea.

**Alternativa descartada.** Crear siempre y limpiar duplicados después.

**Razón.** Un CRM con duplicados deja de ser confiable, y cuando el equipo deja de confiar
en el CRM vuelve a su hoja personal. Limpiar después es trabajo manual recurrente que nunca
se hace.

**Consecuencias.** Hay que definir una identidad estable por entidad y por sistema.

**Rollback.** No recomendado.

---

<a id="adr-012"></a>
## ADR-012 · El handoff a humano pausa la automatización del hilo

**Contexto.** Cuando un agente escala una conversación, notificar al equipo no es suficiente.

**Decisión.** El escalado hace tres cosas: notifica con contexto, **pausa la automatización
en ese hilo** y registra que hubo intervención.

**Alternativa descartada.** Escalar notificando únicamente.

**Razón.** Sin pausa, la persona y el bot responden a la vez al mismo cliente. Eso destruye
la confianza más rápido que no haber automatizado nada.

**Consecuencias.** Hace falta un estado de "hilo intervenido" y un criterio explícito para
devolverlo a la automatización.

**Rollback.** No recomendado.

---

<a id="adr-013"></a>
## ADR-013 · Mitigación de CSRF para sesiones por cookie (SameSite + validación de Origin)

**Contexto.** La API autentica por cookie HttpOnly (`access_token`) para navegadores y
por `Authorization: Bearer` para clientes no-navegador. CSRF es un ataque exclusivo de
navegador: un sitio malicioso dispara peticiones mutantes con las cookies de la víctima.

**Decisión.** Defensa por capas sin cambiar el contrato de la API:

1. **SameSite=Lax** en la cookie de sesión: el navegador no envía la cookie en POST
   cross-site. Cubre el caso normal.
2. **Validación de Origin** en `middleware/csrf.js`: toda petición mutante
   (POST/PUT/PATCH/DELETE) con cookie de sesión debe traer un Origin same-origin o
   listado en `CORS_ORIGINS`. Si el Origin no está autorizado, la petición se rechaza
   con 403. Sin Origin no puede tratarse de un navegador (los navegadores siempre lo
   envían en peticiones mutantes) y la petición pasa.
3. Los clientes Bearer no envían cookie: no se ven afectados.

**Alternativas descartadas.**
- **`csurf` / tokens CSRF de doble envío:** la librería clásica está sin mantenimiento y
  con CVEs conocidos; los tokens de doble envío añaden estado y complejidad al cliente.
- **Confiar solo en SameSite:** no cubre los despliegues con `SameSite=None`
  (frontend y API en subdominios distintos, como documenta `.env.example`).

**Razón.** La validación de Origin no añade estado, no exige cambios en el frontend y
bloquea el único vector real (navegador con cookie de sesión). El webhook de Stripe queda
fuera por diseño: se autentica por firma HMAC y no usa cookies.

**Consecuencias.** Las peticiones mutantes desde el navegador deben ser same-origin o
estar en la allowlist CORS — requisito que el frontend ya cumple (`credentials: 'include'`
hacia origenes CORS). Clientes que usen cookie fuera de navegador deben enviar Origin.

**Rollback.** Documentado y de bajo riesgo: retirar el middleware deja la protección en
manos de SameSite únicamente.

---

## Formato interno de un ADR

Los ADRs completos siguen esta plantilla. **Los campos de implementación no se publican.**

```
# ADR-NNN · <Título de la decisión>

Estado:        Propuesta | Aceptada | Sustituida por ADR-NNN | Obsoleta
Fecha:         YYYY-MM-DD
Ámbito:        <sistemas afectados>

## Contexto
<qué situación forzó la decisión>

## Decisión
<qué se eligió>

## Alternativas consideradas
<qué se descartó y por qué>

## Consecuencias
<qué se gana, qué cuesta, qué queda pendiente>

## Procedimiento de rollback
<pasos concretos para revertir + qué se rompe al revertir>

## Detalle de implementación        ← NO SE PUBLICA
<parámetros, esquemas, umbrales, consultas, prompts>
```

---

<div align="center">

[⬅️ Volver al portafolio](../../README.md) · [Patrón reutilizable](../patterns/webhook-ai-crm-notify.md) · [SECURITY](../../SECURITY.md)

</div>
