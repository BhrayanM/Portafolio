#!/bin/bash
# test-lead-webhook.sh — Prueba el webhook de lead qualification
# Uso: ./scripts/test-lead-webhook.sh [tipo]
#   tipos: hot, warm, cold, invalid

set -euo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:5678/webhook/lead-qualification}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

case "${1:-hot}" in
  hot)
    info "Enviando lead HOT..."
    curl -s -X POST "${WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "company": "Demo Company",
        "phone": "+1-555-0123",
        "message": "Director de operaciones. 45 empleados. Presupuesto $1,500/mes para automatización de leads. Urgente.",
        "source": "tally"
      }' | python3 -m json.tool 2>/dev/null || cat
    ;;

  warm)
    info "Enviando lead WARM..."
    curl -s -X POST "${WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "John Doe",
        "email": "john.doe@example.com",
        "company": "Sample Consulting",
        "phone": "+1-555-0144",
        "message": "Me interesa saber cómo funcionan sus automatizaciones para leads. ¿Podrían darme más información?",
        "source": "tally"
      }' | python3 -m json.tool 2>/dev/null || cat
    ;;

  cold)
    info "Enviando lead COLD..."
    curl -s -X POST "${WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test",
        "email": "test@example.com",
        "company": "",
        "phone": "",
        "message": "Quiero información",
        "source": "tally"
      }' | python3 -m json.tool 2>/dev/null || cat
    ;;

  invalid)
    info "Enviando lead INVÁLIDO (sin email)..."
    curl -s -X POST "${WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Incompleto",
        "message": "Falta email"
      }' | python3 -m json.tool 2>/dev/null || cat
    ;;

  *)
    echo "Uso: $0 {hot|warm|cold|invalid}"
    exit 1
    ;;
esac

echo ""
info "Prueba completada."
