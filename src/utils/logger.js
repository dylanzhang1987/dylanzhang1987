/**
 * Logger Utility
 */
const config = require('../config/database.config');

const logger = {
  info: (message, meta = {}) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, meta);
  },
  error: (message, error = null) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
  },
  warn: (message, meta = {}) => {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    if (config.env === 'development') {
      console.log(`[${new Date().toISOString()}] DEBUG: ${message}`, meta);
    }
  }
};

module.exports = logger;
