# Auditoría de Realidad — Portafolio SaaS

---

# FASE 4: Dashboard Web

## Estado

BOILERPLATE / PARCIAL

## Objetivo prometido

Next.js 14 dashboard con login, KPIs, tabla de leads, analytics, settings. Consumo de API backend. Docker multi-stage.

## Archivos auditados

- `frontend/package.json` (28 líneas)
- `frontend/next.config.js` (8 líneas)
- `frontend/src/app/dashboard/page.tsx` (53 líneas)
- `frontend/src/app/dashboard/leads/page.tsx` (107 líneas)
- `frontend/src/app/dashboard/analytics/page.tsx` (13 líneas)
- `frontend/src/app/dashboard/settings/page.tsx` (18 líneas)
- `frontend/src/app/login/page.tsx` (86 líneas)
- `frontend/src/app/dashboard/layout.tsx` (57 líneas)
- `frontend/src/app/dashboard/Sidebar.tsx` (38 líneas)
- `frontend/src/app/dashboard/Header.tsx` (23 líneas)
- `frontend/Dockerfile` (16 líneas)

## Comandos ejecutados

```
cd frontend; npm install
```
Salida: 394 packages, 16 high severity vulnerabilities.

```
cd frontend; npm run build
```
Salida: ✓ Compiled successfully. 9 rutas generadas (static).

## Evidencia

**1. Build exitoso, 9 rutas generadas:**
- `dashboard` (1.63 kB), `dashboard/leads` (2.06 kB), `login` (1.98 kB), etc.
- Todas las rutas son `○ (Static)` — prerenderizadas como HTML estático.

**2. Login con JWT en localStorage (inseguro):**
- `login/page.tsx` línea 31: `localStorage.setItem('token', data.token)` — vulnerable a XSS.
- No hay httpOnly cookies, ni refresh tokens, ni server-side session.

**3. API URL hardcodeada como fallback:**
- `dashboard/page.tsx` línea 5: `const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'`
- `leads/page.tsx` línea 5: mismo patrón.
- En producción, sin variable de entorno, apunta a localhost (no funciona).

**4. Analytics y Settings son placeholders:**
- `analytics/page.tsx` líneas 8-12: `<p>Los gráficos se mostrarán aquí cuando haya datos suficientes.</p>`
- `settings/page.tsx` líneas 11-14: `<p>Configuración de perfil próximamente.</p>`

**5. Sin manejo de errores en API calls:**
- `dashboard/page.tsx` línea 20: `.catch(console.error)` — silencia errores, el usuario ve "-" permanentemente.
- `leads/page.tsx` línea 26: mismo patrón.

**6. Dockerfile con problemas:**
- `frontend/Dockerfile` línea 4: `RUN npm ci` — no hay lockfile, falla.
- `frontend/Dockerfile` línea 15: `ENV PORT=3001` — inconsistente con docker-compose que espera puerto 3001.

## Problemas encontrados

1. JWT en localStorage (inseguro, XSS vulnerable).
2. 2 páginas placeholder (analytics, settings).
3. API URL hardcodeada a localhost como fallback.
4. Sin manejo de errores en fetch calls.
5. Dockerfile usa `npm ci` sin lockfile.

## Conexiones reales

- **Frontend → Backend**: MOCK (intenta fetch a localhost:3000, pero backend sin DB responde 500)
- **Docker**: ROTO (npm ci sin lockfile)

## Riesgo

ALTO — Frontend compila pero no funciona sin backend. Autenticación insegura (localStorage). 2 páginas placeholder mienten sobre su estado.

## Acción recomendada

Configurar NEXT_PUBLIC_API_URL como variable de entorno en el deployment. Migrar de localStorage a httpOnly cookies. Implementar páginas reales de analytics y settings.

## Nivel de confianza

95%

---

# FASE 5: Sistema Multiempresa

## Estado

BOILERPLATE

## Objetivo prometido

