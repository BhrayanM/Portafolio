# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**BLOQUE D — CI/CD.** Commit: ver `git log --oneline`.

## Bloque en curso

Ninguno. Los 4 bloques (A-D) están cerrados.

## Siguiente paso exacto

Nada pendiente de los bloques A-D. Lo que queda depende de credenciales del usuario:
ver `docs/SPRINT_CORE_COMPLETO.md`, sección **PENDIENTE - REQUIERE MIS KEYS**.

Comprobación rápida al retomar:

```bash
cd backend && npm run lint && npm test    # 59 verdes, lint limpio
bash "$(git rev-parse --show-toplevel)/scripts/backup.sh"
```

## Bloques pendientes

| Bloque | Estado |
|---|---|
| A — Fixes checklist producción | ✅ Cerrado |
| B — Auth HttpOnly | ✅ Cerrado |
| C — Tests (sin APIs externas) | ✅ Cerrado |
| D — CI/CD (.github/workflows) | ✅ Cerrado |
| Entregable `docs/SPRINT_CORE_COMPLETO.md` | ✅ Creado |

## Estado que se pierde al cortar

- **n8n**: workflow activo `<workflow-id>`, 17 nodos. Tras cualquier edición hay que publicar
  (`POST /deactivate` + `POST /activate {"versionId"}`) o el cambio no corre. Ver `CLAUDE.md`.
- **Contenedores**: `portafolio-publico-n8n-1` y `portafolio-publico-postgres-1` deben estar `Up`.
  Si no: `docker compose up -d`.
- **`lead_log` fila 1** y **`error_log` filas 1-10** son datos de QA de sprints anteriores.
- **`.git/hooks/pre-commit`** no se versiona: si se clona el repo de nuevo, hay que reinstalarlo.
- `backups/` está gitignored; los dumps generados no se commitean.
- **Auth ya es por cookie HttpOnly** (`access_token`). El backend acepta también
  `Authorization: Bearer` para clientes no-navegador. `npm test` en `backend/` → 11 verdes.
- El rate limiter de login se desactiva con `NODE_ENV=test` (jest lo pone solo).
- **`backend/src/lib/lead.js` es la implementación de referencia** de los Code nodes
  `Sanitize & Validate` / `Parse AI Response` / `Is Hot?`. Si cambias uno, sincroniza el otro
  y **publica** el workflow. Ahora mismo están sincronizados.
- `npm test` en `backend/` → **59 verdes** (11 auth + 48 lógica de leads).
- `npm run lint` limpio. Config: `backend/eslint.config.js` (ESLint 9 flat).
- CI en `.github/workflows/ci.yml`: 3 jobs (backend, frontend, secrets). **Nunca ha corrido
  en GitHub**: no se ha hecho push. `origin/main` sigue en `e2cadc3`.

## Reglas vigentes

- Prohibido mocks/stubs de OpenAI, Slack, HubSpot y Stripe. Lo que necesite key →
  `PENDIENTE - REQUIERE CREDENCIAL REAL`.
- Nada marcado hecho sin evidencia (SELECT real, execution ID, test verde o archivo commiteado).
- Commit tras cada bloque, no al final. Actualizar este archivo al cerrar cada bloque.
- Fuera de alcance: Analytics, Billing UI, Invoices, Usage, Activity.

## Bloqueado por credenciales (lo hace el usuario al final)

OpenAI (saldo) · Slack (`xoxb-` + channel ID) · HubSpot (`pat-`) · Stripe.
Además: sin dominio público, `Wait for Approval` es inalcanzable desde Slack → la rama HOT
no se puede completar aunque se cargue el token.
