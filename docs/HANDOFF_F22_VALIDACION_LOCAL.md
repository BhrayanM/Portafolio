# HANDOFF — F22 · Validación local completa (backend, BD, n8n)

> **Fecha:** 2026-07-26 · **Rama:** `release/v1-publication-ready` · **Sin commit, sin push, sin merge.**
>
> **LA SIGUIENTE FASE EMPIEZA CON VERIFICACIÓN MANUAL DESDE EL NAVEGADOR.**
> Una vez aprobada por el autor, se continúa con las integraciones OpenAI/Groq.
> **No avanzar a integraciones antes de esa aprobación.**

---

## 0. Resumen en una frase

Backend, PostgreSQL, n8n **y el frontend** quedan **validados de extremo a extremo** en el stack
Docker de producción local. **R1 (frontend no consumía la API) está RESUELTO** aplicando la
topología prevista por el repositorio: inyección de `NEXT_PUBLIC_API_URL` en build-time +
subdominios de nginx + CORS. Falta **una única acción del autor**: añadir tres entradas al fichero
`hosts` de Windows (requiere permisos de administrador) — ver §7-bis.

> **Actualización 2026-07-26 17:13 — F22 R-03.** Las secciones §6 y §7 describen el problema y las
> opciones **tal como estaban antes** de resolverlo; se conservan como registro del diagnóstico.
> El estado vigente es §7-bis.
>
> **Actualización 2026-07-26 18:20 — F22 R-04…R-08 · ESTADO RELEASE CANDIDATE.**
> Cerrados además **R2** (rol `app` → RLS efectivo, aislamiento demostrado),
> **R3** (cookie acotada al JWT), **R7** (`TRUST_PROXY`), **R11** (`/leads/activity` implementado,
> contrato de `/usage` alineado). **103/103 tests.** Ver §13.

---

## 1. Estado del sistema — dos stacks simultáneos

Es lo primero que hay que entender para no diagnosticar el contenedor equivocado.

| Proyecto compose | Fichero | Contenido | BD / volumen |
|---|---|---|---|
| `portafolio-prod` | `docker-compose.prod.yml` | nginx, api, frontend, postgres, n8n | `portafolio-prod_postgres_data` |
| `portafolio-publico` | `docker-compose.yml` | postgres, n8n **(workflow activo)** | `portafolio-publico_postgres_data` |

**Son bases de datos distintas.** `docker compose ps` sin `-f` muestra el stack *dev*.
El trabajo de esta sesión se hizo sobre **`portafolio-prod`** salvo donde se indique.

### Contenedores (verificado 2026-07-26 17:02)

```
portafolio-prod-nginx-1                 Up (estable, sin reinicios desde 16:43:07)
portafolio-prod-portafolio-api-1        Up (healthy)
portafolio-prod-portafolio-frontend-1   Up
portafolio-prod-postgres-1              Up (healthy)
portafolio-prod-n8n-1                   Up
portafolio-publico-postgres-1           Up (healthy)
portafolio-publico-n8n-1                Up
```

> `RestartCount=17` en nginx es histórico (bucle previo a la corrección). No ha reiniciado desde
> las 16:43:07.

---

## 2. Credenciales del entorno LOCAL

> Solo para desarrollo local. **No están en el repositorio ni deben commitearse.**

| Campo | Valor |
|---|---|
| URL | `https://localhost/login` (o `http://localhost:3001` en flujo host) |
| Email | `admin@example.com` |
| Contraseña | `kWkryenHoYUQLk5NdicqhDGJ` |
| Rol | `admin` · tenant `00000000-0000-0000-0000-000000000001` |

Usuario secundario creado para probar autorización por rol:

| Email | Contraseña | Rol |
|---|---|---|
| `member.prueba@example.com` | `MemberPrueba2026` | `member` |

**Origen:** el seed `database/seeds/002_admin_user.sql` inserta un hash bcrypt cuyo texto plano
**no está en el repo por diseño** (lo documenta el propio fichero). Se generó una contraseña
aleatoria de 24 caracteres, se calculó el hash con el `bcrypt` del backend (cost 12, igual que
`BCRYPT_ROUNDS` en `auth.service.js:7`) y se aplicó con un `UPDATE` **solo sobre la BD local**.
El fichero de seed **no se tocó**.

Para rotarla:
```bash
docker exec portafolio-prod-portafolio-api-1 node -e "console.log(require('bcrypt').hashSync('NUEVA',12))"
docker exec -i portafolio-prod-postgres-1 psql -U n8n -d n8n \
  -c "UPDATE users SET password_hash='<hash>' WHERE email='admin@example.com';"
```

---

## 3. Archivos modificados

| Archivo | Estado | Motivo |
|---|---|---|
| `docker-compose.prod.yml` | Modificado (sesión anterior) | `DB_HOST: postgres` + `DB_PORT: 5432` en `environment:` de `portafolio-api`. `.env` declara `DB_HOST=localhost`, correcto para ejecutar el backend en el host pero inválido dentro de la red de compose: causaba `ECONNREFUSED` → `/health` 503 → contenedor `unhealthy`. `environment` gana a `env_file`, así que se corrige sin tocar `.env`. Sigue el patrón que `docker-compose.dev.yml:46` ya usaba. |
| `docker/ssl/fullchain.pem`, `docker/ssl/privkey.pem` | Creados (sesión anterior) | Self-signed RSA 2048, 365 días, SAN `localhost, example.com, www/api/n8n.example.com, 127.0.0.1`. `docker/ssl/` estaba vacío (`.gitignore:63-64` excluye `*.pem`), y nginx aborta al arrancar si faltan. **Gitignored — verificado con `git check-ignore`.** |
| `docs/HANDOFF_F22_VALIDACION_LOCAL.md` | Creado (este fichero) | Documento de handoff. Sin trackear. |

**En esta sesión no se modificó ningún otro fichero del proyecto**: ni seeds, ni migraciones,
ni `.env`, ni `nginx.conf`, ni código de backend/frontend, ni documentación existente.

```
$ git status --porcelain
 M docker-compose.prod.yml
```

---

## 4. Estado de PostgreSQL

### BD del stack PROD — migraciones aplicadas en esta sesión

Las 16 migraciones de `database/migrations/` **estaban sin aplicar** (la BD solo tenía las tablas
propias de n8n). Se aplicaron con el procedimiento documentado en `README.md:277` — bucle con
`ON_ERROR_STOP=1`, fichero a fichero. **No hay runner de migraciones ni tabla de control**: es un
bucle de shell, por diseño del proyecto.

