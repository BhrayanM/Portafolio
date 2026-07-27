# Accesos de Prueba — Entorno Local

## URLs del Entorno de Prueba

| Servicio | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| API (directo) | `http://localhost:3001` |
| API (vía nginx dev) | `http://localhost:8080` |
| Health Check | `http://localhost:3001/health` |
| Swagger | `http://localhost:3001/api-docs` |
| n8n | `http://localhost:5678` |

## Usuarios de Prueba

### Admin (acceso completo)
- **Email**: `admin@example.com`
- **Contraseña**: `kWkryenHoYUQLk5NdicqhDGJ`

### Member (acceso limitado)
- **Email**: `member.prueba@example.com`
- **Contraseña**: `MemberPrueba2026`

## Notas

1. **SSL Self-Signed**: En el stack con nginx (`docker-compose.prod.yml`), el certificado SSL es autofirmado. Si el navegador muestra advertencia de seguridad, acepta el riesgo manualmente para continuar.

2. **Health Check**: Si la API no responde, visita primero `http://localhost:3001/health` para confirmar que el backend está corriendo. Luego reintenta el login.

3. **Credenciales exclusivas para testing**: No usar en producción ni compartir públicamente.

4. **Inicio rápido**:
   ```bash
   # Frontend (dev)
   cd frontend && npm run dev

   # Backend (dev)
   cd backend && npm run dev

   # Stack completo (Docker)
   docker compose up -d
   docker compose -f docker-compose.dev.yml up -d
   ```
