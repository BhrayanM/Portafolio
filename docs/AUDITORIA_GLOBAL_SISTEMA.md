# Auditoría Global del Sistema — ETAPA B.5

> Documento de diagnóstico generado al inicio de la ETAPA B.5.
> No corrige — solo diagnostica. Los hallazgos se resolverán en FASE 18 y FASE 19.

---

## 1. ARQUITECTURA ACTUAL

### Frontend
- **Framework:** Next.js 14.2.35 (App Router), TypeScript estricto
- **UI:** Tailwind CSS, lucide-react icons, clsx
- **Rutas (14):** 11 pages + error.tsx + not-found.tsx + dashboard/error.tsx
- **Auth:** Cookie HttpOnly, apiFetch<T> genérico con `credentials: 'include'`
- **Estado:** Solo useState local — sin React Query, SWR, ni estado global
- **Testing:** 0 tests, 0 framework de testing instalado

### Backend
- **Runtime:** Node.js + Express
- **Auth:** JWT via cookie HttpOnly + Bearer fallback + API Key middleware
- **DB:** PostgreSQL 16 (pool pg), 10 migraciones, RLS habilitado
- **Validación:** Joi schemas (4 archivos)
- **Rate limiting:** Global (100/15min), Auth (5/15min), API Key (60/15min)
- **Logging:** Logger estructurado + morgan + console.log residual
- **Middleware:** 9 archivos (3 muertos: combinedAuth, auditLog, security duplica rate limit)
- **Controllers:** 10 archivos (3 usan res.status directo en vez de next(error))
- **Services:** 10 archivos (2 muertos: cache.service.js sin dependencia, worker.js sin publicador)
- **Testing:** 70 tests (3 suites) — cubren solo lib/lead.js + auth cookie + health/leads API

### Base de Datos
- PostgreSQL 15-alpine (Docker)
- 10 migraciones ejecutadas, seeds de admin
- Tablas: tenants, users, leads, scores, error_log, settings, workflow_runs, audit_log, lead_log
- RLS en 6 tablas via `app.tenant_id`

### Automatización (n8n)
- **Lead Qualification:** 17 nodos, activo, versión `883a60ad`
- **WhatsApp Agent / Voice Receptionist / Sales Chat:** Scaffolding, workflows en disco
- **Flujo E2E verificado:** WARM, HOT (con aprobación Slack), COLD — todos exitosos

### IA
- **Groq** (`llama-3.3-70b-versatile`): Activo, key real
- **OpenAI:** Sin saldo (429), no usado actualmente

### Integraciones
- **HubSpot:** Upsert contactos, token real, portal `246823552`
- **Slack:** Aprobación HOT, token real
- **Stripe:** Checkout funcional (test key), webhook sin secret
- **WhatsApp Cloud API:** Scaffolding, sin token real
- **Twilio (Voice):** Scaffolding, sin credenciales reales

### Infraestructura Local
- Docker Compose: PostgreSQL, n8n, Redis 7, RabbitMQ 3
- Docker Compose Prod: + Nginx, API, Frontend (no activo)
- Monitoring: Prometheus, Grafana, Loki, Uptime Kuma (docker-compose separado)
- Red: `portafolio-net` (bridge)
- Volúmenes persistentes: postgres_data, n8n_data, redis_data, rabbitmq_data

---

## 2. METODOLOGÍA DE AUDITORÍA

- Inspección manual de cada archivo fuente (backend, frontend, docker, config)
- Ejecución de tests existentes
- Verificación de dependencias vs imports reales
- Análisis de seguridad de configuración y secretos
- Revisión de historial git

---

## 3. HALLAZGOS — CLASIFICADOS POR SEVERIDAD

### 🔴 CRÍTICO (4) — Impide funcionalidad o causa caída en producción

