'use client';

import { useCallback, useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import type { Subscription } from '@/lib/types';
import { CheckCircle, Loader2, CreditCard } from 'lucide-react';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    features: ['Up to 500 leads/month', '1 user', 'HubSpot integration', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    features: ['Up to 2,000 leads/month', '5 users', 'Full API access', 'Slack + HubSpot', 'Priority support'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited leads', 'Unlimited users', 'API + Webhooks', 'All integrations', '24/7 support', 'Guaranteed SLA'],
  },
];

const DEMO_SUBSCRIPTION: Subscription = {
  plan: 'growth',
  status: 'active',
  current_period_end: '2026-08-25T00:00:00Z',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
};

const statusColors: Record<string, string> = {
  active: 'text-green-600 bg-green-50',
  past_due: 'text-red-600 bg-red-50',
  canceled: 'text-slate-600 bg-slate-50',
  incomplete: 'text-yellow-600 bg-yellow-50',
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [useDemo, setUseDemo] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setUseDemo(true);
        setLoading(false);
      }
    }, 3000);

    billingApi.subscription()
      .then((result) => {
        if (!cancelled) {
          clearTimeout(timer);
          setSubscription(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          clearTimeout(timer);
          setError(e instanceof Error ? e.message : 'Error loading subscription');
          setUseDemo(true);
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const displaySubscription = useDemo ? DEMO_SUBSCRIPTION : subscription;

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your subscription and available plans</p>
      </div>

      {error && useDemo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          <span>Could not connect to the server. Showing demo data.</span>
        </div>
      )}

      {displaySubscription && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Current Subscription</h2>
              <p className="text-sm text-slate-500">Details of your active plan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium capitalize text-slate-800 text-lg">{displaySubscription.plan}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[displaySubscription.status] || 'text-slate-600 bg-slate-50'}`}>
              {statusLabels[displaySubscription.status] || displaySubscription.status}
            </span>
          </div>
          {displaySubscription.current_period_end && (
            <p className="text-sm text-slate-500">
              Renews on: {new Date(displaySubscription.current_period_end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = displaySubscription?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border-2 p-6 flex flex-col shadow-sm ${plan.popular ? 'border-indigo-500 relative' : 'border-slate-200'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-2 mb-6">
                  <span className="text-3xl font-bold text-slate-900">${plan.price}</span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </p>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
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
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : isCurrent ? (
                    'Current plan'
                  ) : (
                    'Select'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center mt-4">
        Payments are processed securely through Stripe.
      </p>
    </div>
  );
}
