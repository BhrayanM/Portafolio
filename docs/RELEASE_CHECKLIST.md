# RELEASE CHECKLIST

**Rama:** `remediacion/v2` · **Última revisión:** 2026-07-26 · Línea base: commit `9748baa` (cierre F21).

---

# 🔴 VEREDICTO: BLOQUEADO

**No se puede hacer push.** Todo lo demás está en verde: build, tests, lint, typecheck, compose,
n8n y las dos correcciones de infraestructura que arrastraban F20 y F21 sin verificar.

El bloqueo es uno solo, y es de credenciales.

## El bloqueante · R-03 — Dos contraseñas en claro en el historial local

Al preparar el push se barrieron las **27 683 líneas añadidas** por los 58 commits pendientes. Los 8
patrones de secretos con prefijo conocido (`sk-`, `xox`, `pat-`, `ghp_`, `AKIA`, claves privadas,
cadenas Postgres, credenciales n8n) salieron **limpios**. Pero apareció lo que ningún patrón
buscaba: **dos contraseñas en claro**, en 7 ficheros versionados.

| Credencial | Qué abre | Dónde estaba |
|---|---|---|
| Password del **owner de n8n** (`admin@portafolio.ai`) | La UI de administración de n8n, que en producción se publica en `n8n.portafolio.ai` vía nginx | `CLAUDE.md`, `docs/SPRINT1_N8N.md`, `docs/SPRINT2_SERVICIOS_EXTERNOS.md` |
| Password del **admin sembrado en la app** | La cuenta `admin` de cualquier despliegue que aplique el seed | `database/seeds/002_admin_user.sql` (hash bcrypt + texto plano en el comentario), `docs/REMEDIACION_COMPLETA.md`, `docs/VALIDACION_RUNTIME.md`, y como constante en `backend/tests/auth.cookie.test.js` |

### Lo que importa: todavía no hay exposición

```
git log -S'<password n8n>'  origin/main  ->  0 commits
git log -S'<password seed>' origin/main  ->  0 commits
```

**Ninguna de las dos está en `origin/main`.** El repositorio público no las tiene. Se ha llegado a
tiempo, y por eso esto es un bloqueo y no un incidente.

### Por qué redactar los ficheros no basta

Ya están redactadas en el árbol de trabajo (ver R-04), pero **eso no las saca del historial**. Las
credenciales entraron en 4 commits que siguen pendientes de subir:

| Credencial | Commits que la introducen |
|---|---|
| Owner de n8n | `4779634`, `e0a9c99` |
| Admin sembrado | `cb543ee`, `e0a9c99`, `6c5ab82` |

Un `git push` publica esos commits **con su contenido original**. La redacción solo protege de aquí
en adelante.

### Hay que elegir una de las dos vías — es decisión humana

| | Vía A · Rotar las credenciales | Vía B · Reescribir el historial |
|---|---|---|
| **Qué se hace** | Cambiar la password del owner en n8n; regenerar el hash bcrypt del seed. Después, push normal | `git filter-repo` sobre los 4 commits, y push |
| **Resultado** | Lo que se publica queda obsoleto y no abre nada | No se publica nunca |
| **Coste** | Dos cambios de contraseña | Reescribe 58 commits: cambian todos los SHA |
| **Riesgo** | Ninguno: `origin/main` no ha divergido | Bajo aquí (nadie más ha clonado), pero es una operación destructiva |

**Recomendación: Vía A.** Es más barata, no toca el historial y deja el sistema seguro incluso si
alguien ya tuviera una copia local del repo. La Vía B solo compensa si además molesta que las
contraseñas *antiguas* queden legibles en el historial público.

> Elijas la que elijas: **la password del owner de n8n conviene cambiarla igualmente**. Ver R-05 —
> ese puerto lleva expuesto en la red local todo este tiempo.

---

## Bloqueos verificados como INEXISTENTES

Cosas que F21 dejó como condición y que en esta fase se han comprobado y **no bloquean**:

| Condición de F21 | Estado |
|---|---|
| Configuración remota / credenciales de git | ✅ `origin` configurado, Git Credential Manager activo, lectura del remoto OK |
| ¿Pasaría el CI? | ✅ Los 3 jobs pasan: lint, 98/98 tests, `tsc --noEmit` exit 0, build, barrido de secretos. **Pero el fichero no estaba en git** — ver R-06 |
| Mount SSL de nginx (F20-3, sin verificar) | ✅ **Verificado en contenedor real** |
| Upstream `n8n` de nginx (A-04, sin verificar) | ✅ Mecanismo confirmado en contenedor real |
| Workflow n8n activo y webhook vivo | ✅ n8n **2.31.6**, `healthz` ok, webhook **200 `{"received":true}`** |

---

## Correcciones aplicadas en esta fase

