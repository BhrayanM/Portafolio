# Engineering Practices

Patrones, trade-offs y lecciones aprendidas al construir sistemas de automatización y
plataformas orientados a producción. Documentación de alto nivel: el *cómo* operativo de
cada sistema —parámetros, umbrales, esquemas— no se publica (ver [SECURITY.md](../SECURITY.md)).

---

## Patrones de fiabilidad

### Fast ACK + deduplicación son innegociables en webhooks

Todo proveedor que reintenta (WhatsApp, Twilio, calendarios, formularios) volverá a enviar
el mismo evento si el handler excede su presupuesto de tiempo. La secuencia que evita
respuestas duplicadas al usuario:

1. Validar autenticación → 2. ACK 200 inmediato → 3. Deduplicar por ID del proveedor → 4. Procesar

Invertir los pasos 2 y 3 no funciona: el reintento llega antes de que la primera ejecución
termine la deduplicación. El presupuesto de reintento del proveedor se mide en segundos; una
llamada a un LLM lo excede por defecto.

### El estado externo debe sobrevivir a los reinicios del contenedor

Conversaciones, aprobaciones pendientes, registros de deduplicación, estado de ejecución de
workflows: todo lo que un usuario o un sistema aguas abajo necesita debe vivir fuera del
contenedor. Un despliegue, una actualización o un fallo del host no puede costar datos ni
dejar una aprobación huérfana.

**Implicación:** todo workflow que retenga estado necesita almacenamiento externo
(PostgreSQL, Redis o la base de datos del propio orquestador configurada para persistencia).
Los sistemas que solo usan memoria son prototipos, no sistemas de producción.

### La captura global de errores vence al try/catch por workflow

Un workflow de error único que se suscribe a todos los fallos, escribe en una tabla
persistente con contexto completo (entrada, nodo, error, stack) y alerta sobre umbrales
críticos responde la única pregunta que importa en operación: *¿esto pasó una vez o es un
patrón?*

Los logs del contenedor desaparecen al recrearlo. Las alertas de Slack se leen y se olvidan.
Una tabla de errores consultable, agrupable por tipo y fecha, es el único artefacto que
sobrevive a una revisión de incidente.

---

## Patrones de integración de LLM

### El modelo propone, el código dispone

El LLM debe devolver salida estructurada y tipada (score, categoría, entidades, rationale).
Un router determinista en código decide el destino. Esto vence a dejar que el modelo elija
el destino porque es:

- **Auditable:** la lógica del router se lee, se versiona y se prueba
- **Reproducible:** la misma entrada produce siempre el mismo destino
- **Barato:** no cuesta una llamada adicional al modelo
- **Rápido:** crítico para presupuestos de latencia (voz)
- **Fail-loud:** una salida fuera de esquema va al camino de error en lugar de contaminar
  el CRM en silencio

### Sanear en la puerta de entrada, no en el prompt

La entrada desde internet abierta llega al LLM. Debe tratarse como *dato a evaluar*, no
como *instrucción a obedecer*. El saneamiento y la normalización en el punto de entrada del
workflow son defensa determinista; las instrucciones del prompt son probabilísticas y
bypasseables.

**Principio, no receta:** las reglas concretas de saneamiento son parte del método
operativo y no se publican. Lo público es la decisión de arquitectura: la puerta de entrada
es dueña de la seguridad, el modelo es dueño de la clasificación.

### Human-in-the-loop solo donde el falso positivo es caro

Aprobar todo provoca fatiga de aprobación → aprobación automática → el gate se vuelve
teatro. Aprobar nada deja pasar falsos positivos costosos. El punto óptimo: gate solo en el
segmento donde un error tiene coste real de negocio (por ejemplo, los leads Hot que
consumen la hora más valiosa de un comercial).

La espera debe ser persistente: el reinicio del contenedor durante la deliberación humana
no puede perder la aprobación pendiente.

---

## Arquitectura multi-tenant

### Esquema compartido + RLS > bases de datos separadas

Elegido por simplicidad operativa (una sola base para respaldar, migrar y monitorear),
eficiencia de recursos (pools compartidos) y aislamiento garantizado: las políticas de RLS
hacen cumplir `tenant_id = current_setting('app.current_tenant')` a nivel de motor,
inbypasseable incluso por SQL crudo.

