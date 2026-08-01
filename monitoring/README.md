# Monitoring

Observability stack for the platform: Prometheus, Grafana, Loki and Uptime Kuma.

## Components

| Component | Image | Role |
|---|---|---|
| Prometheus | `prom/prometheus:v2.53.0` | Metric collection (`prometheus.yml`) |
| Grafana | `grafana/grafana:11.1.0` | Dashboards (`grafana-dashboards/`) and alerts |
| Loki | `grafana/loki:3.0.0` | Structured log aggregation (`loki.yml`) |
| Uptime Kuma | `louislam/uptime-kuma:1.23.13` | Synthetic availability checks |

## Deployment

```bash
docker compose -f monitoring/docker-compose.monitoring.yml up -d
# Grafana → https://<domain>/grafana  (admin / admin by default — change it)
```

## Related documentation

- [Engineering practices: observability](../docs/engineering-practices.md#observability)
- [Documentation index](../docs/README.md)
