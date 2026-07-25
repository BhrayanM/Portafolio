# AGENTS.md — Memoria Persistente del Sistema

> Este archivo contiene los IDs críticos del sistema, credenciales y estado verificado.
> NO resumir, NO compactar, NO eliminar entradas.
> Conservar permanentemente entre sesiones.

---

## IDs del Sistema (NO MODIFICAR)

| Elemento | ID |
|---|---|
| Workflow Lead Qualification | `92fIV59ijURIYfwT` |
| Credencial PostgreSQL DB | `1SSa86iJODaXpkD6` |
| Credencial LLM API (Groq) | `5mpbT73GTHmK5DJ9` |
| Credencial Slack API | `aEsbKrH2FsoB9UHJ` |
| Credencial HubSpot App Token | `ABfLC3myrfeFGWOW` |
| Contacto HubSpot E2E HOT | `vid: 525347024611` |
| Portal HubSpot | `246823552` |

---

## Estado Verificado

- **E2E HOT verificado**: Execution 48 SUCCESS, lead_log id=4 status=approved
- **COLD → OPEN**: leadStatus mapeado a OPEN (no UNQUALIFIED) — lead_log id=5 verificado
- **WARM**: Execution 46 SUCCESS verificado
- **.env en .gitignore**: Confirmado
- **Pre-commit hook activo**: Barrido de secretos en cada commit

---

## Stack

- **Backend**: Node.js + Express + PostgreSQL (pg pool)
- **Frontend**: Next.js 14.2.35 (App Router) + Tailwind CSS + TypeScript estricto
- **Automatización**: n8n v2.31.6 (Docker), workflow Lead Qualification activo
- **DB**: PostgreSQL 16 (Docker), RLS habilitado, 10 migraciones
- **IA**: Groq (`llama-3.3-70b-versatile`) vía HTTP Request — activo
- **OpenAI**: Sin saldo (429) — no usado
- **CRM**: HubSpot (upsert contactos por email)
- **Pagos**: Stripe (test keys, webhook sin secret)
- **Infra**: Docker Compose (postgres, n8n, redis, rabbitmq, nginx)

---

## Ramas y Commits

- **Branch**: `remediacion/v2`
- **Origin**: `github.com/BhrayanM/Portafolio` (público, NO subir secretos)
- **Commits clave**: `c8e7b1d` (F7), `3009132` (F8), `d984e2d` (F9), `a23ba44` (F10-12), `861ba2e` (F13-16), `b4763d6` (auditoría final)

---

## Reglas de Seguridad

- **Nunca a git**: exports n8n (.json), grafo real / Code nodes, prompts producción, tokens, URLs webhook con host no local, cadenas conexión Postgres, PII
- **Secretos**: Solo en `.env`, que está en `.gitignore`
- **Pre-commit**: Activo con barrido de secretos

---

## Notas Arquitectónicas

- Lead Qualification: Webhook → Fast ACK → Sanitize → Groq Score → HOT/WARM/COLD → HubSpot → PostgreSQL
- HOT pasa por Slack Approval antes de HubSpot
- Ambas ramas (HOT aprobado + WARM/COLD) convergen en Upsert HubSpot
- Sin token HubSpot no existe camino E2E completo
