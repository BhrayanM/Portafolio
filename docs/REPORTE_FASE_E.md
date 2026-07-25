# Reporte FASE E — Frontend

## Etapa

Verificación de conexión frontend-backend, autenticación, placeholders.

## Problemas encontrados

1. **JWT en localStorage**: `login/page.tsx:31` guarda `localStorage.setItem('token', data.token)`. Vulnerable a XSS. Sin httpOnly cookies, sin refresh tokens, sin server-side session. 
2. **API URL hardcodeada**: 3 archivos definen `const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'` (dashboard/page.tsx:5, leads/page.tsx:5, layout.tsx:8). En producción, sin NEXT_PUBLIC_API_URL, apunta a localhost.
3. **Sin manejo de errores en fetch**: `.catch(console.error)` en dashboard (line 20) y leads (line 26). Errores silenciados, usuario ve "-" permanentemente.
4. **2 páginas placeholder**: analytics/page.tsx (11 líneas, texto "Los gráficos se mostrarán aquí cuando haya datos suficientes") y settings/page.tsx (17 líneas, texto "Configuración de perfil próximamente").
5. **4 páginas faltantes** (prometidas en FASE 11): billing, invoices, usage, activity — cero archivos.
6. **Auth check solo en cliente**: layout.tsx lee token de localStorage y redirige a `/login` si no existe. No hay middleware de servidor que proteja rutas.
7. **Logout solo localStorage**: Header.tsx:9 solo hace `localStorage.removeItem('token')`. No invalida el token en backend.

## Archivos auditados

```
frontend/src/app/
  layout.tsx                    (15 líneas — root layout)
  login/page.tsx                (86 líneas — login form)
  dashboard/
    layout.tsx                  (58 líneas — dashboard shell con auth check)
    page.tsx                    (53 líneas — KPIs dashboard)
    Header.tsx                  (27 líneas — header con logout)
    Sidebar.tsx                 (42 líneas — navegación)
    leads/page.tsx              (107 líneas — tabla de leads)
    analytics/page.tsx          (11 líneas — PLACEHOLDER)
    settings/page.tsx           (17 líneas — PLACEHOLDER)
```

## Dependencias

```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "lucide-react": "^0.441.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.2"
}
```

Todas instaladas (verificadas en audit: `npm run build` exitoso).

## Build output (de auditoría)

```
✓ Compiled successfully
  /dashboard                    ○ (Static)  1.63 kB
  /dashboard/analytics          ○ (Static)  1.12 kB
  /dashboard/leads              ○ (Static)  2.06 kB
  /dashboard/settings           ○ (Static)  1.18 kB
  /login                        ○ (Static)  1.98 kB
```

Todas las rutas son `○ (Static)` — prerenderizadas como HTML estático. Esto significa que los datos de API se cargan en el cliente después del hydrate. Es correcto para un dashboard con auth client-side.

## Conexión con backend

| Página | Endpoint que consume | Método | Auth |
|--------|---------------------|--------|------|
| Login | `/api/auth/login` | POST | No |
| Dashboard | `/api/leads/stats` | GET | Bearer token (localStorage) |
| Leads | `/api/leads` | GET | Bearer token (localStorage) |
| Layout | `/api/auth/me` | GET | Bearer token (localStorage) |

**Problema**: El layout.tsx importa `fetchWithAuth` pero tiene la URL hardcodeada en línea 8 (`const API = ...`). No puede reutilizar la función porque está definida fuera del componente pero dentro del mismo archivo.

## Categoría de severidad

| Issue | Severidad | Archivo:línea |
|-------|-----------|---------------|
| JWT en localStorage | 🔴 CRÍTICO | login/page.tsx:31 |
| API URL hardcodeada | 🟡 ALTO | dashboard/page.tsx:5, leads/page.tsx:5, layout.tsx:8 |
| catch(console.error) | 🟡 ALTO | dashboard/page.tsx:20, leads/page.tsx:26 |
| Placeholder analytics | 🟡 MEDIO | analytics/page.tsx:5-7 |
| Placeholder settings | 🟡 MEDIO | settings/page.tsx:8,12 |
| Páginas faltantes (billing, invoices, usage, activity) | 🟡 MEDIO | No existen |
| Logout sin invalidación server-side | 🟢 BAJO | Header.tsx:9 |

## Estado actual

**ESTRUCTURALMENTE COMPLETO (70%) — Placeholders + Auth insegura**

- Build: ✅ Compila sin errores
- Login: ✅ Funcional (con localStorage)
- Dashboard: ✅ KPIs conectados a backend
- Leads: ✅ Tabla con filtros conectada a backend
- Analytics: ❌ Placeholder
- Settings: ❌ Placeholder
- Auth: ❌ localStorage (inseguro)
- Error handling: ❌ catch(console.error)
- Páginas faltantes: ❌ 4 no existen

## Pendientes

| # | Item | Prioridad |
|---|------|-----------|
| 1 | Migrar auth de localStorage a httpOnly cookies | Alta |
| 2 | Agregar NEXT_PUBLIC_API_URL como variable de entorno en deployment | Alta |
| 3 | Reemplazar catch(console.error) con manejo de errores visible | Alta |
| 4 | Implementar analytics real con datos de backend | Media |
| 5 | Implementar settings real (perfil + API keys) | Media |
| 6 | Crear páginas billing, invoices, usage, activity | Baja |
| 7 | Agregar middleware de servidor para proteger rutas | Media |

## Nivel de confianza

95%

---

*Generado durante remediación. Próximo paso: FASE F (Servicios Externos).*
