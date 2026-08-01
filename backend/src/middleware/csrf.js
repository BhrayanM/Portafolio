const crypto = require('crypto');
const config = require('../config');
const { ForbiddenError } = require('../utils/errors');

/**
 * CSRF protection for cookie-based sessions (JWT in HttpOnly cookie).
 *
 * CSRF is a browser-only attack: a malicious site triggers state-changing
 * requests against the API carrying the victim's cookies. Defense in depth:
 *
 *   1. SameSite=Lax on the session cookie (config.cookie.sameSite): the browser
 *      does not send the cookie on cross-site POSTs. Covers the default case.
 *   2. OWASP double-submit token: the server issues a JS-readable `csrf-token`
 *      cookie; every mutating request (POST/PUT/PATCH/DELETE) with a session
 *      cookie must echo it in the `x-csrf-token` header. A third-party site
 *      cannot read the cookie (Same-Origin Policy) nor set the header (CORS).
 *      Covers deployments with SameSite=None (frontend and API on separate
 *      subdomains).
 *   3. Origin validation: the request must be same-origin or come from an
 *      origin in CORS_ORIGINS.
 *
 * Only mutating requests with a session cookie are validated. Non-browser
 * clients use Authorization: Bearer without cookies, and external webhooks
 * (WhatsApp, Twilio, Stripe) authenticate through other means: this middleware
 * ignores them. Double-submit is preferred over libraries like `csurf`
 * (unmaintained, known CVEs) because it adds no server-side state and does not
 * change the API contract for Bearer clients.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(origin, req) {
  return origin === `${req.protocol}://${req.headers.host}`;
}

function issueCsrfToken(res) {
  res.cookie('csrf-token', crypto.randomBytes(32).toString('hex'), {
    // Not HttpOnly on purpose: the SPA must read it to echo it in x-csrf-token.
    httpOnly: false,
    secure: config.isProd,
    sameSite: config.cookie.sameSite || 'lax',
    maxAge: config.cookie.maxAgeMs,
    path: '/',
  });
}

function csrfProtection(req, res, next) {
  const hasSessionCookie = Boolean(req.cookies && req.cookies[config.cookie.name]);

  // Safe requests and requests without a session (login, Bearer clients,
  // external webhooks): issue the token if missing, without validating.
  if (!MUTATING_METHODS.has(req.method) || !hasSessionCookie) {
    if (!req.cookies || !req.cookies['csrf-token']) issueCsrfToken(res);
    return next();
  }

  // Mutating request with a session: Origin validation (layer 3).
  const origin = req.headers.origin;
  if (origin && !isSameOrigin(origin, req) && !config.corsOrigins.includes(origin)) {
    return next(
      new ForbiddenError('Origin rejected: session request from an unauthorized origin')
    );
  }

  // Double-submit (layer 2): the header must reproduce the issued cookie.
  if (!req.cookies['csrf-token'] || !req.headers['x-csrf-token']) {
    return next(new ForbiddenError('CSRF token missing'));
  }
  if (req.headers['x-csrf-token'] !== req.cookies['csrf-token']) {
    return next(new ForbiddenError('CSRF token invalid'));
  }

  return next();
}

module.exports = { csrfProtection };
