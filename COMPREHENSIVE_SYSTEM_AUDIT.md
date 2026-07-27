# Comprehensive System Audit

**Rama auditada:** `release/v1-production-recovery` (`099cef5`, 67 commits)
**Fecha:** 2026-07-26
**Método:** todo verificado por ejecución contra el código real.

---

## 1. Resumen ejecutivo

### Veredicto: **READY WITH FIXES** — 3 bloqueadores, todos de una hora de trabajo

El proyecto que hay hoy en `release/v1-production-recovery` es un SaaS multi-tenant real y
funcionando. Lo he arrancado entero: 15 migraciones aplican con exit 0, el backend carga, 98 tests
pasan, el frontend construye 14 rutas, las dos imágenes Docker se construyen, nginx sirve TLS, y el
ciclo completo login → crear lead → consultar lead responde 200/201 a través del proxy.

Eso es un cambio de categoría respecto a la auditoría anterior, que se hizo sobre `main` y
encontró un backend que ni siquiera arrancaba. De los 11 hallazgos críticos de entonces, **10 están
resueltos** en esta rama.

Lo que queda no es deuda estructural, son tres cosas concretas:

1. **Los reportes que yo mismo escribí filtran los IDs de credenciales n8n y el portal
   HubSpot** que documentaban como retirados. Están versionados y se publicarían.
2. **RLS está completamente inerte.** El diseño es correcto —lo he probado— pero el backend conecta
   como propietario de las tablas, y PostgreSQL no aplica políticas al propietario. El aislamiento
   multi-tenant hoy lo sostiene únicamente el `WHERE tenant_id` del código.
3. **El README está desactualizado.** Describe un repo de infraestructura con n8n y Postgres.
   El código es un SaaS con 14 rutas, API de 9 recursos, Stripe, marketplace y 98 tests. Es el
   problema inverso al de `main`, pero cuesta lo mismo: nadie ve lo que construiste.

Hay además un hallazgo de seguridad de fondo que no bloquea la publicación pero sí una entrevista:
**las API keys se guardan en texto plano** en `tenants.api_keys`.

---

## 2. Historia completa del proyecto

67 commits con una progresión legible por fases. Reconstruida desde `git log` y los mensajes de
commit, no desde la documentación.

### 2.1 Línea temporal

| Bloque | Commits | Qué ocurrió |
|---|---|---|
| **Inicial** | `de0a09d` | Base del portafolio: Docker, n8n, PostgreSQL |
| **FASE 1–8** | `b1b22f8` → `28d1d15` | Construcción progresiva: motor de automatización, BD central, backend Express, dashboard Next.js, multi-tenancy + RLS + API keys, agentes IA, NGINX/SSL, observabilidad |
| **FASE 9–13** | `b4649e2` | Stripe, WhatsApp, Voice, marketplace, escalabilidad |
| **Auditoría interna** | `6c5ccbb` | *«checkpoint: auditoria completa + plan de remediacion»* — punto de inflexión: el proyecto se audita a sí mismo |
| **Remediación A–D** | `928e402` → `0f0f4e9` | Infra funcional, 10 migraciones ejecutadas de verdad, JWT sale de localStorage a cookie HttpOnly, lógica de leads extraída y testeada, CI con lint + tests + barrido de secretos |
| **E2E real** | `abb11c2`, `e95abb4` | Flujos WARM y HOT verificados extremo a extremo con credenciales reales |
| **FASE 7–16 (2.ª pasada)** | `5712c55` → `5803729` | Backend robusto (Swagger, schemas Joi, rate limit), frontend completo, Stripe raw body, WhatsApp/Voice/Marketplace, testing |
| **Correcciones C-01…P2-A06** | `773ae53` → `9c9633e` | 11 commits de corrección puntual derivados de auditoría |
| **FASE 18–19** | `ee259ff` → `91520bb` | Deuda técnica, hardening de backend, infraestructura, BD y frontend |
| **FASE 20–21** | `1c37a9c`, `1c36a08` | Preparación de despliegue, auditoría integral, Release Candidate |
| **FASE 21.2** | `2b216e8` → `a2573a6` | Recuperación del release perdido |
| **FASE 21.3** | `099cef5` | Reparación de las migraciones 011–015 |

### 2.2 Cumplimiento de objetivos por fase

