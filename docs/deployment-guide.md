# Deployment Guide

Production deployment instructions for the Portafolio SaaS platform.

---

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2+
- **Node.js** 20 LTS (local development only)
- **Git** for version control
- Access to a cloud VM (recommended: 4+ vCPU, 8 GB RAM)

### Required Environment Variables

All secrets are configured exclusively through environment variables. See `.env.example` for the complete list.

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Database password |
| `AUTOMATION_ENCRYPTION_KEY` | Yes | 32-character key for n8n credential encryption |
| `JWT_SECRET` | Production | HS256 signing key |
| `CORS_ORIGINS` | Production | Comma-separated allowed origins |

---

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/BhrayanM/Portafolio.git
cd Portafolio

# 2. Configure environment
cp .env.example .env
# Edit .env with your production values

# 3. Create shared Docker network
docker network create app-net

# 4. Provision TLS certificates
mkdir -p docker/ssl
# Place certificates in docker/ssl/ or configure automated renewal
```

---

## Local Development

```bash
# Start infrastructure services
docker compose up -d postgres automation

# Start backend (with hot reload)
cd backend && npm install && npm run dev

# Start frontend (with hot reload, separate terminal)
cd frontend && npm install && npm run dev

# Run database migrations
cat database/migrations/*.sql | docker exec -i portafolio-postgres psql -U portafolio

# Seed initial tenant and admin user
cat database/seeds/*.sql | docker exec -i portafolio-postgres psql -U portafolio
```

### Quality Checks

```bash
# Backend
cd backend && npm run lint && npm test

# Frontend
cd frontend && npx tsc --noEmit && npm run build
```

---

## Production Deployment

### 1. Provision Infrastructure

Deploy a cloud VM with:
- Ubuntu 22.04 LTS or Debian 12 (recommended)
- Docker 24+ and Docker Compose v2
- 4+ vCPU, 8 GB RAM, 50 GB SSD
- Static public IP with DNS A record

### 2. Configure DNS and TLS

```bash
# Point your domain to the server IP
# Example (Cloudflare):
#   Type: A, Name: app, Value: <server-ip>, Proxy: Yes

# Provision certificates using ACME
sudo apt install certbot
sudo certbot certonly --standalone -d app.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/app.yourdomain.com/privkey.pem docker/ssl/
```

### 3. Deploy Application Stack

```bash
# On the server
git clone https://github.com/BhrayanM/Portafolio.git
cd Portafolio

# Configure environment
cp .env.example .env
# Fill all required production values (see Prerequisites section)

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
curl -s https://app.yourdomain.com/health
```

### 4. Enable Monitoring

```bash
# Deploy observability stack
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# Access Grafana at https://app.yourdomain.com/grafana
# Default credentials: admin / admin (change immediately)
```

### 5. Schedule Automated Backups

```bash
# Add to crontab (runs daily at 3 AM)
crontab -e
# 0 3 * * * /path/to/Portafolio/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## Security

### Secrets Management

- **Never commit `.env` files** — they are excluded via `.gitignore` and blocked by pre-commit hooks
- **Production secrets** must be set as environment variables on the server
- **n8n credentials** are encrypted at rest using `AUTOMATION_ENCRYPTION_KEY`
- **API keys** are hashed before storage using bcrypt (cost factor 12)

### HTTPS and TLS

- TLS 1.2+ is enforced at the edge proxy
- HTTP requests are redirected to HTTPS
- HSTS headers are configured with a 1-year max-age
- Certificate auto-renewal should be scheduled via cron

### Container Security

- All containers run as non-root users
- Internal ports are never exposed to the host network
- Docker networks are segmented (frontend, backend, database, monitoring)
- Base images are pinned to specific versions and updated regularly

### Database Backup Strategy

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full database | Daily | 30 days | Compressed SQL dump |
| Transaction logs | Continuous | 7 days | WAL archive |
| Configuration | Per deployment | Indefinite (Git) | Version control |

---

## Troubleshooting

### Containers Fail to Start

```bash
# Check container logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Verify all required environment variables are set
docker compose -f docker-compose.prod.yml config

# Check port availability
netstat -tulpn | grep LISTEN
```

### Database Connection Issues

```bash
# Verify database is running
docker compose -f docker-compose.prod.yml ps postgres

# Test connection from application container
docker exec -it <backend-container> sh
# psql -h postgres -U portafolio -d portafolio_saas

# Check if PostgreSQL is accepting connections
docker logs <postgres-container> --tail 50
```

### Environment Variable Problems

```bash
# Verify .env file exists and is properly formatted
cat .env | grep -v '^#' | grep -v '^\s*$'

# Check that required variables are set in the container
docker exec <backend-container> env | grep -E '(JWT_SECRET|POSTGRES_PASSWORD|CORS_ORIGINS)'

# Validate against example
diff <(grep -v '^#' .env.example | grep -v '^\s*$' | cut -d= -f1) \
     <(grep -v '^#' .env | grep -v '^\s*$' | cut -d= -f1)
```

### Port Conflicts

| Service | Default Port | Notes |
|---------|-------------|-------|
| NGINX (HTTP) | 80 | Internal redirect to HTTPS |
| NGINX (HTTPS) | 443 | Production entry point |
| Backend API | 3001 | Internal only |
| Frontend | 3000 | Internal only |
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |
| RabbitMQ | 5672 | Internal only |

### Monitoring Alerts

If Grafana alerts fire:

1. Check Loki logs for the affected service
2. Verify resource utilization (CPU, memory, disk)
3. Review recent deployment changes
4. Check upstream dependencies (database, message broker)

---

## Rollback

```bash
# Revert to previous deployment
git checkout <previous-stable-tag>
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Restore database from backup
zcat /backups/portafolio_$(date +%Y%m%d).sql.gz | docker exec -i <postgres-container> psql -U portafolio
```

---

## Related

- [README](../README.md) — Project overview and architecture
- [Engineering Notes](../ENGINEERING_NOTES.md) — Reliability, AI, and multi-tenant patterns
- [Security Policy](../SECURITY.md) — Vulnerability disclosure and controls
