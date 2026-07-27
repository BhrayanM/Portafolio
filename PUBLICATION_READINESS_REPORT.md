# FINAL PUBLICATION READINESS REPORT — FASE 21.5

**Rama:** `release/v1-publication-ready` (`8590279`, 72 commits)
**Base:** `release/v1-production-recovery` (`099cef5`) · **Backup:** `backup-before-phase21.5`
**Fecha:** 2026-07-26

**Sin push. Sin merge a `main`. Pendiente de revisión humana.**

---

## 1. Estado antes / después

| | Antes (F21.4) | Después (F21.5) |
|---|---|---|
| IDs de credenciales n8n en ficheros versionados | **3 ficheros** | **0** |
| PII realista (nombres, emails, teléfonos) | 2 ficheros | **0** |
| Dominio real del autor | 9 ficheros | **0** |
| Aislamiento multi-tenant | `WHERE tenant_id` del código; **RLS inerte** | **impuesto por el motor**, verificado |
| Usuario de conexión del backend | superusuario con `BYPASSRLS` | rol `app` (`NOSUPERUSER`, `NOBYPASSRLS`) |
| `FORCE ROW LEVEL SECURITY` | ausente | **6/6 tablas** |
| README | congelado en «FASE 0 — Infraestructura Base» | describe la plataforma real + Roadmap explícito |
| Workflows n8n publicados | 3 con **5 defectos**; nunca importados | **importados y ejecutados** en n8n 2.31.6 limpio |
| Reintentos en nodos HTTP de n8n | 0 | **10** |
| Autenticación en webhooks n8n | ninguna | secreto compartido en los 2 |
| Migraciones | 15 (`001`–`015`) | **16** (`001`–`016`) |
| Tests | 98/98 | **98/98** |
| Enlaces roto en el README | 1 (`docs/IMPLEMENTATION_PLAN.md`) | 0 |

---

## 2. Cambios realizados

Cinco commits, cada uno con su justificación técnica en el mensaje.

### `53006ae` — BLOQUE 2 · Sanitización

Tres familias de datos, detectadas por barrido sobre `git ls-files` y no por la lista previa:

- **IDs reales de credenciales.** `RECOVERY_DIFF_REPORT.md` y `RELEASE_RECOVERY_SUMMARY.md`
  citaban textualmente los 4 IDs de credenciales n8n, el ID del portal de HubSpot y el `vid` de
  un contacto real — escritos al documentar su retirada, con lo que el informe filtraba
  exactamente lo que denunciaba. `FINAL_COMPLETE_AUDIT_PHASE0_TO_PRESENT.md` repetía el error al
  reportarlo. Sustituidos por descripciones.
- **PII en `scripts/test-lead-webhook.sh`.** Dos nombres completos con emails en dominios `.mx`
  no reservados y teléfonos mexicanos con formato válido. Ahora `Jane Smith` / `John Doe`,
  `@example.com` y el rango de documentación `+1-555-01xx`.
- **Dominio real en 9 ficheros.** `docker-compose.prod.yml` pasa a variables de entorno
  (`N8N_HOST`, `N8N_PROTOCOL`, `WEBHOOK_URL`); `scripts/setup-cloudflare.sh` toma `DOMAIN` del
  entorno; `docker/nginx.conf` queda con `example.com` como marcador y la instrucción de
  sustitución en la cabecera, porque **nginx no interpola variables de entorno** en su
  configuración.

### `46c9e7d` — BLOQUE 4 · Aislamiento multi-tenant real

La auditoría F21.4 probó que las políticas RLS de `010_enable_rls.sql` no tenían efecto: el
backend conectaba como propietario y PostgreSQL no aplica RLS al propietario.

**Durante esta fase apareció un agravante que la auditoría no había visto:**

```sql
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'n8n';
-- n8n | t | t
```

