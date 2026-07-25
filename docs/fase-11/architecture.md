# FASE 11 — Portal Cliente

## Páginas del Portal

| Ruta | Descripción |
|------|-------------|
| `/dashboard/billing` | Plan actual, cambiar/cancelar suscripción |
| `/dashboard/invoices` | Historial de facturas |
| `/dashboard/api-keys` | Gestionar API keys |
| `/dashboard/usage` | Estadísticas de uso |
| `/dashboard/activity` | Log de actividad |

## Backend Endpoints

```
GET    /api/tenants/usage       # Estadísticas de uso
GET    /api/keys                # Listar API keys
POST   /api/keys                # Crear API key
DELETE /api/keys                # Revocar API key
GET    /api/billing/subscription # Suscripción actual
POST   /api/billing/checkout    # Cambiar/cancelar plan
```

## Componentes del Frontend

- `src/app/dashboard/billing/page.tsx` — Plan actual, botón de upgrade
- `src/app/dashboard/invoices/page.tsx` — Historial (placeholder)
- `src/app/dashboard/usage/page.tsx` — Uso del tenant

## Flujo de Facturación

```
Usuario → Dashboard → "Mejorar Plan" → Stripe Checkout → Pago
                                      ↓
                              Webhook Stripe → Backend → Actualizar tenant
                                      ↓
                              Dashboard refleja nuevo plan
```

## Variables de Entorno

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://portafolio.ai
```