```bash
for f in database/migrations/*.sql; do
  docker exec -i portafolio-prod-postgres-1 psql -U n8n -d n8n -v ON_ERROR_STOP=1 -f - < "$f" || break
done
# después, igual con database/seeds/*.sql
```

**Resultado: 16/16 migraciones + 2/2 seeds con `rc=0`.**

### Verificación del esquema

| Elemento | Estado |
|---|---|
| Tablas de aplicación | **9/9** — `tenants, users, leads, scores, error_log, tenant_settings, workflow_runs, audit_log, lead_log` |
| RLS | **6/6** tablas multi-tenant con `rowsecurity=t` **y** `forcerowsecurity=t`, 1 política cada una |
| Foreign keys | **10** — todas presentes y correctas |
| Índices | 42 sobre las 9 tablas (audit_log 7 · error_log 6 · leads 6 · lead_log 5 · tenant_settings 4 · tenants 4 · users 4 · scores 3 · workflow_runs 3) |
| Triggers | **4** — `tenants_audit`, `users_audit`, `leads_audit`, `workflow_runs_audit` |
| CHECK constraints | **0 — y es lo correcto.** Las migraciones no declaran ninguno (verificado por grep: la única aparición está comentada en `011_hardening.sql:106`). No es una carencia. |
| Roles `app` / `app_admin` | Existen, **NOLOGIN**, `rolsuper=f`, `rolbypassrls=f` |
| Migraciones pendientes | **Ninguna.** `015_db_validation` y `016_rls_force` son autovalidantes (lanzan `EXCEPTION` si falta el endurecimiento) y ambas terminaron con `rc=0`. |

### Datos actuales (stack prod)

```
tenants=1  usuarios=2  leads=1  audit_log=4  politicas_rls=6
```

### ⚠️ La BD del stack DEV está PARCIALMENTE migrada

`portafolio-publico-postgres-1`: 9/9 tablas, 6 políticas RLS, 1 usuario, **pero el rol `app` NO
existe** → la migración `012_db_roles.sql` nunca se aplicó ahí. Si se decide trabajar contra el
stack dev, hay que completar las migraciones primero.

---

## 5. Estado del backend — VALIDADO

`/health` → `{"status":"ok","db":"connected"}` · healthcheck `healthy`, `FailingStreak=0`.

### Suite de tests

```
Test Suites: 6 passed, 6 total
Tests:       98 passed, 98 total     ← 98/98
Time:        4.2 s
```

### Endpoints verificados (24 pruebas, todas superadas)

**Públicos**

| Endpoint | Esperado | Obtenido |
|---|---|---|
| `GET /health` | 200 | ✅ 200 `db: connected` |
| `GET /api-docs/` | 200 | ✅ 200 (Swagger) |
| `GET /api/billing/plans` | 200 | ✅ 200 (3 planes) |
| `GET /api/marketplace/catalog` | 200 | ✅ 200 |
| `GET /api/ruta-inexistente` | 404 | ✅ 404 `NOT_FOUND` |

**Autenticación**

| Caso | Esperado | Obtenido |
|---|---|---|
| Login correcto | 200 + cookie | ✅ 200, `Set-Cookie` HttpOnly |
| Login contraseña incorrecta | 401 | ✅ 401 `Credenciales inválidas` |
| Login usuario inexistente | 401 | ✅ 401 (mismo mensaje — no filtra si el email existe) |
| Login payload inválido | 400 | ✅ 400 `VALIDATION_ERROR` |
| 6.º intento en la ventana | 429 | ✅ 429 `AUTH_RATE_LIMIT` |
| `POST /api/auth/logout` | cookie borrada | ✅ `Expires=Thu, 01 Jan 1970` |
| `POST /api/auth/register` (admin) | 201 | ✅ 201, rol `member`, tenant heredado del admin (D-07(b) confirmado) |

**Seguridad del JWT**

| Ataque | Resultado |
|---|---|
| Firma manipulada | ✅ 401 |
| Token basura | ✅ 401 |
| **`alg=none` (confusión de algoritmo)** | ✅ **401** — la fijación `algorithms:['HS256']` (H-13) funciona |
| `Authorization: Bearer` válido | ✅ 200 |

**Autorización por rol** (token `member`)

| Ruta admin-only | Resultado |
|---|---|
| `GET /api/users/` | ✅ 403 |
| `POST /api/auth/register` | ✅ 403 |
| `PATCH /api/tenants/settings` | ✅ 403 |
| `POST /api/keys/` | ✅ 403 |
| `GET /api/auth/me`, `/api/leads/`, `/api/tenants/` | ✅ 200 (permitidas) |

**Autenticados con admin — 11/11 en 200**

`/api/auth/me` · `/api/tenants/` · `/api/tenants/settings` · `/api/tenants/usage` ·
`/api/users/` · `/api/leads/` · `/api/leads/stats` · `/api/keys/` ·
`/api/billing/subscription` · `/api/marketplace/installed` · `/api/metrics`

**Creación de lead**

| Caso | Resultado |
|---|---|
| `POST /api/leads` válido | ✅ **201**, lead `3ec65257-…` persistido con `tenant_id` correcto |
| Sin email | ✅ 400 `"email" is required` |
| Sin autenticación | ✅ 401 |
| Trigger de auditoría | ✅ fila `INSERT/leads` en `audit_log` |
| `last_login_at` tras login | ✅ actualizado |

### Cabeceras de seguridad (helmet) — presentes

`Content-Security-Policy` · `Strict-Transport-Security` · `X-Frame-Options: DENY` ·
`X-Content-Type-Options: nosniff` · `Referrer-Policy` · `Cross-Origin-Opener-Policy` ·
`Origin-Agent-Cluster` · `X-Permitted-Cross-Domain-Policies`

---

## 6. Estado del frontend — COMPILA Y RENDERIZA, PERO NO CONSUME LA API

### Lo que funciona

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ **rc=0**, sin errores |
| Build Docker (standalone) | ✅ imagen construida y sirviendo |
| Renderizado SSR de rutas | ✅ **11/11 en 200** vía nginx |
| `/` | ✅ 307 (redirección de app) |
| 404 de ruta inexistente | ✅ 404 |

Rutas verificadas en 200: `/login`, `/dashboard`, `/dashboard/{leads,analytics,activity,billing,integrations,marketplace,usage,settings}`.

