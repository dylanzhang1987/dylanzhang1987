/**
 * Audit Log Middleware
 * Logs operations (CREATE, UPDATE, DELETE) for audit trails
 */
const pool = require('../config/db');
const logger = require('../utils/logger');

const methodsToAudit = ['POST', 'PUT', 'DELETE'];

module.exports = async (ctx, next) => {
  const startTime = Date.now();

  await next();

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Only log modifications (POST, PUT, DELETE)
  if (!methodsToAudit.includes(ctx.method)) return;

  // Skip error responses
  if (ctx.status >= 400) return;

  try {
    const userId = ctx.state.user?.id || null;
    const path = ctx.path;
    const method = ctx.method;

    // Extract resource type and ID from path
    const pathMatch = path.match(/^\/api\/([a-z-]+)(?:\/(\d+))?/);
    if (!pathMatch) return;

    const resourceType = pathMatch[1].replace(/-/g, '_').replace(/s$/, ''); // e.g., 'users' -> 'user'
    const resourceId = pathMatch[2] ? parseInt(pathMatch[2]) : null;

    // Determine action
    let action;
    if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    } else {
      return;
    }

    // Extract resource ID from response if creating new item
    if (action === 'CREATE' && ctx.body?.data?.id) {
      resourceId = ctx.body.data.id;
    }

    // Log to database
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify({
          path,
          method,
          duration: `${duration}ms`,
          request: ctx.request.body,
          response: ctx.body
        }),
        ctx.ip || ctx.request.ip,
        ctx.header['user-agent']
      ]
    );
  } catch (err) {
    // Don't fail the request if audit logging fails
    logger.error('Audit logging error', err);
  }
};
