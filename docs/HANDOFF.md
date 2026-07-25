# HANDOFF — estado para retomar sin repetir

**Última actualización:** 2026-07-25 · Rama `remediacion/v2`

Al retomar: leer `CLAUDE.md` + este archivo. No re-auditar lo cerrado.

## Último bloque cerrado

**BLOQUE A — Fixes del checklist de producción.** Commit: ver `git log --oneline -1`.

## Bloque en curso

**BLOQUE B — Auth HttpOnly.** No empezado todavía.

## Siguiente paso exacto

Migrar la autenticación de `localStorage` a cookies HttpOnly:

1. Backend: en el login, emitir `Set-Cookie` con `httpOnly`, `sameSite`, `secure` (según entorno)
   y `maxAge`; añadir endpoint de logout que limpie la cookie; leer el JWT desde `req.cookies`
   además del header `Authorization` durante la transición.
2. Frontend: dejar de escribir el JWT en `localStorage`; las peticiones pasan a `credentials: 'include'`.
3. Evidencia requerida: tests de login/logout verdes + cabecera `Set-Cookie` en la respuesta.

Archivos probables: `backend/src/routes/auth*`, `backend/src/middleware/auth*`, `backend/src/app.js`
(necesita `cookie-parser`), y en el frontend donde se use `localStorage`.

Comando para localizarlos:

```bash
grep -rn "localStorage" frontend/ --include=*.tsx --include=*.ts | grep -v node_modules
grep -rln "jwt\|jsonwebtoken" backend/src/
```

## Bloques pendientes

| Bloque | Estado |
|---|---|
| A — Fixes checklist producción | ✅ Cerrado |
| B — Auth HttpOnly | ⬜ Siguiente |
| C — Tests (sin APIs externas) | ⬜ |
| D — CI/CD (.github/workflows) | ⬜ |
| Entregable `docs/SPRINT_CORE_COMPLETO.md` | ⬜ Al cerrar D |

## Estado que se pierde al cortar

- **n8n**: workflow activo `<workflow-id>`, 17 nodos. Tras cualquier edición hay que publicar
  (`POST /deactivate` + `POST /activate {"versionId"}`) o el cambio no corre. Ver `CLAUDE.md`.
- **Contenedores**: `portafolio-publico-n8n-1` y `portafolio-publico-postgres-1` deben estar `Up`.
  Si no: `docker compose up -d`.
- **`lead_log` fila 1** y **`error_log` filas 1-10** son datos de QA de sprints anteriores.
- **`.git/hooks/pre-commit`** no se versiona: si se clona el repo de nuevo, hay que reinstalarlo.
- `backups/` está gitignored; los dumps generados no se commitean.

## Reglas vigentes

- Prohibido mocks/stubs de OpenAI, Slack, HubSpot y Stripe. Lo que necesite key →
  `PENDIENTE - REQUIERE CREDENCIAL REAL`.
- Nada marcado hecho sin evidencia (SELECT real, execution ID, test verde o archivo commiteado).
- Commit tras cada bloque, no al final. Actualizar este archivo al cerrar cada bloque.
- Fuera de alcance: Analytics, Billing UI, Invoices, Usage, Activity.

## Bloqueado por credenciales (lo hace el usuario al final)

OpenAI (saldo) · Slack (`xoxb-` + channel ID) · HubSpot (`pat-`) · Stripe.
Además: sin dominio público, `Wait for Approval` es inalcanzable desde Slack → la rama HOT
no se puede completar aunque se cargue el token.
