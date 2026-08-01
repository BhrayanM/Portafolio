const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { pool } = require('../db');
const { extractToken } = require('../utils/authCookie');

const authenticate = async (req, res, next) => {
  try {
    // Cookie HttpOnly primero; Bearer como respaldo para clientes no-navegador.
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Token requerido');
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const result = await pool.query(
      'SELECT id, tenant_id, email, name, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    req.user = result.rows[0];
    req.tenantId = result.rows[0].tenant_id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token inválido o expirado'));
    } else {
      next(error);
    }
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permiso para esta acción'));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
