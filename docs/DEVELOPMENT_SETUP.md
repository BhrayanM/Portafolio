# Development Environment Setup — Local Testing

## URLs del Entorno de Prueba

| Servicio | URL |
| Frontend | `http://localhost:3000` |
| Login | `http://localhost:3000/login` |
| API (direct) | `http://localhost:3001` |
| API (via nginx) | `http://localhost:8080` |
| Health Check | `http://localhost:3001/health` |
| Swagger | `http://localhost:3001/api-docs` |
| n8n | `http://localhost:5678` |

## Test Users

### Admin (full access)
- **Email**: `admin@example.com`
- **Password**: `kWkryenHoYUQLk5NdicqhDGJ`

### Member (limited access)
- **Email**: `member.prueba@example.com`
- **Password**: `MemberPrueba2026`

## Notas

1. **SSL Self-Signed**: In the nginx stack (`docker-compose.prod.yml`), the SSL certificate is self-signed. Accept the browser warning to proceed.

2. **Health Check**: If the API does not respond, visit `http://localhost:3001/health` first to confirm the backend is running.

3. **Test credentials only**: Not for production use.

4. **Quick start**:
   ```bash
   # Frontend (dev)
   cd frontend && npm run dev

   # Backend (dev)
   cd backend && npm run dev

   # Full Docker stack
   docker compose up -d
   docker compose -f docker-compose.dev.yml up -d
   ```
