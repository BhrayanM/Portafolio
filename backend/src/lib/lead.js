/**
 * Lógica de calificación de leads — implementación de referencia.
 *
 * Es un port fiel de los Code nodes del workflow n8n "Lead Qualification"
 * (`Sanitize & Validate`, `Parse AI Response`, `Is Hot?`). Aquí es testeable;
 * en n8n el código va inline porque los Code nodes no pueden importar módulos.
 *
 * ⚠️ Si cambias algo aquí, replícalo en el nodo correspondiente y vuelve a publicar
 *    el workflow (POST /deactivate + POST /activate). Ver docs/ARQUITECTURA.md.
 *
 * Ninguna función de este módulo llama a servicios externos.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  name: 255,
  company: 255,
  phone: 50,
  message: 5000,
  source: 100,
  rationaleOnError: 200,
};

const CATEGORIES = ['HOT', 'WARM', 'COLD'];

/**
 * Valida y normaliza el lead entrante.
 * Acepta tanto el cuerpo del webhook (`{body: {...}}`) como el objeto plano.
 * @throws {Error} si falta el email o tiene formato inválido.
 */
function sanitizeLead(input, now = Date.now()) {
  const data = (input && input.body) || input || {};

  if (!data.email) {
    throw new Error('Email is required');
  }
  if (typeof data.email !== 'string') {
    throw new Error('Invalid email format');
  }

  // Se recorta ANTES de validar: el nodo original validaba primero y rechazaba
  // " ana@example.com ", algo habitual en formularios y payloads copiados a mano.
  const email = data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new Error('Invalid email format');
  }

  const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

  return {
    email,
    name: str(data.name).trim().substring(0, LIMITS.name),
    company: str(data.company).trim().substring(0, LIMITS.company),
    // Se conservan solo caracteres plausibles de teléfono.
    phone: str(data.phone).replace(/[^0-9+\-\s()]/g, '').substring(0, LIMITS.phone),
    message: str(data.message).trim().substring(0, LIMITS.message),
    source: (str(data.source).trim() || 'web-form').substring(0, LIMITS.source),
    receivedAt: now,
  };
}

/** Extrae el texto de la respuesta de la API de chat, tolerando ambas formas. */
function extractContent(response) {
  if (!response) return '';
  const choices =
    (response.body && response.body.choices) || response.choices || null;
  if (!choices || !choices[0] || !choices[0].message) return '';
  return choices[0].message.content || '';
}

/** Normaliza el score a un entero dentro de 0-100. */
function normalizeScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeCategory(value) {
  const c = String(value || '').toUpperCase();
  return CATEGORIES.includes(c) ? c : 'COLD';
}

/**
 * Convierte la respuesta del modelo en los campos que consume el resto del flujo.
 * Nunca lanza: ante un JSON inválido degrada a COLD con score 0 y deja constancia
 * en `aiRationale`, para que un fallo del modelo no tumbe la ejecución.
 */
function parseAiResponse(response, sanitized = {}) {
  const content = extractContent(response);

  try {
    const parsed = JSON.parse(content);
    return {
      ...sanitized,
      aiScore: normalizeScore(parsed.score),
      aiCategory: normalizeCategory(parsed.category),
      aiRationale: parsed.rationale || '',
      aiBusinessCategory: parsed.business_category || 'General',
    };
  } catch {
    return {
      ...sanitized,
      aiScore: 0,
      aiCategory: 'COLD',
      aiRationale:
        'Failed to parse AI response: ' +
        String(content).substring(0, LIMITS.rationaleOnError),
      aiBusinessCategory: 'General',
    };
  }
}

/** Rama `Is Hot?` del workflow: solo HOT pasa por aprobación humana. */
function isHot(lead) {
  return normalizeCategory(lead && lead.aiCategory) === 'HOT';
}

/** Valor de `status` que se escribe en `lead_log`. */
function resolveStatus(lead) {
  if (!lead) return 'cold';
  if (lead.approved) return 'approved';
  if (lead.rejected) return 'rejected';
  return String(lead.aiCategory || 'cold').toLowerCase();
}

module.exports = {
  sanitizeLead,
  parseAiResponse,
  extractContent,
  normalizeScore,
  normalizeCategory,
  isHot,
  resolveStatus,
  EMAIL_RE,
  LIMITS,
  CATEGORIES,
};
