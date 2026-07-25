# Plan de Remediación — Portafolio SaaS

---

## Objetivo General

Transformar el proyecto desde un esqueleto bien estructurado pero no funcional (75-85% código muerto) hasta un SaaS real, integrado, probado y verificable. Cada fase debe dejar el proyecto en mejor estado que antes.

## Estado Actual del Proyecto

**🔴 Desarrollo — 15-20% funcional**

El proyecto genera la ilusión de un SaaS completo pero carece de integraciones reales entre componentes. El código existe y está bien estructurado, pero las conexiones están rotas o nunca existieron.

| Componente | Estado | % Funcional |
|---|---|---|
| Infraestructura (Docker) | Parcial | 40% |
| Base de Datos | No funcional | 0% |
| Backend | Parcial | 40% |
| n8n | No funcional | 0% |
| Frontend | Parcial | 40% |
| Servicios Externos | No funcional | 0% |
| Testing | No existe | 0% |

## Lista Priorizada de Problemas

| # | Prioridad | Fase | Problema | Bloqueante |
|---|---|---|---|---|
| A-01 | 🔴 CRÍTICO | Infra | Puerto 5678 ocupado por contenedor externo (`n8n`) | Sí — n8n propio no arranca |
| A-02 | 🔴 CRÍTICO | Infra | `docker/ssl/` no existe — nginx no arranca en prod | Sí — prod no deployable |
| A-03 | 🔴 CRÍTICO | Infra | Backend Dockerfile usa `npm ci` sin lockfile + `wget` inexistente en alpine | Sí — build falla |
| A-04 | 🔴 CRÍTICO | Infra | Frontend Dockerfile usa `npm ci` sin lockfile | Sí — build falla |
| A-05 | 🔴 CRÍTICO | Infra | monitoring compose referencia red externa no creada | Sí — monitoring no deployable |
| B-01 | 🔴 CRÍTICO | DB | 0 tablas en PostgreSQL — migraciones nunca ejecutadas | Sí — nada funciona sin DB |
| B-02 | 🔴 CRÍTICO | DB | Seed admin con password hash placeholder | Medio |
| B-03 | 🔴 CRÍTICO | DB | Sin mecanismo de migración automatizado | Sí — manual cada vez |
| C-01 | 🔴 CRÍTICO | Backend | `stripe`, `amqplib`, `express-rate-limit` no instalados | Sí — módulos rotos |
| C-02 | 🔴 CRÍTICO | Backend | `billing.routes.js` y `marketplace.routes.js` no registrados en app.js | Sí — endpoints 404 |
| C-03 | 🔴 CRÍTICO | Backend | Login devuelve 500 (sin tabla users, sin .env real) | Sí — auth rota |
| C-04 | 🔴 CRÍTICO | Backend | `security.js` no importado en app.js (rate limiting muerto) | Sí — sin seguridad |
| C-05 | 🟡 ALTO | Backend | JWT_SECRET hardcodeado (`changeme_...`) | Medio |
| D-01 | 🔴 CRÍTICO | n8n | Workflows no importados en n8n | Sí — automatización 0 |
| D-02 | 🔴 CRÍTICO | n8n | Credenciales n8n usan `$vars` sin reemplazar | Sí — conexiones rotas |
| D-03 | 🟡 ALTO | n8n | WhatsApp Agent sin verification webhook | Alto — Meta no conecta |
| D-04 | 🟡 ALTO | n8n | Voice Agent sin Speech-to-Text | Alto — no procesa audio |
| E-01 | 🟡 ALTO | Frontend | JWT en localStorage (vulnerable XSS) | Alto |
| E-02 | 🟡 ALTO | Frontend | 2 páginas placeholder (analytics, settings) | Medio |
| E-03 | 🟡 ALTO | Frontend | API URL hardcodeada a localhost como fallback | Medio |
| E-04 | 🟡 ALTO | Frontend | Sin manejo de errores en fetch | Medio |
| F-01 | 🟡 ALTO | Ext | OpenAI API key placeholder (`sk-proj-tu_key_aqui`) | Sí — sin IA |
| F-02 | 🟡 ALTO | Ext | HubSpot/Slack tokens vacíos | Sí — sin CRM/notif |
| F-03 | 🟡 ALTO | Ext | Stripe Price IDs hardcodeados y no creados | Sí — sin facturación |
| G-01 | 🟡 MEDIO | Testing | No hay tests automatizados | Medio |

## Dependencias Entre Tareas

```
FASE A (Infra)
  └── FASE B (DB) — necesita DB corriendo
        └── FASE C (Backend) — necesita DB funcional
              ├── FASE D (n8n) — necesita backend para webhooks
              └── FASE E (Frontend) — necesita backend funcional
                    └── FASE F (Ext) — necesita todo lo anterior
                          └── FASE G (Testing) — necesita todo funcional
```

**REGLAS ESTRICTAS:**
- No comenzar FASE B sin A completa
- No comenzar FASE C sin B completa  
- No comenzar FASE D sin C completa
- No comenzar FASE E sin C completa
- No comenzar FASE G sin A-F completas

---

## Roadmap de Implementación

### ✅ [COMPLETED] Auditoría — docs/AUDITORIA_REALIDAD.md
- Mapa completo de estado actual
- Evidencia de cada problema

