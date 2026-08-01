# Development Environment Setup

Guía para ejecutar la plataforma completa en local: infraestructura, migraciones, API y
dashboard.

## Servicios y URLs

| Servicio | URL |
|---|---|
| Frontend (dev) | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| API (directa) | `http://localhost:3001` |
| API (vía nginx, stack dev) | `http://localhost:8080` |
| Health check | `http://localhost:3001/health` |
| Swagger / OpenAPI | `http://localhost:3001/api-docs` |
| n8n | `http://localhost:5678` |

## Usuarios de prueba

Credenciales de demo sembradas por `database/seeds/` — solo para entorno local.

| Rol | Email | Contraseña |
|---|---|---|
| Admin (acceso completo) | `admin@example.com` | `kWkryenHoYUQLk5NdicqhDGJ` |
| Member (acceso limitado) | `member.prueba@example.com` | `MemberPrueba2026` |

> No son credenciales de producción. En un despliegue real se cambian o se sustituyen por
> usuarios creados por registro.

## Inicio rápido

### 1. Infraestructura (n8n + PostgreSQL + Redis + RabbitMQ)

```bash
cp .env.example .env      # editar; nunca se commitea
docker compose up -d      # → http://localhost:5678 (n8n)
```

### 2. Esquema y datos iniciales

Las migraciones se aplican **una a una con `ON_ERROR_STOP=1`**: el `cat *.sql | psql`
típico no sirve aquí, porque un fallo no detiene el flujo y el operador ve un código de
salida 0.

```bash
for f in database/migrations/*.sql database/seeds/*.sql; do
  docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 -f - < "$f" || { echo "fallo en $f"; break; }
done
```

### 3. Rol de aplicación (RLS)

El aislamiento multi-tenant exige conectar con un rol sin privilegios de propietario
(migración `016_rls_force.sql`). Habilitar el rol `app` una sola vez en el despliegue:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER ROLE app LOGIN PASSWORD '<generada>';"
# y en .env:  DB_USER=app  ·  DB_PASSWORD=<la misma>
```

### 4. Backend y dashboard

```bash
cd backend  && npm ci && npm run dev     # API   → http://localhost:3000
cd frontend && npm ci && npm run dev     # Panel → http://localhost:3001
```

### 5. Verificación

```bash
cd backend  && npm run lint && npm test        # 103 tests
cd frontend && npx tsc --noEmit && npm run build
docker compose -f docker-compose.prod.yml build
```

## Notas

1. **SSL self-signed en el stack de producción** (`docker-compose.prod.yml`): aceptar el
   aviso del navegador para continuar.
2. **Health check:** si la API no responde, visitar `http://localhost:3001/health` primero
   para confirmar que el backend está corriendo.
3. **Stack local con nginx:** `docker compose -f docker-compose.dev.yml up -d --build`
   levanta nginx + backend detrás de `http://localhost:8080`.

## Documentación relacionada

- [Índice de documentación](./README.md)
- [Despliegue a producción](./deployment-guide.md)
- [Plataforma SaaS](./platform.md)
