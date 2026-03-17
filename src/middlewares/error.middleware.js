/**
 * Error Handler Middleware
 */
const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    logger.error('Error occurred', err);

    // JWT errors
    if (err.name === 'UnauthorizedError') {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Invalid or expired token',
        code: 'UNAUTHORIZED'
      };
      return;
    }

    // Validation errors
    if (err.name === 'ValidationError') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: err.message,
        code: 'VALIDATION_ERROR',
        details: err.details
      };
      return;
    }

    // Database errors
    if (err.code && err.code.startsWith('ER_')) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Database error',
        code: 'DATABASE_ERROR',
        details: err.message
      };
      return;
    }

    // Default error
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    };

    // Log stack trace in development
    if (process.env.NODE_ENV === 'development') {
      ctx.body.stack = err.stack;
    }
  }
};
