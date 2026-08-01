# Plataforma SaaS — AI Lead Automation Platform

Documentación técnica de la plataforma multi-tenant de captación y calificación de leads
(backend, frontend y base de datos incluidos en este repositorio). Las capacidades descritas
están verificadas mediante ejecución local, pruebas automatizadas y CI.

## Arquitectura

```
Formulario · WhatsApp · Voz · API
        │
   NGINX  — TLS 1.2/1.3 · HSTS · rate limit 10 r/s · cabeceras de seguridad
        ├──────────────► Next.js 16  (dashboard, 11 páginas)
        └──────────────► Express     (API REST, 9 grupos de rutas)
                              │
                              ├── n8n  — workflows de automatización
                              │        └── LLM → HubSpot → Slack
                              └── PostgreSQL 15
                                     multi-tenant · RLS con FORCE · 16 migraciones
```

## Capas

| Capa | Tecnología | Estado |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript estricto, Tailwind | 11 páginas, build en verde (CI) |
| **Backend** | Node.js 20, Express 4, API REST | 9 grupos de rutas, OpenAPI en `/api-docs` |
| **Base de datos** | PostgreSQL 15, multi-tenant | 16 migraciones + 2 seeds, **RLS activo con FORCE** |
| **Automatización** | n8n 2.31.6 autoalojado | Ejemplos sanitizados en `examples/` |
| **IA** | Orquestación de LLM vía HTTP | Scoring con salida estructurada y router determinista |
| **CRM** | HubSpot | Upsert idempotente |
| **Notificaciones** | Slack | Webhook entrante |
| **Pagos** | Stripe | Checkout + webhook con verificación de firma |
| **Infraestructura** | Docker Compose, NGINX | Imágenes pineadas a patch exacto |
| **Testing** | Jest + Supertest | **103 tests**, CI con lint + typecheck + build + barrido de secretos |

## Seguridad

- **Sesión en cookie `HttpOnly + Secure + SameSite`** — el JWT no es accesible desde
  JavaScript.
- **Aislamiento multi-tenant impuesto por el motor.** `FORCE ROW LEVEL SECURITY` en las
  tablas multi-tenant y conexión con un rol sin privilegios de propietario. Sin contexto de
  tenant, una consulta devuelve cero filas; un `INSERT` con `tenant_id` ajeno se rechaza.
- **Arranque en fallo rápido** — en producción el proceso aborta si falta `JWT_SECRET`,
  `CORS_ORIGINS`, `POSTGRES_PASSWORD` o `STRIPE_WEBHOOK_SECRET`. No hay secretos por defecto.
- **Validación de entrada con Joi** en todas las rutas que escriben.
- Rate limit por IP, CORS con lista blanca, Helmet, y auditoría por triggers en base de datos.

## Verificación local

```bash
cd backend  && npm run lint && npm test        # 103 tests
cd frontend && npx tsc --noEmit && npm run build
docker compose -f docker-compose.prod.yml build
```

## Respaldo

```bash
./scripts/backup.sh
```

## Roadmap

Declarado aquí, y **no** presentado como implementado en ninguna otra parte del
repositorio:

| Elemento | Estado real |
|---|---|
| Redis (caché / rate-limit distribuido) | `cache.service.js` existe; sin consumidor ni servicio en compose |
| RabbitMQ (procesamiento asíncrono) | Servicio declarado en compose; sin productor ni worker |
| Google Sheets · Shopify | Integraciones del sistema de producción; sin código en este repositorio |
| API keys con hash en reposo | Hoy se almacenan en claro en `tenants.api_keys` |
| Firma HMAC en los webhooks de WhatsApp y Twilio | Pendiente; hoy solo el handshake de verificación |
| Observabilidad (Prometheus · Grafana · Loki) | Configuración en `monitoring/`; targets sin revalidar |
| Tests de frontend | Ninguno |
| Tabla de control de migraciones | Las migraciones son idempotentes, pero nada registra cuáles se aplicaron |

## Documentos relacionados

- [Arquitectura del Lead Qualification Engine](./architecture.md)
- [Patrón reutilizable](./patterns/webhook-ai-crm-notify.md)
- [ADRs](./adr/README.md)
- [Guía de despliegue](./deployment-guide.md)
- [SECURITY.md](../SECURITY.md)
