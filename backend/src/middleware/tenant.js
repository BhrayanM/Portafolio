const { ForbiddenError } = require('../utils/errors');
const { runWithTenant } = require('../db');

/**
 * Resuelve el tenant de la peticion a partir del usuario autenticado.
 *
 * F19(a) H-08 — antes, si no habia `req.user`, se aceptaba el tenant de las
 * cabeceras `x-tenant-id` / `x-tenant-slug`. Hoy no era explotable porque en todas
 * las rutas donde se monta va `authenticate` delante, pero era una mina enterrada:
 * bastaba con montar este middleware sin auth (o quitarla en un refactor) para que
 * cualquiera suplantase cualquier tenant con una cabecera. El tenant se deriva
 * **solo** de la identidad verificada.
 *
 * F21.5 — Ademas de dejarlo en `req.tenantId`, el resto de la peticion se ejecuta
 * dentro de un ambito de tenant (AsyncLocalStorage). `src/db.js` lo lee y fija
 * `app.tenant_id` en cada consulta, que es lo que activan las politicas RLS con
 * FORCE de la migracion 016. El aislamiento pasa a imponerlo el motor: si un
 * servicio olvidase el `WHERE tenant_id = $1`, la base sigue sin devolver filas
 * ajenas. El `WHERE` se mantiene igualmente — defensa en profundidad, no relevo.
 *
 * El ambito se abre aqui y no en `authenticate` a proposito: hay rutas
 * autenticadas que no son de tenant (`/api/auth/me`, `/api/metrics`) y no deben
 * arrastrar contexto.
 */
const resolveTenant = (req, res, next) => {
  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    return runWithTenant(req.tenantId, () => next());
  }

  next(new ForbiddenError('Tenant no identificado'));
};

module.exports = { resolveTenant };