Middleware de tenant, RLS en PostgreSQL, API Keys por tenant, aislamiento de datos multi-tenant.

## Archivos auditados

- `backend/src/middleware/tenant.js` (24 líneas)
- `backend/src/middleware/apiKey.js` (24 líneas)
- `backend/src/services/apiKeys.service.js` (50 líneas)
- `backend/src/routes/apiKeys.routes.js` (18 líneas)
- `database/migrations/010_enable_rls.sql` (39 líneas)

## Comandos ejecutados

```
docker exec portafolio-publico-postgres-1 psql -U n8n -c "\dt"
```
Salida: `(0 rows)` — RLS no aplicado, tablas no existen.

```
docker exec portafolio-publico-postgres-1 psql -U n8n -c "SELECT * FROM pg_catalog.pg_policies"
```
Salida: (ver abajo)

## Evidencia

(Ver FASE 2 — las tablas no existen, por lo tanto RLS no existe.)

## Problemas encontrados

1. RLS/RLS policies requieren tablas que no existen (FASE 2).
2. API Key service existe como código pero requiere tabla `tenants` con columna `api_keys` JSONB.
3. `resolveTenant` middleware (tenant.js) depende de `req.user.tenant_id` que solo existe si JWT auth funciona. Sin JWT funcional (sin DB), el tenant middleware no puede resolver nada.

## Conexiones reales

- **PostgreSQL (RLS)**: NO EXISTE
- **API Keys**: NO EXISTE (servicio no conectado a DB)

## Riesgo

CRÍTICO — Dependencia total de FASE 2 (DB). Sin tablas tenants, el multi-tenant es código muerto.

## Acción recomendada

Ejecutar migraciones de DB primero (FASE 2), luego verificar RLS con `SELECT * FROM pg_catalog.pg_policies`.

## Nivel de confianza

100%

---

# FASE 6: Agentes IA

## Estado

BOILERPLATE

## Objetivo prometido

3 agentes IA (Sales Chat, WhatsApp Support, Voice Receptionist). Workflows n8n importables. Prompts.

## Archivos auditados

- `n8n/workflows/ai-sales-agent.json` (68 líneas)
- `n8n/workflows/ai-whatsapp-agent.json` (76 líneas)
- `n8n/workflows/ai-voice-agent.json` (88 líneas)
- `docs/fase-6/architecture.md` (92 líneas)

## Comandos ejecutados

```
curl -X POST http://localhost:5678/webhook/ai-sales-chat -H "Content-Type: application/json" -d "{\"message\":\"Hola\"}"
```
Salida: `404` — webhook no existe en n8n.

```
curl -X POST http://localhost:5678/webhook/whatsapp-agent
```
Salida: `404`

```
curl -X POST http://localhost:5678/webhook/voice-receptionist
```
Salida: `404`

## Evidencia

**1. Los 3 workflows no están importados en n8n:**
- Todos los webhooks devuelven 404.
- El n8n corriendo es de otro proyecto (`n8n-leads` volume), no el nuestro.
- Mismos problemas estructurales que FASE 1: credenciales con expresión, `typeVersion: 4.2`, etc.

**2. Sales Agent carece de memoria persistente:**
- `ai-sales-agent.json` línea 19-25: sesión se crea en memoria con `Math.random()` — se pierde al reiniciar el workflow.
- No hay integración con Redis, PostgreSQL, o n8n memoria para mantener conversaciones.

**3. WhatsApp Agent no tiene verificación de webhook de Meta:**
- WhatsApp Business API requiere un verification challenge (GET request) antes de aceptar webhooks.
- El workflow solo tiene un POST webhook. No hay handling del `hub.challenge`.
- Sin esto, Meta nunca conectará el webhook.

**4. Voice Agent no tiene Speech-to-Text:**
- `ai-voice-agent.json` espera `$json.transcription` (línea 38) pero no hay nodo que transcriba audio.
- Twilio envía audio, no transcripción. Se necesitaría Google STT, Whisper, o Deepgram.
- El workflow asume que la transcripción ya llegó como texto.

