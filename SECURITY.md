# Security Policy

This repository is a **public technical portfolio**. It does not host executable software, expose services, or contain client data.

---

## What Is Never Published Here

The following categories are excluded by construction, not by aspiration:

| Category | Status |
|----------|--------|
| Exported n8n workflows (`.json`) | ❌ Never — blocked in `.gitignore` |
| Actual node graphs, connections, Code node logic | ❌ Never |
| Production prompts (literal text) | ❌ Never — only high-level description |
| Scoring thresholds and classification weights | ❌ Never |
| Deduplication windows and temporal parameters | ❌ Never |
| Sanitization/anti-injection rules | ❌ Never — only the design principle |
| Credentials, tokens, API keys, credential IDs | ❌ Never |
| Webhook URLs (production or test) | ❌ Never |
| Spreadsheet IDs, channel IDs, instance IDs | ❌ Never |
| PostgreSQL connection strings, hosts, ports | ❌ Never |
| Personal or client PII, transcripts, recordings | ❌ Never |
| Personal email, phone, address, local filesystem paths | ❌ Never |

**Reason:** part of this information is a security risk; the rest is the author's commercial method. Both are excluded by design, not oversight.

---

## What Is Published

- System architecture and conceptual data flows
- Engineering decisions with rationale and rejected alternatives
- Observable operational behaviors (idempotency, error handling, latency budgets)
- Technology choices and trade-offs
- Generic, non-functional code fragments illustrating design patterns
- Diagrams (Mermaid, conceptual images) without proprietary detail

---

## Applied Controls

1. **Hardened `.gitignore`** — blocks by pattern: `.env*`, `credentials*`, `*.json` workflows/credentials, dumps, backups, `*.sqlite`, exports, CSV/XLSX, `/uploads`, keys, certificates, personal documents (`*curriculum*`, `*cv*.pdf`, `*invoice*`, `*contrato*`, `*nda*`)
2. **Quarantine folder** — `_PRIVADO_NO_SUBIR/` is ignored; exists to catch personal files that appear in the working directory before they can be versioned
3. **Image review** — every image is visually inspected (credentials, prompts, IDs, data?) and scanned for EXIF, GPS, local paths before inclusion. Published images are metadata-free.
4. **No real-value examples** — placeholders are obvious (`<YOUR_API_KEY>`, `example.com`) and never derived from real values by obfuscation.

---

## Reporting a Security Concern

If you discover a secret, real identifier, personal data, or any information that should not be public in this repository:

📧 **security@portfolio-automation.example.com** — subject: `SECURITY — public portfolio`

Please **do not open a public issue** with the finding. It will be addressed within 48 hours with confirmation of remediation (credential rotation and Git history purge if applicable).

---

## About the Described Systems

The systems documented here operate on private, self-hosted infrastructure with credentials managed via environment variables and the orchestrator's credential store. No credentials live in versioned files.

This repository **is not** an access vector to those systems: it publishes no endpoints, hosts, identifiers, or authentication methods.

---

## License

All content © 2026 Author. All rights reserved.

See [LICENSE](../LICENSE) for terms.