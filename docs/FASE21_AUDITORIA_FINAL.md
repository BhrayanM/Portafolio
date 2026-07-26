# FASE 21 — Auditoría Final Integral y Release Candidate

**Rama:** `remediacion/v2` · **Fecha:** 2026-07-26 · Línea base: commit `3b6e92f` (cierre F20).

## Objetivo

Validar de F0 a F20 que el proyecto está listo para release. **Auditoría, no re-implementación**:
las fases cerradas no se re-auditan; se comprueba que lo que dicen sigue siendo cierto y se busca
lo que ninguna fase miró.

## Veredicto

**RELEASE CANDIDATE — APTO CON CONDICIONES.**

No hay ningún bloqueante abierto. Las cuatro correcciones aplicadas en F21 son de
configuración/documentación, sin cambio de lógica de negocio: el RC queda validado exactamente en
el estado auditado.

Las condiciones son las **7 acciones manuales previas al despliegue** de `docs/FASE20_DESPLIEGUE.md`
(secretos reales + certs), más **A-11** (el `.env` local sigue pisando el default de JWT).

| | |
|---|---|
| Bloqueantes abiertos | **0** |
| Corregido en F21 | 4 (A-02, A-03, A-04, A-05) |
| Documentado sin corregir | 13 |
| Verificado correcto | 14 comprobaciones |

---

## Validaciones ejecutadas

| Validación | Comando | Resultado |
|---|---|---|
| Lint backend `src/` | `npm run lint` | ✅ limpio |
| Lint backend `tests/` | `npx eslint tests/` | ✅ limpio |
| Tests backend | `npm test` | ✅ **98/98**, 6 suites |
| Build frontend | `npm run build` | ✅ compila, **12 rutas** |
| Compose ×3 | `docker compose -f <f> config --quiet` | ✅ exit 0 los tres |

**No se levantó ningún contenedor**: el demonio de Docker no estaba corriendo
(`failed to connect to the docker API at npipe:...`). Todo lo relativo a runtime de n8n, PostgreSQL
y HubSpot queda **no re-verificado en esta fase** — ver Área 7.

---

## Correcciones aplicadas en F21

Solo se tocó lo que es defecto objetivo de configuración o documentación, con riesgo cero.

### A-02 · `NEXT_PUBLIC_REQUEST_TIMEOUT_MS` sin documentar

La variable se lee en `frontend/src/lib/api.ts` y **no estaba en `.env.example`**. La introduje yo
en F20 al reparar el cliente HTTP y no la documenté. Añadida, con la nota de que el prefijo
`NEXT_PUBLIC_` es obligatorio (la lee el navegador) y de que se hornea en build, no en runtime.

### A-03 · `.env.example` declaraba Redis dos veces con valores contradictorios

```
línea  86:  REDIS_HOST=redis      REDIS_PASSWORD=          # bloque "Redis (Fase 13+)"
línea 124:  REDIS_HOST=localhost  REDIS_PASSWORD=redispass # bloque "Redis (Fase 13 — opcional)"
```

**dotenv se queda con la última aparición**, así que el primer bloque no tenía ningún efecto: quien
copiase el fichero y activase Redis dentro de Docker habría apuntado a `localhost` en vez de al
servicio `redis`. Consolidado en una sola declaración con la distinción dentro/fuera de Docker
explicada. Latente hoy: Redis sigue sin un solo consumidor (F18.4).

### A-04 · nginx de producción podía no arrancar por un upstream sin resolver

`docker/nginx.conf` declara `upstream n8n { server n8n:5678; }`, pero el servicio `nginx` de
`docker-compose.prod.yml` solo tenía `depends_on: [portafolio-api, portafolio-frontend]`.

Nginx **resuelve los upstreams al cargar la configuración y se niega a arrancar** si un nombre no
resuelve (`host not found in upstream "n8n"`). Como `n8n` espera a que postgres esté *healthy*,
nginx tenía vía libre para arrancar antes de que el contenedor de n8n existiese. Con
`restart: always` acabaría recuperándose, pero es una carrera real en el arranque en frío — y es
exactamente la misma familia de fallo que F20-3. Añadido `n8n` a `depends_on`.

### A-05 · `CLAUDE.md` decía «10 migraciones»

Hay **15 ficheros de esquema** (`001`–`014`) más 2 seeds. Corregido.

