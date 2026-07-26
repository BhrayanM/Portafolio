const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.warn(err.message, { code: err.code, statusCode: err.statusCode, path: req.path });
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  logger.error(err.message, { stack: err.stack, path: req.path });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  });
};

module.exports = { errorHandler };
