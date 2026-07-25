# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**BLOQUE B — Auth HttpOnly.** Commit: ver `git log --oneline`.

## Bloque en curso

**BLOQUE C — Tests.** No empezado todavía.

## Siguiente paso exacto

Escribir tests de lo que NO llama a APIs externas. Ya existe `backend/tests/auth.cookie.test.js`
(11 verdes) y `backend/jest.config.js`. Falta cubrir:

1. **Sanitización y validación** del lead — la lógica vive en el Code node `Sanitize & Validate`
   del workflow n8n, no en el repo. Hay que extraerla a un módulo testeable en
   `backend/src/` (p. ej. `utils/leadSanitizer.js`) y que el nodo quede como copia, o
   testear una reimplementación fiel. **Decidir esto primero.**
2. **Parseo del score de IA** — misma situación (`Parse AI Response`).
3. **Lógica `Is Hot?`** — umbral HOT/WARM/COLD.
4. **Auth** — ya cubierta.

Ejecutar con: `cd backend && npm test`

## Bloques pendientes

| Bloque | Estado |
|---|---|
| A — Fixes checklist producción | ✅ Cerrado |
| B — Auth HttpOnly | ✅ Cerrado |
| C — Tests (sin APIs externas) | ⬜ Siguiente |
| D — CI/CD (.github/workflows) | ⬜ |
| Entregable `docs/SPRINT_CORE_COMPLETO.md` | ⬜ Al cerrar D |

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
