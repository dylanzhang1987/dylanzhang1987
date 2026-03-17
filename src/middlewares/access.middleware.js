/**
 * Access Log Middleware
 * Logs all API access for monitoring
 */
const pool = require('../config/db');
const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  const startTime = Date.now();

  await next();

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  try {
    const userId = ctx.state.user?.id || null;

    // Only log API requests
    if (!ctx.path.startsWith('/api/')) return;

    await pool.query(
      `INSERT INTO access_logs (user_id, path, method, status_code, ip_address, user_agent, response_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        ctx.path,
        ctx.method,
        ctx.status,
        ctx.ip || ctx.request.ip,
        ctx.header['user-agent'],
        responseTime
      ]
    );

    // Log slow requests (> 1s)
    if (responseTime > 1000) {
      logger.warn(`Slow request: ${ctx.method} ${ctx.path} took ${responseTime}ms`);
    }
  } catch (err) {
    // Don't fail the request if access logging fails
    logger.error('Access logging error', err);
  }
};
