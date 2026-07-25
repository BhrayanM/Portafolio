const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const formatTimestamp = () => new Date().toISOString();

const logger = {
  error: (message, meta) => {
    if (currentLevel >= 0) console.error(JSON.stringify({ level: 'error', timestamp: formatTimestamp(), message, meta }));
  },
  warn: (message, meta) => {
    if (currentLevel >= 1) console.warn(JSON.stringify({ level: 'warn', timestamp: formatTimestamp(), message, meta }));
  },
  info: (message, meta) => {
    if (currentLevel >= 2) console.log(JSON.stringify({ level: 'info', timestamp: formatTimestamp(), message, meta }));
  },
  debug: (message, meta) => {
    if (currentLevel >= 3) console.log(JSON.stringify({ level: 'debug', timestamp: formatTimestamp(), message, meta }));
  },
};

module.exports = { logger };