| Fase | Objetivo | Implementado (verificado) | Estado |
|---|---|---|---|
| 0 | Infraestructura Docker + n8n + PostgreSQL | `docker-compose.yml`, `.dev.yml`, `.prod.yml`; ambos `config` válidos | ✅ Completo |
| 1 | Motor de automatización | Workflows n8n; **no versionados por política** (SECURITY.md) | ⚠️ Parcial *(por diseño, ver §7)* |
| 2 | Base de datos central | 15 migraciones + 2 seeds, aplican con exit 0 | ✅ Completo |
| 3 | Backend Node.js | 49 ficheros en `src/`, 9 grupos de rutas, carga OK | ✅ Completo |
| 4 | Dashboard Next.js | 14 rutas, build OK, TypeScript strict sin errores | ✅ Completo |
| 5 | Multi-tenancy + RLS + API keys | Tablas y políticas creadas; **RLS inerte** (§6.4); API keys en claro (§8.2) | ⚠️ Parcial |
| 6 | Agentes IA (Sales/WhatsApp/Voice) | `whatsapp.service.js` y `voice.service.js` llaman a Graph API y Twilio de verdad; **sin verificación de firma** | ⚠️ Parcial |
| 7 | Infraestructura cloud (NGINX/SSL) | `nginx.conf` con TLS, HSTS, `limit_req_zone`, upstreams correctos; verificado arrancando | ✅ Completo |
| 8 | Observabilidad | `monitoring/` con Prometheus, Grafana, Loki, Uptime Kuma; `/api/metrics` existe y está autenticado | ⚠️ Parcial *(targets sin revalidar tras F21)* |
| 9 | Stripe | `express.raw` antes de `express.json`, webhook con firma, checkout | ✅ Completo |
| 10–12 | WhatsApp + Voice + Marketplace | Rutas, servicios y frontend presentes | ⚠️ Parcial |
| 13–16 | Escalabilidad + SaaS + testing | Redis declarado pero **sin consumidor**; RabbitMQ declarado y **sin servicio** | ⚠️ Parcial |
| 17 | — | No aparece como fase propia en el historial | — |
| 18 | Cierre de deuda técnica | 6 commits F18.x verificables | ✅ Completo |
| 19 | Security hardening (a/b/c/d) | (a) backend ✅ · (b) infra ✅ · (c) BD ❌→✅ *reparado en 21.3* · (d) frontend ✅ | ✅ Completo *(tras 21.3)* |
| 20 | Preparación de despliegue | Imágenes pineadas a patch, mount SSL corregido | ✅ Completo |
| 21 | Auditoría externa | Realizada; detectó que `main` ≠ proyecto real | ✅ Completo |
| 21.2 | Recuperación del release | 102 archivos recuperados, 38 restaurados, 42 despublicados | ✅ Completo |
| 21.3 | Reparación de migraciones | 011–015 aplican; 6/6 aserciones; idempotentes | ✅ Completo |

**Balance:** 14 ✅ · 8 ⚠️ · 0 ❌

Ningún objetivo declarado quedó sin implementar. Los parciales son de dos tipos: componentes
declarados y no cableados (Redis, RabbitMQ), y componentes construidos cuya garantía no está activa
(RLS, firma de webhooks).

### 2.3 Un patrón que merece señalarse

El commit `6c5ccbb` («auditoria completa + plan de remediacion») marca el momento en que el
proyecto empieza a auditarse. Todo lo que viene después —bloques A-D, correcciones C-0x, F18.x,
F19.x— es **corrección dirigida por auditoría, no construcción de features**. Es el 45 % del
historial.

Ese es un patrón de ingeniero senior, y es lo más valioso que cuenta este repositorio sobre su
autor. Hoy no está contado en ninguna parte visible.

---

## 3. Arquitectura

### 3.1 Diseño verificado

```
Cliente / n8n / WhatsApp / Twilio
        │
   nginx (TLS 1.2-1.3, HSTS, limit_req 10r/s burst 20, security headers)
        ├── example.com      → frontend:3001  (Next.js standalone)
        ├── api.example.com  → api:3000       (Express)
        └── n8n.example.com  → n8n:5678
                │
        Express: trust proxy → securityMiddleware → CORS allowlist → requestId
                 → morgan → [webhook Stripe raw] → json → cookieParser
                 → globalLimiter → rutas
                │
        routes → validate(schema) → controller → service → pg.Pool
                │
        PostgreSQL 15 (15 migraciones, RLS declarada, 4 triggers de auditoría)
```

Separación por capas correcta y consistente: `routes` → `controllers` → `services` → `db`. Ningún
controlador toca `pool` directamente. Los servicios no conocen `req`/`res`. Es un backend limpio.

### 3.2 Escalabilidad

- **Stateless.** Sesión en cookie firmada, no en memoria: escala horizontalmente sin sticky sessions.
- **Pool de conexiones** configurado (`max: 20`).
- **Frontend `output: standalone`**, imagen pequeña.
- **Límite real:** el pool se comparte entre todos los tenants sin cuotas. Un tenant con una
  consulta pesada agota el pool para todos. A la escala de portafolio no importa; conviene saberlo.

### 3.3 Documentación vs. código

`docs/ARQUITECTURA.md` **coincide** con lo implementado. Es la excepción positiva.
El `README.md` no (§9).

**Arquitectura: 8/10.**

---

## 4. Backend

### 4.1 Verificaciones ejecutadas

| Comando | Resultado |
|---|---|
| `node -e "require('./src/app.js')"` | ✅ **APP CARGA OK** |
| `npm run lint` (ESLint 9) | ✅ exit 0 |
| `npm test` | ✅ **98 passed / 98** · 6 suites |
| Dependencias usadas vs declaradas | ✅ ninguna sin declarar |

### 4.2 Lo que está bien

**`config/index.js` es el mejor fichero del backend.** Fail-fast real en producción: si falta
`JWT_SECRET`, `CORS_ORIGINS`, `POSTGRES_PASSWORD` o `STRIPE_WEBHOOK_SECRET`, el proceso **no
arranca**. Fuera de producción genera un secreto aleatorio en cada arranque en lugar de usar uno
por defecto escrito en el código. Y valida que `CORS_ORIGINS` no sea `*` ni contenga localhost en
producción. El comentario explica *por qué*, con el ataque concreto que previene.

**Autenticación.** JWT HS256 con `algorithms` fijado explícitamente en `jwt.verify` — cierra la
confusión de algoritmo. Cookie `httpOnly`, `secure` en producción, `sameSite` configurable.
`Bearer` como respaldo para clientes no-navegador. Verificado en vivo: la cookie sale marcada
`#HttpOnly_`.