### R-01 · `docker-compose.prod.yml` secuestraba el stack de desarrollo 🔴

El hallazgo más grave después del de credenciales, y no estaba en ninguna auditoría previa.

Los dos ficheros compose derivaban el **mismo nombre de proyecto** del directorio
(`portafolio-publico`) y además comparten los nombres de servicio `postgres` y `n8n` y los volúmenes
`postgres_data` / `n8n_data`:

```
BASE  name=portafolio-publico  services=n8n, postgres, rabbitmq, redis
PROD  name=portafolio-publico  services=n8n, nginx, portafolio-api, portafolio-frontend, postgres
```

Un `docker compose -f docker-compose.prod.yml up` desde este directorio **no levantaba un stack
paralelo**: compose veía el mismo proyecto y **recreaba los contenedores de desarrollo con
configuración de producción** (`N8N_HOST=n8n.portafolio.ai`, `N8N_PROTOCOL=https`,
`WEBHOOK_URL=https://...`). Es decir, rompía `POST /webhook/lead-qualification` en localhost — lo
que CLAUDE.md marca explícitamente como intocable.

**Por esto no se levantó el stack de producción hasta corregirlo.** Añadido `name: portafolio-prod`.
Verificado el aislamiento:

```
BASE  name=portafolio-publico
PROD  name=portafolio-prod
```

### R-02 · El barrido de secretos del CI no detectaba contraseñas

`ci.yml` escaneaba 7 patrones, todos de **tokens con prefijo conocido**. Ninguno buscaba una
password en claro, y por eso el job salía verde con las dos credenciales dentro del árbol
versionado: **el CI habría dejado publicarlas.**

Añadido un patrón que acepta `"password":"<PLACEHOLDER>"` y rechaza un valor literal. Probado contra
el árbol completo: **0 falsos positivos**.

### R-06 · `ci.yml` nunca estuvo en git — el CI no existía en GitHub 🔴

F21 concluyó que «el CI nunca ha corrido» y lo atribuyó a que no se había hecho push. **El
diagnóstico era incompleto**: al editar `ci.yml` para R-02, `git status` no detectó ningún cambio.

```
git check-ignore -v .github/workflows/ci.yml
.gitignore:65:workflows/   .github/workflows/ci.yml
```

La regla `workflows/` —puesta para bloquear los exports de n8n— **no estaba anclada**. Un patrón de
gitignore sin `/` inicial casa con **cualquier** directorio de ese nombre a cualquier profundidad,
así que se tragaba también `.github/workflows/`.

Consecuencia: **pushear no habría hecho correr el CI.** El fichero no existe en el remoto, así que
GitHub no tenía ningún workflow que disparar. Los 3 jobs bien escritos llevaban todo este tiempo
sin ser más que un fichero local — y con ellos, la única red que habría cazado el frontend roto de
F20-4.

Corregido anclando la regla a `/n8n/workflows/`. Verificado que **lo que debía seguir protegido
sigue protegido**:

```
git check-ignore -v n8n/workflows/*.json   -> los 4 siguen ignorados por /n8n/workflows/
git check-ignore    .github/workflows/ci.yml -> ya NO esta ignorado
```

### R-04 · Redacción de las credenciales en el árbol de trabajo

7 ficheros. Las dos contraseñas sustituidas por `<N8N_ADMIN_PASSWORD>` y `<ADMIN_SEED_PASSWORD>`; el
comentario del seed ya no publica el texto plano y avisa de que es solo para desarrollo. La
constante de `auth.cookie.test.js` pasa a ser un fixture explícito, desacoplado de la credencial
real (los tests usan un doble del pool de `pg`, así que el valor es arbitrario). **98/98 siguen
verdes.**

---

## R-05 · Los contenedores en ejecución no son los que declaran los compose 🟠

Al arrancar el demonio apareció una desviación que ninguna auditoría estática podía ver: **los
contenedores vivos se crearon con una versión anterior de `docker-compose.yml`.**

| | Compose declara | En ejecución |
|---|---|---|
| Puerto n8n | `127.0.0.1:5678:5678` | **`0.0.0.0:5678`** |
| Puerto postgres | `127.0.0.1:5432:5432` | **`0.0.0.0:5432`** |
| Imagen n8n | `n8nio/n8n:2.31.6` | `n8nio/n8n:latest` |
| Imagen postgres | `postgres:15.18-alpine` | `postgres:15-alpine` |

Las dos primeras filas son lo que importa: **la UI de administración de n8n y PostgreSQL están
publicados en todas las interfaces**, no en loopback. Cualquiera en la misma red los alcanza — y
hasta hace un momento la contraseña del owner de n8n estaba escrita en un fichero a punto de
publicarse.

