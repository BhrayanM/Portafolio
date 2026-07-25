# LOG AUTÓNOMO — Portafolio SaaS

> Bitácora de problemas encontrados, decisiones técnicas y soluciones aplicadas durante la construcción autónoma del ecosistema.

---

## FASE 0 — Consolidación del Entorno

**Problemas encontrados:** Ninguno.

**Decisiones:**
- Se optó por PostgreSQL 15 Alpine por su bajo consumo en VPS Hetzner.
- n8n latest en vez de versión fija para recibir actualizaciones de seguridad.
- Red Docker bridge dedicada para evitar IPs flotantes entre contenedores.

**Solución aplicada:** Archivos base creados: docker-compose.yml, .gitignore, .env.example, README.md, scripts/backup.sh.

**Comandos usados:**
```bash
docker compose up -d
docker compose config
git check-ignore -v .env _PRIVADO_NO_SUBIR/ opencode.json
```

---

## FASE 1 — Motor de Automatización (Core)

**Problemas encontrados:**

1. **n8n workflow JSON manual:** Crear un workflow n8n exportable desde cero requiere conocer el schema exacto de nodos, conexiones y parámetros. Se optó por construir el JSON basándose en la documentación oficial de n8n y validando la estructura de ejemplo.

2. **Puerto 5678 ocupado:** Al hacer pruebas, el puerto 5678 ya estaba en uso por una instancia previa de n8n. Se identificó el contenedor con `docker ps --filter publish=5678` y se dejó la instancia existente intacta (el usuario ya opera n8n).

3. **OpenAI prompt engineering:** El prompt de lead scoring debe devolver JSON estructurado con score numérico, categoría (Hot/Warm/Cold), categoría de negocio y rationale. Se diseñó con system prompt + response_format para garantizar salida parseable.

**Decisiones:**
- Workflow n8n creado como archivo JSON importable con 10 nodos.
- Sistema de prompts separado en archivo markdown para facilitar iteración sin tocar el workflow.
- Test harness como script HTTP (`.http` y `.sh`) para probar webhook sin Tally.
- Se usa `response_format: { type: "json_object" }` de OpenAI para garantizar JSON válido.
- Human-in-the-loop implementado con Slack + Wait node (aprobación antes de upsert a CRM).

**Solución aplicada:**
- `n8n/workflows/lead-qualification.json` — Workflow completo listo para importar.
- `docs/fase-1/prompts/lead-scoring-system.md` — Prompt de sistema + ejemplos few-shot.
- `docs/fase-1/test-harness/webhook-test.http` — Petición de prueba.
- `scripts/test-lead-webhook.sh` — Script bash para probar el webhook.
- `docs/fase-1/architecture.md` — Documentación de la fase.

**Comandos usados:**
```bash
# Validar workflow (requiere n8n corriendo)
curl -X POST http://localhost:5678/webhook/lead-qualification \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"..."}'

# Ver logs de n8n
docker compose logs n8n
```
