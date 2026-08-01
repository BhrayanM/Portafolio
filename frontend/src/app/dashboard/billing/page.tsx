'use client';

import { useCallback, useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import type { Subscription } from '@/lib/types';
import { CheckCircle, Loader2 } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    features: ['Hasta 500 leads/mes', '1 usuario', 'Integración HubSpot', 'Soporte email'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    features: ['Hasta 2000 leads/mes', '5 usuarios', 'API completa', 'Slack + HubSpot', 'Soporte prioritario'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    features: ['Leads ilimitados', 'Usuarios ilimitados', 'API + Webhooks', 'Todas las integraciones', 'Soporte 24/7', 'SLA garantizado'],
  },
];

const statusLabels: Record<string, string> = {
  active: 'Activa',
  past_due: 'Vencida',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
};

const statusColors: Record<string, string> = {
  active: 'text-green-600 bg-green-50',
  past_due: 'text-red-600 bg-red-50',
  canceled: 'text-gray-600 bg-gray-50',
  incomplete: 'text-yellow-600 bg-yellow-50',
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingApi.subscription()
      .then(setSubscription)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar suscripción'))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = useCallback(async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const result = await billingApi.createCheckout(planId);
      window.location.href = result.url;
    } catch {
      setCheckoutLoading(null);
    }
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Facturación</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">Suscripción Actual</h2>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium capitalize">{subscription.plan}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[subscription.status] || 'text-gray-600 bg-gray-50'}`}>
              {statusLabels[subscription.status] || subscription.status}
            </span>
          </div>
          {subscription.current_period_end && (
            <p className="text-sm text-gray-500">
              Próximo corte: {new Date(subscription.current_period_end).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border-2 p-6 flex flex-col ${plan.popular ? 'border-brand-500 relative' : 'border-gray-200'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-2 mb-6">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-gray-500 text-sm">/mes</span>
                </p>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isLoading || isCurrent}
                  className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirigiendo...
                    </>
                  ) : isCurrent ? (
                    'Plan actual'
                  ) : (
                    'Seleccionar'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Los pagos se procesan de forma segura a través de Stripe.
      </p>
    </div>
  );
}
