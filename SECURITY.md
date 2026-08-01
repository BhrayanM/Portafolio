# Security policy and publication scope

This repository is a **public technical portfolio**. It does not host runnable software,
does not expose services and does not contain client data.

---

## 1. What is NEVER published here

This list is a construction rule of the repository, not an aspiration:

| Category | Status |
|---|---|
| Exported n8n workflows (`.json`) | ❌ Never — blocked in `.gitignore` |
| Real graph: nodes, connections, Code nodes | ❌ Never |
| Production prompts (literal text) | ❌ Never — high-level description only |
| Scoring thresholds and model weights | ❌ Never |
| Deduplication windows and temporal parameters | ❌ Never |
| Concrete sanitization / anti-injection rules | ❌ Never — design principle only |
| Credentials, tokens, API keys, credential IDs | ❌ Never |
| Webhook URLs (production or test) | ❌ Never |
| Spreadsheet IDs, channel IDs, instance IDs | ❌ Never |
| PostgreSQL connection strings, hosts, ports | ❌ Never |
| Personal or client data (PII), transcripts, recordings | ❌ Never |
| Personal email, phone, address, local user paths | ❌ Never |

**Reason:** part of this information is a security risk and another part is the author's
commercial method. Both stay out by decision, not by oversight.

---

## 2. What IS published

- Architecture and conceptual flow of each system.
- Engineering decisions with their rationale and rejected alternative.
- Mermaid diagrams and conceptual infographics.
- Observable operational behavior and results.
- **Illustrative, generic** code fragments: they show a design idea and are **not
  end-to-end functional**. They contain no business logic or prompts.

---

## 3. Controls in place

1. **Hardened `.gitignore`** — blocks by pattern `.env*`, `credentials*`, workflow
   `*.json` and credentials, dumps, backups, `*.sqlite`, execution exports, CSV/XLSX,
   `/uploads`, keys, certificates and personal documents (`*.pdf`, `*curriculum*`).
2. **Quarantine folder** — `_PRIVADO_NO_SUBIR/` is ignored and exists so that personal
   files that appear in the working directory cannot be versioned.
3. **Image review** — every image is reviewed visually (does it reveal credentials,
   prompts, IDs or data?) and scanned for EXIF metadata, GPS or local paths before
   inclusion. Published images are free of metadata.
4. **No examples with real values** — placeholders are obvious
   (`<YOUR_API_KEY>`, `example.com`) and never derived from an obfuscated real value.

---

## 4. If you find something that should not be here

If you detect in this repository a secret, a real identifier, personal data or any
information that should not be public:

📧 **bhrayan.automation@gmail.com** — subject: `SECURITY — public portfolio`

Please **do not open a public issue** with the finding. It is handled within 48 h and a
reply confirms the remediation (credential rotation and Git history purge if applicable).

---

## 5. About the systems described

The documented systems run on private, self-hosted infrastructure, with credentials
managed through environment variables and the orchestration platform's credential store.
No credential lives in a versioned file.

This repository is **not** an access vector to those systems: it publishes no endpoints,
hosts, identifiers or the way to authenticate against them.

---

<sub>© 2026 Bhrayan Márquez · All rights reserved · [Back to home](./README.md)</sub>
