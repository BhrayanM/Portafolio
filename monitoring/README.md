# Monitoring

Observability stack para la plataforma: Prometheus, Grafana, Loki y Uptime Kuma.

## Componentes

| Componente | Imagen | Rol |
|---|---|---|
| Prometheus | `prom/prometheus:v2.53.0` | Recopilación de métricas (`prometheus.yml`) |
| Grafana | `grafana/grafana:11.1.0` | Dashboards (`grafana-dashboards/`) y alertas |
| Loki | `grafana/loki:3.0.0` | Agregación de logs estructurados (`loki.yml`) |
| Uptime Kuma | `louislam/uptime-kuma:1.23.13` | Checks sintéticos de disponibilidad |

## Despliegue

```bash
docker compose -f monitoring/docker-compose.monitoring.yml up -d
# Grafana → https://<dominio>/grafana  (admin / admin por defecto — cambiar)
```

## Documentación relacionada

- [Prácticas de ingeniería: observabilidad](../docs/engineering-practices.md#observabilidad)
- [Índice de documentación](../docs/README.md)
