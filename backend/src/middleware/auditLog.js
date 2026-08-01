const { pool } = require('../db');

const auditLog = (action, resource = null, resourceId = null) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      pool.query(
        `INSERT INTO audit_log (tenant_id, user_id, action, resource, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.tenantId || null,
          req.user?.id || null,
          action,
          resource,
          resourceId || req.params?.id || null,
          JSON.stringify({ method: req.method, path: req.originalUrl, statusCode: res.statusCode }),
          req.ip,
          req.headers['user-agent'] || null,
        ]
      ).catch((err) => console.error('Audit log error:', err.message));

      return originalJson(body);
    };

    next();
  };
};

module.exports = { auditLog };
