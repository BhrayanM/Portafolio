# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-26 (cierre RC → release: **BLOQUEADO**) · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

# CIERRE RC → RELEASE: 🔴 BLOQUEADO (push)

2026-07-26. Checklist completo en **`docs/RELEASE_CHECKLIST.md`**.
Todo verde salvo **un bloqueante**: no se puede hacer push.

## El bloqueante · R-03 — Dos passwords en claro en el historial local

Al preparar el push se barrieron las **27 683 líneas añadidas** por los 58 commits pendientes. Los 8
patrones de tokens con prefijo (`sk-`, `xox`, `pat-`, `ghp_`, `AKIA`, claves privadas, cadenas
Postgres, credenciales n8n) salieron **limpios**. Apareció lo que ningún patrón buscaba: **dos
contraseñas en claro** en 7 ficheros versionados — la del **owner de n8n** (que en producción se
publica en `n8n.portafolio.ai`) y la del **admin sembrado por `002_admin_user.sql`**.

**Todavía no hay exposición**: `git log -S` sobre `origin/main` da **0** para ambas. Se ha llegado a
tiempo. Por eso es un bloqueo, no un incidente.

**Redactarlas no basta.** Ya están redactadas en el árbol (R-04), pero entraron en 4 commits
pendientes (`4779634`, `e0a9c99`, `cb543ee`, `6c5ab82`): un push los publica con su contenido
original. Hay que elegir —**es decisión humana**—:

- **Vía A · rotar las credenciales** (recomendada): cambiar la password del owner en n8n y regenerar
  el hash del seed. Lo que se publique queda obsoleto. Barata y no toca el historial.
- **Vía B · reescribir el historial** con `git filter-repo`. Reescribe 58 commits, cambian todos los
  SHA. Solo compensa si molesta que las passwords antiguas queden legibles.

## Correcciones aplicadas

| ID | Hallazgo | Corrección |
|---|---|---|
| R-01 🔴 | `docker-compose.prod.yml` **secuestraba el stack de desarrollo**: mismo nombre de proyecto derivado del directorio, mismos servicios `postgres`/`n8n` y mismos volúmenes. Un `up` de prod recreaba los contenedores de dev con config de producción y **rompía el webhook en localhost** | `name: portafolio-prod`. Aislamiento verificado |
| R-06 🔴 | **`ci.yml` nunca estuvo en git.** La regla `workflows/` del `.gitignore` —para los exports de n8n— no estaba anclada y casaba también con `.github/workflows/`. F21 dijo «el CI nunca ha corrido» y lo achacó a la falta de push: en realidad **pushear tampoco lo habría hecho correr**, porque el fichero no existe en el remoto | Regla anclada a `/n8n/workflows/`. Verificado: los 4 exports de n8n siguen ignorados, `ci.yml` ya no |
| R-02 | El barrido de secretos del CI solo miraba tokens con prefijo: **habría dejado publicar las passwords** | Patrón nuevo, 0 falsos positivos |
| R-04 | Las dos credenciales en 7 ficheros | Redactadas a `<N8N_ADMIN_PASSWORD>` / `<ADMIN_SEED_PASSWORD>`; fixture del test desacoplado. 98/98 verdes |

## Condiciones de F21 que resultaron NO bloquear

- **Git**: `origin` configurado, Git Credential Manager activo, lectura del remoto OK.
- **CI**: los 3 jobs pasarían — lint, 98/98, `tsc --noEmit` exit 0, build, barrido de secretos.
  Pero el workflow **no estaba versionado**: ver R-06, que reescribe el diagnóstico de A-18.
- **F20-3 (mount SSL)**: ✅ **verificado en contenedor real** — ambos certs legibles en
  `/etc/nginx/ssl/` y bundle de CAs intacto (299 entradas).
- **A-04 (upstream n8n)**: ✅ mecanismo confirmado en contenedor real —
  `[emerg] host not found in upstream` aborta el arranque. El fix era correcto.
