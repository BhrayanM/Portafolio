# FASE 3 — Backend Profesional

## API REST

```
POST   /api/auth/login       # Login (email + password)
POST   /api/auth/register    # Registro
GET    /api/auth/me          # Usuario actual

GET    /api/users            # Listar usuarios (admin/manager)
GET    /api/users/:id        # Obtener usuario
PATCH  /api/users/:id        # Actualizar usuario (admin)

GET    /api/leads            # Listar leads (filtros: status, category, search)
GET    /api/leads/stats      # Estadísticas de leads
GET    /api/leads/:id        # Obtener lead

GET    /api/tenants          # Obtener tenant actual
PATCH  /api/tenants          # Actualizar tenant (admin)
GET    /api/tenants/usage    # Estadísticas de uso

GET    /health               # Health check
```

## Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | Express.js 4 |
| Autenticación | JWT + bcrypt |
| Validación | Joi (preparado) |
| Base de datos | pg (PostgreSQL) |
| Logs | Morgan + logger.js |
| Seguridad | Helmet + CORS |
| Contenedor | Docker multi-stage (20MB) |

## Cómo ejecutar

```bash
# Local
cd backend
npm install
npm run dev

# Docker
docker build -t portafolio-api ./backend
docker run -p 3000:3000 --env-file .env portafolio-api
```
