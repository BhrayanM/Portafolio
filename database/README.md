# Database

PostgreSQL schema of the multi-tenant platform: versioned migrations and seeds.

## Migrations

- **001–009** — schema: tenants, users, leads, scores, error log, settings, workflow
  runs, audit log and lead log.
- **010–016** — hardening: Row-Level Security, database roles, grants, indexes,
  validation and `FORCE RLS`.

All migrations are **idempotent** and applied with `ON_ERROR_STOP=1` (see
[docs/development-setup.md](../docs/development-setup.md)).

## Seeds

- `001_admin_tenant.sql` — administrator tenant.
- `002_admin_user.sql` — test administrator user (local/demo environment only).

## Related documentation

- [Multi-tenant isolation and RLS](../docs/engineering-practices.md#multi-tenant-architecture)
- [Development environment guide](../docs/development-setup.md)
