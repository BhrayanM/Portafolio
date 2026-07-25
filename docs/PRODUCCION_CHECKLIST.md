# Checklist de producción

Estado a 2026-07-25. Regla: **nada marcado como hecho sin evidencia.**

Leyenda: ✅ hecho y verificado · 🟡 existe pero sin verificar · ❌ pendiente · ⛔ fuera de alcance

## Resumen

| Área | Estado |
|---|---|
| HTTPS y certificados | ❌ Pendiente |
| Dominio y DNS | ❌ Pendiente |
| Variables de entorno | 🟡 Parcial — 3 credenciales vacías |
| Rotación de credenciales | ❌ Pendiente |
| Backups de PostgreSQL | 🟡 Script escrito, **roto y sin probar** |
| Monitoreo | 🟡 Configuración escrita, sin desplegar |
| Logs | 🟡 Parcial — errores sí, aplicación no |
| Seguridad del repositorio | ✅ Hecho |

**Ningún componente está listo para producción hoy.** El sistema funciona en local y le faltan
tanto credenciales externas como toda la capa de operación.

---

## 1. HTTPS y certificados

| Ítem | Estado | Evidencia / nota |
|---|---|---|
| Nginx como reverse proxy | 🟡 | Servicio `nginx` definido en `docker-compose.prod.yml`; nunca levantado |
| Certificados TLS | ❌ | `docs/VALIDACION_RUNTIME.md` menciona certs self-signed en `certs/`, pero **el directorio no existe** |
| Certificado de CA real (Let's Encrypt) | ❌ | Sin emitir |
| Renovación automática | ❌ | Sin configurar |
| Redirección HTTP → HTTPS | ❌ | Sin configurar |
| HSTS | ❌ | Sin configurar |
| TLS solo 1.2+ | ❌ | Sin configurar |

**Siguiente paso:** decidir terminación TLS (Nginx con certbot, o Cloudflare delante —
existe `scripts/setup-cloudflare.sh` sin ejecutar).

## 2. Dominio y DNS

| Ítem | Estado | Nota |
|---|---|---|
| Dominio registrado | ❌ | No hay dominio asignado |
| Registros DNS (A / CNAME) | ❌ | — |
| Subdominio para n8n | ❌ | n8n solo responde en `localhost:5678` |
| `WEBHOOK_URL` de n8n con dominio público | ❌ | Sin esto, los webhooks de reanudación (`Wait for Approval`) no son alcanzables desde Slack |
| Firewall | 🟡 | `scripts/setup-firewall.sh` existe, sin ejecutar |

> ⚠️ **Bloqueante para el flujo HOT.** El nodo `Wait for Approval` pausa hasta recibir una
> llamada de vuelta. Con n8n en `localhost`, Slack no puede alcanzarlo. Publicar n8n en un
> dominio con HTTPS es **requisito**, no mejora opcional.

## 3. Variables de entorno

| Ítem | Estado | Evidencia |
|---|---|---|
| `.env` fuera de git | ✅ | `git check-ignore` → `.gitignore:19:*.env` |
| `.env.example` con placeholders | ✅ | Solo valores tipo `tu_key`, `user:pass` |
| `POSTGRES_*` | ✅ | Contenedor `(healthy)`, conexiones reales |
| `JWT_SECRET` | ✅ | Login del backend devuelve token |
| `OPENAI_API_KEY` | 🟡 | Válida pero **cuenta sin saldo** (HTTP 429 `insufficient_quota`) |
| `SLACK_BOT_TOKEN` · `SLACK_CHANNEL_ID` | ❌ | Vacías |
| `HUBSPOT_ACCESS_TOKEN` | ❌ | Vacía |
| Separación de entornos (dev / staging / prod) | ❌ | Un único `.env` |
| Gestor de secretos (Vault, SOPS, secrets del cloud) | ❌ | Secretos en fichero plano |
| Contraseña por defecto de n8n cambiada | ❌ | Sigue `admin@portafolio.ai` / contraseña de desarrollo |

## 4. Rotación de credenciales

| Ítem | Estado | Nota |
|---|---|---|
| Política de rotación documentada | ❌ | Sin definir periodicidad ni responsable |
| Rotación de contraseña de PostgreSQL | ❌ | La actual se fijó en la FASE A y no ha cambiado |
| Rotación de `JWT_SECRET` | ❌ | Rotarlo invalida las sesiones: requiere plan |
| Rotación de tokens externos | ❌ | No aplicable aún: 2 de 3 no existen |
| Credenciales de n8n con permiso mínimo | 🟡 | HubSpot y Slack aún no creadas; al crearlas, limitar scopes |
| Inventario de dónde vive cada secreto | 🟡 | Documentado en `ARQUITECTURA.md`, sin dueño asignado |

**Recomendación mínima antes de producción:** cambiar la contraseña de n8n y la de PostgreSQL,
y crear los tokens de Slack/HubSpot ya con el scope mínimo.

## 5. Backups de PostgreSQL

| Ítem | Estado | Evidencia |
|---|---|---|
| Script de backup | 🟡 | `scripts/backup.sh` existe (pg_dump + retención 30 días) |
| **El script apunta a un contenedor inexistente** | ❌ | Define `DB_CONTAINER="portafolio-postgres-1"`; el real es `portafolio-publico-postgres-1` → **el backup falla** |
| Backup ejecutado alguna vez | ❌ | Sin evidencia de ejecución |
| Restauración probada | ❌ | Un backup sin restauración probada no es un backup |
| Programación automática (cron / timer) | ❌ | Solo manual |
| Copia fuera del host | ❌ | Escribe en `./backups` local: un fallo de disco se lo lleva todo |
| Cifrado de los backups | ❌ | Sin cifrar |
| Retención verificada | 🟡 | Parametrizada (`RETENTION_DAYS=30`), nunca ejercitada |

**Acción inmediata:** corregir `DB_CONTAINER` en `scripts/backup.sh`, ejecutarlo una vez y
**probar la restauración** en una base desechable.

## 6. Monitoreo

| Ítem | Estado | Evidencia |
|---|---|---|
| Prometheus | 🟡 | `monitoring/prometheus.yml` presente, sin desplegar |
| Grafana + dashboards | 🟡 | `monitoring/grafana-dashboards`, `grafana-datasources` presentes, sin desplegar |
| Loki (agregación de logs) | 🟡 | `monitoring/loki.yml` presente, sin desplegar |
| Stack de monitoreo levantado | ❌ | `monitoring/docker-compose.monitoring.yml` nunca ejecutado |
| Healthchecks | 🟡 | `postgres` tiene healthcheck; n8n expone `/healthz`; nadie los vigila |
| Alertas (caída, tasa de error, uso de disco) | ❌ | Sin configurar |
| Alerta sobre `error_log` | ❌ | La tabla se llena, pero nada avisa |
| Uptime externo | ❌ | Sin configurar |

## 7. Logs

| Ítem | Estado | Evidencia |
|---|---|---|
| Errores de workflow persistidos | ✅ | `error_log` con nodo, mensaje, execution ID y código HTTP |
| Contexto útil en el error | ✅ | Se añadió `stack_trace`, `nodeName`, `httpCode`, `executionUrl` |
| Trazabilidad de leads | ✅ | `lead_log` con score, categoría y estado |
| Logs de aplicación estructurados | ❌ | El backend escribe a stdout sin formato estructurado |
| Rotación de logs de Docker | ❌ | Sin `max-size` / `max-file`: pueden llenar el disco |
| Centralización | ❌ | Loki configurado pero no desplegado |
| Retención de ejecuciones de n8n | ❌ | Sin política de purga: `execution_data` crece sin límite |
| Auditoría de accesos | 🟡 | Tabla `audit_log` creada, sin escrituras verificadas |

## 8. Seguridad del repositorio

| Ítem | Estado | Evidencia |
|---|---|---|
| `.env` ignorado | ✅ | `.gitignore:19:*.env` |
| Workflows n8n fuera de git | ✅ | `.gitignore:65:workflows/`; `git log --all -- 'n8n/workflows/*'` vacío |
| Ningún secreto real trackeado | ✅ | Barrido sobre `git ls-files`: 4 coincidencias, las 4 placeholders |
| Hook `pre-commit` que bloquea secretos | ✅ | 8 reglas; probado con casos reales y con falsos positivos |
| Credential IDs redactados en la documentación | ✅ | Sustituidos por `<cred-*>` y `<workflow-id>` |
| Hook compartido con el equipo | ❌ | Vive en `.git/hooks/`, que no se versiona ni se clona |
| Escaneo de secretos en CI | ❌ | Sin CI configurado |
| Dependencias auditadas (`npm audit`) | ❌ | Sin ejecutar |

## 9. Fuera de alcance

| Ítem | Nota |
|---|---|
| Stripe / billing | No forma parte del flujo de leads |
| Tests automatizados | 0 tests escritos; Jest y Supertest instalados sin casos |
| Rutas de frontend faltantes | `billing`, `invoices`, `usage`, `activity` sin implementar |

---

## Orden sugerido

1. **Corregir y probar el backup** — es lo único que protege de una pérdida irreversible.
2. **Cambiar las contraseñas por defecto** (n8n y PostgreSQL).
3. **Dominio + HTTPS** — desbloquea además la rama HOT (`Wait for Approval`).
4. **Credenciales externas** (OpenAI con saldo, Slack, HubSpot) → permite el primer E2E real.
5. **Levantar el stack de monitoreo** y alertar sobre `error_log`.
6. **Rotación de logs y purga de ejecuciones** antes de que el disco sea el problema.