- **n8n**: versión **2.31.6**, `healthz` ok, y `POST /webhook/lead-qualification` responde
  **200 `{"received":true}`**. Workflow activo, nada modificado.

## R-05 🟠 — Los contenedores vivos no son los que declaran los compose

Solo visible con el demonio arrancado. Se crearon con una versión anterior de `docker-compose.yml`:

| | Compose declara | En ejecución |
|---|---|---|
| n8n / postgres | `127.0.0.1:5678` / `127.0.0.1:5432` | **`0.0.0.0`** en ambos |
| Imágenes | `n8n:2.31.6` · `postgres:15.18-alpine` | `n8n:latest` · `postgres:15-alpine` |

**La UI de n8n y PostgreSQL están publicados en todas las interfaces**, no en loopback. El compose ya
es correcto desde hace fases; falta **recrear los contenedores** (`docker compose up -d`), lo que de
paso aplica el pinning de F20-2. No se hizo aquí a propósito: recrea n8n, y eso es decisión
explícita. Los datos están en el volumen, el workflow no se pierde.

*(La versión en ejecución sí es 2.31.6: el tag `latest` resolvió a la correcta.)*

## Estado del demonio Docker

Se arrancó Docker Desktop para poder cerrar las áreas 3 y 4 — estaba parado y era lo que impedía
verificar nada de runtime en F21. Los contenedores de dev volvieron solos (`restart: always`).
**No se levantó el stack de producción**: el clasificador de permisos bloqueó `up --build`, así que
la validación se hizo con contenedores efímeros (`docker run --rm`), que dieron los dos resultados
de arriba. No quedaron residuos.

---

# FASE 21 COMPLETADA — Release Candidate: APTO CON CONDICIONES

Cerrada el 2026-07-26. Informe completo en **`docs/FASE21_AUDITORIA_FINAL.md`**.
Auditoría integral F0→F20 sobre 8 áreas. **0 bloqueantes abiertos.**

Backend lint limpio · **98/98 tests** · build frontend OK · los 3 compose validan.

## Corregido en F21 (solo config/docs, sin tocar lógica)

| ID | Hallazgo | Corrección |
|---|---|---|
| A-04 | nginx prod sin `n8n` en `depends_on` pese a declarar `upstream n8n` → nginx se niega a arrancar si el nombre no resuelve | Añadido a `depends_on` |
| A-03 | `.env.example` declaraba Redis **dos veces** con valores contradictorios; dotenv se queda con la última → dentro de Docker apuntaba a `localhost` | Consolidado en una sola declaración |
| A-02 | `NEXT_PUBLIC_REQUEST_TIMEOUT_MS` usada en código y sin documentar (la introduje en F20) | Añadida a `.env.example` |
| A-05 | CLAUDE.md decía «10 migraciones»; son **15** + 2 seeds | Corregido |

## Hallazgos que NO se corrigieron (y por qué)

- **A-01 · el caso `/usage` estaba mal diagnosticado.** No es «endpoint sin implementar»:
  `/api/tenants/usage` **existe**. Lo que hay es doble desajuste — el frontend llama a `/usage`, y
  aunque se repunte los contratos no casan (backend `{total_leads,total_runs,total_users}` vs tipo
  `ApiUsage {total,by_endpoint,period}`; la página haría `undefined.toLocaleString()`).
  Decidir qué significa «uso» es **decisión de producto**, no arreglo de auditoría. → F22.
- **A-08 · Joi solo cubre `auth`/`leads`/`billing`.** Entran sin validar `users`, `tenants`, `keys`,
  `marketplace`, `whatsapp`, `voice`. Mitigado por las allowlists de campo de los servicios.
- **A-09 · `users.role` sin enum** ni en Joi ni en `CHECK` de DB. No es escalada (la ruta ya es
  admin-only), pero un rol con errata deja al usuario fuera de todo `authorize()` en silencio.
- **A-07 · dos migraciones `013_*`.** Renumerar descuadraría el registro de aplicadas en la DB real.