La corrección del binding ya está en el compose desde hace fases; lo que falta es **recrear los
contenedores** para que se aplique (eso además aplica el pinning de F20-2):

```powershell
docker compose -f docker-compose.yml up -d
```

**No se ejecutó aquí a propósito.** Recrea el contenedor de n8n, y reiniciar n8n es una operación
que las reglas del proyecto reservan a una decisión explícita. Los datos viven en el volumen
`portafolio-publico_n8n_data`, así que el workflow no se pierde — pero conviene hacerlo de forma
consciente y comprobar el webhook justo después.

Nota menor: la versión de n8n en ejecución **es 2.31.6** (`n8n --version` dentro del contenedor), o
sea que el tag `latest` resolvió a la versión correcta. El pinning no cambia la versión, la fija.

---

## Estado de las validaciones

| Validación | Comando | Resultado |
|---|---|---|
| Lint backend `src/` | `npm run lint` | ✅ limpio |
| Lint backend `tests/` | `npx eslint tests/` | ✅ limpio |
| Tests backend | `npm test` | ✅ **98/98**, 6 suites |
| Typecheck frontend (paso del CI) | `npx tsc --noEmit` | ✅ exit 0 |
| Build frontend | `npm run build` | ✅ compila |
| Compose ×3 | `docker compose config --quiet` | ✅ exit 0 |
| n8n | `healthz` + webhook | ✅ 2.31.6 · **200 `{"received":true}`** |
| Certs nginx en contenedor real | `docker run` + `ls /etc/nginx/ssl` | ✅ ambos legibles, CA bundle intacto (299) |

---

# Checklist de despliegue

## Antes del push

- [ ] **🔴 R-03 — Resolver las credenciales.** Elegir Vía A (rotar) o Vía B (reescribir historial).
      **Nada de esto se puede subir hasta entonces.**
- [ ] Decidir el destino del push. La rama local es `remediacion/v2`, **no tiene upstream** y el
      remoto solo tiene `main` (en `e2cadc3`). Un `git push -u origin remediacion/v2` crea una rama
      nueva; integrar en `main` es otra decisión. Son 58 commits.
- [ ] Confirmar que el CI queda en verde tras el primer push (los 3 jobs).

## Secretos y configuración (heredado de F20, sigue abierto)

- [ ] `STRIPE_WEBHOOK_SECRET` real de Stripe (`whsec_...`). Sin ella el backend **aborta** en producción.
- [ ] `JWT_SECRET` real (`openssl rand -hex 64`).
- [ ] `CORS_ORIGINS` con el dominio real — no admite `*` ni `localhost` en producción.
- [ ] `POSTGRES_PASSWORD` y `N8N_ENCRYPTION_KEY` (`${VAR:?error}`: el `up` falla si faltan).
- [ ] `TRUST_PROXY=1` con nginx delante.
- [ ] **Quitar `JWT_EXPIRES_IN=7d` del `.env`** — pisa el default de 24h (F21 A-11, verificado abierto).
- [ ] Certs reales en `docker/ssl/` (`fullchain.pem`, `privkey.pem`). Están **gitignored**: no vienen
      en un clon. Los actuales son self-signed, válidos para probar, **no para producción**.
- [ ] **No aplicar `database/seeds/002_admin_user.sql` en producción** sin regenerar el hash: la
      password que siembra es débil y su texto plano ha estado en el repo.

## Infraestructura

- [ ] **R-05 — Recrear los contenedores de desarrollo** para que el binding pase a `127.0.0.1` y se
      aplique el pinning. Verificar el webhook justo después.
- [ ] Primer `up` de producción: comprobar que nginx arranca y que resuelve **los tres** upstreams
      (`portafolio-api`, `portafolio-frontend`, `n8n`). El mecanismo de fallo está confirmado: si uno
      no resuelve, nginx **no arranca**.
- [ ] Confirmar que el workflow `<workflow-id>` sigue activo tras cualquier reinicio, y **publicarlo**
      si se editó (`POST /deactivate` + `POST /activate {"versionId"}`).

## Deuda conocida que NO bloquea el release

Detalle y gravedad en `docs/FASE21_AUDITORIA_FINAL.md`.

- `/usage`: el frontend llama a una ruta que no existe y los contratos no casan (A-01). Decisión de producto.
- `/leads/activity` sin backend (A-15).
- Joi solo cubre `auth`/`leads`/`billing`; 6 routers entran sin validar (A-08).
- `users.role` sin enum ni `CHECK` en la columna (A-09).
- Swagger documenta 11 de ~30 paths (A-16, alcance de F19e).
- 0 tests de frontend (A-17).
- Dos migraciones con número `013` (A-07).
- Producción no incluye `redis` ni `rabbitmq`; frontend sin `HEALTHCHECK` (A-13, A-14).