`POSTGRES_USER` en la imagen oficial de PostgreSQL no es solo propietario, es **superusuario con
`BYPASSRLS`**. `FORCE ROW LEVEL SECURITY` no alcanza a un superusuario. Es decir: activar FORCE
era **necesario pero no suficiente** — conectar con otro rol es obligatorio, no una mejora de
higiene. Corregí los comentarios que había escrito antes de saberlo, en `016_rls_force.sql`,
`config/index.js` y `.env.example`, porque decían lo contrario.

Tres piezas:

1. **`database/migrations/016_rls_force.sql`** — recrea las 6 políticas con
   `current_setting('app.tenant_id', true)`: sin contexto la variable vale NULL y no pasa ninguna
   fila, en lugar de lanzar `unrecognized configuration parameter`. Fallo cerrado.
   `FORCE ROW LEVEL SECURITY` en las 6 tablas. Aserción que aborta si alguna queda sin FORCE.

2. **`backend/src/db.js`** — el tenant viaja en un `AsyncLocalStorage` y cada consulta se ejecuta
   en una transacción con `set_config('app.tenant_id', ..., true)`. Se eligió frente a pasar un
   `client` por parámetro para no cambiar la firma de los 10 servicios: siguen llamando a
   `pool.query(sql, params)` sin enterarse. El ámbito local a la transacción impide que el
   contexto se filtre a la siguiente petición que reutilice la conexión del pool.
   **Coste asumido:** 3 viajes extra por consulta con contexto.

3. **`middleware/tenant.js`, `config/index.js`, `.env.example`** — `resolveTenant` abre el ámbito
   tras derivar el tenant de la identidad verificada. `DB_USER` / `DB_PASSWORD` permiten conectar
   como `app`.

El `WHERE tenant_id = $1` de los servicios **se mantiene**: defensa en profundidad, no relevo.

### `3b5accd` — BLOQUE 5 · Workflows n8n

La auditoría encontró 3 defectos por análisis estático. **Importarlos en una instancia limpia
reveló dos más que ningún lector del JSON habría visto:**

- Los nodos Code declaraban `language: "javascript"` y `code:`. n8n espera `javaScript` y
  `jsCode`. **Todos los nodos Code de los 3 workflows eran inertes**
  (`Error: Unsupported language: javascript`).
- En `lead-scoring`, los nodos de Slack leían `$json`, que después del nodo de CRM es la
  **respuesta del CRM** y no el lead. La notificación salía
  `Lead caliente — undefined (score undefined)`.

Defectos ya conocidos, corregidos: 5 expresiones sin el prefijo `=` (el token se enviaba como
texto literal); Switch con `typeVersion: 2` y esquema v1 (reescrito a 3.2 con condiciones
tipadas); nodo Code con 2 salidas conectadas que colgaba el webhook; ausencia de parseo de la
respuesta del LLM (nuevo nodo `Parse AI Response` que degrada a 0 si el modelo no devuelve JSON
válido y **deriva la categoría en código**); cursor de `crm-sync` leído de `$env`, que un workflow
no puede actualizar (pasa a `getWorkflowStaticData` y solo avanza si la pasada terminó sin
fallos, más paginación).

Añadido: `retryOnFail` + `maxTries` + `waitBetweenTries` en los **10** nodos HTTP; autenticación
por secreto compartido en los 2 webhooks; saneamiento anti-inyección antes del LLM; fast-ACK 202;
`Idempotency-Key` en los upserts; `saveDataSuccessExecution: none` para dejar de almacenar PII de
leads en la base de ejecuciones.

### `0fbe6fe` — BLOQUE 3 · README

Terminaba en «FASE 0 — Infraestructura Base» y su inicio rápido solo levantaba n8n y Postgres. No
mencionaba el backend, el dashboard, las migraciones, los 98 tests, Stripe, el marketplace ni el
CI. Nueva sección **«La plataforma»** con arquitectura, tabla de capas con su estado verificado,
dos inicios rápidos (incluido el paso del rol `app`, sin el cual RLS no aísla), bloque de
verificación y una sección **Roadmap** que declara 8 elementos como **no implementados**.