---

## Área 1 · Consistencia documentación vs código

| ID | Hallazgo | Gravedad |
|---|---|---|
| A-01 | `/usage`: doble desajuste, no «endpoint sin implementar» | 🟡 Medio |
| A-05 | «10 migraciones» → son 15 + 2 seeds | ✅ Corregido |
| A-06 | «14 rutas frontend» conflaciona páginas estáticas con rutas | 🟢 Bajo |
| A-07 | Dos migraciones con el mismo número `013` | 🟡 Medio |

### A-01 · El caso `/usage` está mal diagnosticado en la documentación

Se arrastra como «`/usage` endpoint backend no implementado» desde CLAUDE.md. **No es cierto**:
`/api/tenants/usage` **existe y está implementado** (`tenants.routes.js` → `tenants.controller.usage`
→ `tenantsService.getUsageStats`). Lo que hay son **dos** desajustes encadenados:

1. **Ruta.** El frontend llama a `/usage`; la real es `/tenants/usage`.
2. **Contrato.** Aunque se repunte, los tipos no casan:

| Backend devuelve | El tipo `ApiUsage` espera |
|---|---|
| `{ total_leads, total_runs, total_users }` | `{ total, by_endpoint, period: {from,to} }` |

La página renderiza `usage.total.toLocaleString()` → sería `undefined.toLocaleString()` → excepción.

**No se corrige en F21 y es deliberado:** decidir si «uso» significa *peticiones a la API* (lo que
pide el tipo) o *conteo de entidades* (lo que da el backend) es una decisión de producto, no un
arreglo de auditoría. Inventar el contrato aquí sería justo el tipo de cambio que esta fase no debe
hacer. → F22 con decisión humana.

### A-06 · «14 rutas» no es el número de rutas

Next reporta `Generating static pages (14/14)`, que incluye entradas internas. La tabla de rutas del
build lista **12**: 11 ficheros `page.tsx` + `_not-found`. Además `/api-docs` aparece en la lista de
rutas del frontend en CLAUDE.md, pero lo sirve el **backend** (Swagger UI en `app.js`).

Nota de honestidad: yo repetí «14 rutas» en `docs/FASE20_DESPLIEGUE.md` y en el commit de F20,
tomándolo del contador de páginas estáticas. El número correcto de rutas es 12. No reescribo el
histórico de F20; queda corregido aquí.

### A-07 · Colisión de numeración en migraciones

`013_db_hardening.sql` y `013_db_indexes.sql` comparten número. Hoy el orden alfabético es
determinista (`hardening` antes que `indexes`), pero cualquier runner que use el número como clave
de la tabla de aplicadas registrará una y dará la otra por hecha. Renumerar a `015_` **no se hace
aquí**: las migraciones ya están aplicadas en la base real y renumerarlas descuadraría el registro.
→ Regla para futuras migraciones: número nuevo siempre.

---

## Área 2 · Seguridad backend / frontend

### Verificado correcto (no se re-audita lo de F19)

- **Sin SQL por concatenación.** Barrido de interpolación dentro de `pool.query`: **0 coincidencias**.
  Los `${...}` que sí aparecen construyen *nombres de columna desde una allowlist fija*, con los
  valores siempre parametrizados.
- **Cobertura de autenticación.** `router.use(authenticate)` + `resolveTenant` a nivel de router en
  `leads`, `users`, `tenants`, `keys`. Por ruta en `billing`, `marketplace`, `whatsapp`, `voice`.
  Públicas **a propósito**: `/billing/plans` (tarifas), `/marketplace/catalog`, y los webhooks.
- **Aislamiento multi-tenant.** `users.service.update` filtra por `AND tenant_id = $n`; ambos
  servicios usan allowlist de campos y tienen el guard `fields.length === 0`.
- **CSP y cabeceras.** `frameAncestors: 'none'`, `objectSrc: 'none'`, `baseUri`/`formAction: 'self'`,
  HSTS 1 año + `includeSubDomains` + `preload`, `referrerPolicy: same-origin`, `nosniff`.
- **Orden de rutas.** En `leads.routes.js`, `/stats` se declara antes que `/:id`: no lo engulle.
- **Webhook de Stripe** montado en `app.js` **antes** de `express.json()` (necesita raw body).

### Hallazgos

