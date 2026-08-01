# Política de seguridad y alcance de publicación

Este repositorio es un **portafolio técnico público**. No aloja software ejecutable, no
expone servicios y no contiene datos de clientes.

---

## 1. Qué NO se publica aquí (nunca)

Esta lista es una regla de construcción del repositorio, no una aspiración:

| Categoría | Estado |
|---|---|
| Workflows n8n exportados (`.json`) | ❌ Nunca — bloqueado en `.gitignore` |
| Grafo real: nodos, conexiones, Code nodes | ❌ Nunca |
| Prompts de producción (texto literal) | ❌ Nunca — solo descripción de alto nivel |
| Umbrales de puntuación y pesos del modelo de scoring | ❌ Nunca |
| Ventanas de deduplicación y parámetros temporales | ❌ Nunca |
| Reglas concretas de saneamiento / anti-inyección | ❌ Nunca — solo el principio de diseño |
| Credenciales, tokens, API keys, credential IDs | ❌ Nunca |
| URLs de webhook (producción o test) | ❌ Nunca |
| Spreadsheet IDs, channel IDs, instance IDs | ❌ Nunca |
| Cadenas de conexión de PostgreSQL, hosts, puertos | ❌ Nunca |
| Datos personales o de clientes (PII), transcripciones, grabaciones | ❌ Nunca |
| Correo personal, teléfono, dirección, rutas locales de usuario | ❌ Nunca |

**Motivo:** parte de esa información es un riesgo de seguridad y otra parte es el método
comercial del autor. Ambas quedan fuera por decisión, no por descuido.

---

## 2. Qué SÍ se publica

- Arquitectura y flujo conceptual de cada sistema.
- Decisiones de ingeniería con su justificación y su alternativa descartada.
- Diagramas Mermaid e infografías conceptuales.
- Resultados y comportamientos operativos observables.
- Fragmentos de código **ilustrativos y genéricos**: muestran una idea de diseño y
  **no son funcionales de extremo a extremo**. No contienen lógica de negocio ni prompts.

---

## 3. Controles aplicados

1. **`.gitignore` endurecido** — bloquea por patrón `.env*`, `credentials*`, `*.json` de
   workflow y credenciales, dumps, backups, `*.sqlite`, exports de ejecuciones, CSV/XLSX,
   `/uploads`, claves, certificados y documentos personales (`*.pdf`, `*curriculum*`).
2. **Carpeta de cuarentena** — `_PRIVADO_NO_SUBIR/` está ignorada y existe para que los
   archivos personales que aparezcan en el directorio de trabajo no puedan versionarse.
3. **Revisión de imágenes** — cada imagen se revisa visualmente (¿revela credenciales,
   prompts, IDs o datos?) y se escanea en busca de metadatos EXIF, GPS o rutas locales
   antes de incluirse. Las imágenes publicadas están libres de metadatos.
4. **Sin ejemplos con valores reales** — los placeholders son evidentes
   (`<TU_API_KEY>`, `example.com`) y nunca se derivan de un valor real ofuscado.

---

## 4. Si encuentras algo que no debería estar aquí

Si detectas en este repositorio un secreto, un identificador real, un dato personal o
cualquier información que no debería ser pública:

📧 **bhrayan.automation@gmail.com** — asunto: `SECURITY — portafolio público`

Por favor **no abras un issue público** con el hallazgo. Se atiende en un plazo de 48 h y
se responde confirmando la remediación (rotación de la credencial y purga del historial de
Git si aplica).

---

## 5. Sobre los sistemas descritos

Los sistemas documentados operan en infraestructura privada, autoalojada, con credenciales
gestionadas por variables de entorno y almacén de credenciales de la plataforma de
orquestación. Ninguna credencial vive en un archivo versionado.

Este repositorio **no** es un vector de acceso a esos sistemas: no publica endpoints,
hosts, identificadores ni el modo de autenticarse contra ellos.

---

<sub>© 2026 Bhrayan Márquez · Todos los derechos reservados · [Volver al inicio](./README.md)</sub>