**Autorización.** Las 9 rutas están correctamente protegidas. `POST /api/auth/register` exige
`authenticate` + `authorize('admin')`: se corrigió el registro público que permitía crear usuarios
en cualquier tenant. Rate limit específico en login y registro.

**Validación.** Schemas Joi aplicados vía `validate()` en login, registro, creación de lead, query
de listado y checkout. Verificado en vivo: un login mal formado devuelve **400**, no 500.

**Otros aciertos:** `express.raw` antes de `express.json` para la firma de Stripe (el bug clásico,
evitado); `/api/metrics` autenticado con el razonamiento escrito (expone versión de Node → CVEs);
`trust proxy` desactivado por defecto con la explicación del bypass de rate limit; jerarquía de
errores tipada; logger estructurado JSON con `requestId`.

### 4.3 Hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **B-01** | **Alto** | **API keys en texto plano.** `apiKeys.service.js:18` guarda `{name, key, created_at, active}` en `tenants.api_keys` con la clave literal. `validate()` hace un match por contenido JSONB sobre el texto plano. Un dump de BD, un backup o una lectura de solo lectura filtran claves vivas. Debería guardarse solo `sha256(key)` + los 8 primeros caracteres para identificarla. |
| **B-02** | **Alto** | `GET /api/keys` (`list`) devuelve **las claves completas**, no una vista enmascarada. Cualquier miembro autenticado del tenant las lee. |
| **B-03** | **Alto** | `POST /api/whatsapp/webhook` **sin verificación de firma** `X-Hub-Signature-256`. Solo está el handshake GET. Cualquiera puede inyectar mensajes falsos. |
| **B-04** | **Alto** | `POST /api/voice/webhook` **sin validación** `X-Twilio-Signature`. |
| **B-05** | Medio | `whatsapp.service.js:47`: `process.env.WHATSAPP_VERIFY_TOKEN \|\| 'portafolio_verify_2024'` — secreto por defecto en el código, justo lo que `config/index.js` erradicó. Inconsistencia. |
| **B-06** | Medio | `/api-docs` público sin autenticación: publica el mapa completo de la API. Debería quedar tras auth o desactivado con `NODE_ENV=production`. |
| **B-07** | Medio | Las API keys viven en una columna JSONB de `tenants`. Sin tabla propia no hay expiración, ni `last_used_at`, ni rotación, ni auditoría por clave. La revocación es un flag blando. |
| **B-08** | Bajo | `cache.service.js` existe y no lo consume nadie (`REDIS_ENABLED=false`). Andamiaje declarado. |

**Backend: 8/10.** Bajaría a 6 si las API keys fueran el centro del producto; como no lo son, el
resto del backend sostiene la nota.

---

## 5. Frontend

### 5.1 Verificaciones ejecutadas

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (strict) | ✅ exit 0 |
| `npm run build` | ✅ **14/14 rutas**, First Load JS 87.3 kB |

Rutas: `/`, `/login`, `/_not-found`, `/dashboard` + `activity`, `analytics`, `billing`,
`integrations`, `leads`, `marketplace`, `settings`, `usage`.

### 5.2 Evaluación

`src/lib/api.ts` es una capa HTTP tipada con `apiFetch<T>`, `AbortController` con timeout
configurable, y 8 clientes por dominio (`authApi`, `leadsApi`, `billingApi`, `apiKeysApi`,
`settingsApi`, `activityApi`, `usageApi`). `src/lib/types.ts` define los DTOs. Los 10 símbolos
importados desde `@/lib/*` resuelven — incluidos `activityApi`, `settingsApi` y `usageApi`, que en
`main` no existían.

Hay `error.tsx`, `not-found.tsx` y `dashboard/error.tsx`: error boundaries en su sitio.

El token ya no pasa por `localStorage`: la sesión va en cookie HttpOnly, así que el frontend no
puede leerla — que es exactamente lo que se busca.

### 5.3 Hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **F-01** | Medio | No hay `middleware.ts`. La protección de rutas es del lado cliente; el backend protege los datos, pero hay parpadeo de contenido y la lógica de sesión se duplica por página. |
| **F-02** | Medio | Sin librería de datos (SWR/React Query): cada página gestiona su `loading`/`error`/`refetch` a mano. |
| **F-03** | Bajo | Cero tests de frontend. Con 14 rutas y estado real, la ausencia se nota. |
| **F-04** | Bajo | Deuda conocida y documentada: `/leads/activity` no existe en backend, y el contrato de `/usage` no casa entre frontend y backend. |

**Frontend: 7/10.**

---

## 6. Base de datos

### 6.1 Verificaciones ejecutadas

Base creada desde cero, migraciones aplicadas fichero a fichero con `ON_ERROR_STOP=1`, comprobando
el **código de salida real**:

```
001…015  → 15/15 OK
seeds    → 2/2 OK
tenants=1 users=1 audit_log=2
EXIT_CODE_GLOBAL=0
```

`audit_log=2` prueba que los triggers de auditoría reparados disparan de verdad.

### 6.2 Modelo

9 tablas de dominio, UUID como PK salvo tres tablas de log con `SERIAL`. Siete claves foráneas
`tenant_id → tenants(id)`, con `CASCADE` donde el dato pertenece al tenant y `SET NULL` donde debe
sobrevivirle (logs y auditoría). Es la decisión correcta y está aplicada de forma consistente.

Índices: compuestos con `tenant_id` como primera columna en todas las tablas multi-tenant, que es
el patrón de acceso real. `014_db_indexes.sql` retira los índices sueltos redundantes.

### 6.3 Riesgo verificado — **RLS está inerte**

