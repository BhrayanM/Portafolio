# CLAUDE.md — Portafolio-Publico

Contexto permanente del proyecto. Se auto-carga en cada sesión: **no hay que repegar contexto**.

## ESTADO VERIFICADO (no lo re-audites)

- **Git**: branch `remediacion/v2`, working tree limpio. Origin público (`github.com/BhrayanM/Portafolio`).
- **n8n v2.31.6** en Docker, contenedor `portafolio-publico-n8n-1`, puerto `5678`, PostgreSQL compartido. Login REST API OK (`admin@portafolio.ai`).
- **Workflow "Lead Qualification"** (`92fIV59ijURIYfwT`, 17 nodos, 0 deshabilitados, version `883a60ad`) **activo**.
- **E2E completo verificado**: WARM (exec 46 SUCCESS), HOT con aprobacion (exec 48 SUCCESS), COLD (exec 49 SUCCESS, lead_log id=5).
- `POST /webhook/lead-qualification` responde **200** con `{"received":true}` (Fast ACK). **No romper esto.**
- **IA**: Groq (`llama-3.3-70b-versatile`) vía HTTP Request node. OpenAI sin saldo (429).
- **PostgreSQL**: **15 migraciones** de esquema (`001`–`014`, con dos ficheros `013_*`) + 2 seeds,
  tablas `lead_log` y `error_log` funcionales.
- **Backend**: `/health`, `/api/auth/login`, `/api/leads`, `/api-docs` responden 200. **98 tests** (F20).
- **Frontend**: build Next.js 14.2.35 OK. 14 rutas (dashboard, leads, analytics, activity, billing, integrations, marketplace, usage, settings, login, error, 404).
- **F20 cerrada**: imágenes Docker pineadas a patch exacto, mount SSL de nginx prod corregido
  (`/etc/nginx/ssl`), `frontend/src/lib/api.ts` reparado (no compilaba desde F19d).
  Requisitos previos de despliegue en `docs/FASE20_DESPLIEGUE.md`.
- **F21 cerrada — Release Candidate APTO CON CONDICIONES**. Auditoría integral F0→F20, 0
  bloqueantes. Informe en `docs/FASE21_AUDITORIA_FINAL.md`.
- **Cierre RC → release: 🔴 BLOQUEADO el push.** Ver `docs/RELEASE_CHECKLIST.md`. Dos passwords en
  claro entraron en 4 commits locales (`4779634`, `e0a9c99`, `cb543ee`, `6c5ab82`). **Aún no
  publicadas** (`origin/main` da 0). Redactadas en el árbol, pero el historial las conserva: hay que
  **rotar las credenciales** (recomendado) o reescribir el historial antes de subir.
- **R-05**: los contenedores en ejecución exponen n8n y postgres en `0.0.0.0`, no en `127.0.0.1`
  como declara el compose. Recrear con `docker compose up -d` (también aplica el pinning de F20).
- **R-06**: `.github/workflows/ci.yml` **nunca estuvo en git** — la regla `workflows/` del
  `.gitignore` no estaba anclada y se tragaba `.github/workflows/`. Corregida a `/n8n/workflows/`;
  los exports de n8n siguen protegidos. El CI no es que no se hubiera ejecutado: no existía.
- **Stripe**: checkout funcional con test key. Webhook raw body fix aplicado.
- **WhatsApp/Voice**: scaffolding backend listo (requiere credenciales externas).
- **Marketplace**: catálogo + instalación persistente.

### IDs del sistema (preservar, no resumir)

| Elemento | ID |
|---|---|
| Workflow Lead Qualification | `92fIV59ijURIYfwT` |
| Credencial PostgreSQL DB | `1SSa86iJODaXpkD6` |
| Credencial LLM API (Groq) | `5mpbT73GTHmK5DJ9` |
| Credencial Slack API | `aEsbKrH2FsoB9UHJ` |
| Credencial HubSpot App Token | `ABfLC3myrfeFGWOW` |
| Contacto HubSpot E2E HOT | `vid: 525347024611` |
| Portal HubSpot | `246823552` |

Estado de las credenciales: cargadas con valores reales en n8n.

## Stack

- **Backend**: Node.js + Express, PostgreSQL (`pg` pool), JWT (cookie HttpOnly). Config vía `backend/src/config/index.js`.
- **Frontend**: Next.js 14.2.35 (App Router), Tailwind CSS, TypeScript estricto, lucide-react.
- **Automatización**: n8n v2.31.6 (Docker).
- **DB**: PostgreSQL **15** (`postgres:15.18-alpine`, Docker), RLS habilitado.
- **Infra**: Docker Compose (`docker-compose.yml`, `.dev.yml`, `.prod.yml`), certs self-signed en
  `docker/ssl/` (gitignored: no vienen en un clon nuevo).
