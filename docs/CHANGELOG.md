# Changelog — Portafolio-Publico

> Línea de tiempo profesional del proyecto.

---

## 2026-07-26 — F23 Product Experience Polish

**Estado:** Completed

**Cambios realizados:**
- Dashboard: métricas demo con iconos (leads capturados, calificados por IA, automatizaciones activas, tasa de conversión) + distribución + resumen rápido
- Leads: 8 leads demo profesionales con tabla enriquecida (fuente visual, score con dot indicator, fecha) + filtro con icono
- Activity: 8 entradas demo + timeline visual con status dots + source badges + CTA recargar en empty
- Analytics: leads por periodo (barras semanales) + embudo de conversión (5 etapas) + stat cards con trend indicators
- Marketplace: 3 workflows demo inline (Lead Qualification, WhatsApp Sales Assistant, Voice Receptionist) con badges Pro, icons diferenciados, border hover
- Billing: demo subscription fallback + card con icono + notificación amber
- Integrations: demo status fallback + mejoras visuales en headers de card
- Usage: 4 métricas con iconos contextuales + promedio ejecuciones por lead
- Settings: iconos en headers de sección + empty state pulido para API keys
- Patrón de fallback: cada página intenta fetch real por 3s, si falla → demo data con aviso amber

**Archivos modificados:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/leads/page.tsx`
- `frontend/src/app/dashboard/activity/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`
- `frontend/src/app/dashboard/billing/page.tsx`
- `frontend/src/app/dashboard/integrations/page.tsx`
- `frontend/src/app/dashboard/marketplace/page.tsx`
- `frontend/src/app/dashboard/usage/page.tsx`
- `frontend/src/app/dashboard/settings/page.tsx`

**Validación:**
- Build: ✅ Next.js 14.2.35 — 14/14 static pages, 0 errores
- Tests: N/A (cambios exclusivamente de UI/demo data)
- Lint: ✅ Compiled successfully

---

## 2026-07-26 — F22.1 Visual QA y Documentación

**Estado:** Completed

**Cambios realizados:**
- Auditoría visual de todas las rutas del dashboard
- Corrección de inconsistencias de color (`gray` → `slate`) en 4 archivos
- URLs hardcodeadas en login reemplazadas por variable de entorno dinámica
- Error states extraídos del bloque loading en activity y analytics
- Skeleton loaders preservados en flujo principal
- Creación de `docs/TEST_ACCESS.md` con URLs reales, usuarios de prueba y comandos de inicio rápido

**Archivos modificados:**
- `docs/TEST_ACCESS.md` (creado)
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/app/error.tsx`
- `frontend/src/app/not-found.tsx`
- `frontend/src/app/dashboard/error.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/dashboard/activity/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`

**Validación:**
- Build: ✅ 14/14 static pages, 0 errores
- Problemas corregidos: 4 (color inconsistency, hardcoded URL, error in loading, outdated TEST_ACCESS)

---

## 2026-07-25 — F22 UI Overhaul

**Estado:** Completed

**Cambios realizados:**
- Login corregido: inputs visibles, manejo de error SSL, branding profesional
- Swagger actualizado con servidor HTTPS
- Eliminación de problemas de dark mode heredado
- Body configurado con `bg-slate-50` y `text-slate-900`
- Dashboard completo actualizado con estilo SaaS consistente
- Cards: `bg-white border border-slate-200 rounded-xl shadow-sm`
- Headers: `text-3xl font-bold text-slate-900`
- Sidebar activo con indigo
- Inputs consistentes en todo el dashboard
- Skeleton loaders en todas las páginas
- Tablas mejoradas con header bg-slate-50

**Rutas aplicadas:**
- `/dashboard`, `/leads`, `/activity`, `/analytics`, `/billing`, `/integrations`, `/marketplace`, `/usage`, `/settings`
- Sidebar, Header, Login

