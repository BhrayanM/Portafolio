/* ════════════════════════════════════════════════════════════════
   Cliente HTTP del frontend.

   F19(d) endureció este fichero, pero lo dejó sin compilar: se perdieron
   cuatro exports que las páginas siguen importando (`apiFetch`,
   `activityApi`, `settingsApi`, `usageApi`) y el build de Next fallaba.
   F20 lo repara como parte de la preparación de despliegue. Ver
   docs/FASE20_DESPLIEGUE.md para el detalle de cada corrección.

   Contrato de seguridad vigente (F19a–c, lado servidor):
   - La sesión viaja en cookie **HttpOnly** `access_token`. El JWT no está en
     localStorage y JS no puede leerlo: por eso aquí solo hace falta
     `credentials: 'include'`, no una cabecera Authorization construida a mano.
   - El origen permitido lo decide el backend vía CORS_ORIGINS. Comprobarlo
     también en el cliente no aporta nada: quien controla el navegador controla
     esa comprobación.
   ════════════════════════════════════════════════════════════════
*/

import type { User, Lead, LeadStats, BillingPlan, Subscription, ApiKey, LeadLogEntry, ApiUsage } from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS) || 10000;

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

export const apiKeysApi = {
  list: () => apiFetch<ApiKey[]>('/keys'),
} as const;

// `/settings` no es un recurso del backend: la pantalla de ajustes solo lista las
// API keys del tenant. Se mantiene como namespace propio porque es lo que importa
// la página, pero apunta a la ruta real `/keys`.
export const settingsApi = {
  apiKeys: () => apiFetch<ApiKey[]>('/keys'),
} as const;

// DEUDA CONOCIDA (heredada, no introducida en F20): `/leads/activity` y `/usage`
// no están implementados en el backend — no hay router montado para ellos en
// `backend/src/app.js`. Estas dos llamadas devuelven 404 y las páginas ya lo
// tratan mostrando su banner de error. Se dejan apuntando a la ruta prevista
// para que al implementarla no haya que tocar el cliente.
export const activityApi = {
  list: () => apiFetch<LeadLogEntry[]>('/leads/activity'),
} as const;

export const usageApi = {
  get: () => apiFetch<ApiUsage>('/usage'),
} as const;

export const logout = () => authApi.logout();
