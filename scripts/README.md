# Scripts

Utilities for development, deployment and testing.

| Script | Usage |
|---|---|
| `backup.sh` | Database backup (schedule with cron) |
| `test-lead-webhook.sh` | Tests the lead qualification webhook (`hot`, `warm`, `cold`, `invalid`) |
| `setup-cloudflare.sh` | Cloudflare configuration for deployment |
| `setup-firewall.sh` | Firewall rules for the production server |
| `githooks/pre-commit` | Barrier against accidental publication of secrets and internal material |

## Installing hooks

```bash
git config core.hooksPath scripts/githooks
```

## Related documentation

- [Security policy and publication scope](../SECURITY.md)
- [Deployment guide](../docs/deployment-guide.md)