## El hallazgo con más consecuencias: A-18

**El CI nunca ha corrido.** `origin/main` sigue en `e2cadc3`, hay **57 commits locales sin pushear**.
`.github/workflows/ci.yml` está bien montado y su job de frontend ejecuta `npm run build`: **si
hubiera corrido una sola vez, habría detectado el frontend roto (F20-4) en el momento en que F19(d)
lo rompió**, no tres fases después. Con 0 tests de frontend (A-17), el build es la única red de
seguridad de esa capa, y estaba desconectada.

## Verificado limpio (lo que más importa en repo público)

- Los 4 exports de workflows n8n están en disco pero **nunca entraron en el historial**:
  `git log --all -- "n8n/workflows/*.json"` sale vacío. La barrera aguanta.
- `.env` no trackeado · 0 `.pem`/`.key` en git · `_PRIVADO_NO_SUBIR/` y `backups/` fuera.
- 0 SQL por concatenación · CSP completa · aislamiento multi-tenant con allowlist de campos.
- Producción no expone nada al host salvo nginx (80/443).

## No verificado en F21

El demonio de Docker no estaba corriendo. **No se re-verificó** el workflow `92fIV59ijURIYfwT`, las
ejecuciones E2E ni `lead_log`; ese estado viene de fases cerradas. Levantar el stack habría
reiniciado el n8n con el workflow activo. Tampoco se han podido probar en vivo las dos correcciones
de infra (F20-3 certs y A-04 upstream): **verificarlas en el primer arranque real**.

## Checklist de release

- [ ] Los **7 requisitos previos** de `docs/FASE20_DESPLIEGUE.md` (secretos + certs).
- [ ] **A-11**: el `.env` local sigue con `JWT_EXPIRES_IN=7d` pisando el default de 24h. Verificado
      abierto; es la única deuda de F19/F20 que sigue viva.
- [ ] Push de los 57 commits y CI en verde antes de etiquetar.
- [ ] Confirmar a mano que el workflow n8n sigue activo y publicado.
- [ ] Primer `up` de producción: nginx con certs en `/etc/nginx/ssl` y upstream `n8n` resuelto.

---

# FASE 20 COMPLETADA — el stack queda desplegable

Cerrada el 2026-07-25. Detalle en **`docs/FASE20_DESPLIEGUE.md`**.
Backend lint limpio · **98/98 tests** · build frontend **OK (14 rutas)** · los 3 compose validan.

**Siguiente paso: despliegue real** (VPS + dominio + Cloudflare), bloqueado por los 7 requisitos
previos de la tabla de abajo. Ninguno es código.

## Lo que corrigió F20

| # | Hallazgo | Corrección |
|---|---|---|
| F20-3 | 🔴 Mount `./docker/ssl:/etc/ssl` vs `nginx.conf` que lee de `/etc/nginx/ssl` → **prod no arrancaba** | Mount movido a `/etc/nginx/ssl`. `nginx.conf` intacto |
| F20-4 | 🔴 `frontend/src/lib/api.ts` **no compilaba** desde F19(d): 4 exports perdidos que 5 páginas importan | Repuestos `apiFetch`, `activityApi`, `settingsApi`, `usageApi` |
| F20-5 | 🔴 `apiFetch` mandaba cuerpo JSON **sin `Content-Type`** → el login respondía 400 con credenciales correctas | Header por defecto en cuanto hay `body` |
| F20-2 | 6 imágenes con tag flotante | Pineadas a patch exacto, **sin cambiar de versión** |
| F20-1 | `STRIPE_WEBHOOK_SECRET`: fallo en cerrado implementado pero **sin un solo test** | `backend/tests/deploy.config.test.js`, 5 tests |