| ID | Componente | Hallazgo | Impacto |
|---|---|---|---|
| **C-01** | Backend — `schemas/billing.schema.js:4` | Valida plan `'growth'` pero `services/billing.service.js` PLANS solo tiene `starter`, `pro`, `enterprise`. | Cualquier checkout con `plan: "growth"` pasa validación pero lanza `NotFoundError("Plan no encontrado")`. UX rota. |
| **C-02** | Backend — `schemas/lead.schema.js:14` vs `services/leads.service.js:51` | Schema valida `HOT/WARM/COLD` (uppercase), pero DB almacena `'Hot'`, `'Warm'`, `'Cold'` (title case). Filtro `?category=HOT` nunca retorna resultados. | Búsqueda por categoría siempre vacía. Funcionalidad de filtro completamente rota. |
| **C-03** | Backend — `services/cache.service.js:13` | `require('ioredis')` pero ioredis **no está en package.json**. | Si `REDIS_ENABLED=true`, la aplicación crashea con `MODULE_NOT_FOUND`. |
| **C-04** | Docker — `docker/nginx.conf:15` vs `docker-compose.yml` | Upstream `portafolio-n8n` no coincide con nombre de servicio `n8n` (línea 22). | Nginx no puede resolver el upstream. Todo el proxy a n8n en producción está roto. |

### 🟡 ALTO (9) — Riesgo de seguridad, degradación o deuda significativa

| ID | Componente | Hallazgo | Impacto |
|---|---|---|---|
| **A-01** | Backend — `security.js:19-21` + `app.js:46` + `auth.routes.js:10` | Rate limiters aplicados **dos veces**: `globalLimiter` en security.js Y app.js; `authLimiter` en security.js Y auth.routes.js. | Cada request es rate-limited dos veces. Contadores duplicados dan falsos positivos de rate limiting. |
| **A-02** | Backend — 7 archivos | Uso de `console.log` / `console.error` en lugar del logger estructurado. | Pérdida de metadata (requestId, tenantId, timestamp ISO), logs no parseables en producción. |
| **A-03** | Backend — `billing.controller.js:26`, `whatsapp.controller.js:14`, `voice.controller.js:11` | 3 controladores usan `res.status(400).json(...)` en vez de `next(error)`. | Error handler global no registra el error. Formato de respuesta inconsistente con el resto de la API. |
| **A-04** | Backend — `billing.controller.js:18` vs `billing.service.js:10` | Stripe instanciado dos veces: en el controller (inline) y en el service (lazy singleton). | Dos instancias de Stripe en memoria. La del controller ignora el service. |
| **A-05** | Backend — 7 archivos muertos | `cache.service.js`, `combinedAuth.js`, `auditLog.js`, `worker.js`, `lib/queue.js`, `schemas/index.js`, `Dockerfile.worker` | 6 archivos nunca importados + 1 Dockerfile no usado. Aumentan complejidad y confusión. |
| **A-06** | Frontend — 7 páginas | Catch blocks silenciosos: `.catch(() => {})` / `.catch(() => [])` en dashboard, analytics, leads, activity, billing, settings, usage, marketplace. | Usuarios ven estados vacíos sin feedback de error cuando el backend falla. |
| **A-07** | Stripe — `.env` | `STRIPE_WEBHOOK_SECRET` vacío. | `handleWebhook` en billing.controller.js usa `constructEvent(req.body, sig, '')` — falla siempre que Stripe firma con un secret real. |
| **A-08** | Monitoring — `.env` | `GRAFANA_ADMIN_PASSWORD=changeme`. | Contraseña por defecto sin cambiar. Cualquiera con acceso a Grafana puede tomar control. |
| **A-09** | Monitoring — `docker-compose.monitoring.yml` | Prometheus (9090), Loki (3100), Uptime Kuma (3002) expuestos sin autenticación. | Acceso no autenticado a métricas, logs y dashboard status. |

### 🟠 MEDIO (14) — Mala práctica, deuda técnica, impacto moderado