## Problemas encontrados

1. 3 workflows no importados en n8n (webhooks devuelven 404).
2. Sales Agent sin memoria persistente (sesiones volátiles).
3. WhatsApp Agent sin verification webhook (requerido por Meta).
4. Voice Agent sin Speech-to-Text (Twilio envía audio, no texto).
5. Mismos problemas estructurales que FASE 1 (credenciales, typeVersion, etc.).

## Conexiones reales

- **n8n**: NO EXISTE (workflows no importados, n8n incorrecto)
- **OpenAI**: MOCK (configurado en JSON, no conectado)
- **WhatsApp**: NO EXISTE (sin verification webhook)
- **Twilio**: NO EXISTE (sin STT, sin configuración)

## Riesgo

CRÍTICO — 3 agentes prometidos, 0 funcionales. Agentes IA son el producto principal.

## Acción recomendada

Detener el n8n legacy, arrancar nuestro docker-compose. Corregir los 3 workflows con los mismos arreglos de FASE 1. Agregar verification webhook para WhatsApp. Agregar nodo STT para Voice.

## Nivel de confianza

100%

---

# FASE 7: Infraestructura Cloud

## Estado

BOILERPLATE

## Objetivo prometido

NGINX config, docker-compose producción, SSL (Cloudflare), firewall, backups.

## Archivos auditados

- `docker/nginx.conf` (78 líneas)
- `docker-compose.prod.yml` (76 líneas)
- `scripts/setup-cloudflare.sh` (64 líneas)
- `scripts/setup-firewall.sh` (38 líneas)
- `scripts/backup.sh` (64 líneas)

## Comandos ejecutados

```
docker compose -f docker-compose.prod.yml config 2>&1
```

## Evidencia

```
docker compose -f docker-compose.prod.yml config
```
Salida: error - the network "portafolio-net" is declared as external but does not exist. (ver abajo)

**1. docker-compose.prod.yml tiene errores:**
- Línea 67: `networks: portafolio-net: external: true` — declara la red como externa, pero no existe. Falla al levantar.
- Línea 12: `./docker/ssl:/etc/ssl:ro` — monta directorio `ssl` que no existe en el repo.
- Los healthchecks de backend y frontend dependen de `portafolio-net` que no existe.

**2. NGINX config asume SSL instalado:**
- `docker/nginx.conf` línea 18-19: referencia `/etc/ssl/certs/fullchain.pem` y `/etc/ssl/private/privkey.pem` — archivos que no existen.
- Sin estos certificados, NGINX no arranca (falla al bind al puerto 443 sin cert).

**3. setup-cloudflare.sh es una guía, no un script ejecutable:**
- `scripts/setup-cloudflare.sh` línea 24-31: solo imprime instrucciones (`echo "PASOS MANUALES"`).
- No ejecuta nada automáticamente. No interactúa con la API de Cloudflare.
- Es documentación disfrazada de script.

**4. setup-firewall.sh requiere sudo:**
- `scripts/setup-firewall.sh` línea 11: `ufw default deny incoming` — requiere sudo.
- No hay verificación de permisos ni manejo de errores.
- En Hetzner, el firewall debería configurarse antes de abrir puertos para evitar quedar fuera.

**5. backup.sh referencia contenedor que no existe en producción:**
- `scripts/backup.sh` línea 14: `DB_CONTAINER="portafolio-postgres-1"` — en docker-compose.prod.yml, el contenedor se llamará `portafolio-publico-postgres-1` (prefijo del folder).

## Problemas encontrados

1. docker-compose.prod.yml no compila (red externa no existe, directorio ssl no existe).
2. NGINX no arranca sin certificados SSL.
3. setup-cloudflare.sh es una guía, no un script.
4. setup-firewall.sh requiere sudo sin verificación.
5. backup.sh tiene nombre de contenedor hardcodeado e incorrecto.

