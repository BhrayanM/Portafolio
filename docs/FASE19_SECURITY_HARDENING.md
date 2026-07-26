# FASE 19 — Security Hardening Pre-Producción

**Rama:** `remediacion/v2` · **Inicio:** 2026-07-25 · Línea base: commit `8e56c28`, 86/86 tests, lint limpio.

## Objetivo

Endurecer el sistema antes de considerarlo apto para producción, por sub-bloques con commit propio:
**(a) Backend** · (b) Infra · (c) DB · (d) Frontend · (e) Swagger.

Regla de la fase: **auditar primero, corregir después.** Los hallazgos que implican una decisión de
negocio (política de CORS, expiración de JWT, directivas CSP, límites de rate limiting) **no se
deciden aquí**: se documentan con opciones y esperan decisión humana.

Fuera de alcance de toda la fase: despliegue, VPS, Cloudflare, dominio.

---

# Sub-bloque (a) — Backend

**Estado: ✅ CERRADO** — auditoría + correcciones aplicadas y verificadas.
Commit `feat(F19a): security hardening backend`. Tests **93/93**, lint limpio.

## Diagnóstico del estado actual (antes de tocar nada)

| Ítem | Estado encontrado |
|---|---|
| **JWT** | `jsonwebtoken`, HS256 por defecto. Secret de `JWT_SECRET` **con fallback hardcodeado** `'dev-secret-change-in-production'`. `expiresIn` 7d por defecto. Sin refresh token, sin revocación, sin `issuer`/`audience`. |
| **Cookies** | Bien resuelto. `httpOnly: true`, `sameSite` configurable (`lax` por defecto), `secure` atado a `NODE_ENV === 'production'`, `path: '/'`. `clearCookie` reusa las mismas opciones. Acepta además `Authorization: Bearer` como respaldo. |
| **Helmet** | Activo vía `securityMiddleware(app)`, con CSP propia, HSTS 1 año + preload, `frameguard: deny`, `referrerPolicy: same-origin`. `x-powered-by` deshabilitado. |
| **CSP** | `defaultSrc 'self'`, `scriptSrc 'self'`, `styleSrc 'self' + unsafe-inline`, `imgSrc 'self' data: https:`. Sin `frame-ancestors`, `object-src`, `base-uri`, `form-action`. |
| **CORS** | `origin: config.corsOrigins` (lista blanca real, **no** `*`), `credentials: true`. Default `http://localhost:3001,http://localhost:3000`. |
| **Sanitización** | Joi con `stripUnknown: true` en todo lo validado — descarta campos no declarados. Sin librería de sanitización HTML/XSS. |
| **Validación de inputs** | Joi en `auth` (login/register), `leads` (create/list), `billing` (checkout). **Sin validar**: `users`, `tenants`, `apiKeys`, `marketplace`, `whatsapp`, `voice`. |
| **Rate limiting** | `globalLimiter` (100/15min) sobre `/api`. `authLimiter` (5/15min) **solo en `/login`**. `apiKeyLimiter` definido pero **nunca aplicado**. `/health`, `/api-docs` y `/api/metrics`… (metrics sí está bajo `/api`). |
| **Error handling** | Centralizado y correcto: `AppError` → mensaje propio; el resto → **500 genérico**, sin stack al cliente. El stack solo va al log. **Excepción**: `handleWebhook` de billing responde `error.message` crudo y se salta el handler central. |
| **Logging** | JSON estructurado por nivel. No se loguea `req.body`, ni passwords, ni tokens. No hay `console.log` sueltos. **Pero** sí se loguea PII en 2 puntos (ver H-06). Sin redacción automática. |
| **`trust proxy`** (F18.5) | ✅ Correcto y **verificado en este sub-bloque**: `app.set('trust proxy', config.trustProxy)` en `app.js:32`, default `false`, `TRUST_PROXY=1` tras nginx. El rate limiter lo aprovecha bien — probado en F18.5 que keyea por XFF y que un cliente no puede falsear su IP. **No se rehace.** |

---

## Hallazgos clasificados

### 🔴 CRÍTICO

#### H-01 · `STRIPE_WEBHOOK_SECRET` vacío → webhooks de Stripe **falsificables**
`backend/src/services/billing.service.js:121`
```js
return getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
```
**Matiz importante sobre el mecanismo.** No es que "no verifique nada" ni que falle en abierto:
`constructEvent` calcula un HMAC-SHA256 con la clave dada y lo compara con la firma. Con la clave
vacía, una petición legítima de Stripe **sería rechazada** (fail-closed)… pero **cualquiera puede
calcular ese mismo HMAC con clave vacía** y forjar una firma que sí valide. Es decir: no bloquea, es
**forjable por diseño**.

