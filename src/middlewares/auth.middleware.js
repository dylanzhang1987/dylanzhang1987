/**
 * Authentication Middleware
 * Validates JWT token and attaches user to context
 */
const jwt = require('jsonwebtoken');
const config = require('../config/database.config');
const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  try {
    const token = ctx.header.authorization?.replace('Bearer ', '');

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'No token provided',
        code: 'NO_TOKEN'
      };
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    ctx.state.user = decoded;

    await next();
  } catch (err) {
    logger.error('Authentication error', err.message);
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    };
  }
};
