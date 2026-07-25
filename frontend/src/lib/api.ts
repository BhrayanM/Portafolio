import type { User, Lead, LeadStats, ApiKey, Subscription, BillingPlan, LeadLogEntry, ApiUsage } from './types';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'Error en la petición';
    try {
      const body = await res.json();
      message = body.error?.message || message;
    } catch {
      /* sin cuerpo JSON */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: User }>('/auth/me'),
};

export const leadsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<Lead[]>(`/leads${qs}`);
  },
  stats: () => apiFetch<LeadStats>('/leads/stats'),
  getById: (id: number) => apiFetch<Lead>(`/leads/${id}`),
};

export const billingApi = {
  plans: () => apiFetch<BillingPlan[]>('/billing/plans'),
  subscription: () => apiFetch<Subscription>('/billing/subscription'),
  createCheckout: (plan: string) =>
    apiFetch<{ url: string; sessionId: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
};

export const settingsApi = {
  apiKeys: () => apiFetch<ApiKey[]>('/keys'),
};

export const activityApi = {
  list: () => apiFetch<LeadLogEntry[]>('/leads/activity'),
};

export const usageApi = {
  get: () => apiFetch<ApiUsage>('/usage'),
};

export const logout = () => authApi.logout();