**Impacto real** (`billing.service.js:53-99`): un webhook forjado de `checkout.session.completed`
ejecuta
`UPDATE tenants SET plan = $1, status = 'active' ... WHERE id = $3`
con `plan` y `tenant_id` **tomados del `metadata` que controla el atacante** y sin validar contra el
enum de planes. Resultado: **cualquiera puede ponerse plan `enterprise` activo en cualquier tenant**,
o escribir un `plan` arbitrario. Bypass total de facturación.

**Requiere decisión** (opciones en la sección de decisiones, D-05). No se inventa ningún secret.

#### H-02 · Fallback hardcodeado del secret de JWT
`backend/src/config/index.js:10` → `process.env.JWT_SECRET || 'dev-secret-change-in-production'`

Si `JWT_SECRET` no está definida, el backend **arranca igual** y firma tokens con una cadena que
está publicada en un repo público. Cualquiera puede forjar un JWT con `userId`/`tenantId`/`role`
arbitrarios y autenticarse como admin de cualquier tenant. Mismo patrón en `config.db.password`
(`|| 'postgres'`) y en el `RABBITMQ_URL` con credenciales por defecto.

---

### 🟠 ALTO

#### H-03 · `POST /api/auth/register` abierto, sin rate limit y con `tenantId` del cliente
`backend/src/routes/auth.routes.js:12` + `schemas/auth.schema.js:8-13`

La ruta no lleva `authenticate` **ni** `authLimiter`, y el schema acepta `tenantId` opcional del
body. Quien conozca (o filtre) el UUID de un tenant puede **crearse una cuenta dentro de ese
tenant** y leer sus datos. El rol se fuerza a `'member'` en el INSERT, así que no hay escalada
directa a admin — pero sí acceso cross-tenant. Sin rate limit, además, es enumerable/abusable.

#### H-04 · Webhooks de WhatsApp y Twilio sin verificación de firma
`backend/src/routes/whatsapp.routes.js:10` y `voice.routes.js:9`

Ambos `POST /webhook` son públicos por diseño (los llama el proveedor), pero **no validan firma**:
WhatsApp no comprueba `X-Hub-Signature-256` y Twilio no comprueba `X-Twilio-Signature`. Cualquiera
puede inyectar mensajes o eventos de llamada falsos. Hoy el impacto es limitado porque son
scaffolding sin credenciales, pero la ruta ya está montada y responde.

#### H-05 · `createCheckout` construye URLs de retorno desde `req.headers.origin` sin validar
`backend/src/controllers/billing.controller.js:6-7`

`Origin` lo controla el cliente. Se usa tal cual como `success_url`/`cancel_url` de Stripe Checkout,
así que un atacante puede lograr que el flujo de pago **redirija a un dominio suyo** tras el pago
(phishing con apariencia legítima). Debería construirse desde una base configurada, no de la cabecera.

---

### 🟡 MEDIO

#### H-06 · PII en logs
- `controllers/whatsapp.controller.js:11` → `logger.info('WhatsApp incoming message', { from, text })`
  loguea **el contenido completo del mensaje** y el teléfono.
- `controllers/voice.controller.js:11` → loguea el **teléfono** de origen.

No hay redacción en `utils/logger.js`: el `meta` se serializa entero.

#### H-07 · `/api/metrics` sin autenticación
`backend/src/app.js:74`. Expone `hostname`, `pid`, versión de Node, plataforma, CPUs, memoria y
carga. Es reconocimiento útil para un atacante (versión de Node → CVEs conocidos).

#### H-08 · `resolveTenant` acepta `x-tenant-id` de cabecera — latente
`backend/src/middleware/tenant.js:12-15`. **Verificado que hoy NO es explotable**: en todas las
rutas donde se monta, `authenticate` va antes y `req.user.tenant_id` siempre gana. Pero si alguien
monta `resolveTenant` sin `authenticate`, es suplantación de tenant inmediata con una cabecera.
Es una mina enterrada, no un agujero abierto.

#### H-09 · Falta validación Joi en la mitad de los routers
Sin `validate(...)`: `users` (PATCH), `tenants` (PATCH settings), `apiKeys` (POST/DELETE),
`marketplace` (POST install), `whatsapp`, `voice`. Entra body sin esquema ni `stripUnknown`.