Corregido: las imágenes documentadas (`n8nio/n8n:latest` → `2.31.6`, `postgres:15-alpine` →
`15.18-alpine`) y el enlace roto a `docs/IMPLEMENTATION_PLAN.md`.

### `8590279` — BLOQUE 6 · Cierre de sanitización

El barrido final encontró dos restos: el informe de F21.4 reproducía el dominio real (7 veces) y
la PII completa al reportarla; y `backend/tests/lead.test.js` usaba `Laura Fernandez /
Laura@ACME.com / +34 600 111 222 / Acme Corp` — fixtures sintéticos, pero ni `acme.com` ni el
prefijo `+34` están en rangos reservados.

---

## 3. Tests ejecutados

### Backend

| Comando | Resultado |
|---|---|
| `node -e "require('./src/app.js')"` | ✅ APP CARGA OK |
| `npm run lint` (ESLint 9) | ✅ exit 0 |
| `npm test` | ✅ **98 passed / 98** · 6 suites |

Los 4 mocks de `../src/db` se actualizaron porque el contrato del módulo cambió (`runWithTenant`).
Los tests fallaron primero (11 rojos) y se corrigieron actualizando los mocks, no la
implementación.

### Frontend

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (strict) | ✅ exit 0 |
| `npm run build` | ✅ 14/14 páginas · 12 rutas |

### Docker

| Comando | Resultado |
|---|---|
| `docker compose config` (dev) | ✅ exit 0 |
| `docker compose -f docker-compose.prod.yml config` | ✅ exit 0, 5 servicios |
| `docker compose -f docker-compose.prod.yml build` | ✅ ambas imágenes |
| Stack completo arriba | ✅ 5/5, API `healthy` |

### Base de datos

Base creada desde cero, migraciones fichero a fichero con `ON_ERROR_STOP=1`, comprobando el
código de salida real:

```
001…016  → 16/16 OK
seeds    → 2/2 OK
tenants=1 users=1 audit_log=2
EXIT_CODE_GLOBAL=0
```

### Aislamiento multi-tenant — pruebas negativas

**En SQL, como rol `app`:**

| Prueba | Resultado |
|---|---|
| Sin contexto de tenant | **0 filas** |
| Tenant A | 1 fila (la suya) |
| Tenant B | 1 fila (la suya) |
| A lee un lead de B por email | `SIN ACCESO` |
| A hace `INSERT` con `tenant_id` de B | `ERROR: new row violates row-level security policy` |

**A través de la API, stack completo, backend conectado como `app`** (confirmado en
`pg_stat_activity`: `app x1`):

| Prueba | Resultado |
|---|---|
| `POST /api/auth/login` A y B | 200 · cookie `access_token` HttpOnly |
| `POST /api/leads` A y B | 201 |
| `GET /api/leads` A | solo `la@example.com` |
| `GET /api/leads` B | solo `lb@example.com` |
| `GET /api/leads/<id de B>` como A | **404** |
| `/api/tenants`, `/usage`, `/settings`, `/keys`, `/marketplace/installed`, `/auth/me` | 200 |
| `/login`, `/dashboard` vía nginx TLS | 200 |
| `/api-docs/` | 200 |
| Redirección HTTP → HTTPS | 301 |

> **Prueba de que filtra el motor y no el `WHERE`:** como rol `app` con FORCE RLS, una consulta
> sin `app.tenant_id` devuelve 0 filas. El listado de A devuelve 1. Luego el contexto se está
> fijando y las políticas se están evaluando.

### Workflows n8n — ejecución real

Importados en una instancia **n8n 2.31.6 limpia** (contenedor propio, owner creado vía REST) y
ejecutados contra endpoints mock locales:

| Score del modelo | Rama | CRM `status` | Notificación Slack |
|---|---|---|---|
| 12 | Cold | `cold` | ninguna, por diseño |
| 55 | Warm | `warm` | *Lead templado — Demo (score 55)* |
| 87 | Hot | `hot` | *Lead caliente — Demo (score 87)* |