**F20-4 y F20-5 no estaban previstos**: salieron al ejecutar `npm run build`, que era una validación
obligatoria de la fase. En el mismo fichero se eliminaron dos restos de F19(d) que contradecían el
contrato de seguridad: una comprobación de origen inoperante (leía `CORS_ORIGINS`, sin prefijo
`NEXT_PUBLIC_` → siempre `undefined` en el navegador → logueaba el tenant ID en cada petición) y una
lectura de `localStorage.getItem('app.authToken')`, cuando la sesión va en cookie HttpOnly desde F19.

## Decisiones de F20

1. **No se creó ningún secreto de Stripe falso.** Lo entregado es el fallo en cerrado **verificado
   con tests**: aborta el arranque en producción, 503 `STRIPE_WEBHOOK_NOT_CONFIGURED` fuera de ella.
2. **Los pins no cambian ninguna versión.** Cada uno es lo que el tag flotante ya resolvía
   (comprobado contra la API de Docker Hub). Se congela la resolución, no se actualiza nada.
3. **`n8nio/n8n:2.31.6` y `docker/nginx.conf` no se tocaron.** El primero es el runtime del workflow
   activo; el segundo tenía las rutas repetidas en 3 `server` blocks y el compose una sola línea.
4. **RabbitMQ se queda en 3.13.7.** Subir a 4.x es cambio de major y el worker es un placeholder.
5. **No se levantó ningún contenedor.** El demonio de Docker no corría, y `up` habría reiniciado el
   n8n con el workflow activo. F20-3 está verificado por lectura cruzada mount↔config.

## Requisitos previos de despliegue (los aporta quien despliega)

| # | Requisito |
|---|---|
| 1 | `STRIPE_WEBHOOK_SECRET` = `whsec_...` real |
| 2 | `JWT_SECRET` real (`openssl rand -hex 64`) |
| 3 | `CORS_ORIGINS` con dominio real (ni `*` ni `localhost`) |
| 4 | `POSTGRES_PASSWORD` + `N8N_ENCRYPTION_KEY` (`${VAR:?error}` en compose) |
| 5 | **`docker/ssl/*.pem` presentes** — gitignored, no vienen en un clon nuevo |
| 6 | `TRUST_PROXY=1` con nginx delante (desactivado por defecto a propósito) |
| 7 | `.env` local: `JWT_EXPIRES_IN=7d` sigue pisando el default de 24h (heredado de F19a) |

---

# FASE 18 COMPLETADA

Cerrada el 2026-07-25. **Siguiente paso: F19 Security Hardening — requiere confirmación humana.**
**Parada obligatoria antes de F20.**

## Bloques ejecutados

| Bloque | Commit | Resultado |
|---|---|---|
| F18.1 — Normalización billing plans | `b91fba6` | `price: 'pro'` permitido en `growth`/`enterprise`; mensaje corregido |
| F18.2 — Alineación enums de Lead | `f3805f1` | `ai_category` canónico `HOT/WARM/COLD` en las 6 capas |
| F18.3 — Limpieza lint backend | `41cf053` | De 5 errores a lint limpio, sin tocar lógica |
| F18.4 — Redis | `6f355ff` | Alcance vacío: verificado y documentado, **no cableado** |
| F18.5 — Nginx + trust proxy | `feat(F18.5)` | Proxy local funcional + `trust proxy` resuelto y probado |

## Decisiones clave

1. **`ai_business_category` NO es un enum de intención** (F18.2). Es el sector de negocio en texto
   libre que emite el LLM. Cerrarlo a 4 valores habría rechazado lo que n8n ya escribe.
2. **Redis no se cableó** (F18.4). Está completo pero sin un solo consumidor; integrarlo no
   habría cambiado nada en runtime. Anti-sobreingeniería.
3. **`TRUST_PROXY` desactivado por defecto** (F18.5). Activarlo sin proxy delante permite falsear
   la IP por cabecera y saltarse el rate limiter. Y vale `1`, no `true`.
4. **El nginx de producción no se tocó** (F18.5). Se creó un config local aparte en vez de
   convertir el de prod a HTTP.