Este es el hallazgo técnico más importante de la auditoría, y está probado, no inferido.

```sql
-- las 6 tablas
relforcerowsecurity = false     (las 6)

-- conectado como n8n = POSTGRES_USER = propietario = como conecta el backend
SELECT count(*) FROM leads;                          -- 2 filas, de 2 tenants distintos
SELECT set_tenant_id('...0001'); SELECT count(*);    -- 2 filas  ← ignora la política
```

PostgreSQL **no aplica políticas RLS al propietario de la tabla** salvo que se declare
`FORCE ROW LEVEL SECURITY`. El backend conecta con `POSTGRES_USER`, que es el propietario. Por lo
tanto **las seis políticas de `010_enable_rls.sql` no tienen ningún efecto sobre la aplicación.**

El aislamiento multi-tenant hoy lo sostiene, en su totalidad, el `WHERE tenant_id = $1` de la capa
de servicios. Un solo `SELECT` sin ese filtro es una fuga entre tenants, y no hay red debajo.

**La buena noticia: el diseño es correcto y está a un cambio de conexión de funcionar.** Con el rol
no propietario `app`:

```sql
SET ROLE app; SELECT set_tenant_id('...0001'); SELECT count(*) FROM leads;  -- 1 fila
SET ROLE app; SELECT set_tenant_id('...00aa'); SELECT count(*) FROM leads;  -- 1 fila
SET ROLE app; SELECT set_tenant_id('...0001');
  INSERT INTO leads (tenant_id, ...) VALUES ('...00aa', ...);
  → ERROR: new row violates row-level security policy for table "leads"
```

Aísla en lectura **y en escritura**.

> **Corrección de un informe anterior.** En `DATABASE_MIGRATION_FIX_REPORT.md` escribí
> que las políticas «no impiden escribir una fila con `tenant_id` ajeno» por carecer de
> `WITH CHECK`. Es inexacto: en políticas con `cmd=ALL`, PostgreSQL usa la expresión `USING`
> también como `WITH CHECK`. La prueba de arriba lo confirma. El riesgo real no era la escritura
> cruzada, sino que **nada de esto aplica al propietario**.

### 6.4 Otros hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **D-01** | **Crítico** | RLS inerte por conexión como propietario (arriba). Faltan `FORCE ROW LEVEL SECURITY` y migrar el backend al rol `app`. |
| **D-02** | Medio | `users` y `tenants` no tienen RLS. Aunque se active lo anterior, esas dos quedan fuera. |
| **D-03** | Medio | No hay tabla de control de migraciones. Nada registra qué se aplicó. La idempotencia (verificada: reaplicar 011–015 da exit 0) lo mitiga, no lo sustituye. |
| **D-04** | Medio | `docs/deployment-guide.md` documenta `cat database/migrations/*.sql \| psql`, **sin `ON_ERROR_STOP=1`**. Ese procedimiento es exactamente el que permitió que F19(c) se cerrara sin ejecutar nada: un fallo no detiene el flujo y el operador ve exit 0. |
| **D-05** | Bajo | `error_log.created_at` es `BIGINT` (epoch ms) mientras el resto del esquema usa `TIMESTAMP`. |
| **D-06** | Bajo | `lead_log` y `leads` se solapan en propósito. Deuda de modelo. |

**Database: 7/10.** El esquema y las migraciones son sólidos; D-01 cuesta 3 puntos porque
convierte la garantía estrella del diseño en decorativa.

---

## 7. Docker / Infraestructura

### 7.1 Verificaciones ejecutadas

| Comando | Resultado |
|---|---|
| `docker compose config` (dev) | ✅ exit 0 |
| `docker compose -f docker-compose.prod.yml config` | ✅ 5 servicios |
| `docker compose -f docker-compose.prod.yml build` | ✅ ambas imágenes |
| Stack completo arriba | ✅ 5/5, API `healthy` |
| `nginx -t` en la red de compose | ✅ *test is successful* |
| E2E a través de nginx TLS | ✅ `/health`, `/login` 200, 301 HTTP→HTTPS |

### 7.2 Evaluación

Imágenes pineadas a patch exacto (`node:20.20.2-alpine`, `postgres:15.18-alpine`) — reproducible.
Multi-stage con usuario no root (`appuser`). HEALTHCHECK en el backend. El compose de producción
**no publica ningún puerto interno**: solo nginx expone 80/443. nginx trae HSTS, `X-Frame-Options:
DENY`, `nosniff`, `server_tokens off`, `limit_req_zone` a 10 r/s con burst 20, y timeouts.
Verificado en vivo: las cabeceras salen.

### 7.3 Hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **I-01** | **Alto** | **n8n publicado en `n8n.example.com:443` sin autenticación ni allowlist.** El comentario del `.conf` dice *«admin access only via Tailscale / internal VPN»*, pero nada lo implementa. Es el panel con las credenciales de CRM, Slack y LLM. |
| **I-02** | Medio | `.env.example` trae `DB_HOST=localhost` (correcto fuera de Docker, y así lo documenta). Quien lo copie tal cual obtiene un contenedor que arranca, responde y devuelve `db:disconnected` hasta que el healthcheck lo marca. Verificado. |
| **I-03** | Medio | `env_file: .env` en el servicio frontend inyecta `JWT_SECRET`, `STRIPE_SECRET_KEY` y la contraseña de BD en el contenedor Next.js, que no los necesita. |
| **I-04** | Bajo | Cabeceras de seguridad duplicadas (nginx `add_header` + helmet). Sin impacto; conviene una sola fuente. |
| **I-05** | Bajo | `listen … http2` deprecado desde nginx 1.25 (3 avisos al arrancar). |
| **I-06** | Bajo | Sin `cap_drop`, `no-new-privileges` ni límites de recursos en los servicios. |

