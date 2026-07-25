# FASE 7 — Infraestructura Cloud

## Arquitectura

```
Usuario ──► Cloudflare ──► NGINX ──► Backend/Frontend/n8n
                  │
             CDN + SSL + DDoS
```

## Componentes

| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| DNS | Cloudflare | Config manual |
| SSL | Cloudflare Origin CA / Let's Encrypt | Config manual |
| Proxy | NGINX (Alpine) | Config listo |
| CDN | Cloudflare | Config manual |
| Orquestación | Coolify (opcional) | Pendiente |
| Backups | Hetzner Storage Box + cron | Script listo |

## Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `docker/nginx.conf` | Reverse proxy con SSL, HTTP/2, cache estático |
| `docker-compose.prod.yml` | Producción: nginx + api + frontend + n8n + postgres |
| `scripts/setup-cloudflare.sh` | Guía de configuración Cloudflare |

## Cómo desplegar en Hetzner

```bash
# 1. Conectar por SSH
ssh root@<IP_DEL_SERVER>

# 2. Clonar repo
git clone https://github.com/BhrayanM/Portafolio.git
cd Portafolio

# 3. Configurar SSL
# Opción A: Cloudflare Origin CA (recomendada)
# Opción B: certbot
./scripts/setup-cloudflare.sh

# 4. Iniciar producción
docker compose -f docker-compose.prod.yml up -d

# 5. Verificar
curl https://portafolio.ai/health
```

## Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 5678       # n8n no expuesto
ufw deny 5432       # Postgres no expuesto
ufw enable
```

## Backups Automáticos (cron)

```bash
# Diario a las 3 AM
0 3 * * * /root/Portafolio/scripts/backup.sh >> /var/log/portafolio-backup.log 2>&1
```
