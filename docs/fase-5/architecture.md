# FASE 5 — Sistema Multiempresa

## Aislamiento de Datos

Cada tenant (cliente) tiene datos aislados mediante:

1. **tenant_id** en todas las tablas (índices compuestos)
2. **Row Level Security (RLS)** en PostgreSQL (capa extra de seguridad)
3. **Middleware** que resuelve tenant de: JWT → Header `X-Tenant-ID` → API Key

## API Keys

```
GET    /api/keys       # Listar API Keys del tenant
POST   /api/keys       # Crear nueva API Key (admin)
DELETE /api/keys       # Revocar API Key (admin)
```

## Flujo de Autenticación

```
Request
  │
  ├── Header: Authorization: Bearer <JWT>  → JWT auth (dashboard)
  │
  ├── Header: x-api-key: <key>             → API Key auth (webhooks)
  │
  └── Header: x-tenant-id: <uuid>          → Tenant override
```

## RLS Policies

Ver: `database/migrations/010_enable_rls.sql`

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

## Estructura de API Keys (JSONB en tenants)

```json
[
  {
    "name": "Production Webhook",
    "key": "pk_abc123...",
    "created_at": "2026-07-25T00:00:00.000Z",
    "active": true
  }
]
```