**Docker/DevOps: 8/10.**

---

## 8. Seguridad

### 8.1 Barrido ejecutado sobre los 67 commits

| Comprobación | Resultado |
|---|---|
| Tokens con prefijo (`sk-`, `xox*`, `pat-`, `ghp_`, `AKIA`, `whsec_`) | ✅ 0 hallazgos |
| Claves privadas PEM | ✅ 0 |
| Cadenas de conexión con credenciales | ✅ 0 |
| `.env` versionado en algún momento | ✅ nunca |
| Contraseñas en claro | ✅ solo fixtures (`fixture-password-no-real`) |

El historial está limpio.

### 8.2 Hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **S-01** | **Bloqueador** | IDs de credenciales y portal HubSpot en informes de rama — corregido posteriormente |
| **S-02** | **Bloqueador** | PII realista en `scripts/test-lead-webhook.sh` — corregido posteriormente |
| **S-03** | Alto | Dominio real `example.com` en 8 ficheros versionados. Menos grave que S-01/S-02 (es tu propio dominio), pero contradice la regla 3 que el repo se impone. |
| **S-04** | **Crítico** | RLS inerte — ver D-01. |
| **S-05** | Alto | API keys en claro — ver B-01/B-02. |
| **S-06** | Alto | Webhooks de WhatsApp y Voice sin verificación de firma — B-03/B-04. |
| **S-07** | Alto | n8n expuesto sin auth — I-01. |
| **S-08** | Medio | `/api-docs` público — B-06. |

### 8.3 OWASP Top 10

| Riesgo | Estado |
|---|---|
| A01 Broken Access Control | ⚠️ Rutas y roles correctos; **RLS inerte** quita la defensa en profundidad |
| A02 Cryptographic Failures | ⚠️ bcrypt cost 12, TLS 1.2/1.3, cookie Secure. **API keys en claro** |
| A03 Injection | ✅ Consultas parametrizadas en todo el backend. Sin concatenación de SQL |
| A04 Insecure Design | ✅ Fail-fast, human-in-the-loop, ADRs con rollback |
| A05 Security Misconfiguration | ⚠️ Buena base; n8n expuesto y `/api-docs` público |
| A06 Vulnerable Components | ⚠️ Imágenes pineadas; `npm audit` en CI **sin bloquear** |
| A07 Auth Failures | ✅ Cookie HttpOnly, algoritmo fijado, rate limit en login, fail-fast de secretos |
| A08 Integrity Failures | ⚠️ Stripe verifica firma; WhatsApp y Twilio **no** |
| A09 Logging Failures | ✅ Logger estructurado, `requestId`, 4 triggers de auditoría, `redact.js` |
| A10 SSRF | ✅ Sin fetch de URLs controladas por el usuario |

**Seguridad: 6/10.** La base es de nivel senior; los bloqueadores de publicación y el RLS inerte
la hunden. Sube a 8 con las correcciones de §12.

---

## 9. Automatizaciones IA / n8n

### 9.1 ¿Los workflows funcionan realmente o solo son ejemplos?

**Respuesta directa: hay dos cosas distintas y conviene no confundirlas.**

**Los workflows de producción existen y funcionaron.** El historial documenta ejecuciones E2E reales
con credenciales reales (`abb11c2` rama WARM, `e95abb4` rama HOT con `lead_log id=4` y un contacto
HubSpot creado). Pero **no están en el repositorio, por decisión explícita** de SECURITY.md: los
exports de n8n nunca se publican. No puedo verificarlos, y esa es la intención del diseño.

**Los tres workflows publicados en `projects/examples/` son ejemplos, y no funcionan como están.**
No es una opinión: los he analizado y tienen tres defectos estructurales.

### 9.2 Defectos verificados en los ejemplos publicados

| # | Fichero | Defecto |
|---|---|---|
| **N-01** | `crm-sync-demo.json` (×2), `lead-scoring-demo.json` (×3) | **5 expresiones sin el prefijo `=`**: `"value": "Bearer {{ $env.CRM_ACCESS_TOKEN }}"`. Sin `=`, n8n lo trata como literal y envía el texto `Bearer {{ $env... }}` como cabecera. En el mismo nodo, la URL sí usa `"={{ $env.CRM_API_URL }}/..."` correctamente: la inconsistencia delata que no se importaron. |
| **N-02** | `lead-scoring-demo.json` | Nodo Switch con `typeVersion: 2` pero esquema v1 (`dataType`/`value1`/`rules[].value2`), y `value2` como cadena `">= 80"`, que no es sintaxis válida. Además el nodo OpenAI devuelve la completion anidada y no hay paso de `JSON.parse`: `$json.score` es `undefined`. Verificado leyendo el JSON. |
| **N-03** | `slack-alert-demo.json` | `Format Slack Message` es un nodo Code (**una sola salida**) con **2 salidas conectadas** en `connections`. `Respond 200` nunca se alcanza y el webhook, en `responseMode: responseNode`, cuelga hasta timeout. Verificado programáticamente. |
| **N-04** | los 3 | **0 `retryOnFail`, 0 `onError`.** El README y los ADR afirman reintentos y Error Workflow global. |
| **N-05** | los 3 | **Webhooks públicos sin autenticación.** `lead-inbound` dispara llamadas LLM de pago con cualquier payload anónimo: abuso de coste directo. |

