# FASE 10 — Facturación (Stripe)

## Planes

| Plan | Precio | Ideal para |
|------|--------|-----------|
| Starter | $49/mes | Emprendedores individuales |
| Pro | $149/mes | Pequeñas y medianas empresas |
| Enterprise | $499/mes | Empresas con necesidades custom |

## API Endpoints

```
GET    /api/billing/plans          # Listar planes disponibles
GET    /api/billing/subscription   # Obtener suscripción actual
POST   /api/billing/checkout       # Crear sesión de checkout
POST   /api/billing/webhook        # Webhook de Stripe
```

## Webhooks de Stripe

| Evento | Acción |
|--------|--------|
| `checkout.session.completed` | Activar suscripción, actualizar plan |
| `customer.subscription.updated` | Actualizar estado del tenant |
| `customer.subscription.deleted` | Degradar a plan gratuito |
| `invoice.payment_failed` | Marcar como past_due |

## Configuración en Stripe

1. Crear productos en Stripe Dashboard:
   - Starter ($49/mes) → price_starter_monthly
   - Pro ($149/mes) → price_pro_monthly
   - Enterprise ($499/mes) → price_enterprise_monthly
2. Configurar webhook endpoint: `https://api.portafolio.ai/api/billing/webhook`
3. Copiar el signing secret a `STRIPE_WEBHOOK_SECRET`

## Variables de Entorno

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```