| ID | Componente | Hallazgo | Impacto |
|---|---|---|---|
| **M-01** | Backend — `services/users.service.js`, `leads.service.js`, `tenants.service.js` | Uso de `SELECT *` en lugar de columnas explícitas. | Riesgo de leak de columnas sensibles, acoplamiento a schema de DB. |
| **M-02** | Backend — `docs/swagger.js` | Swagger documenta solo 4/14 grupos de rutas (health, auth, leads, billing). | 10 grupos de endpoints sin documentación (users, tenants, keys, whatsapp, voice, marketplace, metrics). |
| **M-03** | Backend — `package.json` | Dependencias no usadas: `zod` (Joi es el único validador usado), `uuid` (crypto.randomUUID() nativo usado). | Código muerto en node_modules, peso innecesario. |
| **M-04** | Frontend — `package.json` | `tailwind-merge` instalado pero nunca importado. | Dependencia muerta. |
| **M-05** | Frontend — `src/lib/api.ts:47,51-52` | `leadsApi.getById()` y `billingApi.plans()` definidos pero nunca llamados. | Código muerto. |
| **M-06** | Backend — `worker.js:6-12` | Pool de PostgreSQL duplicado — mismo config que `db.js`. | Dos pools de conexión. Si worker se activa, conexiones extras. |
| **M-07** | Backend — `services/billing.service.js:16-18` | Stripe price IDs son placeholders: `'price_starter_monthly'`, `'price_pro_monthly'`, `'price_enterprise_monthly'`. | Checkout apunta a IDs que no existen en Stripe. |
| **M-08** | Docker — `docker-compose.yml:22` | `n8nio/n8n:latest` — tag no fijado. | Actualización inesperada de n8n puede romper el workflow (verificado en v2.31.6). |
| **M-09** | Monitoring — `docker-compose.monitoring.yml` | Prometheus, Grafana, Loki, Uptime Kuma usan `:latest`. | Rotura por cambios no controlados. |
| **M-10** | Config — `.env` vs `.env.example` | 17 variables de `.env.example` ausentes en `.env` (NODE_ENV, LOG_LEVEL, CORS_ORIGINS, DB_HOST, DB_PORT, AUTH_COOKIE_*, REDIS_ENABLED, RABBITMQ_*, etc.). | El backend usa defaults que pueden no coincidir con el entorno real. |
| **M-11** | Docker — `docker/nginx.conf` | Sin headers de seguridad: HSTS (ya en backend Helmet), CSP (ya en backend), X-Content-Type-Options, X-Frame-Options. | El proxy no refuerza seguridad si el backend no responde. |
| **M-12** | Docker — `docker/nginx.conf` | Sin rate limiting ni límite de tamaño de request. | Sin defensa contra abusos a nivel de proxy. |
| **M-13** | Config — `.env` | `N8N_ENCRYPTION_KEY=clavesegura421` — débil, palabras en español. `POSTGRES_PASSWORD=clavesegura123` — débil. | Fácil de bruteforce si hay acceso a la red interna. |
| **M-14** | Testing — general | 10 controllers, 10 services, 9 middleware — 0 tests. Solo lib/lead.js tiene cobertura completa. | Cualquier refactor puede romper funcionalidad sin detección. |

### 🔵 BAJO (8) — Cosmético, documentación, convención