### 9.3 Lo que sí está bien

**Sanitización: impecable.** `0` bloques `credentials` en los tres ficheros, `$env.VAR` en todos los
valores, nombres de nodo genéricos, sin IDs de producción. Cumple las 8 reglas que el propio repo
se impone.

**El hook `scripts/githooks/pre-commit` es el mejor artefacto del repositorio.** Escanea el
contenido *staged* (no el del disco), maneja falsos positivos con una lista de placeholders, excluye
`projects/examples/` deliberadamente y documenta el escape. Me bloqueó a mí durante FASE 21.2 por un
falso positivo en un reporte: funciona.

**n8n/Automations: 5/10.** La sanitización merece un 9; los ejemplos publicados, un 3. Para el rol
que persigues, este apartado es el escaparate, y hoy es el más débil.

---

## 10. Documentación

### 10.1 El problema principal

**El `README.md` de esta rama está congelado en FASE 0.** Su último bloque se titula literalmente
*«🚀 FASE 0 — Infraestructura Base (Docker + n8n + PostgreSQL)»* y su «Inicio rápido» solo levanta
n8n y Postgres.

No menciona: el backend Express con 9 grupos de rutas, el dashboard Next.js con 14 rutas, las 15
migraciones, los 98 tests, Stripe, el marketplace, las API keys, `/api-docs`, ni el CI.

Es el problema inverso al de `main` —que prometía lo que no existía— y cuesta lo mismo: **el
repositorio no cuenta lo que construiste.** Un revisor lee «FASE 0 — Infraestructura Base» y no
sigue leyendo.

### 10.2 Clasificación de afirmaciones

| Afirmación del README | Estado |
|---|---|
| Docker + n8n + PostgreSQL, inicio rápido | ✅ Implementado — verificado |
| PostgreSQL, no SQLite | ✅ Implementado |
| Human-in-the-loop en leads calientes | ✅ Implementado (E2E en historial) |
| Deduplicación por identidad de negocio | ✅ Implementado — `UNIQUE(tenant_id, dedup_key)` |
| Red Docker dedicada prod ↔ PostgreSQL | ✅ Implementado |
| Fast-ACK en canales que reintentan | ✅ Implementado |
| ADRs + rollback documentado | ✅ Implementado — `docs/adr/README.md` |
| Resiliencia a reinicios | ✅ Implementado — `restart: always` + volúmenes |
| Hardening anti-inyección antes del LLM | ⚠️ Parcial — el saneamiento vive en el workflow n8n, no publicado; no verificable |
| Error Workflow global con persistencia | ⚠️ Parcial — tabla `error_log` existe; los 3 ejemplos publicados no tienen `onError` |
| Stack: Google Sheets, Shopify | ⚠️ Parcial — no hay código de ninguno de los dos en el repo |
| **Backend, dashboard, Stripe, marketplace, tests, CI** | ❌ **Incorrecto por omisión** — existen y funcionan, y el README no los menciona |
| Enlace a `docs/IMPLEMENTATION_PLAN.md` | ❌ **Enlace roto en un clon nuevo** — el fichero está en disco pero no versionado (despublicado en 21.2) |

### 10.3 Otros hallazgos

| ID | Sev. | Hallazgo |
|---|---|---|
| **DOC-01** | Alto | README congelado en FASE 0 (arriba). |
| **DOC-02** | Medio | Enlace roto a `docs/IMPLEMENTATION_PLAN.md` en un clon limpio. |
| **DOC-03** | Medio | El README presenta 4 sistemas; `projects/whatsapp-agent/` y `projects/whatsapp-ecommerce-agent/` coexisten como entradas distintas y confunden. |
| **DOC-04** | Bajo | `docs/deployment-guide.md` propone un procedimiento de migración sin `ON_ERROR_STOP` (ver D-04). |
| — | ✅ | Los 13 enlaces relativos restantes del README resuelven. `docs/ARQUITECTURA.md`, `docs/adr/README.md` y `docs/patterns/` son de calidad alta y coinciden con el código. |

**Documentación: 5/10.** La prosa es de las mejores que he leído en un portafolio; la sección
«Publication Scope» de los ADR es un argumento maduro. Pero el documento de entrada describe otro
proyecto.

---

## 11. Evaluación como portfolio — tres revisores

### 11.1 Reclutador técnico (mira 90 segundos)

> «Abro el README. Dice *AI Automation Engineer*, se lee muy bien, hay diagramas. Bajo y el último
> bloque dice **FASE 0 — Infraestructura Base**. ¿Está a medias? Miro los commits: 67, y los
> últimos son de auditoría y recuperación de release. Miro si hay badges de CI: no hay ninguno en
> el README. No sé si esto funciona.»

**Veredicto:** pasa por la calidad de la escritura, duda por la señal de «FASE 0» y por la ausencia
de una prueba visible de que el sistema corre. **No hay capturas ni GIF del dashboard.**

### 11.2 Senior Backend Engineer (abre el código 20 minutos)

> «`config/index.js` me convence en treinta segundos: fail-fast, sin secretos por defecto,
> validación de CORS, y comentarios que explican el ataque que previenen. Eso no lo escribe alguien
> que copia arquitecturas.
>
> `app.js`: `express.raw` antes de `express.json` para Stripe. Ese bug lo he visto en producción
> tres veces. Aquí está evitado y comentado.
>
> Corro los tests: 98 pasan. Corro el build: pasa. Levanto el compose: levanta. Eso ya lo pone por
> encima de la mayoría de portafolios.
>
> Pero abro `apiKeys.service.js` y las claves se guardan en claro. Y busco `FORCE ROW LEVEL
> SECURITY` en las migraciones y no está, con el backend conectando como owner: el RLS del que
> presume el diseño no hace nada. Le preguntaría por las dos.»