## Conexiones reales

- **NGINX**: NO EXISTE (config existe, no desplegado)
- **Cloudflare**: NO EXISTE (solo guía de setup manual)
- **SSL**: NO EXISTE (certificados no presentes)
- **Backups**: NO EXISTE (script no probado, contenedor mal nombrado)
- **Firewall**: NO EXISTE (script requiere sudo, no probado)

## Riesgo

CRÍTICO — Sin infraestructura cloud, el sistema no puede desplegarse en producción. SSL faltante impide HTTPS. Firewall no configurado mantiene PostgreSQL y n8n expuestos.

## Acción recomendada

Crear directorio `docker/ssl/` con README explicativo. Cambiar network de external a bridge. Probar cada script individualmente. Corregir backup.sh con nombre de contenedor genérico o variable.

## Nivel de confianza

100%

---

# FASE 8: Observabilidad

## Estado

BOILERPLATE

## Objetivo prometido

Prometheus, Grafana, Loki, Uptime Kuma, dashboards, alertas Slack.

## Archivos auditados

- `monitoring/docker-compose.monitoring.yml` (80 líneas)
- `monitoring/prometheus.yml` (22 líneas)
- `monitoring/loki.yml` (33 líneas)
- `monitoring/grafana-datasources/datasources.yml` (15 líneas)
- `monitoring/grafana-dashboards/dashboards.yml` (17 líneas)
- `monitoring/grafana-dashboards/portafolio-main.json` (28 líneas)

## Comandos ejecutados

```
docker compose -f monitoring/docker-compose.monitoring.yml config 2>&1
```

## Evidencia

```
docker compose -f monitoring/docker-compose.monitoring.yml config
```
Salida: error - network "portafolio-net" declared as external but not found.

**1. Mismo error de red externa:**
- Línea 64: `networks: portafolio-net: external: true` — misma red que no existe en docker-compose.prod.yml.

**2. Dashboard de Grafana es placeholder:**
- `grafana-dashboards/portafolio-main.json` líneas 1-28: define 4 paneles (CPU, Memory, Disk, Uptime) — son tipos `gauge` y `stat` simples.
- Línea 7: `"targets": [{ "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[1m])) * 100)", ... }]` — expresión PromQL que asume node_exporter corriendo.
- Sin servicios monitoreados, los paneles muestran "No data".

**3. Alertas Slack documentadas pero no configuradas:**
- `docs/fase-8/architecture.md` línea 35-38: describe configuración de alertas en Slack.
- No hay archivo de configuración de alertas en Grafana.
- Las alertas deben configurarse manualmente en la UI de Grafana.

**4. Uptime Kuma sin configuración de monitores:**
- El contenedor de uptime-kuma arranca vacío. Los monitores deben configurarse manualmente en la UI.

**5. n8n y API endpoints de métricas referenciados pero no configurados:**
- `prometheus.yml` línea 14-20: targets para n8n (:5678) y postgres (:9187).
- n8n requiere `N8N_METRICS=true` en .env y endpoint `/metrics` expuesto. No está configurado.
- PostgreSQL requiere `postgres_exporter` o config adicional. `:9187` no es puerto default de PostgreSQL metrics.

## Problemas encontrados

1. Red externa no existe (mismo error que FASE 7).
2. Dashboard Grafana placeholder (4 paneles básicos, sin datos).
3. Alertas Slack no configuradas (solo documentación).
4. n8n metrics no habilitado (requiere N8N_METRICS=true).
5. PostgreSQL metrics apunta a puerto incorrecto (:9187 no es puerto de Postgres).

## Conexiones reales

- **Prometheus**: NO EXISTE (config existe, no desplegado)
- **Grafana**: NO EXISTE (ídem)
- **Loki**: NO EXISTE (ídem)
- **Uptime Kuma**: NO EXISTE (ídem)
- **Alertas**: NO EXISTE

## Riesgo

