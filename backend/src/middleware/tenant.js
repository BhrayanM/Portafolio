const { ForbiddenError } = require('../utils/errors');

/**
 * Resuelve el tenant de la peticion a partir del usuario autenticado.
 *
 * F19(a) H-08 — antes, si no habia `req.user`, se aceptaba el tenant de las
 * cabeceras `x-tenant-id` / `x-tenant-slug`. Hoy no era explotable porque en todas
 * las rutas donde se monta va `authenticate` delante, pero era una mina enterrada:
 * bastaba con montar este middleware sin auth (o quitarla en un refactor) para que
 * cualquiera suplantase cualquier tenant con una cabecera. El tenant se deriva
 * **solo** de la identidad verificada.
 */
const resolveTenant = (req, res, next) => {
  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    return next();
  }

  next(new ForbiddenError('Tenant no identificado'));
};

module.exports = { resolveTenant };