5. **Compose local separado** (F18.5), para no reiniciar el n8n con el workflow activo.
6. **Los enums vienen de una sola fuente**: `backend/src/lib/lead.js` es el origen de
   `CATEGORIES`/`normalizeCategory`; el resto de capas los importan.

## Estado al cerrar la fase

- **Tests: 86/86 verdes** (empezó la fase en 77).
- **Lint: limpio** en `src/` y en `tests/`.
- **Build frontend: OK**, 14 rutas.
- n8n **intacto** durante toda la fase: no se tocó el workflow ni se reinició el contenedor.

## Deuda restante al cerrar FASE 18

| Deuda | Destino |
|---|---|
| ~~`STRIPE_WEBHOOK_SECRET` vacío → firma se verifica con `\|\| ''`~~ | ✅ F19(a) H-01 + tests en **F20** |
| ~~Certs de nginx prod: mount `/etc/ssl` vs rutas de `nginx.conf`~~ | ✅ **F20-3** |
| ~~Imágenes docker sin pinear~~ | ✅ **F20-2** |
| Renombrar `ai_category` → `classification` | Futuro (requiere migración + tocar n8n) |
| Intención de lead sin contrato real (columna nueva si se quiere) | Futuro |
| Redis al rate limiter cuando haya varias réplicas | Futuro |
| n8n `leadStatus` COLD→OPEN · mapeo `hs_lead_status` unificado | Pendiente |
| Secretos locales en disco | F19(b) |
| `/leads/activity` y `/usage` sin implementar · 0 tests frontend | Futuro |

---

## Último bloque cerrado

**F19(a) — Security Hardening Backend. Auditoría + correcciones aplicadas.**

Detalle completo en **`docs/FASE19_SECURITY_HARDENING.md`**. Resumen:

- **13 hallazgos corregidos** (2 críticos, 3 altos, 6 medios/bajos). Tests **93/93**, lint limpio.
- **H-01 Stripe**: el matiz importa — con `STRIPE_WEBHOOK_SECRET` vacía la firma **no fallaba en
  cerrado**, era **forjable por cualquiera** (HMAC con clave vacía), y el webhook escribía `plan` y
  `tenant_id` del metadata sin validar → cualquiera se ponía `enterprise` en cualquier tenant.
- **H-02**: eliminados los secretos por defecto del código (`'dev-secret-change-in-production'`,
  `'postgres'`, credenciales de rabbit). En producción, sin las variables **el proceso no arranca**.
- **`/register` cerrado a admin** (D-07): el `tenantId` del body se ignora. La lógica de creación
  quedó **intacta** para construir invitaciones encima.
- PII fuera de los logs; `/api/metrics` autenticado; `x-tenant-id` como puerta trasera eliminado;
  `algorithms: ['HS256']` fijado; CSP aditiva sin tocar `scriptSrc`.

**Dos acciones manuales pendientes** (ver el doc): el `.env` local tiene `JWT_EXPIRES_IN=7d` que
sobrescribe el nuevo default de 24h, y `STRIPE_WEBHOOK_SECRET` sigue vacía — en producción el
backend no arrancará hasta que tenga valor real.

**Siguiente**: F19(b) Infra — requiere confirmación humana. **Parada obligatoria antes de F20.**

---

**F18.5 — Nginx reverse proxy local + `trust proxy` en el backend. Con esto FASE 18 queda cerrada.**

### Estado real que se encontró (no era lo que parecía)

- Nginx existía **solo en `docker-compose.prod.yml`**, nunca en el compose local.
- **Nunca se había ejecutado**: no había contenedor nginx ni en `docker ps -a`.
- `docker/nginx.conf` es **100 % HTTPS + dominio** (`portafolio.ai`, `api.`, `n8n.`). El puerto 80
  solo hace `301` a https. No servía para trabajar en local.
- `docker/ssl/` sí tiene certs self-signed (`fullchain.pem`, `privkey.pem`).
- El backend **no tenía `trust proxy`** (hallazgo heredado de F18.4).

### Qué se hizo

