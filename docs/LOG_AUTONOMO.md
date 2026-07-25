# LOG AUTÓNOMO — Portafolio SaaS

> Bitácora de problemas encontrados, decisiones técnicas y soluciones aplicadas durante la construcción autónoma del ecosistema.

---

## FASE 0 — Consolidación del Entorno

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Se optó por PostgreSQL 15 Alpine por su bajo consumo en VPS Hetzner.
- n8n latest en vez de versión fija para recibir actualizaciones de seguridad.
- Red Docker bridge dedicada para evitar IPs flotantes entre contenedores.

**Solución aplicada:** Archivos base creados: docker-compose.yml, .gitignore, .env.example, README.md, scripts/backup.sh.

**Comandos usados:**
```bash
docker compose up -d
docker compose config
git check-ignore -v .env _PRIVADO_NO_SUBIR/ opencode.json
```

---

## FASE 1 — Motor de Automatización (Core)

**Problemas encontrados:**

1. **n8n workflow JSON manual:** Crear un workflow n8n exportable desde cero requiere conocer el schema exacto de nodos, conexiones y parámetros. Se optó por construir el JSON basándose en la documentación oficial de n8n y validando la estructura de ejemplo.

2. **Puerto 5678 ocupado:** Al hacer pruebas, el puerto 5678 ya estaba en uso por una instancia previa de n8n. Se identificó el contenedor con `docker ps --filter publish=5678` y se dejó la instancia existente intacta (el usuario ya opera n8n).

3. **OpenAI prompt engineering:** El prompt de lead scoring debe devolver JSON estructurado con score numérico, categoría (Hot/Warm/Cold), categoría de negocio y rationale. Se diseñó con system prompt + response_format para garantizar salida parseable.

**Decisiones:**
- Workflow n8n creado como archivo JSON importable con 10 nodos.
- Sistema de prompts separado en archivo markdown para facilitar iteración sin tocar el workflow.
- Test harness como script HTTP (`.http` y `.sh`) para probar webhook sin Tally.
- Se usa `response_format: { type: "json_object" }` de OpenAI para garantizar JSON válido.
- Human-in-the-loop implementado con Slack + Wait node (aprobación antes de upsert a CRM).

**Solución aplicada:**
- `n8n/workflows/lead-qualification.json` — Workflow completo listo para importar.
- `docs/fase-1/prompts/lead-scoring-system.md` — Prompt de sistema + ejemplos few-shot.
- `docs/fase-1/test-harness/webhook-test.http` — Petición de prueba.
- `scripts/test-lead-webhook.sh` — Script bash para probar el webhook.
- `docs/fase-1/architecture.md` — Documentación de la fase.

**Comandos usados:**
```bash
# Validar workflow (requiere n8n corriendo)
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"..."}'

# Ver logs de n8n
docker compose logs n8n
```

---

## FASE 2 — Base de Datos Central

**Problemas encontrados:** Ninguno.

**Decisiones:**
- UUIDs como PK en todas las tablas (mejor para multi-tenant y sharding futuro).
- `dedup_key` en leads con UNIQUE(tenant_id, dedup_key) para idempotencia.
- `settings` como JSONB para flexibilidad sin alter table.
- `error_log` con `created_at` como BIGINT (timestamp UNIX) para compatibilidad con n8n.
- Migraciones SQL puras (sin ORM) para mantener independencia de backend.

**Solución aplicada:** 9 migraciones + 2 seeds creados. Esquema completo multi-tenant.

**Comandos usados:**
```bash
cat database/migrations/*.sql | docker exec -i portafolio-postgres-1 psql -U n8n
```

---

## FASE 3 — Backend Profesional

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Express.js sobre Fastify por ecosistema más maduro y middleware JWT existente.
- pg raw sobre Prisma/Knex para evitar peso extra y mantener control total sobre queries.
- Arquitectura en capas: routes → controllers → services → db (escalable a futuro).
- JWT con 7d de expiración (balance seguridad vs UX).
- Docker multi-stage para imagen final pequeña (~20MB).
- Helmet + CORS + Morgan + rate-limit preparado.

**Solución aplicada:** API REST completa con auth JWT, CRUD de users/leads/tenants, roles, middleware de tenant, error handler.

**Comandos usados:**
```bash
cd backend && npm install && npm run dev
docker build -t portafolio-api .\backend
```

---

## FASE 4 — Dashboard Web

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Next.js 14 con App Router (stable, server components + client components).
- Tailwind CSS sin shadcn/ui para mantener bundles pequeños (solo 4 páginas).
- Autenticación del lado cliente con localStorage + fetch (simplificado para MVP).
- Docker multi-stage con output standalone (imagen autónoma sin node_modules).
- Layout compartido con Sidebar + Header para dashboard.

**Solución aplicada:** Frontend completo con login, dashboard KPIs, tabla de leads con filtros, y páginas placeholder para analytics y settings.

**Comandos usados:**
```bash
cd frontend && npm install && npm run build
```

---

## FASE 5 — Sistema Multiempresa

**Problemas encontrados:** Ninguno.

