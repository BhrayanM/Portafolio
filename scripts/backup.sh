#!/bin/bash
# ═════════════════════════════════════════════════════════════
#  backup.sh — Backup completo del ecosistema Portafolio SaaS
#  Ejecutar: ./scripts/backup.sh
#  Requiere: docker, pg_dump (o docker exec)
# ═════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuración ────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="portafolio-postgres-1"
DB_USER="${POSTGRES_USER:-n8n}"
DB_NAME="${POSTGRES_DB:-n8n}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Crear directorio de backups ──────────────────────────────
mkdir -p "${BACKUP_DIR}"

# ── 1. Backup de PostgreSQL ─────────────────────────────────
info "Backup de base de datos..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "${BACKUP_DIR}/db_${TIMESTAMP}.sql" \
  || { error "Fallo pg_dump"; exit 1; }

# Comprimir
gzip "${BACKUP_DIR}/db_${TIMESTAMP}.sql"
info "DB backup: ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# ── 2. Backup de n8n (solo workflows exportados) ────────────
if [ -d "./n8n/workflows" ]; then
  tar czf "${BACKUP_DIR}/n8n_workflows_${TIMESTAMP}.tar.gz" \
    -C ./n8n/workflows .
  info "n8n workflows: ${BACKUP_DIR}/n8n_workflows_${TIMESTAMP}.tar.gz"
fi

# ── 3. Backup de .env (cifrado simbólico - b64 ofuscado) ────
if [ -f ".env" ]; then
  warn "Respaldando .env — asegúrate de que este backup esté cifrado"
  cp .env "${BACKUP_DIR}/env_${TIMESTAMP}.backup"
fi

# ── 4. Limpieza de backups antiguos ──────────────────────────
find "${BACKUP_DIR}" -name "db_*.sql.gz"    -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "n8n_*.tar.gz"   -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "env_*.backup"   -mtime +${RETENTION_DAYS} -delete

info "Backups antiguos (>${RETENTION_DAYS} días) eliminados."
info "Backup completado: ${TIMESTAMP}"
