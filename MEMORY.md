# MEMORY — Portafolio-Publico

Conocimiento estable del proyecto. No caduca. No contiene secretos ni datos privados.

---

## Stack tecnológico

| Capa | Tecnología | Rol |
|------|------------|-----|
| Workflow | n8n 2.31.6 | Automatización de procesos |
| Backend | Node.js / Express 4 | API REST |
| Frontend | Next.js 14 (App Router) / Tailwind CSS 3 | Dashboard SaaS |
| Database | PostgreSQL 15 | Multi-tenant con RLS |
| Cache | Redis 7.4.9 | Caching |
| Queue | RabbitMQ 3.13.7 | Mensajería |
| Contenedores | Docker / Docker Compose | Orquestación dev y prod |
| Proxy | NGINX 1.27.5 | TLS, rate limiting, WAF |
| CI/CD | GitHub Actions | Tests, lint, deploy |
| AI | Groq (llama-3.3-70b-versatile) | Lead scoring |
| CRM | HubSpot | Gestión de contactos |
| Payments | Stripe | Suscripciones (test) |
| Monitoring | Grafana + Prometheus + Loki | Observabilidad |
| Repo | GitHub | Código público |

## Arquitectura general

```
Forms / API / Voice / WhatsApp
  ↓
Edge Layer (NGINX — TLS, Rate Limit, WAF)
  ↓
Backend API (Node.js/Express)
  ↓
Automation Engine (n8n) → AI Agents → CRM / Notifications / DB
  ↓
PostgreSQL (Multi-tenant, RLS)
```

## Sistema Maestro de Memoria (Dos Sistemas)

```
┌─────────────────────────────────────────────────────────────┐
│ SISTEMA 1: Estado Operativo (C:\Portafolio-Publico)          │
│ STATE.md · PROJECT_STATUS.md · PROGRESO.md · MEMORY.md      │
│ DECISIONS.md · ENGINEERING_NOTES.md                         │
│ Contiene únicamente el estado dinámico actual del proyecto. │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Decisión al finalizar tarea
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ SISTEMA 2: Conocimiento Permanente (C:\Segundo-Cerebro)      │
│ 02_Aprendizaje · 04_Workflows · 05_Prompts                  │
│ 07_Recursos · 09_Errores-Soluciones                         │
│ Contiene únicamente activos reutilizables futuros.          │
└─────────────────────────────────────────────────────────────┘
```

## Estructura del repositorio

```
Portafolio-Publico/
├── STATE.md             # Estado dinámico instantáneo (< 30s)
├── AGENTS.md            # Protocolo universal multi-agente
├── CLAUDE.md            # Instrucciones auto-cargables para Claude Code
├── MEMORY.md            # Conocimiento estable del proyecto
├── PROJECT_STATUS.md    # Estado detallado de fases y tareas
├── PROGRESO.md          # Checkpoint cronológico
├── DECISIONS.md         # Registro de decisiones de arquitectura (ADR)
├── ENGINEERING_NOTES.md # Patrones de ingeniería y lecciones
├── .github/workflows/   # CI/CD
├── backend/             # Express API
├── frontend/            # Next.js dashboard
├── docs/                # Documentación técnica + CHANGELOG
├── projects/            # Proyectos de automatización
│   ├── lead-qualification/
│   ├── voice-receptionist/
│   ├── whatsapp-ecommerce-agent/
│   ├── examples/        # Workflows n8n sanitizados
│   └── appointment-automation/
├── assets/              # Diagramas de arquitectura
├── scripts/             # Githooks, helpers
├── docker/              # NGINX config, SSL
├── monitoring/          # Grafana, Prometheus, Loki
├── database/            # Migraciones + seeds
└── docker-compose*.yml  # Entornos dev y prod
```

## Convenciones Git

- Formato commit: `type: mensaje imperativo corto`
- Tipos: feat, fix, docs, ci, refactor, test, chore, style
- Ramas: `type/descripcion` (feat/, fix/, docs/, ci/)
- Sin force push a `main`
- Sin reescritura de historial en ramas públicas
- Un cambio lógico por commit
- Pre-commit hook valida secretos automáticamente

## Reglas de sanitización (repo público)

1. No `.env` ni credenciales reales
2. No API keys, tokens, secretos (usar `{{placeholder}}` o `$env.VAR`)
3. No URLs privadas, webhooks, IPs, dominios reales
4. No nombres de clientes, empresas reales, PII
5. No prompts internos, system prompts, reglas de negocio
6. No IDs de credenciales n8n ni bloques exportados
7. No cadenas de conexión a BD con credenciales
8. No llaves SSH ni certificados privados
9. No diagramas de infraestructura real
10. No referencias a workspaces privados

## Rutas del Frontend

