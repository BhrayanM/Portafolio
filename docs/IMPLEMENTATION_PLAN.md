# Plan Maestro de Implementación — Portafolio SaaS

> **Autor:** Bhrayan Márquez — CTO & Arquitecto de Software Senior  
> **Stack base:** n8n · Docker · PostgreSQL · Node.js · Next.js · OpenAI · Hetzner  
> **Objetivo:** De automatizaciones IA aisladas → Plataforma multi-tenant SaaS  
> **Total fases:** 14  
> **Estado actual:** FASE 0 [DONE] · FASE 1 [DONE] · FASE 2 [DONE] · FASE 3 [DONE] · FASE 4 [DONE] · FASE 5 [DONE] · FASE 6 [DONE] · FASE 7 [DONE] · FASE 8 [DONE] · FASE 9 [DONE] · FASE 10 [DONE] · FASE 11 [DONE] · FASE 12 [DONE] · FASE 13 [DONE]

---

## Tabla de Contenido

- [FASE 0 — Consolidación del Entorno](#fase-0--consolidación-del-entorno)
- [FASE 1 — Motor de Automatización (Core)](#fase-1--motor-de-automatización-core)
- [FASE 2 — Base de Datos Central](#fase-2--base-de-datos-central)
- [FASE 3 — Backend Profesional](#fase-3--backend-profesional)
- [FASE 4 — Dashboard Web](#fase-4--dashboard-web)
- [FASE 5 — Sistema Multiempresa](#fase-5--sistema-multiempresa)
- [FASE 6 — Agentes IA](#fase-6--agentes-ia)
- [FASE 7 — Infraestructura Cloud](#fase-7--infraestructura-cloud)
- [FASE 8 — Observabilidad](#fase-8--observabilidad)
- [FASE 9 — Seguridad](#fase-9--seguridad)
- [FASE 10 — Facturación](#fase-10--facturación)
- [FASE 11 — Portal Cliente](#fase-11--portal-cliente)
- [FASE 12 — Marketplace de Automatizaciones](#fase-12--marketplace-de-automatizaciones)
- [FASE 13 — Escalabilidad](#fase-13--escalabilidad)
- [FASE 14 — Arquitectura Final SaaS](#fase-14--arquitectura-final-saas)

---

## FASE 0 — Consolidación del Entorno

### Objetivo de negocio
Base sólida y repetible sobre la que construir todo el ecosistema. Cero deuda técnica inicial. Un solo comando levanta todo.

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    docker-compose.yml                    │
│  ┌──────────────┐         ┌──────────────────────────┐  │
│  │   n8n (node) │◄───5678──│   Internet / Webhooks    │  │
│  │  ┌─────────┐ │         └──────────────────────────┘  │
│  │  │postgres │◄───5432──│                             │  │
│  │  └─────────┘ │         │   portafolio-net (bridge)  │  │
│  └──────────────┘         └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tecnologías exactas

| Componente | Tecnología | Versión | Imagen |
|-----------|-----------|---------|--------|
| Orquestación | n8n | latest | n8nio/n8n:latest |
| Base de datos | PostgreSQL | 15 | postgres:15-alpine |
| Contenedores | Docker Compose | v2+ | — |
| Servidor | Hetzner CX (2vCPU, 4GB) | $7-11/mo | Ubuntu 22.04 |
| Proxy (futuro) | NGINX / Coolify | — | — |

### Estructura de carpetas

```
/
├── backend/            # API REST (Fase 3+)
│   ├── src/
│   └── tests/
├── frontend/           # Dashboard (Fase 4+)
│   └── src/
├── n8n/
│   ├── data/           # Persistencia n8n (ignorado)
│   └── workflows/      # Export backup (ignorado)
├── docker/             # Config extras Docker
├── docs/
│   ├── adr/            # Decisiones de arquitectura
│   ├── patterns/       # Patrón reutilizable
│   ├── fase-0/         # Docs de cada fase
│   └── ...
├── scripts/
│   └── backup.sh       # Backup automatizado
├── monitoring/         # Grafana/Prometheus (Fase 8+)
├── database/
│   ├── migrations/     # Migraciones SQL
│   └── seeds/          # Datos de prueba
├── assets/             # Imágenes, diagramas
├── projects/           # Documentación de proyectos
├── .env.example        # Template de variables
├── .gitignore          # Blindado
├── docker-compose.yml  # Orquestación base
└── README.md           # Documentación principal
```

### Variables .env necesarias

```bash
POSTGRES_USER=n8n
POSTGRES_PASSWORD=changeme_super_segura
POSTGRES_DB=n8n
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_PORT=5678
WEBHOOK_URL=
N8N_ENCRYPTION_KEY=changeme_ejecuta:_openssl_rand_-hex_32
```

### Dependencias

- Docker Engine 24+ y Docker Compose v2
- Git
- (Opcional) openssl para generar claves

### Criterios de finalización (Definition of Done)

- [ ] `docker compose up -d` levanta n8n + postgres sin errores
- [ ] n8n accesible en http://localhost:5678
- [ ] PostgreSQL responde en localhost:5432
- [ ] `.env` existe y está en `.gitignore`
- [ ] `.gitignore` ignora correctamente: .env, _PRIVADO_NO_SUBIR/, n8n/data/, node_modules/, opencode.json
- [ ] `git status` no muestra archivos ignorados como untracked
- [ ] `scripts/backup.sh` ejecuta sin error (aunque falle pg_dump si no hay DB)
- [ ] README.md tiene instrucciones de inicio rápido
- [ ] Estructura de carpetas creada según plano

### Riesgos y buenas prácticas

| Riesgo | Mitigación |
|--------|-----------|
| .env se commitea por accidente | .gitignore probado con `git check-ignore -v .env` |
| Puerto 5678/5432 ocupados | Usar puertos alternativos en .env |
| Contenedor se queda sin disco | Monitorear con `docker system df` |
| n8n sin encryption key | Validar en docker-compose con `${N8N_ENCRYPTION_KEY:?error}` |
| Backup no se ejecuta | Probar script manualmente, luego cron |

### Pruebas que debo hacer

1. `docker compose config` — validar YAML
2. `docker compose up -d` — sin errores
3. `curl http://localhost:5678/healthz` — n8n responde 200
4. `docker compose ps` — ambos containers "Up"
5. `docker compose logs n8n` — sin errores de conexión a DB
6. `docker compose logs postgres` — sin errores
7. `git check-ignore -v .env` — confirma ignorado
8. `git status` — sin archivos sensibles visibles

### Documentación que debo producir

- [ ] README.md actualizado
- [ ] docs/fase-0/setup.md (notas de instalación)
- [ ] docs/fase-0/troubleshooting.md

### Qué NO hacer en esta fase

- No instalar Node.js, Python ni ningún runtime fuera de Docker
- No configurar HTTPS aún (viene en Fase 7)
- No crear usuarios ni datos en n8n
- No exponer Postgres a internet (solo red Docker)
- No instalar Coolify / NGINX aún
- No generar workflows n8n (Fase 1)

---

## FASE 1 — Motor de Automatización (Core) [DONE]

### Objetivo de negocio
Primer producto vendible: lead qualification engine. Tally → Webhook → OpenAI → HubSpot → Slack. El flujo completo que resuelve el problema real de un cliente.

### Arquitectura

```
Tally Form ──Webhook──► n8n ──► OpenAI (score + categoría)
                            │
                            ├──► HubSpot (upsert contacto)
                            │
                            ├──► Slack (notificación al equipo)
                            │
                            └──► PostgreSQL (log de errores)
```

### Tecnologías exactas

| Componente | Tecnología |
|-----------|-----------|
| Formulario | Tally (webhook saliente) |
| Orquestación | n8n (workflow visual) |
| IA | OpenAI Chat Completions API |
| CRM | HubSpot (API REST) |
| Notificación | Slack Webhook/API |
| Persistencia errores | PostgreSQL (tabla `error_log`) |

### Estructura de carpetas

```
docs/fase-1/
├── workflow-lead-qualification.md
├── prompt-lead-scoring.md
├── test-cases.md
└── env-vars.md
```

### Variables .env necesarias

```bash
OPENAI_API_KEY=sk-proj-...
HUBSPOT_ACCESS_TOKEN=...
SLACK_BOT_TOKEN=...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL_ID=...
```

### Dependencias

- Docker compose funcionando (Fase 0)
- Cuenta Tally (gratuita)
- Cuenta OpenAI con API Key
- Cuenta HubSpot (Free Tier)
- Workspace Slack + app configurada

### Criterios de finalización

- [ ] Workflow n8n "Lead Qualification" creado y activo
- [ ] Webhook público responde a POST de Tally
- [ ] OpenAI devuelve score + categoría + resumen
- [ ] HubSpot crea/actualiza contacto (upsert por email)
- [ ] Slack notifica leads Hot con botón aprobar/rechazar
- [ ] PostgreSQL registra cada ejecución y errores
- [ ] Human-in-the-loop: lead Hot requiere aprobación
- [ ] Manejo de errores: workflow global captura fallos
- [ ] Prueba end-to-end con lead real

### Riesgos y buenas prácticas

| Riesgo | Mitigación |
|--------|-----------|
| Costo OpenAI se dispara | Rate limiting, max tokens, cache de respuestas |
| Webhook público sin auth | API Key en header, rate limit por IP |
| HubSpot rate limit | Cola de operaciones, backoff exponencial |
| Prompt injection | Saneamiento de entrada antes del LLM |

### Pruebas

1. Enviar formulario Tally → webhook n8n recibe datos
2. OpenAI clasifica correctamente Hot/Warm/Cold
3. HubSpot recibe lead con score correcto
4. Slack muestra notificación con botón de acción
5. Error workflow: enviar datos malformados → tabla error_log
6. Duplicado: mismo email dos veces → un solo contacto en HubSpot

### Documentación que debo producir

- [ ] docs/fase-1/workflow-lead-qualification.md
- [ ] docs/fase-1/test-cases.md

### Qué NO hacer

- No implementar autenticación de usuarios (Fase 3)
- No crear base de datos de leads propia (Fase 2)
- No hacer UI (Fase 4)
- No optimizar para múltiples clientes (Fase 5)

---

## FASE 2 — Base de Datos Central (PostgreSQL) [DONE]

### Objetivo de negocio
Dejar de depender de HubSpot como sistema de registro. Base de datos propia con todas las entidades del negocio. HubSpot pasa a ser solo integración CRM.

### Arquitectura

```
┌──────────────────────────────────────────────┐
│              PostgreSQL (Central)              │
│                                                │
│  users          companies        leads         │
│  ┌──────┐      ┌──────────┐    ┌──────────┐   │
│  │ id   │      │ id       │    │ id       │   │
│  │ email│      │ name     │    │ email    │   │
│  │ role │      │ tenant_id│    │ company  │   │
│  └──────┘      │ plan     │    │ score    │   │
│                │ settings │    │ category │   │
│  logs          └──────────┘    │ status   │   │
│  ┌──────────┐                  │ source   │   │
│  │ id       │   scores         └──────────┘   │
│  │ level    │   ┌──────────┐                  │
│  │ message  │   │ id       │   workflow_runs  │
│  │ source   │   │ lead_id  │   ┌──────────┐   │
│  │ metadata │   │ score    │   │ id       │   │
│  └──────────┘   │ criteria │   │ workflow │   │
│                 │ model    │   │ status   │   │
│  settings       └──────────┘   │ duration │   │
│  ┌──────────┐                  │ error    │   │
│  │ id       │   tenants        └──────────┘   │
│  │ company  │   ┌──────────┐                  │
│  │ key      │   │ id       │                  │
│  │ value    │   │ slug     │                  │
│  └──────────┘   │ settings │                  │
│                 │ api_keys │                  │
│                 └──────────┘                  │
└──────────────────────────────────────────────┘
```

### Tecnologías exactas

| Componente | Tecnología |
|-----------|-----------|
| Base de datos | PostgreSQL 15 (existente) |
| Migraciones | Node.js (knex o raw SQL) |
| Pool de conexiones | pg-bouncer (opcional) |
| Herramienta GUI | pgAdmin / DBeaver (local) |

### Estructura de carpetas

```
database/
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_companies.sql
│   ├── 003_create_leads.sql
│   ├── 004_create_scores.sql
│   ├── 005_create_logs.sql
│   ├── 006_create_settings.sql
│   ├── 007_create_workflow_runs.sql
│   └── 008_create_tenants.sql
├── seeds/
│   ├── 001_admin_user.sql
│   └── 002_demo_company.sql
└── README.md
```

### Variables .env necesarias

```bash
DATABASE_URL=postgresql://user:pass@postgres:5432/portafolio
# o separada para la app:
DB_PORT=5432
DB_NAME=portafolio
DB_SCHEMA=public
```

### Criterios de finalización

- [ ] Esquema completo con todas las tablas creado via migraciones
- [ ] Migraciones idempotentes (pueden correr多次)
- [ ] Seed de admin y demo company funcional
- [ ] n8n conectado a la nueva base de datos
- [ ] Leads se persisten en PostgreSQL (no solo HubSpot)
- [ ] Tabla `error_log` captura errores de n8n
- [ ] Consultas básicas funcionan (CRUD leads, users, companies)

### Qué NO hacer

- No migrar datos de HubSpot aún
- No crear API REST (Fase 3)
- No optimizar índices prematuramente

---

## FASE 3 — Backend Profesional (Node.js) [DONE]

### Objetivo de negocio
API REST propia con autenticación, roles y multi-empresa. Reemplazar lógica de n8n con código mantenible cuando sea necesario.

### Tecnologías exactas

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js o Fastify |
| ORM | Knex.js (raw SQL) o Prisma |
| Auth | JWT (jsonwebtoken + bcrypt) |
| Validación | Joi / Zod |
| Testing | Jest + Supertest |
| Documentación API | Swagger (OpenAPI 3) |

### Estructura de carpetas

```
backend/
├── src/
│   ├── index.js
│   ├── config/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validate.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── leads.routes.js
│   │   └── companies.routes.js
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── utils/
├── tests/
├── package.json
└── Dockerfile
```

### Variables .env

```bash
API_PORT=3000
API_HOST=0.0.0.0
JWT_SECRET=...
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Dependencias npm

```json
{
  "express": "^4.18",
  "knex": "^3",
  "pg": "^8",
  "jsonwebtoken": "^9",
  "bcrypt": "^5",
  "joi": "^17",
  "cors": "^2",
  "helmet": "^7",
  "morgan": "^1",
  "jest": "^29"
}
```

### Criterios de finalización

- [ ] API REST con endpoints: auth (login/register), users CRUD, leads CRUD
- [ ] JWT login con refresh token
- [ ] Roles: admin, member, viewer
- [ ] Middleware de autenticación y validación
- [ ] Documentación Swagger en /api/docs
- [ ] Pruebas unitarias + integración (coverage > 70%)
- [ ] Dockerfile multi-stage para producción

---

## FASE 4 — Dashboard Web (Next.js) [DONE]

### Objetivo de negocio
Interfaz visual para que el cliente vea leads, analytics, y configure su cuenta. Sin depender de n8n para UI.

### Tecnologías exactas

| Componente | Tecnología |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Estado | React Query (TanStack Query) |
| Auth | NextAuth.js |
| Charts | Recharts / Tremor |
| Forms | React Hook Form + Zod |

### Estructura

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── leads/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── login/
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   └── shared/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── public/
├── package.json
└── Dockerfile
```

### Criterios de finalización

- [ ] Login con JWT
- [ ] Dashboard con KPIs (leads hoy, score promedio, tasa conversión)
- [ ] Tabla de leads con filtros y búsqueda
- [ ] Analytics: gráficos de leads por día, categoría, fuente
- [ ] Configuración: API keys, webhooks, preferencias
- [ ] Responsive (mobile-first)
- [ ] Docker multi-stage

---

## FASE 5 — Sistema Multiempresa [DONE]

### Objetivo de negocio
Un mismo backend sirve a N clientes. Cada cliente tiene sus datos aislados, su API key y su plan.

### Arquitectura

```
Request ──► API Gateway ──► Tenant Resolver ──► DB con tenant_id
                │                    │
                │              ┌──────────┐
                │              │  Dominio  │
                │              │  o Header │
                │              │  X-Tenant │
                │              └──────────┘
                │
           ┌──────────┐
           │  API Key  │
           │  + JWT    │
           └──────────┘
```

### Implementación clave

- Tabla `tenants` con slug, nombre, plan, settings (JSONB)
- Cada tabla de negocio tiene `tenant_id` (índice compuesto)
- Middleware `tenantResolver` que extrae tenant de header/dominio/API key
- Row-Level Security (RLS) en PostgreSQL como capa extra
- API Keys por tenant con rate limit individual

### Criterios de finalización

- [ ] Middleware de tenant en backend
- [ ] Todas las queries filtran por tenant_id
- [ ] API Keys rotables por tenant
- [ ] Rate limit por tenant (no global)
- [ ] RLS activado en PostgreSQL

---

## FASE 6 — Agentes IA [DONE]

### Objetivo de negocio
Agentes autónomos: Sales Agent (web), Support Agent (WhatsApp), Voice Agent (Twilio/Vapi). Cada uno con su propio contexto y herramientas.

### Tecnologías

| Agente | Canal | Tecnología IA |
|--------|-------|-------------|
| AI Sales | Web (embeddable chat) | OpenAI Assistants API |
| AI Support | WhatsApp | OpenAI + n8n + memoria |
| Voice AI | Voz (Twilio/Vapi) | OpenAI Realtime API / Vapi |

### Arquitectura por agente

```
Usuario ──► Canal ──► n8n ──► Agent Handler ──► Tools
                              │                      │
                              │  ┌────────────────┐  │
                              │  │  Memory (Redis) │  │
                              │  └────────────────┘  │
                              │                      │
                              ├──► CRM (consulta)    │
                              ├──► Calendario        │
                              └──► Escalar a humano  │
```

### Criterios de finalización

- [ ] AI Sales: chat embebible responde preguntas comerciales
- [ ] AI Support: WhatsApp responde con contexto del cliente
- [ ] Voice AI: llamada entrante detecta idioma y gestiona cita
- [ ] Escalado a humano en los 3 canales
- [ ] Memoria conversacional persistente

---

## FASE 7 — Infraestructura Cloud [DONE]

### Objetivo de negocio
Pasar de localhost a producción real con HTTPS, dominio, CDN y backups automáticos.

### Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Servidor | Hetzner CX21 ($11-17/mo) |
| Orquestación | Coolify (+ Coolify) |
| Proxy | NGINX / Caddy |
| SSL | Cloudflare (Free SSL) / Let's Encrypt |
| CDN | Cloudflare |
| DNS | Cloudflare |
| Backups | Hetzner Storage Box + cron |

### Arquitectura

```
Usuario ──► Cloudflare ──► NGINX ──► Coolify ──► Contenedores
                  │                                    │
             CDN + SSL                           n8n · API · Frontend
```

### Criterios de finalización

- [ ] HTTPS funcionando con cert válido
- [ ] Dominio apuntando a Hetzner via Cloudflare
- [ ] Coolify gestionando deploys
- [ ] Backups automáticos diarios a Storage Box
- [ ] CDN activo para assets estáticos
- [ ] Firewall: solo puertos 80, 443, (22 admin)

---

## FASE 8 — Observabilidad [DONE]

### Objetivo de negocio
Saber qué está pasando en producción antes de que el cliente lo reporte.

### Tecnologías

| Componente | Tecnología | Costo |
|-----------|-----------|-------|
| Métricas | Prometheus + Node Exporter | Gratis |
| Dashboards | Grafana | Gratis |
| Uptime | Uptime Kuma | Gratis |
| Logs | Loki (Grafana stack) | Gratis |
| Alertas | Slack Webhook | Gratis |

### Criterios de finalización

- [ ] Prometheus recolecta métricas de todos los servicios
- [ ] Grafana dashboard con: CPU, RAM, disco, uptime
- [ ] Uptime Kuma monitorea endpoints críticos
- [ ] Logs centralizados (Loki o similar)
- [ ] Alertas en Slack si servicio cae
- [ ] n8n métricas habilitadas

---

## FASE 9 — Seguridad [DONE]

### Objetivo de negocio
Capa de seguridad profesional: rate limiting, firewall, auditoría, recovery plan.

### Implementación

- Rate limiting: express-rate-limit + Redis (por IP y por tenant)
- Firewall: UFW en Hetzner + fail2ban
- Secret Manager: Coolify envs (no .env en disco)
- Auditoría: tabla `audit_log` con quién, qué, cuándo
- Roles: RBAC con 4 niveles (admin, manager, member, viewer)
- Recovery: plan de disaster recovery documentado
- VPN: Tailscale para acceso admin

### Criterios de finalización

- [ ] Rate limit global y por tenant
- [ ] fail2ban activo
- [ ] Secretos rotados (API keys, JWT)
- [ ] Tabla audit_log con triggers automáticos
- [ ] Plan de recovery probado

---

## FASE 10 — Facturación (Stripe) [DONE]

### Objetivo de negocio
Cobrar a los clientes. Planes, suscripciones, webhooks de pago.

### Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Pagos | Stripe |
| Planes | Stripe Products + Prices |
| Webhooks | Stripe → Backend |
| Portal | Stripe Customer Portal |
| Moneda | USD (luego MXN/COP) |

### Flujo

```
Usuario ──► Selecciona plan ──► Stripe Checkout ──► Pago
                │                                      │
                │   Webhook: checkout.session.completed │
                └──────────────────────────────────────┘
                                    │
                              Backend actualiza:
                              - tenant.plan = 'pro'
                              - tenant.status = 'active'
                              - Envía email bienvenida
```

### Criterios de finalización

- [ ] 3 planes: Starter ($49), Pro ($149), Enterprise (custom)
- [ ] Checkout Stripe funcional
- [ ] Webhook actualiza tenant automáticamente
- [ ] Portal de facturación para clientes
- [ ] Prueba: tarjeta de prueba 4242...

---

## FASE 11 — Portal Cliente [DONE]

### Objetivo de negocio
El cliente tiene su propio espacio: ve facturas, cambia plan, configura integraciones, ve uso.

### Funcionalidades

- Dashboard de uso (leads procesados, llamadas, etc.)
- Historial de facturas
- Cambiar/ cancelar plan
- Configurar webhooks propios
- API keys management
- Logs de actividad

### Criterios de finalización

- [ ] Login SSO (Google OAuth opcional)
- [ ] Sección "Mi cuenta" con datos de facturación
- [ ] Sección "Uso" con gráficos mensuales
- [ ] Sección "API" con generación de keys
- [ ] Sección "Facturas" con descarga PDF

---

## FASE 12 — Marketplace de Automatizaciones [DONE]

### Objetivo de negocio
Los clientes pueden instalar automatizaciones pre-construidas desde un marketplace. Como App Store pero para n8n.

### Arquitectura

```
Marketplace
├── Lead Qualification (Fase 1)
├── WhatsApp Agent (Fase 6)
├── Voice Receptionist (Fase 6)
├── Appointment Automation
├── Invoice Automator
└── Email Sequencer

Al instalar:
1. n8n importa workflow (via API)
2. Crea webhooks
3. Conecta con tenant
4. Activa
```

### Criterios de finalización

- [ ] Catálogo de automatizaciones
- [ ] Instalación 1-click via n8n API
- [ ] Workflows parametrizables por tenant
- [ ] Tracking de uso por automatización

---

## FASE 13 — Escalabilidad [DONE]

### Objetivo de negocio
El VPS de $20 ya no da abasto. Preparar la arquitectura para escalar horizontalmente.

### Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Cache | Redis |
| Colas | RabbitMQ |
| Workers | Node.js workers separados |
| Sesiones | Redis |
| Rate limit | Redis |
| CDN | Cloudflare (ya) |

### Arquitectura

```
                    ┌──────────┐
                    │  Redis    │
                    │  Cache    │
                    └────┬─────┘
                         │
Request ──► LB ──► API Server ──► Queue (RabbitMQ) ──► Workers
                         │
                    ┌──────────┐
                    │  PostgreSQL │
                    └──────────┘
```

### Criterios de finalización

- [ ] Redis cache para consultas frecuentes
- [ ] RabbitMQ para tareas pesadas (procesamiento leads, export)
- [ ] Workers separados en contenedores independientes
- [ ] Sesiones fuera de Node.js (Redis)
- [ ] Health endpoints para load balancer

---

## FASE 14 — Arquitectura Final SaaS

### Objetivo de negocio
Diagrama completo de la arquitectura final multi-tenant, escalable, segura y observable.

### Arquitectura Final

```
                                    ┌──────────────────────────────┐
                                    │       Cloudflare             │
                                    │  DNS · CDN · DDoS · SSL     │
                                    └──────────────┬───────────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │     NGINX / Caddy    │
                                        │   Reverse Proxy +    │
                                        │   Rate Limit (global)│
                                        └──┬──────┬──────┬─────┘
                                           │      │      │
                            ┌──────────────┘      │      └──────────────┐
                            ▼                     ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                    │  Frontend    │     │  Backend API │     │  n8n Workers │
                    │  Next.js     │     │  Node.js     │     │  (multi-inst)│
                    │  (x2-3)      │     │  (x2-3)      │     │              │
                    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                           │                    │                    │
                           └────────┬───────────┴───────────┬────────┘
                                    │                       │
                            ┌───────▼───────┐       ┌───────▼───────┐
                            │    Redis       │       │   RabbitMQ    │
                            │  Cache/Session │       │   Queue       │
                            └───────┬───────┘       └───────┬───────┘
                                    │                       │
                            ┌───────▼───────────────────────▼───────┐
                            │           PostgreSQL (Primary)        │
                            │          Multi-tenant + RLS           │
                            └───────┬───────────────────────────────┘
                                    │
                            ┌───────▼───────┐
                            │  PostgreSQL   │
                            │  Read Replica │
                            └───────────────┘

            ┌─────────────────────────────────────────────────────────┐
            │                  Observabilidad                         │
            │  Prometheus ── Grafana ── Loki ── Uptime Kuma ── Slack │
            └─────────────────────────────────────────────────────────┘

            ┌─────────────────────────────────────────────────────────┐
            │                    Seguridad                            │
            │  fail2ban · UFW · Tailscale · RBAC · Audit Log · RLS   │
            └─────────────────────────────────────────────────────────┘

            ┌─────────────────────────────────────────────────────────┐
            │               Facturación / Comercial                   │
            │  Stripe · Portal Cliente · Marketplace · Planes         │
            └─────────────────────────────────────────────────────────┘
```

### Componentes finales

| Capa | Componentes | Escala |
|------|------------|--------|
| Edge | Cloudflare (DNS, CDN, DDoS, SSL) | Global |
| Proxy | NGINX / Caddy | 1-3 instancias |
| Frontend | Next.js 14 + Tailwind + shadcn | Horizontal |
| API | Node.js + Express/Fastify + JWT | Horizontal |
| Workers | n8n + Node.js workers | Horizontal |
| Cache | Redis (sesiones, rate limit, datos calientes) | Cluster |
| Colas | RabbitMQ (tareas async) | Cluster |
| DB | PostgreSQL + RLS + Read Replica | Primary + Replica |
| Monitoreo | Prometheus + Grafana + Loki + Uptime Kuma | Dedicado |
| Seguridad | fail2ban + UFW + Tailscale + RBAC | Transversal |
| Facturación | Stripe + Portal Cliente | SaaS externo |
| Infra | Hetzner + Coolify + Docker Compose | Nubes múltiples |

### Principios de operación

1. **Inmutabilidad:** Los contenedores se reemplazan, no se parchean
2. **Observabilidad primero:** No hay feature sin métrica
3. **Security by design:** RLS, audit log, rate limit desde el día 1
4. **Multi-tenant nativo:** Aislamiento por tenant_id + RLS
5. **Costos controlados:** Hetzner + Coolify + Supabase Free Tier + Redis OSS
6. **Backup y recovery:** Diario + probado mensualmente
7. **Deuda técnica cero:** Cada fase produce código mantenible

---

## Resumen de fases

| Fase | Nombre | ¿Depende de? | Esfuerzo estimado | MVP vendible |
|------|--------|-------------|-------------------|-------------|
| 0 | Consolidación del Entorno | — | 1 día | No |
| 1 | Motor de Automatización (Core) | Fase 0 | 3-5 días | **Sí** |
| 2 | Base de Datos Central | Fase 0 | 2-3 días | No |
| 3 | Backend Profesional | Fase 2 | 5-7 días | No |
| 4 | Dashboard Web | Fase 3 | 5-7 días | **Sí** |
| 5 | Multiempresa | Fase 3 | 3-5 días | No |
| 6 | Agentes IA | Fase 1 | 5-10 días | **Sí** |
| 7 | Infraestructura Cloud | Fase 0 | 2-3 días | No |
| 8 | Observabilidad | Fase 7 | 3-5 días | No |
| 9 | Seguridad | Fase 7 | 2-3 días | No |
| 10 | Facturación | Fase 5 | 5-7 días | **Sí** |
| 11 | Portal Cliente | Fase 10 | 5-7 días | **Sí** |
| 12 | Marketplace | Fase 1 | 7-10 días | **Sí** |
| 13 | Escalabilidad | Fase 5 | 5-7 días | No |
| 14 | Arquitectura Final | Todas | 2-3 días | No |