**Archivos modificados:**
- `frontend/src/app/globals.css`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/app/dashboard/Sidebar.tsx`
- `frontend/src/app/dashboard/Header.tsx`
- `frontend/src/app/dashboard/leads/page.tsx`
- `frontend/src/app/dashboard/activity/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`
- `frontend/src/app/dashboard/billing/page.tsx`
- `frontend/src/app/dashboard/integrations/page.tsx`
- `frontend/src/app/dashboard/marketplace/page.tsx`
- `frontend/src/app/dashboard/usage/page.tsx`
- `frontend/src/app/dashboard/settings/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`

**Validación:**
- Build: ✅ Next.js 14.2.35

---

## 2026-07-24 — F21 Auditoría Final y Release

**Estado:** Completed

**Cambios realizados:**
- F21.1: Auditoría integral del sistema (security, deployment, testing)
- F21.2: Reportes de recuperación, diff y smoke test
- F21.3: Reparación de migraciones de hardening 011-015
- F21.4: Sanitización completa de datos reales del repositorio público
- F21.5: Reporte de preparación para publicación
- Corrección de Dockerfiles y estructura frontend
- Activación de aislamiento multi-tenant real (RLS efectivo)
- Reparación de 3 workflows de ejemplo n8n
- README actualizado para describir la plataforma real

**Validación:**
- Build: ✅
- Smoke test: ✅
- Sanitización: ✅

---

## 2026-07-23 — F20 Preparación para Despliegue

**Estado:** Completed

**Cambios realizados:**
- Auditoría y preparación para despliegue
- Corrección de configuraciones de Docker y nginx
- Verificación de variables de entorno y secrets
- Documentación de despliegue actualizada

**Validación:**
- Build: ✅
- Deployment checklist: ✅

---

## 2026-07-22 — F19 Security Hardening

**Estado:** Completed

**Cambios realizados:**
- F19a: Security hardening del backend (middleware, validación, rate limiting)
- F19b: Infrastructure hardening (nginx, Docker, red)
- F19c: Database hardening (migraciones 011-016, RLS forzado, roles, grants, índices, validación)
- F19d: Frontend hardening (API security, CORS enforcement, HTTP-only cookies)
- Sincronización de documentación con Segundo Cerebro

**Componentes hardening:**
- `backend/src/middleware/security.js`
- `backend/src/middleware/auth.js`
- `backend/src/middleware/rateLimit.js`
- `backend/src/utils/authCookie.js`
- `frontend/src/lib/api.ts`
- `docker/nginx.conf`
- `docker-compose.yml`

**Validación:**
- Build: ✅
- Seguridad: ✅ Middleware, auth, rate limiting, CORS, cookies HttpOnly

---

## 2026-07-21 — F18 Normalización y Correcciones

**Estado:** Completed

**Cambios realizados:**
- F18.1: Normalización billing plans — marketplace pro items para growth/enterprise
- F18.2: Alineación enums lead clasificación e intención
- F18.3: Limpieza lint backend
- F18.4: Redis verificado y documentado
- F18.5: nginx reverse proxy + trust proxy backend
- E2E HOT cerrado: exec 48 success, lead_log id=4 approved, HubSpot verificado

**Validación:**
- E2E: ✅ HOT + WARM paths verificados
- Lint: ✅ Backend limpio

---

## 2026-07-20 — F13-16 Escalabilidad, SaaS, Observabilidad y Testing

**Estado:** Completed

**Cambios realizados:**
- Escalabilidad del sistema multi-tenant
- Mejoras SaaS (billing, planes, API keys)
- Observabilidad con Grafana + Prometheus + Loki
- Suite de tests: 48 tests en backend
- CI/CD con GitHub Actions (lint, tests, security scan)

**Validación:**
- Tests: ✅ 48 tests
- CI: ✅ GitHub Actions

---

## 2026-07-19 — F10-12 WhatsApp, Voice AI y Marketplace

**Estado:** Completed

**Cambios realizados:**
- WhatsApp Business API integration (routes, controller, service)
- Voice AI Receptionist (Twilio integration)
- Marketplace de automatizaciones (catalog, install)
- Endpoints REST documentados en Swagger

**Archivos creados:**
- `backend/src/routes/whatsapp.routes.js`
- `backend/src/routes/voice.routes.js`
- `backend/src/routes/marketplace.routes.js`
- `backend/src/controllers/whatsapp.controller.js`
- `backend/src/controllers/voice.controller.js`
- `backend/src/controllers/marketplace.controller.js`

**Validación:**
- Build: ✅

---

## 2026-07-18 — F9 Stripe Integration

**Estado:** Completed

**Cambios realizados:**
- Stripe webhook con raw body parsing
- Checkout session creation y manejo de suscripciones
- Frontend billing page con selección de planes
- Corrección de orden de middlewares para webhook

**Validación:**
- Build: ✅
- Webhook: ✅ Raw body fix

---

## 2026-07-17 — F7-8 Backend y Frontend

**Estado:** Completed

**Cambios realizados:**
- F7: Backend robusto con Express, middleware, controladores, servicios
- F8: Frontend Next.js con App Router, Tailwind CSS, dashboard completo
- Autenticación con cookies HttpOnly
- CRUD de leads con filtros y búsqueda
- Panel de analytics y actividad

**Validación:**
- Build: ✅

---

## 2026-07-16 — F1-6 Fundaciones

**Estado:** Completed

**Cambios realizados:**
- F1: Motor de automatización core (n8n)
- F2: Base de datos PostgreSQL con esquema multi-tenant
- F3: Backend Node.js/Express profesional
- F4: Dashboard web Next.js
- F5: Sistema multi-tenant + RLS + API Keys
- F6: Agentes IA (Sales, WhatsApp, Voice)

**Arquitectura:**
- n8n 2.31.6 como orquestador de workflows
- PostgreSQL 15 con RLS por tenant
- Express API REST con autenticación JWT
- Next.js 14 App Router + Tailwind CSS

**Validación:**
- Infraestructura Docker: ✅

---

## 2026-07-15 — Inicio del Proyecto

**Estado:** Completed

**Cambios realizados:**
- Inicialización del repositorio
- Configuración inicial de Docker Compose
- Estructura base del proyecto
- Licencia y configuración de seguridad inicial
- Primer commit: `de0a09d portafolio base`

**Validación:**
- Repo: ✅ Inicializado y configurado