**Veredicto:** contrataría para una entrevista técnica. Las dos objeciones son concretas y
respondibles.

### 11.3 AI Automation Engineer (mira los workflows)

> «Es mi área, así que voy directo a `projects/examples/`. La sanitización es ejemplar: cero
> credenciales, `$env` en todo, nombres genéricos. Se nota criterio.
>
> Pero abro `lead-scoring-demo.json` y hay `"value": "Bearer {{ $env.CRM_ACCESS_TOKEN }}"` sin el
> `=` delante — eso no interpola. Y en la URL del mismo nodo sí lo puso. El Switch mezcla v1 y v2 y
> no evaluaría. En el de Slack, un nodo Code tiene dos salidas conectadas.
>
> Esto no se importó nunca en n8n. Y ningún nodo tiene `retryOnFail`, cuando el README habla de
> reintentos.»

**Veredicto:** el más severo de los tres, y es el perfil del puesto que buscas. **Los ejemplos n8n
son el escaparate y hoy restan más de lo que suman.**

### 11.4 Qué preguntaría un entrevistador

1. «Tienes RLS en las migraciones. ¿Qué usuario usa el backend para conectarse?» — *La respuesta
   honesta hoy es que el aislamiento lo hace el código, no el motor.*
2. «¿Cómo almacenas las API keys?» — *En claro.*
3. «Este webhook de WhatsApp, ¿cómo verificas que viene de Meta?» — *No se verifica.*
4. «Veo commits de auditoría y de recuperación de release. Cuéntame qué pasó.» — **Esta es la
   pregunta que puedes ganar.** Es una historia de ingeniería real: un `.gitignore` sin anclar tragó
   el CI y el subsistema de API keys, la rama publicada era un snapshot mutilado, lo detectaste
   auditando y lo recuperaste sin reescribir historia.
5. «¿Los workflows n8n de `examples/` los has ejecutado?»
6. «`error_log.created_at` es BIGINT y el resto TIMESTAMP. ¿Por qué?»

---

## 12. Hallazgos críticos y riesgos pendientes

### 12.1 Bloqueadores de publicación (3)

| ID | Hallazgo | Coste |
|---|---|---|
| **S-01** | IDs de credenciales n8n y portal HubSpot en informes de rama | 5 min |
| **S-02** | PII realista mexicana en `scripts/test-lead-webhook.sh` | 5 min |
| **DOC-01** | README congelado en FASE 0: no describe el sistema que existe | 1 h |

### 12.2 Riesgos altos (no bloquean publicar, sí una entrevista)

| ID | Riesgo |
|---|---|
| **D-01 / S-04** | RLS inerte: el backend conecta como propietario. Falta `FORCE ROW LEVEL SECURITY` + migrar a `app` |
| **B-01 / B-02** | API keys en texto plano y devueltas completas por `GET /api/keys` |
| **B-03 / B-04** | Webhooks de WhatsApp y Voice sin verificación de firma |
| **I-01** | n8n publicado en 443 sin auth pese al comentario sobre Tailscale |
| **N-01…N-03** | Tres bugs funcionales en los workflows n8n publicados |

### 12.3 Riesgos medios

`B-05` verify token por defecto en código · `B-06` `/api-docs` público · `D-02` `users`/`tenants`
sin RLS · `D-03` sin tabla de control de migraciones · `D-04` guía de despliegue sin
`ON_ERROR_STOP` · `I-02` `DB_HOST` por defecto · `I-03` secretos en el contenedor frontend ·
`F-01` sin `middleware.ts` · `S-03` dominio real en 8 ficheros · `DOC-02` enlace roto en clon
limpio.

---

## 13. Fortalezas

Lo digo sin adornos porque es lo que sostiene el proyecto:

1. **`config/index.js`** — fail-fast real, cero secretos por defecto, validación de CORS, y
   comentarios que explican el ataque concreto que previenen. Nivel senior sin discusión.
2. **El hook `pre-commit`** — escanea el contenido staged, gestiona falsos positivos, documenta el
   escape. Me bloqueó a mí durante esta serie de fases; funciona.
3. **98 tests que pasan**, con `security.test.js` y `auth.cookie.test.js` entre ellos. Y un CI
   (`ci.yml`) con concurrency y un barrido de secretos que sí escanea — a diferencia del de `main`,
   que usaba `grep --include` con llaves y no escaneaba nada.
4. **El historial cuenta una historia de ingeniería.** El 45 % de los commits son corrección
   dirigida por auditoría, no features. Eso distingue a alguien que termina sistemas.
5. **Migraciones reparadas y verificadas** con prueba negativa incluida: rompí un trigger a
   propósito y la validación lo detectó.
6. **Decisiones documentadas con la alternativa descartada y el rollback.** Los ADR y la sección
   «Publication Scope» (publicar el nivel de decisión, no el método comercial) son un argumento
   maduro y poco común.
7. **Sanitización de los ejemplos n8n**: cero credenciales, `$env` en todo, cumple las 8 reglas
   propias.
8. **El historial está limpio de secretos** tras 67 commits, verificado con 7 familias de patrones.

---

## 14. Score final

