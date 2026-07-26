#!/bin/bash
# setup-cloudflare.sh — Guia de configuracion de Cloudflare para el dominio del despliegue
# Requiere: cloudflare CLI (wrangler) o API Token
# Uso: DOMAIN=tu-dominio.tld ./scripts/setup-cloudflare.sh
#
# F21.5 — El dominio estaba fijado en el codigo. Ahora se pasa por entorno: este
# repositorio es publico y no debe declarar infraestructura propia (SECURITY.md
# regla 3). El script solo imprime instrucciones; no modifica nada.

set -euo pipefail

DOMAIN="${DOMAIN:-example.com}"
SERVER_IP="$(curl -s ifconfig.me)"

echo "═══ Configuración Cloudflare para ${DOMAIN} ═══"
echo "IP del servidor: ${SERVER_IP}"
echo ""
echo "PASOS MANUALES (Cloudflare Dashboard):"
echo "────────────────────────────────────────"
echo "1. Agrega ${DOMAIN} en Cloudflare"
echo "2. Configura estos registros DNS:"
echo ""
printf "  %-25s %-10s %-15s\n" "Tipo" "Nombre" "Valor"
printf "  %-25s %-10s %-15s\n" "A" "@" "${SERVER_IP}"
printf "  %-25s %-10s %-15s\n" "A" "api" "${SERVER_IP}"
printf "  %-25s %-10s %-15s\n" "A" "n8n" "${SERVER_IP}"
printf "  %-25s %-10s %-15s\n" "A" "www" "${SERVER_IP}"
echo ""
echo "3. SSL/TLS → Full (Strict)"
echo "4. Edge Certificates → Always Use HTTPS: ON"
echo "5. Speed → Auto Minify: ON"
echo "6. Security → Bot Fight Mode: ON"
echo ""
echo "═══ Configurar SSL Local ═══"
echo ""
echo "Opción A — Cloudflare Origin CA (recomendada):"
echo "  Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate"
echo "  Guardar en: ./docker/ssl/certs/fullchain.pem"
echo "  Guardar en: ./docker/ssl/private/privkey.pem"
echo ""
echo "Opción B — Let's Encrypt (alternativa):"
echo "  docker run --rm -p 80:80 \\"
echo "    -v \"\${PWD}/docker/ssl:/etc/letsencrypt\" \\"
echo "    certbot/certbot certonly --standalone \\"
echo "    -d ${DOMAIN} -d api.${DOMAIN} -d n8n.${DOMAIN}"
echo ""
echo "═══ Despliegue ═══"
echo "Una vez configurado DNS y SSL:"
echo "  docker compose -f docker-compose.prod.yml up -d"