Los tenants de alto volumen pueden migrar a esquemas dedicados sin reescribir la aplicación.

### API keys como autenticación de primera clase

Keys con prefijo `pk_` para comunicación servidor-a-servidor, generadas con
`crypto.randomBytes`, validadas vía middleware dedicado y con rotación y revocación desde
el día uno. Distintas de las sesiones JWT de usuario (cortas, en cookie `HttpOnly`).

---

## Integración de pagos

### La verificación del webhook requiere el cuerpo crudo

La verificación de firma de Stripe falla si Express parsea el JSON antes de que el handler
del webhook lea el cuerpo crudo. La ruta del webhook necesita un parser dedicado
`express.raw()` aplicado **antes** del `express.json()` global.

### Idempotencia de eventos

Cada evento de Stripe se procesa exactamente una vez mediante idempotencia en dos capas:
clave de idempotencia por evento y upsert en CRM por identidad de contacto. La composición
exacta de las claves es parte del método operativo y no se publica.

---

## Observabilidad

- **Prometheus** scrapea `/metrics` de la API, n8n, exportador de PostgreSQL y node-exporter
- **Loki** agrega logs estructurados JSON (`tenant_id`, `trace_id`, `level`)
- **OpenTelemetry** con W3C TraceContext vía middleware de request ID
- **Grafana** con reglas de alerta para tasa de error, p99, saturación y conexiones de BD
- **Uptime Kuma** con checks sintéticos de `/health` cada 30 s

### Los dashboards multi-tenant requieren la etiqueta de tenant

Todas las métricas y logs llevan `tenant_id`. Los dashboards filtran por ella y las alertas
pueden ser por tenant o globales.

---

## Seguridad

### Cero secretos en código, fallo rápido en producción

El arranque en producción aborta si falta un secreto crítico: `JWT_SECRET`,
`STRIPE_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`. Sin valores por
defecto, sin fallbacks silenciosos.

### Defensa en profundidad

| Capa | Controles |
|---|---|
| Red | Redes Docker privadas, TLS 1.2+ en el borde, HSTS, cabeceras de seguridad; puertos internos nunca expuestos |
| Aplicación | Helmet (CSP, HSTS, X-Frame), CORS por entorno con lista blanca, rate limit por niveles (global, auth, API key), CSRF por doble envío de token + validación de Origin en peticiones mutantes con cookie |
| Autenticación | bcrypt cost 12, JWT HS256 (24 h, sin refresh tokens), rotación de API keys |
| Autorización | Roles (admin/manager/member), middleware por tenant, RLS como refuerzo final |
| Datos | `.env` en `.gitignore`, patrones de secreto en `.gitignore` (`*.secret`, `*.key`, `*.pem`) |

---

## Lecciones aprendidas

1. **El primer reintento no es un edge case: es el camino feliz.** Diseña para reintentos
   desde la primera línea del código de webhooks.
2. **El estado en memoria es deuda.** Se paga de inmediato o se agrava en el peor momento.
3. **Una tabla de errores consultable vale más que mil alertas de Slack.** Constrúyela
   antes de necesitarla.
4. **La salida del LLM es una propuesta, no una orden.** Valida el esquema, enruta en
   código, falla con ruido ante la violación.
5. **El saneamiento es responsabilidad de la puerta de entrada.** No lo empujes al prompt
   donde es probabilístico.
6. **Gates de aprobación solo donde el coste del falso positivo es medible.** Todo lo
   demás sigue directo.
7. **El upsert es el único patrón de escritura seguro.** Crear + deduplicar después es
   deuda operativa que nunca se paga.
8. **Un handoff sin pausa es peor que no automatizar.** El bot y el humano no deben
   competir por responder.
9. **RLS es la última línea de defensa.** Los bugs de aplicación ocurren; la base de datos
   debe seguir imponiendo el aislamiento.
10. **La configuración fail-fast previene malas configuraciones silenciosas en
    producción.** Si falta un secreto, el proceso no debe arrancar.

---

## Documentos relacionados

- [Registro de decisiones de arquitectura (ADRs)](./adr/README.md)
- [Patrón: Webhook → IA → CRM → Notificación](./patterns/webhook-ai-crm-notify.md)
- [Arquitectura del Lead Qualification Engine](./architecture.md)
- [Plataforma SaaS](./platform.md)
- [Política de seguridad](../SECURITY.md)
