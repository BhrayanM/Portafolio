# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**E2E con credenciales reales.** LLM (Groq), Slack, HubSpot y Stripe verificados; rama WARM completa.

## Bloque en curso

**Rama HOT**: execution 47 en `waiting`, pendiente de aprobación manual.

## Siguiente paso exacto

La ejecución **47** está esperando aprobación. Para cerrar la rama HOT:

```bash
curl -X POST http://localhost:5678/webhook-waiting/47/direct   -H "Content-Type: application/json" -d '{"approved": true}'
```

Después: confirmar contacto en HubSpot y fila `approved` en `lead_log`.

**No se puede aprobar desde Slack**: el mensaje es texto plano sin botones, y la interactividad
de Slack exige una Request URL pública (n8n está en localhost).

**Pendiente de seguridad:** rotar las 5 claves (OpenAI, Groq, Slack, HubSpot, Stripe) — se
imprimieron por consola durante esta sesión.

## Bloques pendientes

| Bloque | Estado |
|---|---|
| A — Fixes checklist producción | ✅ Cerrado |
| B — Auth HttpOnly | ✅ Cerrado |
| C — Tests (sin APIs externas) | ✅ Cerrado |
| D — CI/CD (.github/workflows) | ✅ Cerrado |
| E2E rama WARM | ✅ exec 46, lead_log id 3, HubSpot 525380986565 |
| E2E rama HOT | ⏸ exec 47 en espera |
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
