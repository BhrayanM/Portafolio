const { ForbiddenError } = require('../utils/errors');

const resolveTenant = (req, res, next) => {
  const tenantHeader = req.headers['x-tenant-id'];
  const tenantSlug = req.headers['x-tenant-slug'];
  const subdomain = req.subdomains.length > 0 ? req.subdomains[0] : null;

  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    return next();
  }

  if (tenantHeader) {
    req.tenantId = tenantHeader;
    return next();
  }

  if (tenantSlug) {
    req.tenantSlug = tenantSlug;
    return next();
  }

  next(new ForbiddenError('Tenant no identificado'));
};

module.exports = { resolveTenant };