> `/api-docs` **no es una ruta del frontend** (CLAUDE.md la lista entre las 14 por error): la sirve
> el backend. Verificado: `https://api.example.com/api-docs/` → 200.

### 🔴 INCIDENCIA BLOQUEANTE — el frontend no alcanza al backend

**Síntoma:** cualquier llamada a la API desde el navegador falla.

**Causa raíz:** `frontend/Dockerfile:9` ejecuta `RUN npm run build` **sin declarar ningún
`ARG`/`ENV` para las variables `NEXT_PUBLIC_*`**. En Next.js esas variables se hornean **en tiempo
de build**. Como no existían durante el build, quedaron sin valor:

1. **En el bundle del navegador:** `API_BASE = process.env.NEXT_PUBLIC_API_URL || ''` resolvió a
   `''`. Verificado: `localhost:3000` **no aparece** en `.next/static`; el chunk conserva
   `r(257).env.NEXT_PUBLIC_API_URL||""` contra el shim vacío de `process`.
   → El navegador llamaría a `/auth/login` (relativa) en vez de a la API.
2. **En el rewrite de `next.config.js`:** el destino se compiló con el valor de reserva.
   Verificado en `server.js`: `localhost:3000/api/:path*`. Ese `localhost` es **el propio
   contenedor del frontend**, donde no escucha nada en el 3000.

**Evidencia empírica (extremo a extremo, vía nginx):**

```
POST https://localhost/auth/login   -> 404   (ruta que usaría el navegador)
GET  https://localhost/api/auth/me  -> 500   (rewrite roto)
GET  https://localhost/login        -> 200   (la página sí carga)
```

Y los propios logs del contenedor frontend lo confirman:

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Por qué no se corrigió:** arreglarlo exige **elegir topología**, y las opciones llevan a
configuraciones distintas de `.env`, `nginx.conf` y del Dockerfile. Es una decisión del autor, no
un detalle de implementación. Ver §7.

> **Nota clave:** `.env` (`NEXT_PUBLIC_API_URL=http://localhost:3000/api`,
> `CORS_ORIGINS=http://localhost:3001,http://localhost:3000`) está afinado para el **flujo de
> desarrollo en host** del README paso 3 (`npm run dev`), **no** para el stack Docker servido tras
> nginx. `docker/nginx.dev.conf` lo corrobora: solo proxya el backend, no tiene upstream de
> frontend.

---

## 7. DECISIÓN PENDIENTE — cómo validar el frontend en el navegador

### Opción A — Flujo de desarrollo en host (RECOMENDADA para validar ya)

Es el flujo que el README documenta y **no requiere ningún cambio**: `.env` ya encaja
(API en `:3000`, frontend en `:3001`, CORS permite ambos).

```bash
# Terminal 1 — backend en host (usa DB_HOST=localhost de .env → postgres publicado en 127.0.0.1:5432)
cd backend && npm ci && npm run dev      # → http://localhost:3000

# Terminal 2 — frontend en host
cd frontend && npm ci && npm run dev     # → http://localhost:3001
```

⚠️ **Atención:** en host, `DB_HOST=localhost:5432` apunta al postgres del stack **dev**
(`portafolio-publico`), que está **parcialmente migrado** (falta la migración 012, no existe el rol
`app`) y **no tiene el usuario admin con la contraseña de §2**. Antes de usar esta vía hay que:
1. aplicar las 16 migraciones + seeds a `portafolio-publico-postgres-1` (mismo bucle de §4), y
2. repetir el `UPDATE` del hash de §2 sobre esa BD.

- ✔️ Cero cambios en ficheros · ✔️ hot reload · ✔️ valida Frontend→Backend→PostgreSQL
- ✖️ No valida la imagen Docker del frontend ni el paso por nginx

### Opción B — Stack Docker en el navegador (fiel a producción)

