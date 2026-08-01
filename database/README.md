# Database

Esquema PostgreSQL de la plataforma multi-tenant: migraciones versionadas y seeds.

## Migraciones

- **001–009** — esquema: tenants, usuarios, leads, scores, error log, settings, workflow
  runs, audit log y lead log.
- **010–016** — endurecimiento: Row-Level Security, roles de base de datos, grants,
  índices, validación y `FORCE RLS`.

Todas las migraciones son **idempotentes** y se aplican con `ON_ERROR_STOP=1` (ver
[docs/development-setup.md](../docs/development-setup.md)).

## Seeds

- `001_admin_tenant.sql` — tenant administrador.
- `002_admin_user.sql` — usuario administrador de prueba (solo entorno local/demo).

## Documentación relacionada

- [Aislamiento multi-tenant y RLS](../docs/engineering-practices.md#arquitectura-multi-tenant)
- [Guía de entorno de desarrollo](../docs/development-setup.md)