- **Externos**: Groq, HubSpot, Slack, Stripe (+ scaffolding para WhatsApp Cloud API, Twilio).

## Commits recientes (orden cronológico)

| Commit | FASE | Descripción |
|---|---|---|
| `c8e7b1d` | F7 | Backend robusto: Swagger, schemas Joi, rate-limit, POST leads, health |
| `3009132` | F8 | Frontend completo: types, 14 rutas, icons, responsive, error/404 |
| `d984e2d` | F9 | Stripe: webhook raw body fix, checkout frontend activo |
| `a23ba44` | F10-12 | WhatsApp + Voice AI + Marketplace (scaffolding + frontend) |

## Fuente de verdad

- `docs/ARQUITECTURA.md`
- `docs/LECCIONES_APRENDIDAS.md`
- `docs/CIERRE_FASE.md`
- `docs/AUDITORIA_REALIDAD.md`

## Repo PÚBLICO — qué nunca se commitea

**Nunca a git:** exports de workflows n8n (.json), grafo real / Code nodes, prompts de producción, tokens, URLs de webhook con host no local, cadenas de conexión Postgres, PII.

- `.env` en `.gitignore`.
- `.git/hooks/pre-commit` activo (barrido de secretos).
- IDs de credenciales n8n se documentan en CLAUDE.md pero se redactan en `docs/`.

---
## Segundo Cerebro - Sincronizado

- Error 401 webhook-waiting -> usar cookie de login
- Símbolos extraños ◇? (UTF-16) -> convertir a UTF-8 sin BOM
- Error token '&&' en PowerShell -> usar ; o comandos separados
- Error psql extra command-line argument WHERE ignored -> bash -c con comillas simples
- Cada nuevo error debe duplicarse en `C:\Segundo-Cerebro\09_Errores-Soluciones\`
- Leemos `C:\Segundo-Cerebro\CLAUDE.md` como contexto global

## n8n 2.x: publicar el borrador (CRÍTICO)

n8n v2.31.6 separa borrador de versión activa. Tras editar:

```bash
POST /rest/workflows/{id}/deactivate
POST /rest/workflows/{id}/activate  # body {"versionId": "<workflow_entity.versionId>"}
```

## Flujo Lead Qualification

```
Webhook → Fast ACK → Sanitize & Validate → OpenAI Score Lead → Parse AI Response → Is Hot?
   ├── true  → Human Approval (Slack) → Wait for Approval → Check Approval → Is Approved?
   │              ├── true  → Upsert HubSpot
   │              └── false → Done (Rejected)
   └── false → Upsert HubSpot
Upsert HubSpot → Log to PostgreSQL → Done
Error Trigger → Format Error → Log Global Error
```

**Ambas ramas convergen en HubSpot**: sin token de HubSpot no existe ningún camino E2E completo.

## Comandos útiles

```bash
# Estado contenedores
docker ps

# Login n8n API
curl -s -c cookie.txt -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"admin@portafolio.ai","password":"<N8N_ADMIN_PASSWORD>"}'

# Disparar webhook leads
bash scripts/test-lead-webhook.sh

# Tests backend
cd backend && npm test

# Build frontend
cd frontend && npm run build
```

## Rutas del frontend (14 total)

`/login`, `/dashboard`, `/dashboard/leads`, `/dashboard/analytics`, `/dashboard/activity`, `/dashboard/billing`, `/dashboard/integrations`, `/dashboard/marketplace`, `/dashboard/usage`, `/dashboard/settings`, `/api-docs`, error.tsx, not-found.tsx

## Backend: estructura de API

`/api/auth/*`, `/api/leads/*`, `/api/billing/*`, `/api/whatsapp/*`, `/api/voice/*`, `/api/marketplace/*`, `/api/users/*`, `/api/tenants/*`, `/api/keys/*`, `/health`

## Deuda técnica conocida

- `/leads/activity` endpoint backend no implementado
- `/usage`: **mal diagnosticado hasta F21**. `/api/tenants/usage` **sí existe**; el frontend llama a
  `/usage` y además los contratos no casan (backend `{total_leads,total_runs,total_users}` vs tipo
  `ApiUsage {total,by_endpoint,period}`). Requiere decisión de producto — ver F21 A-01
- WhatsApp/Voice requieren cuentas Meta/Twilio
- Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) vacío → **requisito previo de despliegue**, no un
  bug: el backend aborta en producción y responde 503 fuera de ella (verificado, F20-1)
- Worker RabbitMQ placeholder
- 0 tests frontend
