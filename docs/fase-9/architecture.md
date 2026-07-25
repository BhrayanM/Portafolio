# FASE 9 — Seguridad

## Capas de Seguridad

| Capa | Implementación | Estado |
|------|---------------|--------|
| Rate Limiting | express-rate-limit (global + auth + API key) | Config |
| Firewall | UFW (solo 22, 80, 443 abiertos) | Script |
| SSL/TLS | Cloudflare Origin CA | Fase 7 |
| Secret Manager | Coolify ENV (no .env en disco) | Manual |
| Auditoría | audit_log middleware + tabla DB | Config |
| RBAC | 4 roles: admin, manager, member, viewer | Fase 3 |
| RLS | Row Level Security PostgreSQL | Fase 5 |
| VPN | Tailscale (acceso admin) | Manual |
| fail2ban | Protección SSH | Manual |
| Headers | Helmet (CSP, HSTS, XSS, Frameguard) | Config |

## Rate Limiting

| Endpoint | Ventana | Máximo |
|----------|---------|--------|
| `/api/*` | 15 min | 100 requests |
| `/api/auth/login` | 15 min | 5 intentos |
| `/api/auth/register` | 15 min | 5 intentos |
| `/api/*` (con API key) | 1 min | 60 requests |

## Auditoría

La tabla `audit_log` registra automáticamente:
- Login/logout
- CRUD de usuarios
- CRUD de leads
- Cambios en configuración del tenant
- Acciones con API keys

## fail2ban (servidor)

```bash
apt install fail2ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban
```

## Tailscale (acceso admin)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# Solo usuarios autorizados pueden acceder a puertos admin
```