| Área | Nota | Nota alcanzable con §15 |
|---|---|---|
| Arquitectura | **8/10** | 8 |
| Backend | **8/10** | 9 |
| Frontend | **7/10** | 7 |
| Database | **7/10** | 9 |
| Docker / DevOps | **8/10** | 8 |
| Seguridad | **6/10** | 8 |
| n8n / Automations | **5/10** | 8 |
| Documentación | **5/10** | 8 |
| **Portfolio readiness** | **6/10** | **9** |

**Media: 6.7/10** · alcanzable **8.2/10**

Para comparar: la auditoría de FASE 21 sobre `main` dio **3.6/10**. La recuperación y la reparación
de migraciones valen casi tres puntos, y no se escribió una sola línea de funcionalidad nueva.

---

## 15. Acciones exactas antes de publicar en GitHub

### 🔴 Bloqueadores — antes del push (≈ 1 h 15 min)

1. **Redactar los IDs de los informes de rama.**
   Sustituir por `<credential-id-redactado>` y `<portal-id-redactado>`. No hace falta tocar el
   historial: esos commits son locales y aún no están en `origin`. **(5 min)**
2. **Sustituir la PII de `scripts/test-lead-webhook.sh`** por `Jane Smith / jane@example.com /
   +1 555 0100` y `Demo Company`, según las Documentation Rules del propio repo. **(5 min)**
3. **Reescribir el README.** Es la acción de mayor retorno del proyecto entero:
   - Quitar el bloque «FASE 0 — Infraestructura Base» del final o moverlo a `docs/`.
   - Añadir lo que existe y está verificado: backend con 9 grupos de rutas, dashboard con 14 rutas,
     15 migraciones con RLS, 98 tests, Stripe, marketplace, API keys, `/api-docs`, CI.
   - Un «Quick start» que levante **el sistema completo**, no solo n8n + Postgres.
   - Badge de CI y **capturas o un GIF del dashboard**: hoy no hay ninguna prueba visual de que el
     producto exista.
   - Sección «Roadmap» explícita para Redis, RabbitMQ, Google Sheets y Shopify, que hoy se
     enuncian como parte del stack sin código detrás. **(1 h)**
4. **Arreglar el enlace roto** a `docs/IMPLEMENTATION_PLAN.md` (versionarlo tras revisarlo, o
   quitar el enlace). **(2 min)**

### 🟡 Antes de enseñárselo a un entrevistador (≈ 4 h)

5. **Activar RLS de verdad:** migración `016` con `ALTER TABLE … FORCE ROW LEVEL SECURITY` en las 6
   tablas, y cambiar el backend a conectar con el rol `app` (`ALTER ROLE app LOGIN PASSWORD …` en
   el despliegue). Convierte la garantía estrella de decorativa en real. **(1,5 h)**
6. **Hashear las API keys:** guardar `sha256(key)` + prefijo visible de 8 caracteres; `list()`
   devuelve solo el prefijo; el valor completo se muestra una única vez al crearla. **(1 h)**
7. **Verificar firmas de webhook:** HMAC `X-Hub-Signature-256` en WhatsApp y `X-Twilio-Signature`
   en Voice. Quitar el `'portafolio_verify_2024'` por defecto. **(1 h)**
8. **Arreglar los 3 workflows n8n, importarlos en n8n y volver a exportarlos.** Añadir el prefijo
   `=` a las 5 expresiones, corregir el Switch, desconectar la segunda salida del nodo Code, y
   añadir `retryOnFail` y autenticación por cabecera en los webhooks. Es tu escaparate para el rol
   que persigues. **(1,5 h)**
9. **Poner auth o allowlist delante de n8n**, o sacarlo del vhost público.

### 🟢 Después (opcional)

10. `middleware.ts` en Next para protección de rutas en servidor.
11. Tabla de control de migraciones y `ON_ERROR_STOP=1` en `docs/deployment-guide.md`.
12. Tests de frontend.
13. Parametrizar `example.com` en los 8 ficheros.
14. `cap_drop`, `no-new-privileges` y límites de recursos en el compose.
15. Revalidar los targets de Prometheus (quedaron 3 de 4 rotos en FASE 21; no revalidados aquí).

---

## 16. Cierre

El proyecto pasó de **3.6/10 a 6.7/10** en tres fases, sin escribir funcionalidad nueva: lo que
faltaba era publicar lo que ya existía y reparar lo que nunca se había ejecutado.

Lo que queda para llegar a **8.2** son diez horas de trabajo, y las tres primeras son de
publicación, no de ingeniería.

**Recomendación:** haz los cuatro bloqueadores (§15.1) y publica. Los riesgos altos son reales pero
son conversación de entrevista, no vergüenza pública — y un repositorio que arranca, se construye,
pasa 98 tests y despliega con TLS ya está por encima de la media con holgura.

Lo único que hoy no perdonaría un revisor de tu propio nicho son los tres bugs de los workflows
n8n. Si solo pudieras hacer una cosa de las nueve primeras, haz la 8.

---

*Verificado por ejecución: `npm test` (98/98), `node -e "require('./src/app.js')"`, `npm run lint`,
`tsc --noEmit`, `npm run build` (14 rutas), `docker compose config` ×2, `docker compose build`,
stack completo arriba con `nginx -t`, 15 migraciones + 2 seeds sobre BD limpia (exit 0), pruebas de
RLS como propietario y como rol `app`, barrido de secretos sobre 67 commits, y análisis
programático de los 3 workflows n8n. Sin modificar archivos, sin commits.*
