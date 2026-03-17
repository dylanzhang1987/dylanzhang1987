/**
 * Statistics Controller
 */
const StatisticsService = require('../services/statistics.service');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class StatisticsController {
  static async getOverview(ctx) {
    try {
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const stats = await StatisticsService.getOverview(userId, role);

      ctx.body = Response.success(stats);
    } catch (error) {
      logger.error('Get overview statistics error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get overview statistics', 'GET_OVERVIEW_ERROR');
    }
  }

  static async getCourseStatistics(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Check permission
      if (role === 'teacher') {
        const Course = require('../models/course.model');
        const course = await Course.findById(id);
        if (!course || course.teacher_id !== userId) {
          ctx.status = 403;
          ctx.body = Response.error('Access denied', 'FORBIDDEN');
          return;
        }
      }

      const stats = await StatisticsService.getCourseStatistics(id);

      ctx.body = Response.success(stats);
    } catch (error) {
      logger.error('Get course statistics error', error);
      ctx.status = 500;
      ctx.body = Response.error(error.message || 'Failed to get course statistics', 'GET_COURSE_STATS_ERROR');
    }
  }

  static async getStudentStatistics(ctx) {
    try {
      const { id } = ctx.params;

      const stats = await StatisticsService.getStudentStatistics(id);

      ctx.body = Response.success(stats);
    } catch (error) {
      logger.error('Get student statistics error', error);
      ctx.status = 500;
      ctx.body = Response.error(error.message || 'Failed to get student statistics', 'GET_STUDENT_STATS_ERROR');
    }
  }

  static async getOverallStatistics(ctx) {
    try {
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const stats = await StatisticsService.getOverallStatistics(userId, role);

      ctx.body = Response.success(stats);
    } catch (error) {
      logger.error('Get overall statistics error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get overall statistics', 'GET_OVERALL_STATS_ERROR');
    }
  }
}

module.exports = StatisticsController;
