# FASE 4 — Dashboard Web

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/dashboard` | KPIs: total leads, nuevos hoy, hot, score promedio |
| `/dashboard/leads` | Tabla de leads con búsqueda y filtro por categoría |
| `/dashboard/analytics` | Panel de analytics (placeholder) |
| `/dashboard/settings` | Configuración (placeholder) |

## Tecnologías

| Componente | Tecnología |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS |
| Iconos | Lucide React |
| Despliegue | Docker multi-stage (standalone) |

## Cómo ejecutar

```bash
# Dev
cd frontend
npm install
npm run dev

# Build
npm run build
npm start

# Docker
docker build -t portafolio-frontend ./frontend
docker run -p 3001:3001 --env-file .env portafolio-frontend
```

## Variables de entorno

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```
