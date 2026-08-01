# Changelog — Portafolio-Publico

> Professional project timeline.

---

## 2026-07-26 — Product Experience Polish

**State:** Completed

**Changes:**
- Dashboard: demo metrics with icons (leads captured, AI-qualified, active automations, conversion rate) + distribution + quick summary
- Leads: 8 professional demo leads with enriched table (visual source, score with dot indicator, date) + icon filter
- Activity: 8 demo entries + visual timeline with status dots + source badges + reload CTA on empty state
- Analytics: leads per period (weekly bars) + conversion funnel (5 stages) + stat cards with trend indicators
- Marketplace: 3 inline demo workflows (Lead Qualification, WhatsApp Sales Assistant, Voice Receptionist) with Pro badges, differentiated icons, border hover
- Billing: demo subscription fallback + card with icon + amber notification
- Integrations: demo status fallback + visual improvements in card headers
- Usage: 4 metrics with contextual icons + average runs per lead
- Settings: icons in section headers + polished empty state for API keys
- Fallback pattern: every page tries a real fetch for 3 s; on failure → demo data with an amber notice

**Modified files:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/leads/page.tsx`
- `frontend/src/app/dashboard/activity/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`
- `frontend/src/app/dashboard/billing/page.tsx`
- `frontend/src/app/dashboard/integrations/page.tsx`
- `frontend/src/app/dashboard/marketplace/page.tsx`
- `frontend/src/app/dashboard/usage/page.tsx`
- `frontend/src/app/dashboard/settings/page.tsx`

**Validation:**
- Build: ✅ 0 errors
- Tests: N/A (UI/demo data only)
- Lint: ✅

---

## 2026-07-26 — Visual QA and Documentation

**State:** Completed

**Changes:**
- Visual audit of all dashboard routes
- Color consistency fixes (`gray` → `slate`) in 4 files
- Hardcoded URLs in login replaced with dynamic environment variable
- Error states extracted from the loading block in activity and analytics
- Skeleton loaders preserved in the main flow
- Created `docs/DEVELOPMENT_SETUP.md` with URLs, test users and quick-start commands

**Modified files:**
- `docs/DEVELOPMENT_SETUP.md` (created)
- `frontend/src/app/dashboard/layout.tsx`
- `frontend/src/app/error.tsx`
- `frontend/src/app/not-found.tsx`
- `frontend/src/app/dashboard/error.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/dashboard/activity/page.tsx`
- `frontend/src/app/dashboard/analytics/page.tsx`

**Validation:**
- Build: ✅ 0 errors
- Fixed issues: 4 (color inconsistency, hardcoded URL, loading error, outdated setup doc)

---

## 2026-07-25 — UI Overhaul

**State:** Completed

**Changes:**
- Login fixed: visible inputs, SSL error handling, professional branding
- Swagger updated with HTTPS server
- Removed inherited dark-mode issues
- Body configured with `bg-slate-50` and `text-slate-900`
- Dashboard fully updated with consistent SaaS style
- Cards: `bg-white border border-slate-200 rounded-xl shadow-sm`
- Headers: `text-3xl font-bold text-slate-900`
- Active sidebar with indigo
- Consistent inputs across the dashboard
- Skeleton loaders on all pages
- Improved tables with `bg-slate-50` header

**Routes applied:**
- `/dashboard`, `/leads`, `/activity`, `/analytics`, `/billing`, `/integrations`,
  `/marketplace`, `/usage`, `/settings`
- Sidebar, Header, Login

**Validation:**
- Build: ✅

---

## 2026-07-24 — Final Audit and Release

**State:** Completed

**Changes:**
- Full system audit (security, deployment, testing)
- Recovery reports, diff and smoke test
- Repair of hardening migrations 011–015
- Full sanitization of real data from the public repository
- Publication readiness report
- Dockerfile fixes and frontend structure
- Real multi-tenant isolation enabled (effective RLS)
- Repair of 3 example n8n workflows
- README updated to describe the real platform

**Validation:**
- Build: ✅
- Smoke test: ✅
- Sanitization: ✅

---

## 2026-07-23 — Deployment Preparation

**State:** Completed

**Changes:**
- Deployment audit and preparation
- Docker and nginx configuration fixes
- Environment variable and secret verification
- Deployment documentation updated

**Validation:**
- Build: ✅
- Deployment checklist: ✅

---

## 2026-07-22 — Security Hardening

**State:** Completed

**Changes:**
- Backend hardening (middleware, validation, rate limiting)
- Infrastructure hardening (nginx, Docker, network)
- Database hardening (migrations 011–016, RLS, roles, grants, indexes, validation)
- Frontend hardening (API security, CORS enforcement, HTTP-only cookies)
- Architecture documentation sync

**Hardening components:**
- `backend/src/middleware/security.js`
- `backend/src/middleware/auth.js`
- `backend/src/middleware/rateLimit.js`
- `backend/src/utils/authCookie.js`
- `frontend/src/lib/api.ts`
- `docker/nginx.conf`
- `docker-compose.yml`

**Validation:**
- Build: ✅
- Security: ✅ Middleware, auth, rate limiting, CORS, HttpOnly cookies

---

## 2026-07-21 — Billing and Proxy Normalization

**State:** Completed

**Changes:**
- Billing plan normalization — marketplace pro items for growth/enterprise
- Lead classification and intent enums alignment
- Backend lint cleanup
- Redis verified and documented
- nginx reverse proxy + backend trust proxy
- HOT E2E closed: exec 48 success, lead_log id=4 approved, HubSpot verified

**Validation:**
- E2E: ✅ HOT + WARM paths verified
- Lint: ✅ Backend clean

---

## 2026-07-20 — Scalability, SaaS, Observability and Testing

**State:** Completed

**Changes:**
- Multi-tenant system scalability
- SaaS improvements (billing, plans, API keys)
- Observability with Grafana + Prometheus + Loki
- Test suite: 48 backend tests
- CI/CD with GitHub Actions (lint, tests, secret scan)

**Validation:**
- Tests: ✅ 48 tests
- CI: ✅ GitHub Actions

---

## 2026-07-19 — WhatsApp, Voice AI and Marketplace

**State:** Completed

**Changes:**
- WhatsApp Business API integration (routes, controller, service)
- Voice AI Receptionist (Twilio integration)
- Automation marketplace (catalog, install)
- REST endpoints documented in Swagger

**Created files:**
- `backend/src/routes/whatsapp.routes.js`
- `backend/src/routes/voice.routes.js`
- `backend/src/routes/marketplace.routes.js`
- `backend/src/controllers/whatsapp.controller.js`
- `backend/src/controllers/voice.controller.js`
- `backend/src/controllers/marketplace.controller.js`

**Validation:**
- Build: ✅

---

## 2026-07-18 — Stripe Integration

**State:** Completed

**Changes:**
- Stripe webhook with raw body parsing
- Checkout session creation and subscription handling
- Frontend billing page with plan selection
- Middleware order fix for the webhook

**Validation:**
- Build: ✅
- Webhook: ✅ Raw body fix

---

## 2026-07-17 — Backend and Frontend

**State:** Completed

**Changes:**
- Robust Express backend: middleware, controllers, services
- Next.js frontend with App Router, Tailwind CSS, complete dashboard
- HttpOnly cookie authentication
- Leads CRUD with filters and search
- Analytics and activity panel

**Validation:**
- Build: ✅

---

## 2026-07-16 — Foundation

**State:** Completed

**Changes:**
- Core automation engine (n8n)
- PostgreSQL with multi-tenant schema
- Professional Node.js/Express backend
- Next.js web dashboard
- Multi-tenant system + RLS + API keys
- AI agents (Sales, WhatsApp, Voice)

**Architecture:**
- n8n 2.31.6 as workflow orchestrator
- PostgreSQL 15 with per-tenant RLS
- Express REST API with JWT authentication
- Next.js App Router + Tailwind CSS

**Validation:**
- Docker infrastructure: ✅

---

## 2026-07-15 — Project Start

**State:** Completed

**Changes:**
- Repository initialization
- Initial Docker Compose configuration
- Base project structure
- Initial license and security configuration
- First commit: `de0a09d portafolio base`

**Validation:**
- Repo: ✅ Initialized and configured
