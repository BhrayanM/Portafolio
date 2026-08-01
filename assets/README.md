# Assets

Material visual del portfolio, organizado por tipo.

## Estructura

| Carpeta | Contenido |
|---|---|
| `diagrams/` | Diagramas conceptuales de arquitectura usados en los README de los proyectos |
| `screenshots/` | Capturas de sistemas en ejecución (ver política abajo) |

## Diagrams

| Archivo | Usado en | Contenido |
|---|---|---|
| `diagrams/lead-qualification-architecture.png` | [Lead Qualification](../projects/lead-qualification/README.md) | Etapas conceptuales del motor de calificación de leads |
| `diagrams/whatsapp-agent-architecture.png` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | Arquitectura del agente conversacional |
| `diagrams/whatsapp-agent-flow.png` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | Vista de grafo: modelo, memoria y herramientas |
| `diagrams/whatsapp-agent-commerce.webp` | [WhatsApp Agent](../projects/whatsapp-agent/README.md) | Variante e-commerce (EN/ES + pedidos) |
| `diagrams/voice-receptionist-architecture.png` | [Voice Receptionist](../projects/voice-receptionist/README.md) | Pipeline de la recepcionista de voz bilingüe |

## Screenshots

Las capturas de pantalla de los sistemas en ejecución (dashboard, n8n, Swagger,
integraciones CRM) se muestran en la **demo en vivo** que se ofrece a clientes y en la
llamada de descubrimiento. No se publican capturas que revelen grafos de workflows
reales, credenciales, datos de clientes o URLs de producción — ver
[SECURITY.md](../SECURITY.md). La carpeta se reserva para material visual público que
cumpla esa política.

## Verificación de seguridad aplicada a cada imagen

Antes de incluir cualquier archivo:

1. **Revisión visual** — sin credenciales, tokens, URLs de webhook, IDs, texto de prompts,
   umbrales, parámetros internos ni datos de clientes. Los nombres visibles son genéricos
   y descriptivos.
2. **Escaneo de metadatos** — libres de bloques EXIF, coordenadas GPS, nombres de
   dispositivos y rutas locales embebidas.
3. **Optimización** — los PNG se redimensionan a un máximo de 1600 px donde reduce peso;
   el re-encode descarta metadatos.

Estas son **representaciones conceptuales**: comunican la forma del sistema, no los
detalles de implementación. Ver [SECURITY.md](../SECURITY.md).

---

<sub>© 2026 Bhrayan Márquez · Todos los derechos reservados · [Volver al inicio](../README.md)</sub>