| ID | Hallazgo | Gravedad |
|---|---|---|
| A-08 | Joi solo cubre `auth`, `leads` y `billing` | 🟡 Medio |
| A-09 | `users.role` sin enum ni en Joi ni en CHECK de DB | 🟡 Medio |
| A-10 | `tenants.updateSettings` mezcla JSON arbitrario en el jsonb | 🟢 Bajo |

**A-08.** Solo existen 3 schemas (`auth`, `billing`, `lead`). Entran **sin validar**:
`users.update`, `tenants.update`, `tenants.updateSettings`, `apiKeys.create`, `marketplace.install`,
`whatsapp.sendMessage`, `voice.makeCall`. Mitigado por las allowlists de campo en los servicios —
por eso es medio y no alto—, pero significa que llega al servicio lo que el cliente quiera mandar.
Ya se identificó en F19(a) y sigue abierto.

**A-09.** `data.role` se escribe tal cual. Sin enum en Joi y **sin `CHECK` en la base**: las únicas
`CHECK` de las migraciones son las de `tenant_id` de `011_hardening.sql`. No es escalada de
privilegios (la ruta ya es `authorize('admin')`), pero un rol con una errata deja al usuario fuera
de todo `authorize()` de forma **silenciosa** y sin traza. Arreglo natural: enum en Joi + `CHECK`
en la columna.

**A-10.** `settings = COALESCE(settings,'{}') || $1::jsonb` mezcla claves arbitrarias. Bajo mientras
`settings` no gobierne comportamiento; sube en cuanto algo lea una flag de ahí.

---

## Área 3 · Variables de entorno y secretos

### Verificado correcto

- `.env` **no está trackeado** (solo `.env.example`).
- **0 ficheros** `.pem` / `.key` / con «secret» o «credential» en el nombre bajo control de versiones.
- `_PRIVADO_NO_SUBIR/` y `backups/` **fuera de git**.
- El hook `.git/hooks/pre-commit` es solo de lectura (grep); no borra ni reescribe nada.

### Hallazgos

| ID | Hallazgo | Estado |
|---|---|---|
| A-02 | `NEXT_PUBLIC_REQUEST_TIMEOUT_MS` usada y no documentada | ✅ Corregido |
| A-03 | Bloque Redis duplicado con valores contradictorios | ✅ Corregido |
| A-11 | `.env` local con `JWT_EXPIRES_IN=7d` pisando el default de 24h | 🟡 **Abierto** |
| A-12 | 8 variables documentadas que ningún código lee | ℹ️ Informativo |

**A-11 — verificado abierto.** Comprobado en el `.env` local: `JWT_EXPIRES_IN=7d`. Sigue anulando el
default de 24h que fijó F19(a) D-02. **Es la única deuda de F19/F20 que sigue viva** y es acción
manual del que despliega. `NODE_ENV` y `TRUST_PROXY` no están en el `.env`, así que toman sus
defaults seguros (`development` / desactivado).

