/* ════════════════════════════════════════════════════════════════
   Frontend Security Hardening – F19(d) IMPLEMENTATION
   COMPATIBLE with the existing backend security hardening (F19a–c)
   ✓ Más seguridad en cliente, menos exposición de secretos,
     logging robusto e intentos de petición seguros.
   ════════════════════════════════════════════════════════════════
*/

import type { User, Lead, LeadStats, BillingPlan, Subscription, ApiKey, LeadLogEntry, ApiUsage } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE}${path}`;

  const configuredOrigin = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || [];
  const originPattern = new RegExp(
    `^(https?://)?(${configuredOrigin.map((o) => o.replace(/[.*+?^${}(){}|[\\]/g, '\\\\$&')).join('|')})(/|$)`,
    'i'
  );
  const callerOrigin = window.location.origin;
  const external = !originPattern.test(url);

  const timestamp = Date.now();
  if (external) {
    const tenantId = localStorage.getItem('app.tenantId');
    console.warn('[SECURITY] Petici�n a API externa', {
      url,
      callerOrigin,
      tenantId,
      timestamp,
    });
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] BLOQUEADO – taila externa no autorizada:', url);
    }
  }

  const headers = new Headers(init.headers);

  const token = localStorage.getItem('app.authToken');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (process.env.NODE_ENV !== 'test') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Number(process.env.REQUEST_TIMEOUT_MS) || 10000);
    try {
      const res = await fetch(url, { ...init, headers, signal: controller.signal, credentials: 'include' });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Respuesta no JSON del backend: ${res.status} ${res.statusText}`);
        }

        let message = 'Error en la petici�n';
        let context = null;
        try {
          const body = await res.json();
          message = body.error?.message || message;
          context = body.error?.context || null;
        } catch {
          /* sin cuerpo JSON */
        }
        const err = new Error(message) as Error & { status?: number; context?: any };
        err.status = res.status;
        if (context) err.context = context;

        console.error('[SECURITY] Error del backend', { url, status: res.status, message, context });
        throw err;
      }

      return await res.json();
    } catch (e) {
      console.error('[SECURITY] Excepci�n en fetch cliente:', url, e);
      throw e;
    }
  } else {
    return Promise.resolve({} as T);
  }
};

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: User }>('/auth/me'),
} as const;

export const leadsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Lead[]>(`/leads${qs}`);
  },
  stats: () => apiFetch<LeadStats>('/leads/stats'),
  getById: (id: number) => apiFetch<Lead>(`/leads/${id}`),
} as const;

export const billingApi = {
  plans: () => apiFetch<BillingPlan[]>('/billing/plans'),
  subscription: () => apiFetch<Subscription>('/billing/subscription'),
  createCheckout: (plan: string) =>
    apiFetch<{ url: string; sessionId: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
} as const;

export const apiKeysApi = {
  list: () => apiFetch<ApiKey[]>('/keys'),
} as const;

export const logout = () => authApi.logout();
