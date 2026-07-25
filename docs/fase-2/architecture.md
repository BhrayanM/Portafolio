# FASE 2 — Base de Datos Central

## Esquema

```
┌────────────────────────────────────────────────────────────┐
│                        PostgreSQL                            │
│                                                              │
│  tenants ────┬─── users                                      │
│              ├─── leads ──── scores                          │
│              ├─── lead_log                                   │
│              ├─── error_log                                  │
│              ├─── workflow_runs                              │
│              ├─── settings                                   │
│              └─── audit_log                                  │
└────────────────────────────────────────────────────────────┘
```

## Migraciones

| Archivo | Tabla | Propósito |
|---------|-------|-----------|
| 001 | tenants | Empresas/clientes (multi-tenant) |
| 002 | users | Usuarios del sistema |
| 003 | leads | Leads con score IA y status |
| 004 | scores | Historial de scores por lead |
| 005 | error_log | Errores del sistema |
| 006 | settings | Configuración por tenant |
| 007 | workflow_runs | Trazabilidad de ejecuciones |
| 008 | audit_log | Auditoría de acciones |
| 009 | lead_log | Log plano de leads (n8n) |

## Cómo ejecutar

```bash
# Opción 1: Directo en PostgreSQL
cat database/migrations/*.sql | docker exec -i portafolio-postgres-1 psql -U n8n

# Opción 2: Con node (knex) — cuando exista backend
npx knex migrate:latest
```

## Relaciones clave

- `leads.tenant_id → tenants.id` (CASCADE)
- `users.tenant_id → tenants.id` (CASCADE)
- `scores.lead_id → leads.id` (CASCADE)
- `error_log.tenant_id → tenants.id` (SET NULL)
- `audit_log.user_id → users.id` (SET NULL)
- `workflow_runs.tenant_id → tenants.id` (SET NULL)