| ID | Componente | Hallazgo | Impacto |
|---|---|---|---|
| **B-01** | Backend — `schemas/index.js` | Barrel file nunca importado por ningún route. Cada ruta importa su schema individualmente. | Código muerto trivial. |
| **B-02** | Config — `.env:16` | `N8N_WEBHOOK_URL` presente en `.env` pero ausente en `.env.example`. | Variable stale que puede causar confusión. |
| **B-03** | Docker — `docker-compose.yml` | Redis y RabbitMQ no tienen healthcheck. | Si fallan, no hay señal para dependientes. |
| **B-04** | DB — `database/migrations/005_create_error_log.sql` | `error_log.created_at` usa `BIGINT` (epoch ms) mientras otras tablas usan `TIMESTAMP`. | Inconsistencia de tipo, no funcional. |
| **B-05** | DB — general | No hay migration runner/versionador. Migraciones ejecutadas manualmente. | Riesgo de desincronización entre entornos. |
| **B-06** | Docs — `CLAUDE.md` | Menciona `/api-docs` como ruta del frontend cuando en realidad es servida por el backend (Swagger UI). | Documentación incorrecta. |
| **B-07** | Frontend — activity, usage, settings pages | 4 placeholders visibles al usuario notando que endpoints backend no existen. | UX informa que funcionalidad falta. |
| **B-08** | Scripts — `scripts/setup-cloudflare.sh` | Instruye guardar certs en `./docker/ssl/certs/` y `./docker/ssl/private/`, pero los archivos reales están en `./docker/ssl/`. | Path mismatch en documentación del script. |

---

## 4. EVALUACIÓN POR DIMENSIÓN

| Dimensión | Evaluación | Principales riesgos |
|---|---|---|
| **Calidad del código** | 🟡 Buena base, deuda concentrada | 7 archivos muertos, console.log, SELECT *, inline require |
| **Organización** | 🟢 Estructura clara, separación por capas | Routes/Controllers/Services limpio. Convenciones mayormente consistentes. |
| **Escalabilidad** | 🟡 Redis/RabbitMQ scaffolded pero no cableados | Dependencias faltantes (ioredis), worker sin publicador, cache.service.js nunca importado |
| **Seguridad** | 🟡 Buenas prácticas base con fugas | Contraseñas débiles, doble rate limit, nginx sin headers, webhook sin secret |
| **Mantenibilidad** | 🟢 Código legible, TypeScript estricto, pruebas en núcleo | Tests faltantes en 29 archivos, Swagger incompleto |
| **Riesgos** | 🟡 4 críticos, 9 altos | C-01/02 roturas funcionales ciertas, C-03 crash, C-04 prod broken |

---

## 5. COMPARATIVA CON AUDITORIA FINAL ETAPA B

La auditoría de ETAPA B (`AUDITORIA_FINAL_ETAPA_B.md`) listaba 8 items de deuda técnica. Esta auditoría global expande significativamente:

| Deuda previa | Estado en auditoría actual |
|---|---|
| `/leads/activity` endpoint | Persiste — no implementado (B-07) |
| `/usage` endpoint | Persiste — no implementado (B-07) |
| WhatsApp/Voice credenciales | Persiste — scaffolding funcional (documentado en F10-12) |
| `STRIPE_WEBHOOK_SECRET` vacío | Persiste — ahora documentado como A-07 (ALTO) |
| Worker RabbitMQ placeholder | Ya migrado a logger estructurado (M-06: pool duplicado) |
| Tests frontend | Persiste — 0 tests + dependencia muerta (M-04) |
| `docs/ARQUITECTURA.md` desactualizado | Persiste — no refleja Redis/RabbitMQ |
| ngrok requerido | Persiste — documentado |

**Hallazgos nuevos no listados en auditoría previa:** 18 items (4 críticos, 9 altos, 5 medios/bajos).

---

## 6. RESUMEN CUANTITATIVO

| Severidad | Cantidad | Acción recomendada |
|---|---|---|
| 🔴 CRÍTICO | 4 | Resolver antes de cualquier deploy |
| 🟡 ALTO | 9 | Resolver en FASE 18 y FASE 19 |
| 🟠 MEDIO | 14 | Resolver según prioridad |
| 🔵 BAJO | 8 | Resolver si hay tiempo |

**Total hallazgos: 35**

---

*Documento generado al inicio de ETAPA B.5 — FASE 17.*
*Próximo paso: FASE 18 — Cierre de Deuda Técnica.*
