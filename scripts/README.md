# Scripts

Utilidades para desarrollo, despliegue y pruebas.

| Script | Uso |
|---|---|
| `backup.sh` | Respaldo de la base de datos (programar con cron) |
| `test-lead-webhook.sh` | Prueba el webhook de lead qualification (`hot`, `warm`, `cold`, `invalid`) |
| `setup-cloudflare.sh` | Configuración de Cloudflare para el despliegue |
| `setup-firewall.sh` | Reglas de firewall para el servidor de producción |
| `githooks/pre-commit` | Barrera contra publicación de secretos y material interno |

## Instalación de hooks

```bash
git config core.hooksPath scripts/githooks
```

## Documentación relacionada

- [Política de seguridad y alcance de publicación](../SECURITY.md)
- [Guía de despliegue](../docs/deployment-guide.md)
