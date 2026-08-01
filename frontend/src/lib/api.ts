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
 * Envoltorio único sobre `fetch`.
 *
 * `credentials: 'include'` es obligatorio: sin él la cookie HttpOnly de sesión no
 * viaja y toda ruta autenticada responde 401.
 */
export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(init.headers);
  // Si se manda cuerpo sin este header, `express.json()` no lo parsea y el
  // backend recibe `{}`: el login respondía 400 con credenciales correctas.
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Un backend caído deja la promesa colgando indefinidamente y la pantalla en
  // estado "cargando" para siempre; el AbortController la corta.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // CSRF (doble envío): toda petición mutante debe repetir el token de la cookie.
  if (init.method && !SAFE_METHODS.has(init.method) && !headers.has(CSRF_HEADER)) {
    const csrf = getCsrfToken();
    if (csrf) headers.set(CSRF_HEADER, csrf);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include', signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error(`La petición a ${path} superó ${REQUEST_TIMEOUT_MS} ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // El backend responde errores en JSON (`{ error: { message, context } }`),
    // pero un 502 de nginx llega en HTML: se intenta parsear sin dar por hecho.
    let message = `Error en la petición (${res.status})`;
    let context: unknown = null;
    if ((res.headers.get('content-type') || '').includes('application/json')) {
      try {
        const body = await res.json();
        message = body?.error?.message || message;
        context = body?.error?.context ?? null;
      } catch {
        /* cuerpo JSON ilegible: nos quedamos con el mensaje por defecto */
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
