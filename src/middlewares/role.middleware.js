/**
 * Role Authorization Middleware
 * Checks if user has required role
 */
const pool = require('../config/db');
const logger = require('../utils/logger');

module.exports = (allowedRoles) => {
  return async (ctx, next) => {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'User not authenticated',
          code: 'UNAUTHORIZED'
        };
        return;
      }

      // Get user role from database
      const [users] = await pool.query(
        'SELECT id, role FROM users WHERE id = ?',
        [userId]
      );

      if (!users.length) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        };
        return;
      }

      const user = users[0];

      if (!allowedRoles.includes(user.role)) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: 'Insufficient permissions',
          code: 'FORBIDDEN'
        };
        return;
      }

      // Attach full user info to context
      ctx.state.user = { ...ctx.state.user, role: user.role };

      await next();
    } catch (err) {
      logger.error('Role authorization error', err);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Authorization check failed',
        code: 'AUTH_ERROR'
      };
    }
  };
};