| Ruta | Descripción | Estado |
|---|---|---|
| `/login` | Autenticación | ✅ Completo |
| `/dashboard` | Métricas y KPIs | ✅ Completo (F23) |
| `/dashboard/leads` | CRUD leads | ✅ Completo (F23) |
| `/dashboard/analytics` | Visualizaciones | ✅ Completo (F23) |
| `/dashboard/activity` | Timeline actividad | ✅ Completo (F23) |
| `/dashboard/billing` | Planes/suscripción | ✅ Completo (F23) |
| `/dashboard/integrations` | Conexiones externas | ✅ Completo (F23) |
| `/dashboard/marketplace` | Catálogo workflows | ✅ Completo (F23) |
| `/dashboard/usage` | Consumo tenant | ✅ Completo (F23) |
| `/dashboard/settings` | Perfil y API keys | ✅ Completo (F23) |

## Fases del Proyecto

| Fase | Descripción | Estado |
|---|---|---|
| F1-6 | Fundación: n8n, DB, Backend, Frontend, Multi-tenant, Agentes IA | ✅ |
| F7-8 | Backend robusto + Frontend Next.js | ✅ |
| F9 | Stripe integration | ✅ |
| F10-12 | WhatsApp, Voice AI, Marketplace | ✅ |
| F13-16 | Escalabilidad, SaaS, Observabilidad, Testing | ✅ |
| F18 | Normalización billing, enums, nginx proxy | ✅ |
| F19 | Security Hardening (backend, infra, DB, frontend) | ✅ |
| F20 | Preparación despliegue | ✅ |
| F21 | Auditoría final, release | ✅ |
| F22 | UI Overhaul SaaS | ✅ |
| F22.1 | Visual QA y documentación | ✅ |
| F23 | Product Experience Polish | ✅ |
| Upwork Opt. | Upwork Profile Optimization Phase 1 | ✅ |
| **Sistema Persistente** | **Sistema Maestro de Estado Persistente Multi-Agente** | **✅ Actual** |

## LinkedIn Profile — Conventions

- **Tono:** Profesional, técnico pero accessible. Resultados y arquitectura.
- **Headline:** Máximo 220 caracteres. Formato: `Rol · Propuesta de valor`
- **About:** Máximo 2,000 caracteres. Estructura: quién soy → capacidades → proyectos destacados → stack → idiomas
- **Experiencia:** Por proyecto o rol. Incluir: tecnologías, logro cuantificable, patrón de diseño clave
- **Skills:** Agrupadas por categoría. Priorizar las del stack principal.
- **Idiomas:** Español nativo · Inglés profesional
- **Contenido generado debe ser:** Verificable contra el repo, sin hipérboles, con métricas reales
- **Sanitización:** No incluir datos de clientes, credenciales, URLs privadas, webhooks, prompts internos

## LinkedIn Knowledge System — Auto-update rules

El agente debe actualizar `linkedin/profile.md` cuando ocurra CUALQUIERA de estos eventos:

- Nuevo proyecto terminado → agregar a experiencia + skills + timeline
- Nuevo commit importante (feat, docs, refactor significativo) → evaluar si cambia el perfil
- Nuevo release → verificar si hay nuevos proyectos o features que mostrar
- Nueva certificación → agregar a certifications
- Nueva tecnología aprendida → agregar a skills
- Cambio importante del stack → actualizar stack en about + skills
- Nuevo logro profesional → evaluar headline, about, experiencia
- Cambio en estrategia profesional → actualizar `linkedin/branding.md`
- Nuevo README importante → extraer descripción y logros para experiencia
- Nuevo proyecto agregado al portafolio → agregar a timeline + experiencia

NO actualizar cuando:
- Cambios cosméticos (typos, formatting)
- Commits de chore o style sin impacto funcional
- Conversaciones exploratorias sin cambios concretos
- El conocimiento no será útil en 3 meses

Regla de oro: *"Solo actualizar conocimiento útil que seguirá siendo relevante dentro de tres meses."*

## Upwork Profile

- **Título:** AI Automation Developer — n8n, AI Agents & CRM Workflows
- **Tarifa:** $25/hr (Chicago, IL, USA)
- **Badge:** Rising Talent
- **Phase 1:** Implementación completada manualmente en Upwork. Video Introduction pendiente (Fase 2).
- **Performance Review:** Pendiente después de la publicación.
- **Score estimado:** 8.4/10 (desde 4.5/10 inicial)
- **Archivos:** `docs/upwork/UPWORK_CHANGELOG.md`, `docs/upwork/UPWORK_FINAL_PROFILE.md`, `docs/upwork/UPWORK_IMPLEMENTATION_CHECKLIST.md`, `docs/upwork/UPWORK_FINAL_REVIEW.md`

## Notas de desarrollo

- Los hooks de git están en `.git/hooks/` (no versionados)
- Los workflows n8n de producción NUNCA se suben
- `projects/examples/` contiene ejemplos sanitizados con `--no-verify`
- Los archivos de configuración de agente IA son locales (gitignored)
- Demo data pattern: cada página intenta API 3s, si falla → demo data con aviso amber

---

## Auditoría

- **Última actualización:** 2026-07-27 (8ª)
- **Fase actual:** Sistema Maestro de Estado Persistente Multi-Agente — Completed
- **Build:** ✅ Next.js 14.2.35 — 14/14 static pages — 0 errores
- **Próxima fase:** Validar protocolo multi-agente / Upwork Phase 2 (Video Introduction) / F24 — Portfolio Showcase