ALTO — Sin observabilidad, no se puede monitorear producción. Problemas pasan desapercibidos hasta que el cliente los reporta.

## Acción recomendada

Crear la red `portafolio-net` antes de desplegar: `docker network create portafolio-net`. Habilitar N8N_METRICS en .env. Corregir targets de Prometheus.

## Nivel de confianza

100%

---

# FASE 9: Seguridad

## Estado

BOILERPLATE

## Objetivo prometido

Rate limiting, firewall, auditoría, seguridad headers, fail2ban, Tailscale.

## Archivos auditados

- `backend/src/middleware/rateLimit.js` (28 líneas)
- `backend/src/middleware/security.js` (33 líneas)
- `backend/src/middleware/auditLog.js` (28 líneas)
- `scripts/setup-firewall.sh` (38 líneas)

## Comandos ejecutados

(No aplica — ver FASE 3 para rate limit y security middleware desconectados)

## Evidencia

**1. Rate limiters definidos pero no conectados (FASE 3):**
- `rateLimit.js` define 3 limiters: `globalLimiter`, `authLimiter`, `apiKeyLimiter`.
- `security.js` los aplica via `securityMiddleware(app)`.
- `security.js` NUNCA es importado en `app.js`. Rate limiters = código muerto.

**2. Audit log middleware definido pero no conectado:**
- `auditLog.js` exporta `auditLog(action)` que retorna middleware.
- Ninguna ruta en `routes/*.js` usa `auditLog`. Es código muerto.
- La tabla `audit_log` no existe en DB (FASE 2).

**3. Firewall script no probado (FASE 7):**
- Mismos problemas que FASE 7: requiere sudo, no verificado.

**4. fail2ban y Tailscale solo mencionados en documentación:**
- `docs/fase-9/architecture.md` línea 43-54: instrucciones para instalar fail2ban y Tailscale.
- No hay scripts ni configuraciones automatizadas.

## Problemas encontrados

1. Rate limiters: código muerto (no conectados a app.js).
2. Audit log: código muerto (no usado por rutas, tabla no existe).
3. fail2ban: solo documentación.
4. Tailscale: solo documentación.
5. Firewall: script no probado.

## Conexiones reales

- **Rate Limiting**: NO EXISTE (código no conectado)
- **Auditoría**: NO EXISTE (middleware no conectado, tabla no existe)
- **Firewall**: NO EXISTE (script no probado)
- **fail2ban**: NO EXISTE (solo docs)
- **Tailscale**: NO EXISTE (solo docs)

## Riesgo

CRÍTICO — Cero seguridad activa. Sin rate limiting, el API es vulnerable a DoS. Sin auditoría, acciones no son trazables. Sin firewall, puertos internos expuestos.

## Acción recomendada

Conectar `securityMiddleware` en `app.js`. Integrar `auditLog` en rutas críticas (auth, users, billing). Ejecutar script de firewall en servidor.

## Nivel de confianza

100%

---

# FASE 10: Facturación (Stripe)

## Estado

BOILERPLATE

## Objetivo prometido

Stripe Checkout, 3 planes (Starter $49, Pro $149, Enterprise $499), webhooks, gestión de suscripciones.

## Archivos auditados

- `backend/src/services/billing.service.js` (110 líneas)
- `backend/src/controllers/billing.controller.js` (40 líneas)
- `backend/src/routes/billing.routes.js` (17 líneas)
- `docs/fase-10/architecture.md` (60 líneas)

## Comandos ejecutados

```
curl -X POST http://localhost:3000/api/billing/checkout
```
Salida: `404` — ruta no existe (addendum no integrado). (ver FASE 3)

## Evidencia

**1. Rutas no registradas en app.js (FASE 3):**
- `billing.routes.js` define endpoints, pero `app.js` no los incluye.
- `app.billing.addendum.js` es un archivo huérfano.
- `/api/billing/*` devuelve 404.

