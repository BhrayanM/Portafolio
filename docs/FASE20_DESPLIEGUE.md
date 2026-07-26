# FASE 20 — Auditoría y Preparación para Despliegue

**Rama:** `remediacion/v2` · **Fecha:** 2026-07-25 · Línea base: commit `1570ff0`, 93/93 tests, lint limpio.

## Objetivo

Dejar el stack en estado desplegable. No se despliega nada aquí: se corrige lo que **impediría**
que un despliegue arrancase y se documenta lo que hay que aportar a mano (secretos, certs).

Regla de la fase: **no se inventan secretos de relleno.** Donde falta una credencial real, lo que
se entrega es el fallo en cerrado verificado con un test, no un valor falso que dé sensación de
funcionar.

**Estado: ✅ CERRADO.** Backend lint limpio · **98/98 tests** (93 → 98) · build frontend OK (14 rutas)
· los 3 ficheros compose validan (`docker compose config`).

---

## Resumen de hallazgos

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| F20-1 | `STRIPE_WEBHOOK_SECRET` vacío: sin cobertura que probase el rechazo | Medio | ✅ Documentado + 5 tests |
| F20-2 | 6 imágenes Docker con tag flotante → builds no reproducibles | Medio | ✅ Pineadas |
| F20-3 | Mismatch de mount SSL: **nginx de producción no arrancaba** | 🔴 Alto | ✅ Corregido |
| F20-4 | `frontend/src/lib/api.ts` **no compila** desde F19(d) | 🔴 Bloqueante | ✅ Corregido |
| F20-5 | `apiFetch` mandaba cuerpo JSON sin `Content-Type` → login roto | 🔴 Alto | ✅ Corregido |

F20-4 y F20-5 no estaban en el alcance previsto: aparecieron al ejecutar las validaciones
obligatorias de la fase (`npm run build`). Se corrigen porque un frontend que no compila no es
desplegable, que es exactamente lo que esta fase tenía que determinar.

---

## F20-1 · `STRIPE_WEBHOOK_SECRET` — requisito previo de despliegue

### Decisión: no se crea ningún secreto falso

El secreto lo emite Stripe (`whsec_...`) al dar de alta el endpoint del webhook. Inventar un valor
de relleno sería peor que dejarlo vacío: el arranque en producción pasaría y la verificación de
firma quedaría comparando contra una cadena que no es la de Stripe, fallando en runtime en vez de
en el despliegue.

### Lo que ya estaba bien (verificado, no re-implementado)

Las dos defensas venían de F19(a) H-01 y siguen en pie:

| Capa | Fichero | Comportamiento |
|---|---|---|
| Arranque | `backend/src/config/index.js:123` | `requiredInProd('STRIPE_WEBHOOK_SECRET', ...)` → con `NODE_ENV=production` y la variable vacía, el proceso **aborta** |
| Runtime | `backend/src/services/billing.service.js:137-143` | Sin secreto, `constructEvent` lanza **503 `STRIPE_WEBHOOK_NOT_CONFIGURED`** en vez de verificar contra `''` |

El matiz de H-01 que justifica el 503: con clave vacía la firma **no falla en cerrado**, es
**forjable por cualquiera** — el HMAC-SHA256 con clave vacía lo puede calcular cualquiera.

### Lo que añade F20

- **`backend/tests/deploy.config.test.js`** (nuevo, 5 tests). Cierra el hueco: el comportamiento
  estaba implementado pero **sin una sola prueba**, así que una regresión que reintrodujese el
  `|| ''` habría pasado el CI en verde.
  - Rechazo del webhook sin secreto, y que el rechazo es 503 con el código correcto.
  - Aborto del arranque en producción, recargando `config` con `jest.isolateModules` y un entorno
    de producción controlado.
  - Caso positivo: con el secreto presente, `config` carga.
  - El fichero fija `process.env.STRIPE_WEBHOOK_SECRET = ''` **antes de cualquier `require`**.
    `dotenv` no pisa claves que ya existen en `process.env`, así que esto neutraliza el `.env` real
    del desarrollador y el test da el mismo resultado en cualquier máquina y en CI.
- **`.env.example`**: la variable queda marcada como requisito previo de despliegue, con las dos
  consecuencias explícitas (aborta en producción / 503 fuera de producción).

> Corrección de procedencia: un cambio sin commitear había reetiquetado como «F20» los hallazgos
> **H-01** y **D-02**, que son de F19(a). Se restauran sus etiquetas originales — la trazabilidad
> de qué fase encontró qué es el valor del historial.

---

## F20-2 · Pinning de imágenes Docker

Seis imágenes usaban tag flotante. Con tag flotante, dos builds del **mismo commit** pueden salir
con runtimes distintos: el build deja de ser reproducible y una regresión de upstream entra sin
aparecer en ningún diff.

