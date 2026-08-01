# Documentación

Índice de la documentación técnica del repositorio.

## Estructura del repositorio

```
├── README.md          # Presentación del portfolio (orientada a clientes)
├── projects/          # Casos de estudio: problema → solución → resultado
├── examples/          # Ejemplos sanitizados de workflows n8n (JSON educativos)
├── assets/            # Diagramas de arquitectura (diagrams/) y capturas (screenshots/)
├── docs/              # Esta documentación
├── backend/           # API REST (Express): controllers, services, middleware, schemas, tests
├── frontend/          # Dashboard SaaS (Next.js App Router, TypeScript)
├── database/          # Migraciones SQL (001–016) + seeds — RLS con FORCE
├── monitoring/        # Prometheus, Grafana, Loki, Uptime Kuma
├── scripts/           # Backup, hooks de git, pruebas de webhook
├── docker/            # Config de NGINX (dev y prod)
└── docker-compose*.yml
```

## Arquitectura e ingeniería

| Documento | Contenido |
|---|---|
| [architecture.md](./architecture.md) | Arquitectura del Lead Qualification Engine (n8n): flujo, persistencia, estado verificado |
| [platform.md](./platform.md) | Plataforma SaaS multi-tenant: capas, seguridad, verificación y roadmap |
| [engineering-practices.md](./engineering-practices.md) | Patrones de fiabilidad, integración de LLM, multi-tenancy, seguridad y lecciones |
| [adr/README.md](./adr/README.md) | Registro de decisiones de arquitectura (ADRs) — qué se eligió, contra qué y por qué |
| [patterns/webhook-ai-crm-notify.md](./patterns/webhook-ai-crm-notify.md) | El patrón reutilizable detrás de los cuatro sistemas de automatización |

## Guías

| Documento | Contenido |
|---|---|
| [development-setup.md](./development-setup.md) | Entorno de desarrollo local: URLs, usuarios de prueba, migraciones y verificación |
| [deployment-guide.md](./deployment-guide.md) | Despliegue a producción: prerequisitos, TLS, stack Docker, monitoreo, backups y rollback |

## Proyectos

| Documento | Contenido |
|---|---|
| [projects/README.md](../projects/README.md) | Índice de casos de estudio de automatización y ejemplos sanitizados |
| [projects/lead-qualification/README.md](../projects/lead-qualification/README.md) | Lead Qualification Engine |
| [projects/whatsapp-agent/README.md](../projects/whatsapp-agent/README.md) | WhatsApp Conversational Agent |
| [projects/voice-receptionist/README.md](../projects/voice-receptionist/README.md) | Bilingual Voice Receptionist |
| [projects/appointment-automation/README.md](../projects/appointment-automation/README.md) | Appointment Automation |
| [projects/whatsapp-ecommerce-agent/README.md](../projects/whatsapp-ecommerce-agent/README.md) | WhatsApp E-commerce Agent |
| [examples/README.md](../examples/README.md) | Ejemplos sanitizados de workflows n8n (JSON educativos) |

## Otros

| Documento | Contenido |
|---|---|
| [CHANGELOG.md](./CHANGELOG.md) | Línea de tiempo del proyecto |
| [SECURITY.md](../SECURITY.md) | Política de seguridad y alcance de publicación |
| [CONTACT.md](../CONTACT.md) | Vías de contacto |

---

[⬅️ Volver al repositorio](../README.md)