### 🔄 [IN PROGRESS] FASE A: Infraestructura

**Objetivo**: Docker compose funcional, puertos sin conflicto, redes creadas, .env correcto, todos los servicios arrancan.

**Tareas:**
- [ ] A-01: Liberar puerto 5678 (detener contenedor externo)
- [ ] A-02: Crear docker/ssl/ con certificados self-signed de desarrollo
- [ ] A-03: Corregir backend Dockerfile (npm install + curl healthcheck)
- [ ] A-04: Corregir frontend Dockerfile (npm install, output standalone)
- [ ] A-05: Crear red portafolio-net explícitamente si no existe
- [ ] A-06: Verificar docker compose up -d para dev
- [ ] A-07: Verificar docker logs de todos los servicios
- [x] A-08: .env existe con valores para desarrollo
- [ ] A-09: Verificar healthchecks responden

### ⏳ [PENDING] FASE B: Database

**Objetivo**: Migraciones ejecutadas, tablas, índices, constraints, seeds verificados.

**Tareas:**
- [ ] B-01: Migrar database/migrations/*.sql en orden
- [ ] B-02: Ejecutar seeds
- [ ] B-03: Verificar tablas con \dt
- [ ] B-04: Verificar foreign keys, índices, constraints
- [ ] B-05: Verificar seed admin existe

### ⏳ [PENDING] FASE C: Backend

**Objetivo**: Express funcional, login real, todos los endpoints responden.

**Tareas:**
- [ ] C-01: Instalar dependencias faltantes
- [ ] C-02: Integrar billing.routes.js y marketplace.routes.js en app.js
- [ ] C-03: Conectar security.js (rate limiting) en app.js
- [ ] C-04: Verificar login/auth funcionan con DB real
- [ ] C-05: Generar JWT_SECRET real
- [ ] C-06: Probar todos los endpoints con curl

### ⏳ [PENDING] FASE D: n8n

**Objetivo**: Workflows importados, credenciales funcionales, webhooks responden.

**Tareas:**
- [ ] D-01: Importar workflows via n8n REST API
- [ ] D-02: Reemplazar $vars en credenciales por valores reales
- [ ] D-03: Activar workflows
- [ ] D-04: Probar cada webhook

### ⏳ [PENDING] FASE E: Frontend

**Objetivo**: Login, dashboard, leads funcionales con backend real.

**Tareas:**
- [ ] E-01: Migrar auth de localStorage a httpOnly cookies
- [ ] E-02: Reemplazar placeholders de analytics/settings
- [ ] E-03: Mejorar manejo de errores en fetch
- [ ] E-04: Verificar build exitoso

### ⏳ [PENDING] FASE F: Servicios Externos

**Objetivo**: OpenAI, HubSpot, Slack conectados realmente.

**Tareas:**
- [ ] F-01: Configurar API keys reales (o modo degraded controlado)
- [ ] F-02: Stripe: instalar, registrar rutas, crear Price IDs
- [ ] F-03: Verificar cada conexión externa

### ⏳ [PENDING] FASE G: Testing

**Objetivo**: Flujo completo Formulario → n8n → OpenAI → HubSpot → DB → Slack verificable.

**Tareas:**
- [ ] G-01: Probar flujo extremo a extremo
- [ ] G-02: Documentar resultados

---

## Tareas en Progreso

| Fase | Tarea | Iniciado | Estado |
|---|---|---|---|
| Plan | Crear PLAN_REMEDIACION.md | Ahora | ✅ |
| Plan | Crear checkpoint Git | Siguiente | ⏳ |

## Tareas Completadas

| Fase | Tarea | Completado | Evidencia |
|---|---|---|---|
| Audit | Auditoría completa (FASE 1-13) | Previo | docs/AUDITORIA_REALIDAD.md |

## Riesgos Detectados

| # | Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| R-01 | Puerto 5678 ocupado por contenedor legacy | Alto | 100% | Detener contenedor externo |
| R-02 | Sin SSL, prod no deployable | Alto | 100% | Self-signed certs para dev |
| R-03 | OpenAI/HubSpot/Slack tokens no disponibles | Alto | 80% | Modo degraded + logging |
| R-04 | Stripe Price IDs no creados en dashboard | Alto | 90% | Documentar Price IDs a crear |
| R-05 | npm ci sin lockfile rompe builds Docker | Alto | 100% | npm install en Dockerfiles |

## Bloqueadores

| # | Bloqueo | Fase | Impacto | Decisión Requerida |
|---|---|---|---|---|
| BQ-01 | Puerto 5678 ocupado por `n8n` (proyecto externo) | A | n8n no arranca | Detener contenedor legacy |
| BQ-02 | OpenAI API key placeholder | F | IA no funcional | Solicitar key real o modo degraded |
| BQ-03 | HubSpot/Slack tokens vacíos | F | CRM/notif rotas | Solicitar tokens o modo degraded |

## Próximos Pasos

1. ✅ Crear PLAN_REMEDIACION.md
2. 🔄 Crear checkpoint Git
3. 🔄 Iniciar FASE A: Infraestructura

---

*Documento mantenido automáticamente durante la remediación. Última actualización: Julio 2026.*
