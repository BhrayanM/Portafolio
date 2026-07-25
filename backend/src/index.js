const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger');

const server = app.listen(config.port, config.host, () => {
  logger.info(`API running on http://${config.host}:${config.port}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason.message, stack: reason.stack });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
  server.close(() => process.exit(1));
});