**Cada pin es la versión a la que el tag flotante ya resolvía** (verificado contra la API de
Docker Hub, 2026-07-25). No hay ningún salto de versión: se congela la resolución, no se actualiza
nada.

| Fichero | Antes | Después | Justificación |
|---|---|---|---|
| `backend/Dockerfile` (×2 stages) | `node:20-alpine` | `node:20.20.2-alpine` | Último patch de la línea LTS 20 ya en uso |
| `frontend/Dockerfile` (×2 stages) | `node:20-alpine` | `node:20.20.2-alpine` | Mismo pin que backend: las dos imágenes no deben divergir de runtime |
| `docker-compose.yml` | `postgres:15-alpine` | `postgres:15.18-alpine` | Mismo major → mismo formato de datos, sin migración |
| `docker-compose.yml` | `redis:7-alpine` | `redis:7.4.9-alpine` | Exactamente lo que `7-alpine` resolvía |
| `docker-compose.yml` | `rabbitmq:3-alpine` | `rabbitmq:3.13.7-alpine` | Último 3.x con imagen alpine (la 4.x sería cambio de major: **no** se hace) |
| `docker-compose.prod.yml` | `postgres:15-alpine`, `nginx:1.27-alpine` | `postgres:15.18-alpine`, `nginx:1.27.5-alpine` | Último patch de cada línea |
| `docker-compose.dev.yml` | `nginx:1.27-alpine` | `nginx:1.27.5-alpine` | Ídem |

**`n8nio/n8n:2.31.6` no se toca.** Ya estaba pineado y es el runtime del workflow activo
`92fIV59ijURIYfwT`: tocarlo obligaría a reiniciar el contenedor y republicar.

Nota: `rabbitmq` sigue en la línea 3.x deliberadamente. Subir a 4.x es un cambio de major con
cambios de comportamiento, y el worker RabbitMQ es un placeholder sin consumidores. Pinear no es
el momento de migrar. → deuda.

---

## F20-3 · Mismatch de certificados SSL en nginx (bloqueante real)

**Confirmado: el mismatch existía y el nginx de producción no habría arrancado.**

| | Ruta |
|---|---|
| Mount en `docker-compose.prod.yml` | `./docker/ssl:/etc/ssl:ro` |
| Rutas en `docker/nginx.conf` (×3 server blocks) | `/etc/nginx/ssl/fullchain.pem`, `/etc/nginx/ssl/privkey.pem` |

Los ficheros aterrizaban en `/etc/ssl/fullchain.pem`, que no es donde nginx los busca:
`cannot load certificate ... No such file or directory` y el contenedor muere al arrancar.
Efecto secundario adicional: montar sobre `/etc/ssl` **tapa el bundle de CAs del contenedor**, con
lo que cualquier salida TLS desde nginx dejaría de validar.

**Corrección aplicada** — se mueve el destino del mount a la ruta que la config ya espera:

```yaml
- ./docker/ssl:/etc/nginx/ssl:ro
```

**Se corrigió el compose, no el `nginx.conf`.** Un solo mount contra tres rutas repetidas en tres
`server` blocks: la superficie de cambio es menor y `/etc/nginx/ssl` es además la convención
habitual. `docker/nginx.conf` no se tocó.

`docker/nginx.dev.conf` **no tiene SSL** (HTTP en el 80, para local): ahí no hay nada que corregir.

> **Requisito previo de despliegue derivado:** `docker/ssl/*.pem` está en `.gitignore`
> (`.gitignore:30`, `*.pem`) y **no se versiona** — correcto para un repo público. En un clon nuevo
> el directorio no existe, Docker crearía un bind mount vacío y nginx volvería a morir por la misma
> razón. Hay que colocar los certs **antes** del primer `up`.

---

## F20-4 y F20-5 · El frontend no compilaba

`npm run build` fallaba en la rama. Causa: F19(d) (`0da428e`) reescribió
`frontend/src/lib/api.ts` y dejó fuera cuatro exports que cinco páginas siguen importando.

```
Type error: Module '"@/lib/api"' has no exported member 'activityApi'.
Attempted import error: 'apiFetch'    is not exported from '@/lib/api'
Attempted import error: 'settingsApi' is not exported from '@/lib/api'
Attempted import error: 'usageApi'    is not exported from '@/lib/api'
```

| Export perdido | Lo importa |
|---|---|
| `apiFetch` | `dashboard/marketplace/page.tsx`, `dashboard/integrations/page.tsx` |
| `activityApi` | `dashboard/activity/page.tsx` |
| `settingsApi` | `dashboard/settings/page.tsx` |
| `usageApi` | `dashboard/usage/page.tsx` |