**2. Stripe no está en package.json:**
- `billing.service.js` línea 1: `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)`.
- `stripe` no está en `backend/package.json`. El módulo no está instalado.

**3. Price IDs hardcodeados:**
- `billing.service.js` línea 6-8: `priceId: 'price_starter_monthly'`, `priceId: 'price_pro_monthly'`, `priceId: 'price_enterprise_monthly'`.
- Estos IDs deben crearse en Stripe Dashboard. No existen por defecto.
- Sin estos Price IDs, Stripe Checkout falla.

**4. Webhook sin verificación de signature:**
- `billing.controller.js` línea 16-19: `stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)` — la verificación está en el controller, pero la ruta no tiene middleware de raw body.
- Express `app.use(express.json())` parsea el body antes de que Stripe webhook lo lea, rompiendo la verificación de firma (Stripe requiere el body raw).

## Problemas encontrados

1. Rutas no registradas en app.js (404).
2. Dependencia `stripe` no instalada.
3. Price IDs hardcodeados que no existen en Stripe.
4. Webhook Stripe no funcionará porque Express.parse JSON body antes de verificar firma.

## Conexiones reales

- **Stripe**: NO EXISTE (dependencia no instalada, rutas no registradas, price IDs ficticios)

## Riesgo

CRÍTICO — Stripe es el motor de ingresos. Sin facturación, no hay SaaS. 4 problemas bloqueantes.

## Acción recomendada

Agregar `stripe` a package.json, registrar rutas en app.js, crear raw body middleware para webhooks, reemplazar price IDs con IDs reales de Stripe.

## Nivel de confianza

100%

---

# FASE 11: Portal Cliente

## Estado

BOILERPLATE

## Objetivo prometido

Páginas de billing, usage, api-keys en el dashboard. Conexión con Stripe.

## Archivos auditados

- `docs/fase-11/architecture.md` (27 líneas)

## Comandos ejecutados

```
ls frontend/src/app/dashboard/billing/ 2>&1
```

## Evidencia

```
ls frontend/src/app/dashboard/billing/
```
Salida: `ls: cannot access '.../billing/': No such file or directory`

**1. No existe código de portal cliente:**
- No hay directorios `billing/`, `invoices/`, `usage/`, `activity/` en frontend.
- La documentación describe páginas que no existen.
- `docs/fase-11/architecture.md` promete rutas como `/dashboard/billing`, `/dashboard/invoices`, etc. — ninguna implementada.

**2. Dependencia de FASE 10 (Stripe) y FASE 3 (Backend):**
- Sin Stripe funcional, las páginas de billing no pueden mostrar datos.

## Problemas encontrados

1. Cero código de portal cliente. Solo documentación.
2. 0 archivos de frontend para billing/invoices/usage/activity.

## Conexiones reales

- **Portal Cliente**: NO EXISTE

## Riesgo

ALTO — Sin portal cliente, los usuarios no pueden gestionar su suscripción ni ver facturas.

## Acción recomendada

Crear las páginas prometidas en frontend: billing, invoices, usage, activity. Conectar con endpoints de backend (FASE 10 primero).

## Nivel de confianza

100%

---

# FASE 12: Marketplace

## Estado

BOILERPLATE

## Objetivo prometido

Catálogo de automatizaciones, instalación 1-click, verificación de plan.

## Archivos auditados

- `backend/src/services/marketplace.service.js` (57 líneas)
- `backend/src/controllers/marketplace.controller.js` (26 líneas)
- `backend/src/routes/marketplace.routes.js` (17 líneas)
- `docs/fase-12/architecture.md` (50 líneas)

## Comandos ejecutados

```
curl http://localhost:3000/api/marketplace/catalog
```
Salida: `404` — rutas no registradas (mismo problema que FASE 10).

## Evidencia

**1. Rutas no registradas en app.js:**
- Mismo problema que FASE 10. No hay `app.use('/api/marketplace', marketplaceRoutes)` en app.js.

