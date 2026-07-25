# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**F18.3 — Limpieza de lint backend completada.** `npm run lint` sale **limpio** (antes: 5 errores).

| Archivo | Qué se quitó / cambió |
|---|---|
| `backend/src/routes/billing.routes.js` | Import muerto de `handleWebhook`. **No es un bug**: la ruta `/api/billing/webhook` sí está registrada, en `app.js:33`, antes de `express.json()` porque Stripe exige body raw. El import aquí era un resto. Comentario dejado para que nadie lo "arregle" volviéndolo a añadir. |
| `backend/src/services/voice.service.js` | Import muerto `require('../config')`. El servicio lee `process.env.TWILIO_*` directo. |
| `backend/src/services/whatsapp.service.js` | Import muerto `require('../config')`. El servicio lee `process.env.WHATSAPP_*` directo. |
| `backend/eslint.config.js` | Añadidas las globales de Fetch API (`fetch`, `Response`, `Request`, `Headers`, `FormData`, `AbortController`) a `nodeGlobals`. |

**Los 2 errores `'fetch' is not defined` no eran un bug de código**: `fetch` es global nativo en
Node ≥18 (aquí corre **Node v24.18.0**, verificado con `typeof fetch === 'function'`). La lista
`nodeGlobals` de `eslint.config.js` se mantiene a mano y no lo incluía. Se arregló la config,
**no** se importó `undici` — eso habría añadido dependencia y cambiado comportamiento.

**Verificación antes de borrar los `require('../config')`** (tenían efecto secundario: `config/index.js:2`
carga `dotenv`): `app.js:6` e `index.js:5` requieren `./config` **antes** de montar rutas y servicios,
así que `process.env` ya está poblado cuando se alcanza voice/whatsapp. Borrarlos no cambia
comportamiento. Confirmado por grep, no asumido.

Ningún error de lint reveló un bug real, así que no quedó deuda nueva por este bloque.
Tests: **78/78 verdes** (no bajaron). Sin cambios de lógica de negocio.

Nota menor: el script es `eslint src/`, no cubre `tests/`. Se comprobó aparte
(`npx eslint tests/`) y también sale limpio. Ampliar el script queda fuera del alcance de F18.3.

---

**F18.2 — Alineación de enums de Lead completada.**

Canónico fijado: **`ai_category` = `HOT` | `WARM` | `COLD`** (mayúsculas, tal y como n8n escribe).
Fuente única del enum: `CATEGORIES` + `normalizeCategory()` en `backend/src/lib/lead.js`.
Las demás capas lo importan en vez de redeclararlo.

| Capa | Cambio |
|---|---|
| `backend/src/services/leads.service.js` | Filtro `category` usa `normalizeCategory` importado de `lib/lead` (borrado el capitalizador `charAt(0).toUpperCase()` que producía `Hot`). Stats query: `'Hot'/'Warm'/'Cold'` → `'HOT'/'WARM'/'COLD'`. `create()` inserta `'COLD'` y persiste `ai_business_category`. |
| `backend/src/schemas/lead.schema.js` | `category` valida con `...CATEGORIES` importado. Añadido `ai_business_category`: string libre, `max(100)`. |
| `backend/src/docs/swagger.js` | Ya estaba en mayúsculas. Añadido `ai_business_category` documentado como texto libre. |
| `frontend/src/lib/types.ts` | `type LeadCategory = 'HOT'\|'WARM'\|'COLD'`, con `LEAD_CATEGORIES` (pares value/label) y `LEAD_CATEGORY_LABEL`. Añadido campo `ai_business_category`. |
| `frontend/src/app/dashboard/leads/page.tsx` | **value ≠ display**: el `<select>` y `categoryColor` usan `HOT/WARM/COLD`; la UI muestra `Hot/Warm/Cold` vía `LEAD_CATEGORY_LABEL`. |
| `backend/tests/leads.api.test.js` | Los 2 tests C-02 esperaban `'Hot'`/`'Cold'` (comportamiento viejo); actualizados al canónico. Añadido test: `?category=Hot` → **400**. |