Al reponerlos aparecieron tres defectos más en el mismo fichero, todos corregidos:

1. **Cuerpo JSON sin `Content-Type` (F20-5, alto).** `authApi.login` y `billingApi.createCheckout`
   mandaban `JSON.stringify(...)` sin la cabecera. `express.json()` solo parsea con
   `application/json`, así que el backend recibía `{}` y **el login respondía 400 con credenciales
   correctas**. Ahora se pone por defecto en cuanto hay `body`.
2. **Comprobación de origen inoperante.** Leía `process.env.CORS_ORIGINS`, que no lleva prefijo
   `NEXT_PUBLIC_` y por tanto **siempre es `undefined` en el navegador**. La lista quedaba vacía, el
   regex resultante no casaba con nada, toda petición se marcaba como «externa» y cada llamada
   escribía un `console.warn('[SECURITY]', ...)` **incluyendo el tenant ID**. El «bloqueo» en
   producción era un `console.error`, que no bloquea nada. Eliminada: quien controla el navegador
   controla esa comprobación; el origen lo decide el backend vía CORS (F19a D-01).
3. **Lectura de `localStorage.getItem('app.authToken')`.** Contradice directamente el contrato de
   F19: la sesión va en cookie **HttpOnly** y JS no puede leer el JWT. Era código muerto que
   sugería lo contrario. Eliminada; queda `credentials: 'include'`, que es lo que hace falta.

También se reparó el **mojibake** del fichero (`Petici�n`, `Excepci�n`, `taila externa`) y se
conservó lo que F19(d) sí aportaba: timeout por `AbortController`, parseo defensivo de errores del
backend y `credentials: 'include'`.

---

## Validaciones ejecutadas

| Validación | Comando | Resultado |
|---|---|---|
| Lint backend (`src/`) | `npm run lint` | ✅ limpio |
| Lint backend (`tests/`) | `npx eslint tests/` | ✅ limpio |
| Tests backend | `npm test` | ✅ **98/98** en 6 suites (93 → 98) |
| Build frontend | `npm run build` | ✅ OK, **14 rutas** |
| Sintaxis compose ×3 | `docker compose -f <f> config --quiet` | ✅ exit 0 los tres |

`docker compose config` valida sintaxis y resolución de variables sin daemon. **No se levantó
ningún contenedor**: el demonio de Docker no estaba corriendo y arrancar el stack habría reiniciado
el n8n con el workflow activo. La corrección de F20-3 está verificada por lectura cruzada de mount
y config, no por arranque.

---

## Requisitos previos de despliegue (acciones manuales)

Sin esto, un despliegue a producción **no arranca**. Ninguno es código: son valores que solo puede
aportar quien despliega.

| # | Requisito | Verificación |
|---|---|---|
| 1 | `STRIPE_WEBHOOK_SECRET` = `whsec_...` real de Stripe | Sin ella el proceso aborta con la lista de faltantes |
| 2 | `JWT_SECRET` real (`openssl rand -hex 64`) | Ídem. Ya no hay secreto por defecto en el código |
| 3 | `CORS_ORIGINS` con el dominio real | No admite `*` ni `localhost` en producción (F19a D-01) |
| 4 | `POSTGRES_PASSWORD` y `N8N_ENCRYPTION_KEY` | `${VAR:?error}` en compose: `up` falla si faltan |
| 5 | `docker/ssl/fullchain.pem` + `privkey.pem` presentes | Gitignored: **no vienen en el clon** (ver F20-3) |
| 6 | `TRUST_PROXY=1` con nginx delante | Por defecto desactivado a propósito (F18.5) |
| 7 | `.env` local: `JWT_EXPIRES_IN=7d` sigue pisando el default de 24h | Heredado de F19(a), sin resolver |

---

## Deuda registrada en F20

| Deuda | Nota |
|---|---|
| `next.config.js` manda `Access-Control-Allow-Origin` con **lista separada por comas** | Inválido por spec: el header admite un origen o `*`. Latente, no bloqueante — `apiFetch` va directo al backend, no por el rewrite de Next. → F21 |
| `/leads/activity` y `/usage` sin backend | `activityApi`/`usageApi` apuntan a la ruta prevista y devuelven 404; las páginas ya muestran su banner de error |
| RabbitMQ sigue en 3.13.7 | Subir a 4.x es cambio de major; el worker es placeholder sin consumidores |
| Pinning por tag, no por digest | Un tag de patch es mutable en teoría. `@sha256:` sería el siguiente escalón |
| CLAUDE.md dice certs en `certs/` y «PostgreSQL 16» | Las rutas reales son `docker/ssl/` y postgres **15** |
| 0 tests frontend | El build fue lo único que detectó F20-4. Con un test de humo se habría visto antes |