**2. Catálogo hardcodeado:**
- `marketplace.service.js` línea 6-12: catálogo como array estático. No hay DB, CMS, o API externa.
- Para agregar una automatización, hay que modificar el código.

**3. Instalación no conecta con n8n API:**
- `marketplace.service.js` línea 27-46: solo registra en `settings` y `workflow_runs`.
- No llama a la API REST de n8n para importar el workflow automáticamente.
- La documentación promete instalación 1-click via n8n API, pero no hay código que lo implemente.

## Problemas encontrados

1. Rutas no registradas en app.js (404).
2. Catálogo hardcodeado en código (no extensible).
3. Instalación no importa workflow en n8n (solo DB insert).

## Conexiones reales

- **Marketplace**: NO EXISTE (rutas 404, catálogo hardcodeado, sin integración n8n)

## Riesgo

MEDIO — Marketplace es aditivo, no bloqueante. Pero el código existente no cumple lo prometido.

## Acción recomendada

Registrar rutas en app.js. Implementar integración con n8n REST API para import real de workflows.

## Nivel de confianza

100%

---

# FASE 13: Escalabilidad

## Estado

BOILERPLATE

## Objetivo prometido

Redis, RabbitMQ, Workers, cola de procesamiento, escalado horizontal.

## Archivos auditados

- `backend/src/worker.js` (71 líneas)
- `backend/Dockerfile.worker` (14 líneas)
- `docs/fase-13/architecture.md` (147 líneas)

## Comandos ejecutados

```
node backend/src/worker.js 2>&1
```

## Evidencia

```
node backend/src/worker.js
```
Salida: error — `Cannot find module 'amqplib'` (no está en package.json).

**1. Worker no arranca:**
- `worker.js` línea 7: `const amqp = require('amqplib')` — módulo no instalado.

**2. Sin configuración Docker de Redis/RabbitMQ:**
- No hay `docker-compose.scale.yml` ni `docker-compose.override.yml` que agregue Redis y RabbitMQ.
- El archivo `docs/fase-13/architecture.md` muestra configuraciones YAML de ejemplo, pero no hay archivos reales.

**3. Sin colas reales configuradas:**
- No hay endpoint que publique mensajes en RabbitMQ.
- No hay integración entre API y worker.
- El worker escucha en cola `lead_processing`, pero ningún código publica en ella.

**4. Escalado horizontal documentado pero no configurado:**
- `docs/fase-13/architecture.md` línea 97-118: `deploy: replicas: 3` — requiere Docker Swarm o Compose v3. No hay configuración de swarm.

## Problemas encontrados

1. Worker no arranca (amqplib no instalado).
2. Sin archivos Docker para Redis/RabbitMQ.
3. Sin publisher en RabbitMQ (cola nunca recibe mensajes).
4. Escalado horizontal documentado pero no configurable.

## Conexiones reales

- **Redis**: NO EXISTE (sin configuración Docker)
- **RabbitMQ**: NO EXISTE (sin configuración Docker)
- **Worker**: NO EXISTE (no arranca, sin dependencias)
- **Colas**: NO EXISTE (sin publisher)

## Riesgo

MEDIO — Escalabilidad no es necesaria para MVP. Pero el código existente no funciona y da falsa impresión de preparación.

## Acción recomendada

Agregar `amqplib` a package.json. Crear docker-compose.scale.yml con Redis y RabbitMQ. Implementar publisher en leads controller para encolar leads en vez de procesarlos síncronamente.

## Nivel de confianza

100%

---

---

# Resumen Ejecutivo

## Estado General del Proyecto: **BOILERPLATE (75-85% código no funcional)**

De 13 fases auditadas, **cero (0) fases funcionan de extremo a extremo en producción**. El código existe, los archivos están estructurados, pero las conexiones reales entre componentes no existen o están rotas.

## Porcentaje de Implementación Real vs. Prometido

