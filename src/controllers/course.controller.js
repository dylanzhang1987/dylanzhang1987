/**
 * Course Controller
 */
const Course = require('../models/course.model');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class CourseController {
  static async getAll(ctx) {
    try {
      const { page, pageSize, search, is_active } = ctx.query;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Teachers can only see their own courses
      const teacherId = role === 'teacher' ? userId : undefined;

      const result = await Course.findAll({ teacherId, page, pageSize, is_active, search });

      ctx.body = Response.paginated(
        result.data,
        parseInt(page) || 1,
        parseInt(pageSize) || 10,
        result.total
      );
    } catch (error) {
      logger.error('Get courses error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get courses', 'GET_COURSES_ERROR');
    }
  }

  static async getById(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const course = await Course.findById(id);

      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      // Check permission: teachers can only access their own courses
      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      // Get enrolled students and stats
      const students = await Course.getEnrolledStudents(id);
      const stats = await Course.getStats(id);

      ctx.body = Response.success({ ...course, students, stats });
    } catch (error) {
      logger.error('Get course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get course', 'GET_COURSE_ERROR');
    }
  }

  static async create(ctx) {
    try {
      const data = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Validate required fields
      if (!data.name || !data.teacher_id) {
        ctx.status = 400;
        ctx.body = Response.error('Course name and teacher are required', 'VALIDATION_ERROR');
        return;
      }

      // Teachers can only create courses for themselves
      if (role === 'teacher' && data.teacher_id != userId) {
        ctx.status = 403;
        ctx.body = Response.error('Teachers can only create courses for themselves', 'FORBIDDEN');
        return;
      }

      const course = await Course.create(data);

      logger.info(`Course created: ${course.name}`, { courseId: course.id });

      ctx.body = Response.success(course, 'Course created successfully');
    } catch (error) {
      logger.error('Create course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to create course', 'CREATE_COURSE_ERROR');
    }
  }

  static async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const existing = await Course.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      // Check permission: teachers can only update their own courses
      if (role === 'teacher' && existing.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      // Teachers cannot change the teacher
      if (role === 'teacher' && data.teacher_id && data.teacher_id != userId) {
        ctx.status = 403;
        ctx.body = Response.error('Cannot change course teacher', 'FORBIDDEN');
        return;
      }

      const course = await Course.update(id, data);

      logger.info(`Course updated: ${course.name}`, { courseId: course.id });

      ctx.body = Response.success(course, 'Course updated successfully');
    } catch (error) {
      logger.error('Update course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to update course', 'UPDATE_COURSE_ERROR');
    }
  }

  static async delete(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const existing = await Course.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      // Check permission: teachers can only delete their own courses
      if (role === 'teacher' && existing.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      const result = await Course.delete(id);

      logger.info(`Course deleted`, { courseId: id });

      ctx.body = Response.success(null, 'Course deleted successfully');
    } catch (error) {
      logger.error('Delete course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to delete course', 'DELETE_COURSE_ERROR');
    }
  }

  static async addStudents(ctx) {
    try {
      const { id } = ctx.params;
      const { studentIds } = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const course = await Course.findById(id);
      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      // Check permission
      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        ctx.status = 400;
        ctx.body = Response.error('Student IDs array is required', 'VALIDATION_ERROR');
        return;
      }

      await Course.addStudents(id, studentIds);

      logger.info(`Students added to course`, { courseId: id, count: studentIds.length });

      ctx.body = Response.success(null, `${studentIds.length} students added to course`);
    } catch (error) {
      logger.error('Add students to course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to add students to course', 'ADD_STUDENTS_ERROR');
    }
  }

  static async removeStudent(ctx) {
    try {
      const { id, studentId } = ctx.params;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const course = await Course.findById(id);
      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      // Check permission
      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      await Course.removeStudent(id, studentId);

      logger.info(`Student removed from course`, { courseId: id, studentId });

      ctx.body = Response.success(null, 'Student removed from course');
    } catch (error) {
      logger.error('Remove student from course error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to remove student from course', 'REMOVE_STUDENT_ERROR');
    }
  }
}

module.exports = CourseController;
