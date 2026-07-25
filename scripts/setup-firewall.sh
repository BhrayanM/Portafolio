#!/bin/bash
# setup-firewall.sh — Configura UFW en Hetzner
# Uso: ./scripts/setup-firewall.sh

set -euo pipefail

echo "═══ Configurando UFW ═══"

ufw default deny incoming
ufw default allow outgoing

# SSH (cambia el puerto si usas uno distinto)
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Denunciar servicios internos (n8n, postgres, monitoring)
ufw deny 5678/tcp comment 'n8n - solo acceso interno'
ufw deny 5432/tcp comment 'PostgreSQL - solo acceso interno'
ufw deny 9090/tcp comment 'Prometheus - solo acceso Tailscale'
ufw deny 3000/tcp comment 'Grafana - solo acceso Tailscale'

# Habilitar
ufw --force enable

echo ""
echo "═══ Estado ═══"
ufw status verbose
