# Assets

Visual material of the portfolio, organized by type.

## Structure

| Folder | Content |
|---|---|
| `diagrams/` | Conceptual architecture diagrams used in the project READMEs |
| `screenshots/` | Screenshots of running systems (see policy below) |

## Diagrams

| File | Used in | Content |
|---|---|---|
| `diagrams/lead-qualification-architecture.png` | [Lead Qualification](../projects/lead-qualification/README.md) | Conceptual stages of the lead scoring engine |
| `diagrams/whatsapp-agent-architecture.png` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | Conversational agent architecture |
| `diagrams/whatsapp-agent-flow.png` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | Graph view: model, memory and tools as dependencies |
| `diagrams/whatsapp-agent-commerce.webp` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | E-commerce variant (EN/ES + orders) |
| `diagrams/voice-receptionist-architecture.png` | [Voice Receptionist](../projects/voice-receptionist/README.md) | Bilingual voice receptionist pipeline |

## Screenshots

Screenshots of the running systems (dashboard, n8n, Swagger, CRM integrations) are shown
in the **live demo** offered to clients and during the discovery call. Screenshots that
reveal real workflow graphs, credentials, client data or production URLs are not
published — see [SECURITY.md](../SECURITY.md). This folder is reserved for public visual
material that complies with that policy.

## Security verification applied to every image

Before including any file:

1. **Visual review** — no credentials, tokens, webhook URLs, IDs, prompt text,
   thresholds, internal parameters or client data. Visible names are generic and
   descriptive.
2. **Metadata scan** — free of EXIF blocks, GPS coordinates, device names and embedded
   local paths.
3. **Optimization** — PNGs are resized to a max width of 1600 px where it reduces
   weight; the re-encode discards metadata.

These are **conceptual representations**: they communicate the shape of the system, not
implementation details. See [SECURITY.md](../SECURITY.md).

## Images pending manual rework

The following PNG diagrams contain Spanish labels baked into the image. They are
functional but not yet aligned with the English documentation; they need a manual
replacement pass with an image editor:

| File | Needed change |
|---|---|
| `diagrams/lead-qualification-architecture.png` | Translate embedded labels to English |
| `diagrams/whatsapp-agent-architecture.png` | Translate embedded labels to English |
| `diagrams/whatsapp-agent-flow.png` | Translate embedded labels to English |
| `diagrams/whatsapp-agent-commerce.webp` | Translate embedded labels to English |
| `diagrams/voice-receptionist-architecture.png` | Translate embedded labels to English |

All SVG diagrams and Mermaid diagrams in the repository are already in English.

---

<sub>© 2026 Bhrayan Márquez · All rights reserved · [Back to home](../README.md)</sub>