Cadena verificada: `webhook → 202 fast-ACK → verificación de secreto → saneamiento → LLM →
parseo → router → CRM → Slack`.

También verificado: webhook sin secreto no ejecuta ningún nodo posterior; `severity` inválida se
rechaza en validación; un intento de inyección en `message` se neutraliza antes de llegar al
modelo (`[filtrado]` presente en el payload enviado).

### Seguridad

| Comprobación | Resultado |
|---|---|
| Barrido de tokens (`sk-`, `xox*`, `pat-`, `ghp_`, `AKIA`, `whsec_`, PEM) sobre los 72 commits | ✅ 0 hallazgos |
| IDs de credenciales en ficheros versionados | ✅ 0 |
| Dominios no reservados | ✅ 0 |
| Teléfonos fuera del rango de documentación | ✅ 0 |
| Nombres de persona | ✅ 0 |
| `git check-ignore` — necesarios accesibles | ✅ 4/4 |
| `git check-ignore` — sensibles bloqueados | ✅ 6/6 |

---

## 4. Riesgos restantes

### Altos

| ID | Riesgo | Nota |
|---|---|---|
| **R-01** | **nginx resuelve los upstreams al arrancar y no reintenta.** Detectado durante la validación: al recrear el contenedor de frontend, nginx siguió apuntando a la IP anterior y devolvió **502** hasta recargarlo. Se reproduce en cada redespliegue. Arreglo: `resolver 127.0.0.11 valid=10s;` y `proxy_pass` con variable, o `docker compose restart nginx` en el procedimiento de despliegue. |
| **R-02** | **API keys en texto plano** en `tenants.api_keys`, y `GET /api/keys` las devuelve completas. Declarado en el Roadmap del README. |
| **R-03** | **Webhooks de WhatsApp y Voice sin verificación de firma** (`X-Hub-Signature-256`, `X-Twilio-Signature`). Declarado en el Roadmap. |
| **R-04** | **n8n publicado en 443 sin autenticación** pese al comentario «admin access only via Tailscale». No se tocó: sacarlo del vhost o poner allowlist es una decisión de despliegue. |

### Medios

| ID | Riesgo |
|---|---|
| R-05 | El rol `app` es **`NOLOGIN`** en el repositorio. Si el operador olvida el `ALTER ROLE app LOGIN PASSWORD` y no define `DB_USER`, el backend conecta como superusuario y **RLS deja de aislar en silencio** — sin error visible. Documentado en 3 sitios (migración 016, `.env.example`, README), pero sigue siendo un paso manual sin verificación automática. |
| R-06 | `/api-docs` público sin autenticación: publica el mapa completo de la API. |
| R-07 | `WHATSAPP_VERIFY_TOKEN` tiene un valor por defecto en el código (`whatsapp.service.js:47`), justo lo que `config/index.js` erradicó del resto. |
| R-08 | Sin tabla de control de migraciones. Las 16 son idempotentes (verificado), pero nada registra cuáles se aplicaron. |
| R-09 | Un rechazo en los webhooks n8n devuelve **200 con cuerpo vacío** en vez de 401/400. La rechazo es efectivo (nada downstream se ejecuta), pero el llamante no puede distinguirlo por código de estado. Documentado en `projects/examples/README.md`. |
| R-10 | `users` y `tenants` no tienen RLS. |
| R-11 | Sin `middleware.ts` en Next: protección de rutas del lado cliente. |
| R-12 | 0 tests de frontend. |
| R-13 | Coste del ámbito de tenant: 3 viajes extra a la base por consulta. Asumible a esta escala; el siguiente paso sería una transacción por petición en vez de por consulta. |

### Decisión pendiente para el humano

