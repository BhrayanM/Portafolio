/**
 * Cliente HTTP del panel.
 *
 * La sesion viaja en una cookie HttpOnly que emite el backend: el JWT ya no se guarda
 * en localStorage (donde cualquier XSS podia leerlo). Por eso todas las peticiones
 * necesitan `credentials: 'include'` y el backend debe permitir este origen en CORS.
 */
export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function apiFetch(path: string, init: RequestInit = {}) {
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
      /* respuesta sin cuerpo JSON */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export const logout = () => apiFetch('/auth/logout', { method: 'POST' });
