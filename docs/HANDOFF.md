# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**E2E rama HOT completado.** Execution 48 SUCCESS — lead HOT aprobado y sincronizado end-to-end:
- `lead_log` id=4: `e2e.hot2@example.com` · score 98 · HOT · `status=approved` · HubSpot vid `525347024611`
- Slack: mensaje enviado a canal `C0BJYN0QKPT` (timestamp `1785004393.447999`)
- PostgreSQL: fila insertada en `lead_log` con `ai_category=HOT`, `status=approved`
- HubSpot: contacto creado/actualizado (vid `525347024611`, portal `246823552`)
- n8n execution 48: `success` (2026-07-25 18:33:12 → 18:33:43)

> **Nota:** HANDOFF anterior citaba execution 47 en waiting; execution 47 completó a las 18:29 (23 min wait). El lead HOT se resolvió en execution 48 (nuevo webhook tras aprobación).

## Bloque en curso

*Sin bloque activo — rama HOT cerrada.*

## Bloques pendientes

| Bloque | Estado |
|---|---|
| A — Fixes checklist producción | ✅ Cerrado |
| B — Auth HttpOnly | ✅ Cerrado |
| C — Tests (sin APIs externas) | ✅ Cerrado |
| D — CI/CD (.github/workflows) | ✅ Cerrado |
| E2E rama WARM | ✅ exec 46, lead_log id 3, HubSpot 525380986565 |
| E2E rama HOT | ✅ exec 48, lead_log id 4, HubSpot 525347024611 |
| Entregable `docs/SPRINT_CORE_COMPLETO.md` | ✅ Creado |
| Backup script + doc fix | ✅ Cerrado |

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
- **El LLM del workflow es Groq** (`llama-3.3-70b-versatile`), no OpenAI: esa cuenta sigue sin
  saldo (429). El nodo lleva `User-Agent: curl/8.0.0` porque Cloudflare bloquea el de n8n/urllib.
- Canal de Slack: `C0BJYN0QKPT` (`#nuevo-canal`), fijado literal en el nodo porque `$env` está
  vacío dentro del contenedor.
- Credencial HubSpot nueva de tipo `hubspotAppToken` (la legacy `hubspotApi` no sirve para `pat-`).
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