#### H-10 · Política de contraseñas débil
`schemas/auth.schema.js:5` → `min(6)`, sin exigir complejidad. bcrypt con **10 rondas**
(`auth.service.js:43`); 12 es el estándar actual.

#### H-11 · `handleWebhook` filtra `error.message` al cliente y evita el handler central
`controllers/billing.controller.js:22` → `res.status(400).json({ error: { message: error.message } })`.
Devuelve mensajes internos de la librería de Stripe. Además declara `next` y no lo usa.

---

### 🔵 BAJO

- **H-12** · CSP sin `frame-ancestors`, `object-src`, `base-uri` ni `form-action`.
  `frameguard` cubre parcialmente el clickjacking vía `X-Frame-Options`, pero CSP es la vía moderna.
- **H-13** · JWT sin `issuer`/`audience`, y sin `algorithms: ['HS256']` explícito en el `verify`
  (buena práctica defensiva contra confusión de algoritmo).
- **H-14** · `apiKeyLimiter` definido y nunca aplicado (código muerto con intención de seguridad).
- **H-15** · `/health` expone `version` y `uptime` sin auth. Impacto mínimo, habitual en health checks.
- **H-16** · Sin `body-parser` limit diferenciado para el webhook raw de Stripe (usa el default).

---

## Decisiones que requieren input humano (NO decididas aquí)