**Decisión sobre `'General'` — el diagnóstico de partida era incorrecto, verificado contra la DB:**
- `ai_business_category` **no tiene default de columna** (`VARCHAR(100)`, nullable, sin `DEFAULT`).
  `'General'` es el *fallback* de `parseAiResponse()` en `backend/src/lib/lead.js:99,109`.
- **No es un enum de intención.** Es el **sector de negocio** que emite el LLM en texto libre.
  Valores reales en `lead_log`: `QA`, `Sin especificar`, `Software y Tecnologia`, `Automatización`.
- Por tanto **no se cerró a `Ventas/Soporte/Informacion/Otro`**: hacerlo habría rechazado todo lo
  que n8n ya escribe, violando la regla "el backend acepta lo que n8n escribe; n8n intocable".
  Se valida solo el ancho real de la columna (`max 100`). `'General'` se mantiene como fallback.
- Si en el futuro se quiere una **intención** de verdad (`Ventas/Soporte/Informacion/Otro`), es una
  **columna nueva**, no reutilizar ésta.

Tests: **78/78 verdes**. Build frontend OK (14 rutas). `leads` sigue con 0 filas: nada que migrar.

---

**F18.1 — Normalización Billing Plans completada.**
- `backend/src/services/marketplace.service.js`: fix lógica de planes — `price: 'pro'` ahora permitido para planes `growth` y `enterprise` (antes solo bloqueaba `starter` y mensaje decía "Actualiza a Pro" que no existe). Mensaje corregido a "Actualiza a Growth o Enterprise".
- Verificado: Joi schema (`starter|growth|enterprise`), billing service PLANS, DB tenant plan `enterprise` consistentes.
- Tests: 77/77 verdes.

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
| F18.1 — Normalización Billing Plans | ✅ Cerrado |
| F18.2 — Alineación enums de Lead | ✅ Cerrado |
| F18.3 — Limpieza lint backend | ✅ Cerrado |

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
- `npm test` en `backend/` → **78 verdes**.
- **El LLM del workflow es Groq** (`llama-3.3-70b-versatile`), no OpenAI: esa cuenta sigue sin
  saldo (429). El nodo lleva `User-Agent: curl/8.0.0` porque Cloudflare bloquea el de n8n/urllib.
- Canal de Slack: `C0BJYN0QKPT` (`#nuevo-canal`), fijado literal en el nodo porque `$env` está
  vacío dentro del contenedor.
- Credencial HubSpot nueva de tipo `hubspotAppToken` (la legacy `hubspotApi` no sirve para `pat-`).
- `npm run lint` **limpio** desde F18.3 (los 5 errores que arrastraba quedaron resueltos ahí).
  Config: `backend/eslint.config.js` (ESLint 9 flat). Si añades código que use APIs web nuevas,
  recuerda que `nodeGlobals` es una lista **manual**: puede que haya que declarar la global.
- CI en `.github/workflows/ci.yml`: 3 jobs (backend, frontend, secrets). **Nunca ha corrido
  en GitHub**: no se ha hecho push. `origin/main` sigue en `e2cadc3`.

## Deuda futura registrada en F18.2

- **Renombrar `ai_category` → `classification`**: el nombre no dice que es la clasificación
  HOT/WARM/COLD y se confunde con `ai_business_category`. Requiere migración + tocar los Code
  nodes de n8n y republicar el workflow. **No se hizo en F18.2** (alcance: solo alinear valores,
  no renombrar columnas).
- **`ai_business_category` es sector, no intención.** Si se necesita intención
  (`Ventas/Soporte/Informacion/Otro`), crear columna nueva. Ver decisión en el bloque F18.2.
- El fallback `'General'` vive duplicado en `lib/lead.js` (dos ramas de `parseAiResponse`) y en
  `leads.service.create()`. Si cambia, cambiarlo en los tres sitios.

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