| Archivo | Cambio |
|---|---|
| `backend/src/config/index.js` | Nuevo `trustProxy` + helper `parseTrustProxy()`, leído de `TRUST_PROXY`. Exportado aparte para poder testearlo. |
| `backend/src/app.js` | `app.set('trust proxy', config.trustProxy)` antes de los middlewares. |
| `docker/nginx.dev.conf` | **Nuevo.** Reverse proxy HTTP para local: `server_tokens off`, cabeceras de proxy completas, timeouts, log con `xff`. |
| `docker-compose.dev.yml` | **Nuevo.** `nginx-local` (8080→80) + `portafolio-api` con `TRUST_PROXY=1`, sobre la red **externa** ya existente. |
| `backend/tests/config.test.js` | **Nuevo.** 8 tests del parseo de `TRUST_PROXY` y del default seguro. |
| `.env.example` | Documentada `TRUST_PROXY`. |

### Decisiones técnicas

1. **`docker/nginx.conf` (prod) NO se tocó.** Se creó un archivo local aparte en vez de convertir
   el de producción a HTTP: el de prod es de ETAPA C y romperlo para probar en local sería un
   cambio destructivo.
2. **Compose local separado, con `networks: external: true`.** `docker-compose.yml` levanta el n8n
   con el workflow activo; añadir nginx ahí y hacer `up` lo habría reiniciado. Con un fichero
   aparte enganchado a la red ya creada, **n8n y postgres no se tocan** (verificado: siguieron
   con 14 h y 16 h de uptime durante toda la prueba).
3. **`TRUST_PROXY` por defecto DESACTIVADO.** Es la decisión de seguridad del bloque: con el
   backend expuesto directo, `trust proxy` activo permitiría a cualquiera mandar
   `X-Forwarded-For: <lo que sea>` y estrenar cubo de rate limit en cada petición. Se activa
   (`=1`) solo donde de verdad hay un proxy delante.
4. **`1` y no `true`.** `true` confía en toda la cadena XFF y vuelve a ser falsificable;
   `1` descuenta exactamente un salto, el de nginx.
5. Puerto **8080** en el host, no 80, para no chocar con nada que ya escuche ahí.
6. **Los ficheros se llaman `.dev.` y no `.local.`**: `.gitignore:112` ignora `*.local.*` como red
   de seguridad contra secretos en un repo público, y estos dos deben versionarse. Se renombraron
   en vez de forzar `git add -f`, para no debilitar ese guardia ni sentar el precedente.

### Evidencia de la prueba real

```
curl http://localhost:8080/health -> 200
{"status":"ok","db":"connected",...}                      # nginx -> backend OK

# Rate limiter keyea por XFF (trust proxy activo):
XFF=10.9.9.1 -> RateLimit-Remaining: 99
XFF=10.9.9.1 -> RateLimit-Remaining: 98     # mismo cubo
XFF=10.9.9.2 -> RateLimit-Remaining: 99     # cubo nuevo

# A traves de nginx, cliente falsificando XFF:
finge 8.8.8.8 -> Remaining: 99
finge 1.1.1.1 -> Remaining: 98              # MISMO cubo: no es falsificable

# Log de nginx:
172.21.0.1 -> 172.21.0.4:3000 "GET /api/billing/plans HTTP/1.1" 200 xff="8.8.8.8"
```

Tests: **86/86 verdes** (78 → 86, +8 nuevos). Lint limpio (`src/` y `tests/`).

### Deuda / entregado a F19 y ETAPA C

- **`docker-compose.prod.yml` monta `./docker/ssl:/etc/ssl:ro`, pero `docker/nginx.conf` busca los
  certs en `/etc/ssl/certs/fullchain.pem` y `/etc/ssl/private/privkey.pem`.** Con ese mount los
  ficheros quedan en `/etc/ssl/fullchain.pem`: **nginx de producción no arrancaría**. Además,
  montar sobre `/etc/ssl` tapa el bundle de CAs del contenedor. No se corrigió aquí porque
  SSL/certs/dominio están explícitamente fuera de alcance. → **ETAPA C**.
