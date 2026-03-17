/**
 * Audit and Access Logs Controller
 */
const AuditLog = require('../models/audit.model');
const AccessLog = require('../models/access.model');
const Response = require('../utils/response');
const logger = require('../utils/logger');
const roleMiddleware = require('../middlewares/role.middleware');

class AuditController {
  static async getAuditLogs(ctx) {
    try {
      const { userId, action, resourceType, resourceId, startDate, endDate, page, pageSize } = ctx.query;

      const result = await AuditLog.findAll({
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        page,
        pageSize
      });

      ctx.body = Response.paginated(
        result.data,
        parseInt(page) || 1,
        parseInt(pageSize) || 20,
        result.total
      );
    } catch (error) {
      logger.error('Get audit logs error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get audit logs', 'GET_AUDIT_LOGS_ERROR');
    }
  }

  static async getAccessLogs(ctx) {
    try {
      const { userId, path, method, statusCode, startDate, endDate, page, pageSize } = ctx.query;

      const result = await AccessLog.findAll({
        userId,
        path,
        method,
        statusCode,
        startDate,
        endDate,
        page,
        pageSize
      });

      ctx.body = Response.paginated(
        result.data,
        parseInt(page) || 1,
        parseInt(pageSize) || 20,
        result.total
      );
    } catch (error) {
      logger.error('Get access logs error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get access logs', 'GET_ACCESS_LOGS_ERROR');
    }
  }

  static async getAccessStats(ctx) {
    try {
      const { startDate, endDate } = ctx.query;

      const stats = await AccessLog.getStats({ startDate, endDate });

      ctx.body = Response.success(stats);
    } catch (error) {
      logger.error('Get access stats error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get access statistics', 'GET_ACCESS_STATS_ERROR');
    }
  }
}

module.exports = AuditController;
