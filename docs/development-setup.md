# Development Environment Setup

Guide for running the full platform locally: infrastructure, migrations, API and
dashboard.

## Services and URLs

| Service | URL |
|---|---|
| Frontend (dev) | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| API (direct) | `http://localhost:3001` |
| API (via nginx, dev stack) | `http://localhost:8080` |
| Health check | `http://localhost:3001/health` |
| Swagger / OpenAPI | `http://localhost:3001/api-docs` |
| n8n | `http://localhost:5678` |

## Test users

Demo credentials seeded by `database/seeds/` — local environment only.

| Role | Email | Password |
|---|---|---|
| Admin (full access) | `admin@example.com` | `kWkryenHoYUQLk5NdicqhDGJ` |
| Member (limited access) | `member.prueba@example.com` | `MemberPrueba2026` |

> Not production credentials. In a real deployment they are changed or replaced by
> users created through registration.

## Quick start

### 1. Infrastructure (n8n + PostgreSQL + Redis + RabbitMQ)

```bash
cp .env.example .env      # edit; never commit
docker compose up -d      # → http://localhost:5678 (n8n)
```

### 2. Schema and initial data

Migrations are applied **one by one with `ON_ERROR_STOP=1`**: the typical
`cat *.sql | psql` does not work here, because a failure does not stop the flow and the
operator sees exit code 0.

```bash
for f in database/migrations/*.sql database/seeds/*.sql; do
  docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 -f - < "$f" || { echo "failed on $f"; break; }
done
```

### 3. Application role (RLS)

Multi-tenant isolation requires connecting with a role without owner privileges
(migration `016_rls_force.sql`). Enable the `app` role once per deployment:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER ROLE app LOGIN PASSWORD '<generated>';"
# and in .env:  DB_USER=app  ·  DB_PASSWORD=<the same>
```

### 4. Backend and dashboard

```bash
cd backend  && npm ci && npm run dev     # API   → http://localhost:3000
cd frontend && npm ci && npm run dev     # Panel → http://localhost:3001
```

### 5. Verification

```bash
cd backend  && npm run lint && npm test        # 113 tests
cd frontend && npx tsc --noEmit && npm run build
docker compose -f docker-compose.prod.yml build
```

## Notes

1. **Self-signed SSL in the production stack** (`docker-compose.prod.yml`): accept the
   browser warning to continue.
2. **Health check:** if the API does not respond, visit `http://localhost:3001/health`
   first to confirm the backend is running.
3. **Local stack with nginx:** `docker compose -f docker-compose.dev.yml up -d --build`
   starts nginx + backend behind `http://localhost:8080`.

## Related documentation

- [Documentation index](./README.md)
- [Production deployment](./deployment-guide.md)
- [SaaS platform](./platform.md)