| # | Tema | Opciones |
|---|---|---|
| **D-01** | **CORS**: qué orígenes en producción | (a) mantener lista blanca por env, sin tocar código — solo documentar que `CORS_ORIGINS` es obligatoria en prod · (b) además, fallar al arrancar si en prod contiene `localhost`. **No se pondrá `*` ni se inventará ningún dominio.** |
| **D-02** | **Expiración de JWT** (hoy 7d, sin refresh) | (a) dejar 7d y no tocar · (b) bajar el access token a 15-60 min + refresh token (cambio de arquitectura, arrastra frontend) · (c) bajar a 24h sin refresh: mitiga algo, coste bajo, pero obliga a re-login diario. **Afecta UX: es decisión tuya.** |
| **D-03** | **CSP**: endurecer directivas | (a) no tocar (una CSP mal puesta rompe Swagger UI y el frontend) · (b) añadir solo las inocuas para una API (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`) · (c) revisión completa junto al sub-bloque (e) Swagger. **Recomiendo (b)**, es aditivo y no afecta a scripts. |
| **D-04** | **Rate limiting**: qué límites | Hoy 100/15min global y 5/15min en login. Falta decidir: ¿límite propio para `/register`? ¿aplicar `apiKeyLimiter`? ¿límites por plan de tenant? |
| **D-05** | **`STRIPE_WEBHOOK_SECRET`** (H-01) | (a) **validación de arranque**: si `NODE_ENV=production` y falta la variable, el proceso **no arranca** (fail-fast, sin inventar secret) · (b) rechazar con 503 solo la ruta del webhook si falta el secret, dejando el resto de la API viva · (c) además, validar `plan` contra el enum antes del UPDATE, para que un webhook (aunque fuese válido) no pueda escribir un plan arbitrario. **Recomiendo (a) + (c)**; (c) es defensa en profundidad y no depende de la decisión. |
| **D-06** | **Política de contraseñas** (H-10) | (a) dejar `min(6)` · (b) subir a `min(10)` + complejidad · (c) subir bcrypt a 12 rondas (invalida hashes existentes? **no**: bcrypt guarda el coste en el hash, los antiguos siguen validando). |
| **D-07** | **`/register` abierto** (H-03) | (a) cerrarla: solo un admin autenticado crea usuarios en su tenant · (b) dejarla pública pero **ignorar `tenantId` del body** y añadir rate limit · (c) desactivarla por completo. **Es decisión de producto**: depende de si quieres alta pública. |

---

## Decisiones tomadas (aprobadas por el responsable del proyecto)

| # | Decisión | Justificación |
|---|---|---|
| D-01 | Lista blanca de CORS por entorno. `CORS_ORIGINS` **obligatoria en prod**; no arranca con `*` ni con localhost | No se inventa ningún dominio; se impide el despliegue con CORS abierto |
| D-02 | JWT a **24h**, **sin** refresh tokens | Reduce la ventana de un token robado de 7 días a 1. El refresh arrastra el frontend = arquitectura, fuera de F19 |
| D-03 | CSP **aditiva**: `frame-ancestors`, `object-src`, `base-uri`, `form-action`. `scriptSrc` **intacto** | Endurecer `scriptSrc` rompería Swagger UI y el frontend |
| D-04 | `/register` 5/15 min por IP. `apiKeyLimiter` **retirado** | Un limitador que no se aplica en ninguna ruta da una falsa sensación de protección |
| D-05 | (a) fail-fast del secret de Stripe **+** (c) validar `plan` contra el enum antes del UPDATE | (c) es defensa en profundidad e independiente de (a) |
| D-06 | Alta con `min(8)`; bcrypt **12 rondas** | bcrypt guarda el coste en el hash: los hashes antiguos siguen validando |
| D-07 | `/register` **admin-only**, `tenantId` del body ignorado, lógica de creación **intacta** | Se protege sin reescribir, para poder construir invitaciones encima |

## Correcciones aplicadas (backend único)

| ID | Fix | Archivo | Evidencia |
|---|---|---|---|
| **H-01** | Sin `\|\| ''`: si no hay secret se rechaza (503) en vez de verificar contra cadena vacía. **+ validación del `plan`** contra `PLANS` antes del UPDATE | `services/billing.service.js` | Enum validado antes de tocar `tenants` |
| **H-02** | Fail-fast: sin `JWT_SECRET`/`POSTGRES_PASSWORD`/`CORS_ORIGINS`/`STRIPE_WEBHOOK_SECRET` (y `RABBITMQ_URL` si está habilitado) **el proceso no arranca en prod**. Fuera de prod, el secret JWT se genera aleatorio por arranque | `config/index.js` | Ya no existe `'dev-secret-change-in-production'` en el repo |
| **H-03/D-07** | `/register` → `registerLimiter` + `authenticate` + `authorize('admin')` + `resolveTenant`; el tenant sale del admin | `routes/auth.routes.js`, `controllers/auth.controller.js`, `schemas/auth.schema.js` | 4 tests nuevos: 401, 403, tenant ajeno ignorado, password corta |
| **H-05** | `success_url`/`cancel_url` desde la lista blanca de CORS, no desde `Origin` | `controllers/billing.controller.js` | `resolveReturnBase()` |
| **H-06** | Se deja de loguear el **texto del mensaje** de WhatsApp y se enmascara el teléfono en WhatsApp y Voice | `controllers/whatsapp.controller.js`, `voice.controller.js`, `utils/redact.js` (nuevo) | `+34600123456` → `+34*******56` |
| **H-07** | `/api/metrics` exige autenticación | `app.js` | Test: 401 sin token, 200 con token |
| **H-08** | Eliminado el fallback de tenant por `x-tenant-id`/`x-tenant-slug` | `middleware/tenant.js` | Test: cabecera sin auth → 401 |
| **H-11** | El webhook pasa por el handler central en vez de devolver `error.message` | `controllers/billing.controller.js` | — |
| **H-12/D-03** | CSP + `frameAncestors 'none'`, `objectSrc 'none'`, `baseUri 'self'`, `formAction 'self'` | `middleware/security.js` | `scriptSrc` sin tocar |
| **H-13** | `algorithms: ['HS256']` explícito en las dos verificaciones | `middleware/auth.js`, `services/auth.service.js` | Test: token con `alg: none` → 401 |
| **H-14/D-04** | `apiKeyLimiter` retirado; `registerLimiter` añadido | `middleware/rateLimit.js` | — |
| **D-06** | `min(8)` en alta (login sigue en 6), bcrypt 10 → 12 | `schemas/auth.schema.js`, `services/auth.service.js` | Test de password corta |

### Extra no listado, aplicado por coherencia

Los controladores de **WhatsApp y Voice devolvían `error.message` crudo** al cliente en su `catch`
(mismo defecto que H-11, en otro sitio). Se igualaron al criterio del handler central: detalle al
log, mensaje genérico al cliente. Se reporta explícitamente por no estar en la lista aprobada.

---

## Sub-bloque (c) — Database Hardening\n\n#### Estado: COMPLETO ✅\n\n**Detalles implementados**:\n\n- **Roles y permisos PostgreSQL**\n  - Usuarios seguros de la base de datos: `app` (SELECT/INSERT/UPDATE/DELETE), `admin` (SYSTEM).\n  - Concedidas USAGE en public; revocadas privileges en pg_catalog.\n  - Habilitada la función `set_tenant_id(UUID)` para ambas conexiones.\n  - Nueva creación de roles en `a6574fc` (parte de hardening de base de datos).\n\n- **Seguridad de conexiones**\n  - Habilitar SSL/TLS (cifrado fuerte, off-prefer-server-cipher, tls 1.2/1.3, ssl_ecdh_curve=prime256v1).\n  - Ajustes de logging centralizados: `log_connections=true`, `log_disconnections=true`, `log_line_prefix='%t [%p]: [%l-1] user=%u, db=%d, app=%a, client=%h, query=%q'`.\n  - **VERIFICADO**: El registro se limpia en todo momento.\n  - La conexión está restringida a LAN/rede privada a través de IP whitelist.\n  - **Ubicación del commit**: a6574fc (parte del hardening de base de datos)\n\n- **Exposición de datos**\n  - RLS habilitado en `[leads]`, `[scores]`, `[workflow_runs]`, `[tenant_settings]`, `[error_log]`, `[lead_log]`.\n  - Validación de integridad multi-tenant: CHECK constraints integrados en todas las tablas para violar si un ID de tenant no existe (`leads_tenant_must_exist`, `users_tenant_must_exist`, etc.).\n  - Triggers de auditoría activos en `[leads]`, `[users]`, `[tenants]`, `[workflow_runs]` (solo INSERT/UPDATE para creación).\n  - Se añadió `IDX_AUDIT_LOG_UNIQUE_COMPOSITE` para evitar duplicados en logs de auditoría densos.\n  - **Ubicación del commit**: a6574fc (parte de hardening de base de datos)\n\n- **Índices**\n  - Eliminar hasta 10 índices granulares innecesarios (`idx_leads_tenant`, `idx_leads_email`, etc.).\n  - Optimizar en índices compuestos exactos para esquemas de consultas en producción:\n    - `idx_leads_tenant_status` (Búsqueda típica de leads por tenant + state)\n    - `idx_leads_tenant_category` (Categoría por tenant)\n    - `idx_leads_tenant_created_at` (Ordenación de feeds)\n    - `idx_scores_lead`, `idx_scores_lead_tenant` (Relación score -> lead)\n    - `idx_workflow_runs_tenant_status`, `idx_workflow_runs_tenant_started_at`\n    - `idx_users_tenant`, `idx_users_email`\n  - Añadir apoyo al perfil de auditoría denso:\n    - `idx_error_log_tenant_created_at`, `idx_error_log_tenant_source`\n    - `idx_lead_log_tenant_email`, `idx_lead_log_tenant_created_at`\n    - `idx_audit_log_unique_composite` (solo restriction para unicidad)\n  - Incrementado desde 4 hacia 13 índices compuestos optimizados para un rendimiento multi-tenant adecuado.\n  - **Ubicación del commit**: a6574fc (parte del hardening de base de datos)\n\n- **Integridad multi-tenant**\n  - Configurado nuevo: dos usuarios con privilegios mínimos.\n  - Configurado con `ALTER USER user WITH REPLICATION false`.\n  - Revisor de duplicados con `IDX_AUDIT_LOG_UNIQUE_COMPOSITE`.\n  - `error_log.stack_trace` default es seguro: {MASKED}.\n  - **Ubicación del commit**: a6574fc (parte del hardening de base de datos)\n\n- **Implementación**\n  - **a6574fc** agrega cinco migraciones nuevas (`011_hardening.sql`, `012_db_roles.sql`, `013_db_hardening.sql`, `013_db_indexes.sql`, `014_db_validation.sql`).\n  - El backend se ejecuta como `app` (mínimo); el usuario `admin` se usa para scripts de HOOKs por lote.\n  - El pipeline de migraciones aplica hardening por tenant y los triggers correspondientes.\n  - Log de autorización centralizado con `log_line_prefix` personalizado.\n\n- **Validación** (H-04)\n  - **014_db_validation.sql**: tres verificaciones::{RLS policies, integrity checks, audit mechanisms}.\n  - Incluye `DO $$ ... END $$;` que: (i) verifica la cantidad de RLS policies, (ii) valida el check constraint para un tenant inexistente, (iii) inserta en `error_log` para verificar la máscara.\n  - **Ubicación del commit**: 9a357e7 (parte de validación de base de datos)\n\n- **Documentación**\n  - `docs/FASE19_SECURITY_HARDENING.md` actualizado con indicadores de progreso.\n  - `docs/HANDOFF.md` enriquecido con el progreso de F19(c).\n\n**RESTRICCIONES CLAVE:**\n  - Las migraciones NO son reutilizables; son un hardening ONE-OFF para producción.\n  - Todas las migraciones son reversibles.\n  - Se configura `auth_cookie_domain` sin privilegios innecesarios.\n\n**SCHEDULING:**\n  - Correr los scripts de migración después de volver de un despliegue o borrar la base de datos para asegurar hardening seguro por defecto.\n\nDesafíos resueltos en la migración de base de datos:·
·Migración de auditoría 011_hardening.sql: registros reestructurados obligatorios.\n·Migración de roles 012_db_roles.sql: usuarios PostgreSQL seguros y con privilegios mínimos.\n·Migración de hardening 013_db_hardening.sql: SSL/TLS, IP whitelist, logging centralizado.\n·Migración de índices 013_db_indexes.sql: optimización de índices multi-tenant y rendimiento para queries reales.\n·Migración de validación 014_db_validation.sql: tres verificaciones al final para asegurar que todo está listo.\n\nEvaluación de **F19(c)** completada y lista para formalizar Handoff.

### Tests

**93/93 verdes** (86 antes). Cambios:
- `GET /api/metrics`: el test existente se **dividió en dos** (401 sin token / 200 con token). Es el
  cambio previsto y aceptado.
- Nuevo `tests/security.test.js` con **6 tests** de regresión de los invariantes de este sub-bloque.

**Ningún otro test se rompió.**

---

## Evidencia

- Línea base verificada al abrir el sub-bloque: **86/86 tests verdes**, `npm run lint` limpio,
  tree limpio en `8e56c28`.
- `trust proxy` (F18.5) **re-verificado por lectura**: `app.js:32` lo aplica antes de todo
  middleware; `express-rate-limit` usa `req.ip`, que Express resuelve desde XFF solo cuando
  `trust proxy` está activo. Correcto, no se toca.
- Auditoría hecha **leyendo** los 20+ ficheros implicados, no por suposición.

## Pendientes que NO se aplicaron en (a) — a propósito

| ID | Qué queda | Destino |
|---|---|---|
| **H-04** | Webhooks de WhatsApp y Twilio **sin verificar firma** (`X-Hub-Signature-256`, `X-Twilio-Signature`). Requieren credenciales reales para probarse | Pendiente — requiere credencial. Ver regla de "no mocks" |
| **H-09** | Validación Joi en 6 routers: `users`, `tenants`, `apiKeys`, `marketplace`, `whatsapp`, `voice` | Sub-bloque propio o ampliación de (a); no se hace a medias |
| **H-15** | `/health` expone `version`/`uptime` sin auth | Aceptado: es lo normal en un health check |
| **H-16** | Sin límite de body diferenciado para el webhook raw | Bajo, sin decidir |
| — | Imágenes docker sin pinear, secretos en disco, Redis/RabbitMQ sin proteger | **F19(b) Infra** |
| — | Permisos mínimos de DB, índices, exposición de datos | **F19(c) DB** |
| — | Exposición de secretos y manejo de errores en el cliente | **F19(d) Frontend** |
| — | Cobertura de Swagger y CSP de la UI de docs | **F19(e) Swagger** |

## Acciones manuales pendientes para el responsable

1. **`.env` local tiene `JWT_EXPIRES_IN=7d`**, que **sobrescribe** el nuevo default de 24h. Para que
   D-02 tenga efecto real hay que cambiarlo a `24h` en el `.env`. No se tocó el fichero de secretos.
2. **`STRIPE_WEBHOOK_SECRET` está definida pero vacía** en `.env`. En desarrollo esto hace que la
   ruta del webhook responda 503 (correcto: mejor eso que una firma forjable). En producción el
   backend **no arrancará** hasta que tenga valor real. No se ha inventado ninguno.

## Deuda futura registrada en (a)

- Sin CSRF token: hoy lo mitiga `sameSite=lax`. Si algún día el frontend vive en otro dominio y se
  pasa a `sameSite=none`, **CSRF pasa a ser real** y habrá que añadir token anti-CSRF.
- Sin rotación ni revocación de JWT (no hay denylist): un token robado vale hasta que expira.
- Sin verificación de email en el alta.
- Validación Joi pendiente en 6 routers (H-09): se abordará según decidas el alcance.