Requiere **tres cambios coordinados**:
1. `frontend/Dockerfile`: `ARG NEXT_PUBLIC_API_URL` + `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL` **antes** de `RUN npm run build`.
2. `docker-compose.prod.yml`: `build: { context: ./frontend, args: { NEXT_PUBLIC_API_URL: ... } }`.
3. Elegir el destino, y con él el resto:
   - **B1 — subdominio (arquitectura de producción tal cual):** `https://api.example.com/api`.
     Exige añadir al `hosts` de Windows `127.0.0.1 example.com api.example.com n8n.example.com`
     y meter `https://example.com` en `CORS_ORIGINS`. Es cross-origin con cookies → hará falta
     `SameSite=None` + `Secure`, es decir `NODE_ENV=production` (que a su vez exige
     `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `CORS_ORIGINS` sin localhost, o el backend aborta).
   - **B2 — mismo origen:** `NEXT_PUBLIC_API_URL=/api` + un `location /api/ { proxy_pass http://backend; }`
     en el server block del frontend de `docker/nginx.conf`. Más simple y sin CORS, **pero
     introduce una ruta que la arquitectura actual no contempla** (hoy separa por subdominios).

**Recomendación:** **Opción A** para la validación manual inmediata (es lo que el proyecto ya
documenta y no toca nada), y decidir B1 vs B2 más adelante como tarea propia de despliegue.

---

## 7-bis. ✅ R1 RESUELTO — topología aplicada (F22 R-03, 2026-07-26)

**Se eligió la Opción B1** por ser la única fiel a la arquitectura del repositorio. La conclusión
no se supuso: la sostienen cuatro evidencias convergentes.

| Evidencia | Qué demuestra |
|---|---|
| `.github/workflows/ci.yml:67` inyecta `NEXT_PUBLIC_API_URL` en `npm run build` | El mecanismo previsto es **build-time**, por variable de entorno |
| `CORS_ORIGINS` es obligatoria en producción, con validación que rechaza `*` y localhost | Esa maquinaria **solo existe si el navegador llama a la API cross-origin** |
| `docker/nginx.conf` declara 3 vhosts: `example.com`, `api.example.com`, `n8n.example.com` | Orígenes separados por subdominio |
| `frontend/src/lib/api.ts:35` construye `${API_BASE}${path}` con base **absoluta** | El navegador ataca la API directamente |

**El `rewrites()` de `next.config.js` es vestigial** y no se usa: con `API_BASE` absoluta nunca se
pide `/api/*` al origen del frontend, y sería auto-referencial si la variable fuese relativa.
**No se modificó** — no procede tocarlo para este arreglo.

### Cambios aplicados (2 ficheros)

**1. `frontend/Dockerfile`** — `ARG`/`ENV` para `NEXT_PUBLIC_API_URL` y
`NEXT_PUBLIC_REQUEST_TIMEOUT_MS` **antes** de `RUN npm run build`. Sin ellos el bundle salía sin
valor. Es el mismo mecanismo que ya usa el CI del repo.

**2. `docker-compose.prod.yml`** — dos bloques:
- `portafolio-frontend.build` pasa de cadena a `context` + `args`, inyectando
  `NEXT_PUBLIC_API_URL: ${FRONTEND_API_URL:-https://api.example.com/api}`.
  Pasarla por `env_file` en runtime **no tiene ningún efecto** sobre el bundle.
- `portafolio-api.environment` añade
  `CORS_ORIGINS: ${PROD_CORS_ORIGINS:-https://example.com,https://www.example.com}`.
  Mismo patrón que `DB_HOST`: `.env` conserva los valores del flujo en host y el stack recibe los
  suyos por compose. **`.env` no se tocó.**

Ambas parametrizadas con `${VAR:-default}`, igual que `N8N_HOST`: cambiar de dominio es definir
`FRONTEND_API_URL` y `PROD_CORS_ORIGINS` en `.env`, sin editar los ficheros.

### ⚠️ ACCIÓN REQUERIDA DEL AUTOR — fichero hosts

El navegador no resuelve `example.com` a la máquina local. **Una sola vez**, en PowerShell
**como administrador**:

```powershell
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value @"
127.0.0.1 example.com
127.0.0.1 api.example.com
127.0.0.1 n8n.example.com
"@
```

Comprobar: `ping example.com` → debe responder `127.0.0.1`.

Para revertir: editar el fichero y borrar esas tres líneas.

> No se aplicó automáticamente: es un fichero de sistema, exige elevación y afecta a toda la
> máquina, no solo a este proyecto.

### Verificación realizada (con `curl --resolve`, equivalente a las entradas de hosts)

| Prueba | Resultado |
|---|---|
| `NEXT_PUBLIC_API_URL` horneada en el bundle | ✅ `https://api.example.com/api` presente en `.next/static` |
| `localhost:3000` residual en la imagen | ✅ **0 ocurrencias** |
| Preflight `OPTIONS` desde `https://example.com` | ✅ 204 + `Allow-Origin: https://example.com` + `Allow-Credentials: true` |
| Preflight desde origen NO autorizado | ✅ **sin** `Allow-Origin` → el navegador lo bloquea |
| `POST /api/auth/login` cross-origin | ✅ 200 + `Set-Cookie` HttpOnly |
| `GET /api/auth/me` reutilizando cookie | ✅ 200 |
| `POST /api/leads` | ✅ 201 — lead `97a75cc0-…` |
| `GET /api/leads` | ✅ 200, 2 leads |
| `GET /api/leads/stats` | ✅ 200 `{"total":2,...}` |
| Persistencia en PostgreSQL | ✅ ambos leads en la tabla |
| Rutas del frontend en `https://example.com` | ✅ **11/11 en 200** |
| Chunk real servido al navegador | ✅ `login/page-ef7a0fbe….js` contiene `api.example.com` |

### Regresión tras el rebuild — nada roto

`/health` 200 · healthcheck `healthy` · nginx sin reinicios · **98/98 tests** ·
webhook n8n **200 `{"received":true}`**.

> **Cookies cross-origin:** funciona con `SameSite=Lax` porque `example.com` y `api.example.com`
> comparten dominio registrable → son **same-site** aunque sean orígenes distintos. No hizo falta
> `SameSite=None`, y por tanto tampoco `NODE_ENV=production`.

---

## 8. Estado de n8n — VALIDADO

| Comprobación | Resultado |
|---|---|
| `n8n` prod — `/healthz` | ✅ `{"status":"ok"}` |
| `n8n` dev — `/healthz` | ✅ `{"status":"ok"}` |
| Vía nginx (`n8n.example.com`) | ✅ 200 |
| Workflow `92fIV59ijURIYfwT` | ✅ **activo**, 17 nodos |
| Webhook registrado | ✅ `lead-qualification` / POST |
| `POST /webhook/lead-qualification` | ✅ **200** `{"received":true}` (Fast ACK — invariante de CLAUDE.md **intacto**) |
| Ejecución completa | ✅ **exec 51 SUCCESS** (16:44:40 → 16:44:42) |
| n8n → PostgreSQL | ✅ `lead_log` id=7 escrito por la ejecución 51 |

> El workflow activo vive en el n8n del stack **dev** y escribe en la BD **dev**. El n8n del stack
> prod tiene una BD limpia: **sin workflows**. Si se quiere el flujo en prod hay que importarlo.

> ⚠️ Durante la prueba, un `POST` devolvió **422 `Failed to parse request body`**. **No era un
> fallo del sistema**: fue el BOM que añade `Out-File -Encoding utf8` en PowerShell 5.1 (error ya
> registrado en el Segundo Cerebro). Con UTF-8 sin BOM → 200. Usar:
> ```powershell
> [System.IO.File]::WriteAllText($p, $json, (New-Object System.Text.UTF8Encoding($false)))
> ```

---

## 9. Cobertura funcional conseguida

| Capa | Cobertura | Método |
|---|---|---|
| PostgreSQL — esquema | ✅ 100 % | Catálogo del sistema: tablas, RLS, FK, índices, triggers, roles |
| Backend — unitario | ✅ 98/98 tests | `npm test` |
| Backend — integración HTTP | ✅ 24/24 pruebas | curl contra el contenedor real |
| Backend ↔ PostgreSQL | ✅ Verificado | Lead creado por API y leído en SQL |
| Auth / JWT / RBAC | ✅ Verificado | Incluye `alg=none`, manipulación de firma, 403 por rol |
| n8n ↔ PostgreSQL | ✅ Verificado | exec 51 → `lead_log` id=7 |
| Frontend — compilación | ✅ Verificado | `tsc --noEmit` rc=0 + build Docker |
| Frontend — SSR | ✅ 11/11 rutas | curl vía nginx |
| **Frontend ↔ Backend** | 🔴 **NO alcanzado** | Bloqueado por §6 |
| **Frontend — navegador** | ⏳ **Pendiente del autor** | Requiere validación manual |

---

## 10. Riesgos e incidencias pendientes

| # | Descripción | Nivel |
|---|---|---|
| ~~R1~~ | ~~Frontend no consume la API~~ → ✅ **RESUELTO** en F22 R-03 (§7-bis). Queda solo la acción de `hosts` del autor. | ✅ **CERRADO** |
| **R2** | **El backend conecta como `n8n`, que es SUPERUSUARIO** (`rolsuper=t`, `rolbypassrls=t`). Ignora el `FORCE RLS` de la migración 016: el aislamiento multi-tenant depende solo del `WHERE tenant_id` del código. El rol `app` existe pero es NOLOGIN — falta el paso 2 del README (`ALTER ROLE app LOGIN PASSWORD …` + `DB_USER`/`DB_PASSWORD` en `.env`). **Las pruebas de integración no reflejarán el comportamiento real de producción hasta arreglarlo.** | 🔴 **HIGH** |
| **R3** | **Cookie de 7 días vs JWT de 24 h.** `.env` fija `AUTH_COOKIE_MAX_AGE_MS=604800000` mientras `JWT_EXPIRES_IN=24h`. Verificado en la respuesta real: `Max-Age=604800` con `exp-iat=86400`. Durante 6 días el navegador conserva una cookie con un JWT muerto → el usuario parece logueado y **todo responde 401**. | 🟠 **MEDIUM** |
| **R4** | **`NODE_ENV=development` en el stack de producción.** Desactiva `cookie.secure` (se sirve por HTTPS sin flag `Secure`), permite CORS a localhost y salta el arranque en fallo rápido. Ponerlo en `production` **aborta el arranque** por `STRIPE_WEBHOOK_SECRET` vacío — requisito previo documentado desde F20, no un bug. | 🟠 **MEDIUM** |
| **R5** | **La BD del stack dev está parcialmente migrada** (sin migración 012, sin rol `app`) y **sin el admin de §2**. Afecta a la Opción A de §7. | 🟠 **MEDIUM** |
| **R6** | **Certificado self-signed**, caduca el **2027-07-26**. Solo desarrollo. En producción: Let's Encrypt + `sed 's/example\.com/<dominio>/g' docker/nginx.conf`. | 🟠 **MEDIUM** |
| **R7** | **`TRUST_PROXY` vacío en el stack prod** pese a tener nginx delante. `docker-compose.dev.yml:44` sí fija `TRUST_PROXY: "1"`. Consecuencia: el rate limiter mete a **todos** los clientes en el mismo cubo (la IP de nginx) → un solo cliente puede agotar el límite de todos. | 🟠 **MEDIUM** |
| **R8** | **`N8N_PROTOCOL=http` con `WEBHOOK_URL=https://…`** en el stack prod (el compose declara `${N8N_PROTOCOL:-https}` pero `.env` lo pisa con `http`). Incoherente para un despliegue real. | 🟢 **LOW** |
| **R9** | **`docker/ssl/` no sobrevive a un clon nuevo** (`*.pem` gitignored, directorio vacío) → un clon limpio reproduce el bucle de nginx. Tarea A-02 de `PLAN_REMEDIACION.md`, aún abierta. | 🟢 **LOW** |
| **R10** | **`listen … http2` deprecado** en `nginx.conf:70,102,130`. Solo warnings en nginx 1.27. | 🟢 **LOW** |
| **R11** | **Deuda conocida, ya documentada:** `/leads/activity` y `/usage` no existen en el backend → las páginas muestran su banner de error. `/api/tenants/usage` sí existe pero **su contrato no casa** con el tipo `ApiUsage` del frontend (F21 A-01). | 🟢 **LOW** |
| **R12** | **0 tests de frontend.** | 🟢 **LOW** |

### Servicios externos — NO integrados (por indicación expresa)

| Servicio | Estado |
|---|---|
| **Groq** | Credencial `5mpbT73GTHmK5DJ9` cargada en n8n. **Ya opera dentro del workflow** (exec 51). Sin cablear al backend. |
| **OpenAI** | Sin saldo (429). El workflow usa Groq. |
| **HubSpot** | Credencial `ABfLC3myrfeFGWOW` cargada; operativa en el workflow. |
| **Slack** | Credencial `aEsbKrH2FsoB9UHJ` cargada. |
| **Stripe** | Test key presente. `STRIPE_WEBHOOK_SECRET` **vacío** → requisito previo de despliegue. |
| **WhatsApp / Twilio** | Scaffolding backend; requieren cuentas Meta/Twilio. |

---

## 11. CHECKLIST DE VERIFICACIÓN MANUAL — la hace el autor

> **Esta es la siguiente acción del proyecto.** Elegir primero la vía en §7 (recomendada: **A**).

### Preparación si se elige la Opción A

- [ ] Aplicar las 16 migraciones + 2 seeds a `portafolio-publico-postgres-1` (bucle de §4)
- [ ] Repetir el `UPDATE` del hash de §2 sobre esa BD
- [ ] `cd backend && npm run dev` → comprobar `http://localhost:3000/health`
- [ ] `cd frontend && npm run dev` → abrir `http://localhost:3001`

### Verificación en el navegador

- [ ] Carga `/login` sin errores en la consola (F12)
- [ ] Login con `admin@example.com` / `kWkryenHoYUQLk5NdicqhDGJ` → redirige al dashboard
- [ ] DevTools → Application → Cookies: `access_token` presente, **HttpOnly ✓**
- [ ] Dashboard muestra métricas sin banner de error
- [ ] `/dashboard/leads` lista el lead `lead.prueba@example.com`
- [ ] **Crear un lead desde el formulario de la interfaz** → aparece en la lista
- [ ] Verificar en SQL: `SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;`
- [ ] Navegar por las 10 rutas del dashboard sin error de runtime
- [ ] `/dashboard/activity` y `/dashboard/usage`: se espera **banner de error** (R11, deuda conocida)
- [ ] Logout → vuelve a `/login` y la cookie desaparece
- [ ] Pestaña Network: ninguna llamada a la API en 404/500
- [ ] Consola: sin errores de hidratación de React

### Si algo falla

Adjuntar: pestaña Network (petición + respuesta), consola completa, y
`docker logs portafolio-prod-portafolio-api-1 --tail 50`.

---

## 12. Cómo retomar en una conversación nueva

### Arranque

```bash
cd C:\Portafolio-Publico
docker compose -f docker-compose.prod.yml up -d     # stack prod
docker compose up -d                                 # stack dev (n8n con workflow activo)
docker compose -f docker-compose.prod.yml ps
```

### Comprobación rápida de salud

```bash
docker exec portafolio-prod-portafolio-api-1 curl -s http://localhost:3000/health
curl -sk -H "Host: api.example.com" https://localhost/health
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost/login
```

### Datos que no hay que volver a derivar

- Stack a usar: **`portafolio-prod`** (`-f docker-compose.prod.yml`). El otro es el dev.
- BD prod ya migrada (16/16 + seeds). BD dev **no** (falta la 012).
- Credenciales locales: **§2**.
- Backend, PostgreSQL y n8n: **validados**, no re-auditar.
- El bloqueo del frontend está diagnosticado con evidencia: **§6**. No re-diagnosticar; **decidir §7**.
- `git status` debe mostrar solo `M docker-compose.prod.yml` (+ este fichero sin trackear).

### Orden de trabajo a partir de aquí

1. **AHORA →** Verificación manual en navegador (§11), tras elegir la vía de §7.
2. Si se aprueba → **integraciones OpenAI/Groq** (era el objetivo original; queda desbloqueado).
3. En paralelo o antes de producción: **R2** (rol `app` → RLS efectivo) y **R3** (cookie vs JWT).
4. Más adelante: decidir B1/B2 de §7 como tarea de despliegue.

### Prohibiciones vigentes

- ❌ Sin commit, sin push, sin merge.
- ❌ No integrar HubSpot, Slack, Stripe, Twilio, WhatsApp, VPS, dominio ni GitHub hasta nueva orden.
- ❌ No romper `POST /webhook/lead-qualification` → debe seguir devolviendo **200 `{"received":true}`**.
- ❌ No commitear `docker/ssl/*.pem` ni las contraseñas de §2.

---

## 13. F22 R-04…R-08 — Cierre a Release Candidate (2026-07-26 18:20)

### R2 CERRADO — RLS efectivo (era el riesgo HIGH abierto)

`ALTER ROLE app LOGIN PASSWORD '<generada, 28 chars, fuera de git>'`; el backend conecta ahora como
`app` (NOSUPERUSER, NOBYPASSRLS) en lugar del superusuario `n8n`.

Credencial en `.env` como `DB_APP_USER` / `DB_APP_PASSWORD` (gitignored). `docker-compose.prod.yml`
las mapea a `DB_USER`/`DB_PASSWORD` **solo dentro del contenedor**, con `${VAR:?}`: si faltan, el
stack **no arranca**. Deliberado — un fallback silencioso al superusuario desactivaría RLS sin que
nadie lo notase. Se usan nombres distintos porque `.env` lo comparten el stack y el flujo en host,
y el postgres del stack dev no tiene el rol `app`.

**Aislamiento demostrado** (tenant `rival` creado con un lead HOT como superusuario):

| Prueba | Resultado |
|---|---|
| `SELECT` como `app` **sin** contexto de tenant | **0 filas** |
| `SELECT` con el tenant correcto | 3 filas |
| `SELECT` con otro tenant | **0 filas** |
| `GET /api/leads` como admin del tenant 1 | 3 leads, **sin fuga** del rival |
| `GET /api/leads/<id-del-rival>` | **404** |
| `GET /api/leads/stats` | `hot: 0` — no cuenta el HOT ajeno |
| `POST /api/leads` (INSERT bajo RLS) | **201** |

### R3 CERRADO — la cookie ya no sobrevive al JWT

`backend/src/utils/authCookie.js`: nueva `resolveCookieMaxAge(token)`. La caducidad se **deriva del
`exp` del propio token**, con `AUTH_COOKIE_MAX_AGE_MS` como techo. Por construcción no pueden
divergir.

Antes: `Max-Age=604800` (7 d) con JWT de 24 h → 6 días de sesión aparente con 401 en todo.
Ahora, verificado en la respuesta real: **`Max-Age=86399`**.

5 tests nuevos en `backend/tests/authCookie.maxage.test.js` (token corto, token largo, caducado,
sin `exp`, ilegible).

### R7 CERRADO — `TRUST_PROXY`

`TRUST_PROXY: "1"` en el compose de prod. Había nginx delante y Express resolvía `req.ip` como la IP
del contenedor proxy: el rate limiter metía a **todos** los clientes en el mismo cubo. Mismo valor
que `docker-compose.dev.yml` ya declaraba.

### R11 CERRADO — código incompleto terminado

**`GET /api/leads/activity`** implementado (servicio + controlador + ruta + schema de paginación).
El frontend ya lo llamaba y devolvía 404. Lee de `lead_log`, que es donde el nodo
"Log to PostgreSQL" del workflow escribe. Montado **antes** de `/:id` para que Express no lo trate
como parámetro.

**`/usage`** — el frontend pedía `/usage` (inexistente) y esperaba `{total, by_endpoint, period}`,
una medición de peticiones por endpoint que **el backend no registra en ninguna tabla**: no había
origen posible para esos datos. Se descartó construir un subsistema de metering (sería arquitectura
nueva) y se alineó el frontend con el contrato real:
`ApiUsage` → `TenantUsage {total_leads, total_runs, total_users}`, `usageApi.get()` → `/tenants/usage`,
y la página reescrita como tres tarjetas. `tsc --noEmit` rc=0.

### Hallazgo NO resuelto — sin reintentos en el nodo IA

El nodo `OpenAI Score Lead` del workflow `92fIV59ijURIYfwT` tiene `timeout: 30000` pero
**`retryOnFail: null`**: un 429 o un 5xx transitorio de Groq tumba la ejecución en el primer intento.

**No se corrigió y no es por falta de trabajo:** modificar el workflow exige la API REST de n8n
(`POST /rest/workflows/{id}/deactivate` + `/activate`, ver CLAUDE.md) y **no hay credencial
disponible** — el admin de n8n y su contraseña no está en `.env`.
Editarlo por SQL sería un hack y además no surtiría efecto: n8n mantiene el workflow activo en
memoria.

> CLAUDE.md dice que el login de n8n es `admin@portafolio.ai`. **Es incorrecto**: la tabla `user`
> solo tiene los datos del autor.

**Para aplicarlo tú:** abrir el workflow → nodo `OpenAI Score Lead` → Settings → activar
*Retry On Fail*, `Max Tries: 3`, `Wait Between Tries: 2000 ms` → guardar → desactivar y reactivar.

### Integración OpenAI/Groq — dónde vive realmente

**No hay ningún SDK de IA ni llamada a LLM en el backend, y es una decisión de arquitectura, no
código sin terminar.** Verificado: `backend/package.json` y `frontend/package.json` no declaran
`openai`, `groq`, `anthropic` ni equivalente; ningún fichero de `backend/src/` llama a un modelo.

La llamada vive en el nodo HTTP Request del workflow de n8n. `backend/src/lib/lead.js` es una
**implementación de referencia** —así lo declara su cabecera— portada fiel de los Code nodes, para
poder testear la lógica; su propio comentario dice *"Ninguna función de este módulo llama a
servicios externos"*.

Añadir un cliente LLM al backend **duplicaría** la lógica que ya está en n8n y ampliaría la
arquitectura, justo lo contrario de lo pedido. Lo que sí se verificó:

| Aspecto | Estado |
|---|---|
| Compatibilidad OpenAI ↔ Groq | ✅ `extractContent()` tolera `response.body.choices` y `response.choices`; ambos proveedores comparten el esquema chat-completions |
| Parsing de JSON | ✅ `parseAiResponse()` **nunca lanza** |
| Fallback ante respuesta ilegible | ✅ degrada a `COLD`/score 0 y deja el motivo en `aiRationale` |
| Normalización de score | ✅ acotado a 0–100 entero |
| Normalización de categoría | ✅ fuera de HOT/WARM/COLD → `COLD` |
| Timeout | ✅ 30 000 ms en el nodo |
| Reintentos | ❌ **ausentes** (ver arriba) |
| Ruta de error | ✅ Error Trigger → `error_log`, **14 entradas** reales |
| Cobertura de esa lógica | ✅ **100 % sentencias**, 94,11 % ramas, 48 tests |
| Flujo E2E Lead → IA → Score → CRM → PostgreSQL | ✅ exec **52 SUCCESS** → `lead_log` id=8 |

### Ficheros modificados en este bloque

| Fichero | Cambio |
|---|---|
| `docker-compose.prod.yml` | `DB_USER`/`DB_PASSWORD` desde `DB_APP_*` con `:?`; `TRUST_PROXY: "1"` |
| `backend/src/utils/authCookie.js` | `resolveCookieMaxAge()` — cookie acotada al `exp` del JWT |
| `backend/src/services/leads.service.js` | `getActivity()` sobre `lead_log` |
| `backend/src/controllers/leads.controller.js` | controlador `activity` |
| `backend/src/routes/leads.routes.js` | ruta `/activity` antes de `/:id` |
| `backend/src/schemas/lead.schema.js` | `activityQuerySchema` |
| `backend/tests/authCookie.maxage.test.js` | **nuevo** — 5 tests |
| `frontend/src/lib/types.ts` | `ApiUsage` → `TenantUsage` |
| `frontend/src/lib/api.ts` | `usageApi` → `/tenants/usage` |
| `frontend/src/app/dashboard/usage/page.tsx` | reescrita al contrato real |
| `.env.example` | documenta `DB_APP_*`, `FRONTEND_API_URL`, `PROD_CORS_ORIGINS` (sin secretos) |
| `.env` | **gitignored** — valores reales |

### Verificación final

`103/103 tests` · `tsc --noEmit` rc=0 · 10/10 rutas frontend 200 ·
login/me/lead/activity/usage/logout todos correctos por el camino del navegador ·
5/5 contenedores arriba, api `healthy`, nginx sin reinicios ·
webhook n8n 200 `{"received":true}` · ningún secreto en el árbol versionado (verificado por búsqueda
directa de las tres contraseñas generadas).

---

## 14. F22 R-09…R-12 — Auditoría técnica final (2026-07-26 21:50)

### Hallazgos corregidos

| # | Hallazgo | Evidencia | Solución |
|---|---|---|---|
| **R-09** | **7 vulnerabilidades** en dependencias del backend (1 crítica, 5 altas, 1 moderada) | `npm audit`: `tar` CRITICAL vía `bcrypt@5.1.1 → @mapbox/node-pre-gyp@1.0.11`; `uuid` MODERATE | `bcrypt@6.0.0` (usa `node-gyp-build`, elimina toda la cadena) + `uuid` retirado (**declarado y jamás usado**: solo aparecía en `package.json`). → **0 vulnerabilidades** |
| **R-09b** | `npm run lint` del frontend **colgaba** en un prompt interactivo | `eslint` y `eslint-config-next` en devDependencies pero **sin fichero de configuración**; CI solo hacía typecheck+build, así que nunca se detectó | `frontend/.eslintrc.json` (`next/core-web-vitals`) + paso `Lint` añadido al job de frontend en `ci.yml`. → *No ESLint warnings or errors* |
| **R-10** | **El frontend escuchaba solo en la IP del contenedor** (`172.22.0.3:3001`); `127.0.0.1:3001` daba *Connection refused* desde dentro de sí mismo | `netstat -ltn` dentro del contenedor. Causa: `server.js` de Next standalone usa `process.env.HOSTNAME`, que Docker fija al ID del contenedor | `ENV HOSTNAME=0.0.0.0` en `frontend/Dockerfile`, alineado con el `API_HOST=0.0.0.0` del backend |
| **R-11** | **3 de 5 contenedores sin healthcheck** (nginx, frontend, n8n): un servicio colgado seguía como "Up" y `restart: always` no actuaba | `docker inspect` → `SIN HEALTHCHECK` | `HEALTHCHECK` en `frontend/Dockerfile`; `healthcheck:` para nginx y n8n en el compose; `location = /healthz` en `docker/nginx.conf`. → **5/5 healthy** |
| **R-12** | Código y dependencias duplicados/muertos | `zod` (0 referencias, **duplica a Joi** que es el validador del proyecto) · `tailwind-merge` (0 referencias) · `apiKeysApi` (misma llamada que `settingsApi.apiKeys()`, sin consumidor) | Los tres retirados |
| **R-13** | **CLAUDE.md desviado del código en 9 puntos** | Ver abajo | Corregido |
| **R-14** | Swagger no documentaba los endpoints tocados en F22 | `/api/leads/activity` y `/api/tenants/usage` ausentes | Añadidos a `swagger.js` |

### Detalle de R-11 — el `return` de nginx

El primer intento colocó `location = /healthz` junto al `return 301` a nivel de servidor y **falló**:
un `return` de servidor se ejecuta en la fase de *rewrite*, **antes** de elegir `location`, así que
se tragaba también `/healthz` y el healthcheck moría validando el certificado self-signed. Corregido
moviendo la redirección dentro de `location / { … }`. Verificado que la redirección 80→443 sigue
intacta (`http://localhost/` → 301).

### Detalle de R-13 — desviaciones de CLAUDE.md corregidas

| Decía | Realidad |
|---|---|
| branch `remediacion/v2` | `release/v1-publication-ready` |
| Login n8n `admin@portafolio.ai` | **Incorrecto** — la tabla `user` solo tiene la cuenta del autor |
| «15 migraciones (`001`–`014`, dos ficheros `013_*`)» | **16 ficheros**, `001`–`016`, uno por número |
| «98 tests» | **103** |
| `/leads/activity` no implementado | Implementado en F22 |
| `/usage` requiere decisión de producto | Resuelto en F22 |
| `/api-docs` listado como ruta del frontend | Lo sirve el **backend** |
| «14 rutas» de frontend | **13 propias** (la 14.ª era `/api-docs`) |

### Verificado sin cambios necesarios

| Área | Resultado |
|---|---|
| ESLint backend | rc=0, limpio |
| TODO / FIXME / HACK / `@ts-ignore` / `eslint-disable` | **Ninguno** en `backend/src`, `frontend/src`, `database`, `docker` |
| Lockfiles | Ambos presentes y versionados |
| `tsc --noEmit` | rc=0 |
| Redes / volúmenes Docker | Una red bridge propia, 2 volúmenes nombrados, sin huérfanos |
| Restart policies | `always` en los 5 servicios |
| Duplicación `lib/lead.js` ↔ Code nodes de n8n | **Intencionada y documentada** en la cabecera del módulo (implementación de referencia testeable). No es deuda |
| Migraciones / seeds / RLS / FK / índices / triggers | Sin cambios desde §4 y §13 |

### Flujo E2E revalidado tras todos los cambios

`POST /webhook/lead-qualification` → **200 `{"received":true}`** → ejecución **53 SUCCESS** →
`lead_log` id=9 con salida real del modelo: `ai_score=20`, `ai_category=COLD`,
`ai_business_category=Tecnologia`. Cadena **Lead → IA → Score → CRM → PostgreSQL** completa.

### Suite de verificación final

**27/27 comprobaciones correctas, 0 fallidas** · 103/103 tests · ESLint backend y frontend limpios ·
`tsc` rc=0 · **0 vulnerabilidades** en backend · **5/5 contenedores healthy** ·
ningún secreto en el árbol versionado.

### Riesgo NO corregido — `next@14.2.35` con 2 CVE HIGH

`npm audit` del frontend reporta dos altas. **No se actualizó, y es una decisión razonada:**

- El fix exige `next@16` — **dos versiones mayores** — que invalidaría toda la verificación de esta
  sesión y puede romper routing, render y build.
- **Exposición real medida, baja:**
  - *DoS vía Image Optimizer `remotePatterns`*: `next.config.js` declara `images: { unoptimized: true }`
    → **el optimizador está desactivado, el vector no existe**.
  - *DoS por deserialización RSC*: **0 Server Actions** (`'use server'` no aparece) y 10 de 11
    páginas son `'use client'`.

Debe planificarse como una migración propia, con su ciclo de verificación.

---

## 15. F22 R-15/R-16 — Fase final: dos bugs latentes que habrían roto el sistema

Al añadir el healthcheck al n8n del stack **dev** hubo que recrear el contenedor, y eso destapó dos
desajustes que llevaban tiempo ocultos. **No los causó el healthcheck**: el contenedor en marcha
databa de una configuración anterior y sobrevivía solo porque nadie lo había recreado. **Cualquier
`docker compose up -d` habría reproducido el fallo** — incluido el que se recomendó en la primera
sesión para corregir R-05.

### Bug 1 — `N8N_ENCRYPTION_KEY` no coincidía con el volumen

```
Error: Mismatching encryption keys. The encryption key in the settings file
/home/node/.n8n/.n8n/config does not match the N8N_ENCRYPTION_KEY env var.
```

| Origen | Valor | Credenciales |
|---|---|---|
| Volumen **dev** | `clavesegura421` | **5** (Groq, HubSpot ×2, Slack, PostgreSQL) |
| Volumen **prod** | `changeme_ejecuta:…` (placeholder) | 0 |
| `.env` | `changeme_ejecuta:…` (placeholder) | — |

**Solución:** `.env` pasa a `clavesegura421` (la clave que protege las 5 credenciales reales; cambiarla
las inutilizaría) y se alineó el config del volumen de prod, que al tener **0 credenciales** se
reescribió sin pérdida. Ambas instancias comparten ahora una única clave.

### Bug 2 — contraseña de PostgreSQL desalineada en el stack dev

```
error: password authentication failed for user "n8n"
```

`POSTGRES_PASSWORD` solo se aplica en el **primer init** del volumen. El volumen de dev se había
inicializado con una contraseña de 14 caracteres, mientras `.env` declaraba otra de 21. El
desajuste era invisible: `pg_isready` no comprueba contraseña y `docker exec psql` usa el socket local.

**Solución en dos pasos** — ambos convergen en el valor de `.env`, que es el que ya usaba el
postgres de prod:
1. `ALTER USER n8n WITH PASSWORD '<POSTGRES_PASSWORD de .env>'`.
2. La credencial `1SSa86iJODaXpkD6` de n8n seguía guardando la antigua y el nodo
   "Log to PostgreSQL" fallaba (**ejecución 55 = error**). Se descifró con `Cipher` de `n8n-core`,
   se sustituyó **solo** el campo `password` y se volvió a cifrar con la misma clave. El resto de
   campos intacto (`host=postgres`, `db=n8n`, `user=n8n`).

**Verificación:** ejecución **56 SUCCESS** y **57 SUCCESS**, con salida real del modelo
(`ai_business_category = "Validación de flujo"`). El workflow **no se modificó**: solo el valor
cifrado de una credencial.

### Estado final

| Stack | Servicio | Estado |
|---|---|---|
| prod | nginx · api · frontend · postgres · n8n | **5/5 healthy** |
| dev | postgres · n8n | **2/2 healthy** |

**37/37 comprobaciones** correctas (CORS preflight, JWT `alg=none`, cookies, 15 endpoints, Swagger,
10 rutas de frontend, healthz de nginx, redirección 80→443, vhost de n8n) ·
103/103 tests · `tsc` rc=0 · ESLint backend y frontend limpios · build OK ·
0 vulnerabilidades en backend · RLS sigue aislando (404 al lead ajeno) ·
cookie `Max-Age=86399` · 9 cabeceras de seguridad.