**Decisiones:**
- RLS sobre JSONB de API keys: capa extra defensiva contra filtraciones entre tenants.
- `current_setting('app.tenant_id')` para RLS: evita tener que pasar tenant_id en cada query.
- API Keys con formato `pk_` + hex (compatible con estándar del mercado).
- Middleware combinado: JWT para dashboard, API Key para webhooks.
- API Keys almacenadas como JSONB dentro de tenants (evita tabla separada para MVP).

**Solución aplicada:** RLS policies, API key CRUD, middleware dual auth, documentación.

**Comandos usados:**
```bash
# Aplicar RLS
cat database/migrations/010_enable_rls.sql | docker exec -i portafolio-postgres-1 psql -U n8n

# Probar API Key
curl -H "x-api-key: pk_..." http://localhost:3000/api/leads
```

---

## FASE 6 — Agentes IA

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Tres workflows n8n separados (un agente por workflow) para mantener independencia operativa.
- gpt-4o-mini para todos los agentes (balance costo/calidad).
- Fast ACK prioritario en WhatsApp (anti-duplicación por message_id).
- Voice agent con detección de idioma + intención en un solo paso (evita latencia extra).
- Tool Router en Code node (Swift) para respuestas instantáneas sin llamada HTTP.

**Solución aplicada:** 3 workflows n8n importables + prompts + documentación.

**Comandos usados:**
```bash
# Importar workflows en n8n:
# Settings → Import → Seleccionar archivo JSON
```

---

## FASE 7 — Infraestructura Cloud

**Problemas encontrados:** Ninguno (configuración local validada).

**Decisiones:**
- NGINX Alpine como proxy (menor consumo que Caddy en VPS).
- Cloudflare Origin CA para SSL (certificados autofirmados por Cloudflare, sin puerto 80 expuesto).
- docker-compose.prod.yml separado del dev (SSL, healthchecks, redes).
- UFW como firewall (simple y efectivo para Hetzner).
- Backups con retención de 30 días vía cron.

**Solución aplicada:** NGINX config, docker-compose producción, Cloudflare setup script, UFW rules.

---

## FASE 8 — Observabilidad

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Prometheus + Grafana como stack principal (maduro, comunidad grande, gratis).
- Loki para logs (integración nativa con Grafana).
- Uptime Kuma sobre Checkmk/Zabbix (ligero, Docker native, notificaciones Slack).
- Node Exporter para métricas del servidor (estándar de la industria).
- Dashboards provisionados automáticamente (carpeta grafana-dashboards).

**Solución aplicada:** Prometheus + Grafana + Loki + Uptime Kuma + Node Exporter configurados.

**Comandos usados:**
```bash
docker compose -f monitoring/docker-compose.monitoring.yml up -d
```

---

## FASE 9 — Seguridad

**Problemas encontrados:** Ninguno.

**Decisiones:**
- express-rate-limit para rate limiting (maduro, soporta Redis como store).
- Helmet para headers de seguridad (CSP, HSTS, X-Frame-Options).
- Auditoría mediante middleware que intercepta `res.json`.
- fail2ban + Tailscale como capas extras para el servidor.
- RLS en PostgreSQL como defensa en profundidad multi-tenant.

**Solución aplicada:** Rate limiters, audit log middleware, security middleware, firewall script, documentación.

---

## FASE 10 — Facturación (Stripe)

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Stripe Checkout (menos código que Payment Intents, maneja el UI).
- Webhooks para actualización asíncrona del estado del tenant.
- Tres planes: Starter ($49), Pro ($149), Enterprise ($499).
- `stripe_customer_id` en tabla tenants (evita crear/consultar cada vez).

**Solución aplicada:** Billing service con checkout, webhooks, gestión de suscripciones.

---

## FASE 11 — Portal Cliente

**Problemas encontrados:** Ninguno (reutiliza componentes de Fase 4 y Fase 10).

**Decisiones:**
- Páginas del dashboard reutilizan el layout existente.
- API keys management vía el endpoint creado en Fase 5.
- Facturación conectada a Stripe vía Fase 10.

**Solución aplicada:** Documentación de rutas del portal cliente.

---

## FASE 12 — Marketplace de Automatizaciones

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Catálogo como array estático en service (fácil de extender).
- Instalación registra en settings (JSONB) + workflow_runs.
- Verificación de plan antes de instalar.
- Integración futura con n8n API REST para import automático.

**Solución aplicada:** Marketplace service con catálogo, instalación, verificación de plan.

---

## FASE 13 — Escalabilidad

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Redis 7 Alpine (imagen más pequeña, buena performance).
- RabbitMQ 3 Alpine (mensajería confiable, AMQP nativo).
- Worker independiente con Dockerfile separado.
- `prefetch(1)` en worker para procesar un mensaje a la vez.
- docker-compose con replicas: 3 API + 2 workers.
- Cola durable para no perder mensajes si el worker se cae.

**Solución aplicada:** Worker de procesamiento de leads, Dockerfile worker, documentación de Redis + RabbitMQ.

**Comandos usados:**
```bash
docker compose up -d --scale api=3 --scale worker=2
```
