# FASE 8 — Observabilidad

## Stack

| Componente | Puerto | Imagen | Función |
|-----------|--------|--------|---------|
| Prometheus | 9090 | prom/prometheus | Métricas |
| Grafana | 3000 | grafana/grafana | Dashboards |
| Loki | 3100 | grafana/loki | Logs centralizados |
| Uptime Kuma | 3002 | louislam/uptime-kuma | Monitoreo de uptime |
| Node Exporter | 9100 | prom/node-exporter | Métricas del servidor |

## Arquitectura

```
Servidores
    │
    ├── Node Exporter ──► Prometheus ──► Grafana
    │                                        │
    ├── n8n ─────────────────────────────────┤
    │                                        │
    ├── API ─────────────────────────────────┤
    │                                        │
    └── Logs (Docker) ──► Loki ──────────────┘
    
Uptime Kuma → Monitorea endpoints HTTP externamente
```

## Cómo iniciar

```bash
# Red compartida (si no existe)
docker network create portafolio-net

# Iniciar monitoreo
docker compose -f monitoring/docker-compose.monitoring.yml up -d

# Acceder:
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# Uptime Kuma: http://localhost:3002
```

## Alertas (Slack)

Configurar en Grafana:
1. Contact Points → Slack Webhook URL
2. Notification Policies → Enviar a Slack
3. Alert Rules → CPU > 80%, Disk > 90%, Servicio caído

## Endpoints monitoreados (Uptime Kuma)

- https://portafolio.ai/health
- https://api.portafolio.ai/health
- https://n8n.portafolio.ai/healthz