| Fase | Estado | % Real vs Prometido |
|------|--------|---------------------|
| 0 — Setup | ✅ Funcional | 100% (Git, Docker, estructura) |
| 1 — n8n | ❌ No funcional | 10-15% (workflows existen pero no importados) |
| 2 — Database | ❌ No funcional | 10% (migraciones existen, no ejecutadas) |
| 3 — Backend | ⚠️ Parcial | 40% (arranca, pero sin DB ni addendums) |
| 4 — Frontend | ⚠️ Parcial | 40% (compila, pero sin backend funcional) |
| 5 — Multiempresa | ❌ No funcional | 5% (RLS requiere tablas que no existen) |
| 6 — Agentes IA | ❌ No funcional | 5% (workflows no importados, sin STT/Webhook) |
| 7 — Infra Cloud | ❌ No funcional | 5% (docker-compose roto, SSL faltante) |
| 8 — Observabilidad | ❌ No funcional | 5% (mismo error de red, dashboards placeholder) |
| 9 — Seguridad | ❌ No funcional | 5% (rate limit/audit no conectados) |
| 10 — Stripe | ❌ No funcional | 5% (dependencia no instalada, rutas no registradas) |
| 11 — Portal Cliente | ❌ No funcional | 0% (no existe código) |
| 12 — Marketplace | ❌ No funcional | 5% (rutas no registradas, catálogo hardcodeado) |
| 13 — Escalabilidad | ❌ No funcional | 5% (worker no arranca, sin Redis/RabbitMQ) |

## Hallazgos Críticos (Prioridad Inmediata)

1. **Database (FASE 2)**: 0 tablas en PostgreSQL. Migraciones nunca ejecutadas. **Sin DB no funciona nada.**
2. **Backend (FASE 3)**: 3 dependencias faltantes, 2 módulos huérfanos, login devuelve 500.
3. **n8n (FASE 1)**: Workflows no importados. Credenciales rotas (`$vars` no reemplazado).
4. **Infraestructura (FASE 7)**: docker-compose.prod.yml no compila. SSL no existe. Sin HTTPS.
5. **Seguridad (FASE 9)**: Rate limit, auditoría, firewall — código muerto o documentación.
6. **Stripe (FASE 10)**: Motor de ingresos. No instalado, no registrado, no funcional.
7. **Portal Cliente (FASE 11)**: Prometido, no existe. Cero archivos.

## Causa Raíz

**Proyecto generado por IA sin verificación de integración.** El código fue creado fase por fase asumiendo que las fases anteriores funcionaban. Cada fase generó archivos independientes, pero nunca se conectaron entre sí. La prueba real de integración (FASE 2: DB) nunca pasó, y todas las fases posteriores heredaron ese error.

## Roadmap de Corrección (Orden de Prioridad)

1. **FASE 2** — Ejecutar migraciones SQL en PostgreSQL.
2. **FASE 3** — Instalar dependencias faltantes, integrar addendums, crear .env.
3. **FASE 1** — Importar workflows en n8n, reemplazar credenciales.
4. **FASE 0** — Corregir docker-compose, liberar puerto 5678.
5. **FASE 4** — Conectar frontend con backend funcional, corregir auth.
6. **FASE 7** — Arreglar docker-compose.prod.yml, agregar SSL.
7. **FASE 10** — Instalar Stripe, registrar rutas, crear price IDs.
8. **FASE 9** — Conectar rate limit y audit middleware.
9. **FASE 5-13 restantes** — Una vez que el core funcione.

## Veredicto Final

**El proyecto es un esqueleto bien estructurado pero no funcional.** La arquitectura es sólida (separación en capas, dockerización, documentación). El código existe y es en su mayoría correcto. Lo que falta es integración entre componentes, ejecución de migraciones, y configuración de servicios externos.

Tiempo estimado para producción funcional: **2-3 días de trabajo enfocado** (no 9 minutos de generación IA).

---

*Documento generado automáticamente como parte de la Auditoría de Realidad. Última actualización: Julio 2026.*