- `docker-compose.prod.yml` y `docker-compose.yml` usan `n8nio/n8n:latest` (imagen sin pinear). → **F19(b)**.
- El nginx local proxya **solo al backend**. El frontend no se incluyó: su upstream no resolvería
  si el contenedor no está levantado y nginx **falla al arrancar** si un upstream no resuelve.
- Rate limiting en nginx, WAF y headers de seguridad del proxy: **fuera de alcance de F18.5**, → **F19**.

Para levantar/parar el stack local:
`docker compose -f docker-compose.dev.yml up -d --build` · `... down`

---

**F18.4 — Redis verificado y cerrado con alcance vacío. No se cableó nada.**

Decisión: **NO cablear Redis** (anti-sobreingeniería). Está completo como scaffolding, pero
**no tiene un solo consumidor**, así que integrarlo hoy no cambiaría nada en runtime.

| Capa | Estado verificado |
|---|---|
| `backend/src/services/cache.service.js` | Implementado completo (`get`/`set`/`del`/`increment`), con degradación elegante: devuelve `null`/no-op si Redis está deshabilitado o la conexión falla |
| **Consumidores** | **Cero.** `grep` en `backend/src` y `backend/tests`: nadie lo requiere |
| `backend/src/config/index.js:35-40` | Bloque `redis` leído de env, sin hardcodear |
| `ioredis` | Declarado en `backend/package.json` |
| `docker-compose.yml:51` | Servicio `redis:7-alpine` con `--requirepass` |
| `REDIS_ENABLED` en `.env` real | **No existe** → `undefined === 'true'` → `false` |
| Contenedor Redis | **No corriendo** (solo n8n + postgres) |

**No hay nada roto que arreglar**: al no llamarlo nadie, encender Redis no altera el runtime.
El bloque F18.4 tal y como estaba definido ("integrar solo lo que el código YA necesita")
tiene alcance vacío. Cero cambios de código en este bloque.

### Deuda futura (F18.4)

- **Cablear Redis como store de `express-rate-limit` cuando se escale a varias réplicas.**
  Hoy `backend/src/middleware/rateLimit.js` usa el store **en memoria** por defecto en sus 3
  limitadores: los contadores se pierden en cada reinicio y no se comparten entre instancias.
  Con un solo contenedor de API esto es correcto; con réplicas, no. Requiere `rate-limit-redis`
  y fallback a memoria si Redis no responde.
- Alternativa si nunca se escala: **retirar** Redis del proyecto (`cache.service.js`, `ioredis`,
  servicio de compose y bloque de config) por ser código muerto. Decisión aplazada.

### Hallazgo derivado, entregado a F19

**Falta `app.set('trust proxy', ...)` en Express.** `docker/nginx.conf` reenvía `X-Forwarded-For`,
pero Express no confía en el proxy: detrás de nginx **los rate limiters cuentan por la IP del
contenedor nginx**, no la del cliente, así que un solo abusador agota el cupo global de todos.
Bug real, solo visible en la topología con nginx delante. → **Se resuelve en F18.5**.

---

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
| F18.4 — Redis (alcance vacío, no cableado) | ✅ Cerrado |
| F18.5 — Nginx reverse proxy + trust proxy | ✅ Cerrado |
| **FASE 18 completa** | ✅ **Cerrada** |
| F19(a) — Security Hardening Backend | ✅ Cerrado |
| F19(c) DB · (d) Frontend | ✅ Cerrados |
| F19(b) Infra · (e) Swagger | ⏸ Pendientes |
| **F20 — Auditoría y Preparación para Despliegue** | ✅ **Cerrada** |
| **F21 — Auditoría Final Integral · Release Candidate** | ✅ **Cerrada** (apto con condiciones) |

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
- `npm test` en `backend/` → **98 verdes** (6 suites) desde F20.
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