/* ════════════════════════════════════════════════════════════════
   Frontend HTTP client.

   Session is carried via HttpOnly `access_token` cookie — no JWT in
   localStorage. The backend enforces CORS_ORIGINS; the client only
   needs `credentials: 'include'` on every fetch.

   CSRF: the backend issues a JS-readable `csrf-token` cookie and requires
   every state-changing request to echo it in the `x-csrf-token` header
   (double-submit pattern). This wrapper adds it automatically.
   ════════════════════════════════════════════════════════════════
*/

import type { User, Lead, LeadStats, BillingPlan, Subscription, ApiKey, LeadLogEntry, TenantUsage } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS) || 10000;

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export type ApiError = Error & { status?: number; context?: unknown };

/**
 * Single wrapper over `fetch`.
 *
 * `credentials: 'include'` is mandatory: without it the HttpOnly session cookie
 * does not travel and every authenticated route responds 401.
 */
export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(init.headers);
  // If a body is sent without this header, `express.json()` will not parse it and the
  // backend receives `{}`: login returned 400 with correct credentials.
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // A down backend leaves the promise hanging forever and the screen
  // stuck in "loading" state; the AbortController cuts it off.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // CSRF (double-submit): every mutating request must echo the cookie token.
  if (init.method && !SAFE_METHODS.has(init.method) && !headers.has(CSRF_HEADER)) {
    const csrf = getCsrfToken();
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include', signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`Request to ${path} exceeded ${REQUEST_TIMEOUT_MS} ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // The backend responds with errors in JSON (`{ error: { message, context } }`),
    // but an nginx 502 arrives as HTML: try to parse it without assuming.
    let message = `Request failed (${res.status})`;
    let context: unknown = null;
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      try {
        const body = await res.json();
        message = body?.error?.message || message;
        context = body?.error?.context ?? null;
      } catch {
        /* unreadable JSON body: keep the default message */
      }
    }
    const err = new Error(message) as ApiError;
    err.status = res.status;
    if (context) err.context = context;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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

// settingsApi maps to the real backend route `/keys` — the /settings
// page imports it as a semantic namespace.
export const settingsApi = {
  apiKeys: () => apiFetch<ApiKey[]>('/keys'),
} as const;

// `/leads/activity` and `/usage` are not yet implemented in the backend.
// These exports resolve to the intended routes for future implementation.
export const activityApi = {
  list: () => apiFetch<LeadLogEntry[]>('/leads/activity'),
} as const;

// Points to the real route `/tenants/usage` in the backend.
export const usageApi = {
  get: () => apiFetch<TenantUsage>('/tenants/usage'),
} as const;

export const logout = () => authApi.logout();