**A-12.** Presentes en `.env.example` pero sin lector en `backend/src` ni `frontend/src`:
`DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `GRAFANA_ADMIN_*`,
`OPENAI_API_KEY`, `GROQ_API_KEY`, `HUBSPOT_*`, `SLACK_*`. **No es un defecto**: las de IA/CRM/Slack
las consumen las credenciales de n8n y las de Grafana el stack de `monitoring/`. Se deja constancia
para que nadie las persiga como código muerto — pero `DATABASE_URL` sí parece legado real: el
backend arma la conexión desde `DB_HOST`/`POSTGRES_*`, no desde ella.

---

## Área 4 · Docker Compose dev / prod

### Verificado correcto

- **Producción no expone nada al host salvo nginx** (80/443). `postgres`, `n8n`, `portafolio-api` y
  `portafolio-frontend` no tienen `ports:`: solo se llega por la red interna. Correcto.
- El compose base sí publica puertos, pero **todos atados a `127.0.0.1`** (postgres, n8n, redis,
  rabbitmq): no quedan expuestos en la red local.
- Los nombres de servicio de prod (`portafolio-api`, `portafolio-frontend`, `n8n`) **coinciden** con
  los `upstream` de `docker/nginx.conf`.
- `${POSTGRES_PASSWORD:?error}` y `${N8N_ENCRYPTION_KEY:?error}`: el `up` falla si faltan.
- Imágenes pineadas a patch exacto (F20-2). Los 3 ficheros validan con `docker compose config`.

### Hallazgos

| ID | Hallazgo | Gravedad |
|---|---|---|
| A-04 | `depends_on` de nginx sin `n8n` pese al `upstream n8n` | ✅ Corregido |
| A-13 | Producción no incluye `redis` ni `rabbitmq` | 🟢 Bajo |
| A-14 | `portafolio-frontend` sin HEALTHCHECK | 🟢 Bajo |

**A-13.** `REDIS_ENABLED` / `RABBITMQ_ENABLED` existen, pero en `docker-compose.prod.yml` no hay
servicio para ninguno. Hoy es inocuo (Redis degrada elegante, Rabbit es placeholder); activar
cualquiera de las dos flags en producción apuntaría a la nada. Con Rabbit es peor: `RABBITMQ_URL`
pasa a ser obligatoria y el arranque falla.

**A-14.** El backend trae `HEALTHCHECK` en su Dockerfile; el frontend **no**. Y `depends_on` sin
`condition: service_healthy` solo espera al arranque del contenedor, no a que sirva. Nginx puede
recibir tráfico apuntando a un upstream aún no listo → 502 durante unos segundos tras el deploy.

---

## Área 5 · Endpoints críticos

| Endpoint | Estado |
|---|---|
| `GET /health` | ✅ `SELECT 1` real contra la DB; fuera del rate limiter (solo cubre `/api`) |
| `POST /api/auth/login` | ✅ `authLimiter` + Joi. El `Content-Type` que faltaba en el cliente se arregló en F20-5 |
| `POST /api/auth/register` | ✅ admin-only desde F19(a) D-07, con `registerLimiter` |
| `GET /api/leads`, `/stats`, `/:id` | ✅ auth + tenant a nivel de router; orden de rutas correcto |
| `POST /api/billing/webhook` | ✅ raw body antes de `express.json()`; 503 sin secreto (F20-1) |
| `GET /api/tenants/usage` | ⚠️ implementado pero **inalcanzable desde el frontend** (A-01) |
| `GET /api/leads/activity` | ❌ **no existe** ningún router para él (A-15) |

**A-15.** `/leads/activity` sigue sin backend — aquí sí es cierto el diagnóstico histórico, a
diferencia de `/usage`. La página `dashboard/activity` recibe 404 y muestra su banner de error.

**Swagger (A-16, 🟡).** `backend/src/docs/swagger.js` documenta **11 paths**; la API expone unos 30.
Sin documentar: `/api/users/*`, `/api/tenants/*`, `/api/keys/*`, `/api/marketplace/*`,
`/api/whatsapp/*`, `/api/voice/*`. Es exactamente el alcance del sub-bloque **F19(e)**, que sigue
pendiente.

---

## Área 6 · Integraciones externas

| Integración | Verificación estática |
|---|---|
| **Stripe** | ✅ `getStripe()` es perezoso: sin `STRIPE_SECRET_KEY` el arranque no rompe, falla al usarse. Webhook con 503 sin secreto |
| **WhatsApp** | ✅ `isConfigured()` y error accionable («Define WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID») |
| **Voice / Twilio** | ✅ Mismo patrón con `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` |
| **Groq · HubSpot · Slack** | ⏸ Viven en credenciales de **n8n**, no en el backend. No verificables sin levantar n8n |

Ninguna integración rompe el arranque por falta de credencial: todas fallan en cerrado en el punto
de uso. Es el comportamiento correcto para un RC que se despliega por partes.

---

## Área 7 · Workflows n8n

### La barrera del repo público aguanta — verificado

Hay 4 exports en disco (`lead-qualification`, `ai-sales-agent`, `ai-voice-agent`,
`ai-whatsapp-agent`) y **ninguno está en git**:

```
git ls-files n8n/                       -> vacío
git check-ignore -v ...lead-qualification.json -> .gitignore:65  workflows/
git log --oneline --all -- "n8n/workflows/*.json" -> vacío   # nunca commiteados
```

Es la comprobación que más importa en un repo público, y sale limpia: no solo están ignorados hoy,
es que **nunca entraron en el historial**.

### Lo que NO se pudo verificar

El demonio de Docker no estaba corriendo. **No se re-verificó** el estado del workflow
`92fIV59ijURIYfwT` (17 nodos, activo), ni las ejecuciones E2E, ni el contenido de `lead_log`. Ese
estado se toma de fases cerradas. Levantar el stack para comprobarlo habría reiniciado el
contenedor de n8n con el workflow activo, que es justo lo que las reglas del proyecto prohíben.

**Antes del release hay que confirmar a mano** que el workflow sigue activo y publicado
(`POST /deactivate` + `POST /activate {"versionId"}` tras cualquier edición).

---

## Área 8 · Tests finales

| | |
|---|---|
| Suites | 6 (`config`, `lead`, `deploy.config`, `leads.api`, `security`, `auth.cookie`) |
| Tests | **98/98 verdes** |
| Lint | limpio en `src/` y en `tests/` |

| ID | Hallazgo | Gravedad |
|---|---|---|
| A-17 | **0 tests de frontend** | 🟡 Medio |
| A-18 | El CI **nunca ha corrido**: 57 commits sin pushear | 🟡 Medio |

**A-18 es el hallazgo con más consecuencias de toda la fase.** `origin/main` sigue en `e2cadc3` y hay
**57 commits locales sin pushear**. El workflow `.github/workflows/ci.yml` está bien montado —
3 jobs, y el de frontend ejecuta `npm run build`.

Ahí está lo importante: **si el CI hubiera corrido una sola vez, habría detectado F20-4** (el
frontend sin compilar) en el mismo momento en que F19(d) lo rompió, en vez de tres fases después.
El sistema de defensa existe, está bien escrito y **nunca se ha ejecutado**. Combinado con A-17
(cero tests de frontend), el build *es* la única red de seguridad del frontend, y estaba
desconectada.

---

## Deuda abierta al cerrar F21

Ordenada por lo que conviene atacar primero.

| # | Deuda | Origen | Gravedad |
|---|---|---|---|
| A-18 | Hacer el primer push y que el CI corra | F21 | 🟡 |
| A-11 | `.env` local: `JWT_EXPIRES_IN=7d` pisa el default de 24h | F19(a) | 🟡 |
| A-01 | `/usage`: decidir contrato (peticiones vs entidades) y repuntar ruta | F21 | 🟡 |
| A-08 | Joi en `users`, `tenants`, `keys`, `marketplace`, `whatsapp`, `voice` | F19(a) | 🟡 |
| A-09 | Enum de `role` en Joi + `CHECK` en la columna | F21 | 🟡 |
| A-16 | Swagger: 11 de ~30 paths documentados | F19(e) | 🟡 |
| A-17 | Cero tests de frontend | histórica | 🟡 |
| A-15 | `/leads/activity` sin backend | histórica | 🟢 |
| A-07 | Dos migraciones `013_*` | F21 | 🟢 |
| A-13 | Prod sin `redis` ni `rabbitmq` | F21 | 🟢 |
| A-14 | Frontend sin HEALTHCHECK; `depends_on` sin `service_healthy` | F21 | 🟢 |
| A-10 | `updateSettings` acepta claves arbitrarias | F21 | 🟢 |
| A-12 | `DATABASE_URL` parece legado | F21 | ℹ️ |
| — | `next.config.js`: `Access-Control-Allow-Origin` como lista con comas | F20 | 🟢 |
| — | Pinning por tag y no por digest | F20 | 🟢 |
| — | RabbitMQ en 3.13.7 (worker placeholder) | F20 | ℹ️ |

## Checklist de release

Nada de esto es código; todo lo aporta quien despliega.

- [ ] Los **7 requisitos previos** de `docs/FASE20_DESPLIEGUE.md` (secretos reales + certs en
      `docker/ssl/`, que están gitignored y no vienen en un clon).
- [ ] **A-11**: quitar `JWT_EXPIRES_IN=7d` del `.env` de producción.
- [ ] Push de los 57 commits y **CI en verde** antes de etiquetar (A-18).
- [ ] Confirmar a mano que el workflow `92fIV59ijURIYfwT` sigue activo y publicado (Área 7).
- [ ] Primer arranque de `docker-compose.prod.yml`: verificar que nginx levanta con los certs en
      `/etc/nginx/ssl` (F20-3) y que resuelve el upstream `n8n` (A-04). Son las dos correcciones de
      infraestructura que **no se han podido probar en vivo**.