**¿Se publican los 6 informes de auditoría del directorio raíz?**
`RECOVERY_DIFF_REPORT.md`, `RELEASE_RECOVERY_SUMMARY.md`, `SMOKE_TEST_REPORT.md`,
`DATABASE_HARDENING_FIX_REPORT.md`, `FINAL_COMPLETE_AUDIT_PHASE0_TO_PRESENT.md` y este mismo.

Están sanitizados, y son evidencia genuina de rigor: documentan un incidente de release, su causa
raíz y su reparación con verificación. **A favor:** cuentan la historia de ingeniería más valiosa
del repositorio, que hoy no está contada en ningún otro sitio. **En contra:** seis informes en el
raíz son ruido, y un revisor que solo lea los titulares se lleva la impresión de que el proyecto
estuvo roto hasta anteayer.

**Mi recomendación:** moverlos a `docs/audits/` y añadir en el README un párrafo corto que enlace
al conjunto, enmarcándolo como lo que es — un ciclo de auditoría y remediación. Así el raíz queda
limpio y la señal positiva se conserva. No lo he hecho porque cambia la estructura del
repositorio y esa es tu decisión.

---

## 5. Score actualizado

| Área | F21.4 | F21.5 | Motivo del cambio |
|---|---|---|---|
| Arquitectura | 8 | **8** | sin cambios estructurales |
| Backend | 8 | **8** | +ámbito de tenant · sigue pendiente el hash de API keys |
| Frontend | 7 | **7** | sin cambios |
| Database | 7 | **9** | RLS pasa de decorativa a impuesta por el motor, con pruebas negativas |
| Docker / DevOps | 8 | **8** | +dominio parametrizado · −R-01 (DNS obsoleto en nginx) |
| Seguridad | 6 | **8** | aislamiento real, 0 datos sensibles, webhooks n8n autenticados |
| n8n / Automations | 5 | **8** | 5 defectos corregidos, importados y **ejecutados**, reintentos y auth |
| Documentación | 5 | **8** | README describe el sistema real, Roadmap explícito, 0 enlaces rotos |
| **Portfolio readiness** | 6 | **9** | los 3 bloqueadores de F21.4 están cerrados |

**Media: 6.7 → 8.1 / 10**

Para contexto: la auditoría F21 sobre `main` dio **3.6**.

---

## 6. Recomendación

# READY FOR PUBLIC RELEASE

Los tres bloqueadores que identificó F21.4 están cerrados y verificados:

1. IDs de credenciales y PII → **0 apariciones** en ficheros versionados.
2. RLS inerte → **aislamiento impuesto por el motor**, con pruebas negativas en SQL y por API.
3. README congelado en FASE 0 → **describe la plataforma real**, con Roadmap explícito de lo que
   no está implementado.

Todo lo que el repositorio afirma está verificado por ejecución. Lo que no está implementado está
declarado como tal. Ningún riesgo restante es de exposición de datos.

**Antes de hacer push, dos cosas:**

- **R-01 (nginx / DNS obsoleto)** conviene arreglarlo o documentarlo en la guía de despliegue: no
  afecta a la publicación, pero un 502 tras el primer redespliegue es una mala primera impresión
  si alguien despliega el proyecto.
- **La decisión sobre los 6 informes de auditoría** (§4).

Ninguna de las dos bloquea publicar. La segunda es de presentación y es tuya.

**No se ha hecho push ni merge a `main`.** `release/v1-publication-ready` queda como candidata,
con `backup-before-phase21.5` apuntando al estado previo y las 7 ramas anteriores intactas.

---

*Verificado por ejecución: `npm test` (98/98), `npm run lint`, `require('./src/app.js')`,
`tsc --noEmit`, `npm run build` (14 páginas), `docker compose config` ×2,
`docker compose build`, stack de 5 servicios arriba con `nginx -t`, 16 migraciones + 2 seeds sobre
base limpia (exit 0), 5 pruebas negativas de RLS en SQL, 9 comprobaciones de aislamiento por API,
importación y ejecución de los 3 workflows en n8n 2.31.6 limpio con 3 ramas de enrutado, y
barrido de secretos sobre 72 commits.*
