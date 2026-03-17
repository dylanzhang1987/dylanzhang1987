/**
 * Attendance Controller
 */
const Attendance = require('../models/attendance.model');
const Course = require('../models/course.model');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class AttendanceController {
  static async getAll(ctx) {
    try {
      const { courseId, studentId, date, status, page, pageSize } = ctx.query;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Check permission for course filter
      if (courseId && role === 'teacher') {
        const course = await Course.findById(courseId);
        if (course && course.teacher_id !== userId) {
          ctx.status = 403;
          ctx.body = Response.error('Access denied', 'FORBIDDEN');
          return;
        }
      }

      const result = await Attendance.findAll({
        courseId,
        studentId,
        date,
        status,
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
      logger.error('Get attendance records error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get attendance records', 'GET_ATTENDANCE_ERROR');
    }
  }

  static async getByCourse(ctx) {
    try {
      const { courseId } = ctx.params;
      const { date } = ctx.query;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Check permission
      const course = await Course.findById(courseId);
      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      let records;
      if (date) {
        records = await Attendance.findByCourseAndDate(courseId, date);
      } else {
        // Get enrolled students without attendance
        const students = await Course.getEnrolledStudents(courseId);
        records = students.map(s => ({
          student_id: s.id,
          student_no: s.student_no,
          student_name: s.name,
          status: null,
          notes: null
        }));
      }

      ctx.body = Response.success(records);
    } catch (error) {
      logger.error('Get course attendance error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get course attendance', 'GET_COURSE_ATTENDANCE_ERROR');
    }
  }

  static async create(ctx) {
    try {
      const data = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      // Check permission
      const course = await Course.findById(data.course_id);
      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      const record = await Attendance.create({
        ...data,
        recorded_by: userId
      });

      logger.info(`Attendance record created`, { recordId: record.id });

      ctx.body = Response.success(record, 'Attendance record created successfully');
    } catch (error) {
      logger.error('Create attendance error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to create attendance record', 'CREATE_ATTENDANCE_ERROR');
    }
  }

  static async batchCreate(ctx) {
    try {
      const { records } = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      if (!Array.isArray(records) || records.length === 0) {
        ctx.status = 400;
        ctx.body = Response.error('Records array is required', 'VALIDATION_ERROR');
        return;
      }

      // Check permission for all courses
      const courseId = records[0].course_id;
      const course = await Course.findById(courseId);
      if (!course) {
        ctx.status = 404;
        ctx.body = Response.error('Course not found', 'COURSE_NOT_FOUND');
        return;
      }

      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      // Validate all records are for the same course
      for (const record of records) {
        if (record.course_id !== courseId) {
          ctx.status = 400;
          ctx.body = Response.error('All records must be for the same course', 'VALIDATION_ERROR');
          return;
        }
      }

      const count = await Attendance.batchCreate(records, userId);

      logger.info(`Batch attendance created`, { courseId, count });

      ctx.body = Response.success({ count }, `${count} attendance records created`);
    } catch (error) {
      logger.error('Batch create attendance error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to create attendance records', 'BATCH_CREATE_ERROR');
    }
  }

  static async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const existing = await Attendance.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('Attendance record not found', 'RECORD_NOT_FOUND');
        return;
      }

      // Check permission
      const course = await Course.findById(existing.course_id);
      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      const record = await Attendance.update(id, data);

      logger.info(`Attendance record updated`, { recordId: id });

      ctx.body = Response.success(record, 'Attendance record updated successfully');
    } catch (error) {
      logger.error('Update attendance error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to update attendance record', 'UPDATE_ATTENDANCE_ERROR');
    }
  }

  static async delete(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user.id;
      const role = ctx.state.user.role;

      const existing = await Attendance.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('Attendance record not found', 'RECORD_NOT_FOUND');
        return;
      }

      // Check permission
      const course = await Course.findById(existing.course_id);
      if (role === 'teacher' && course.teacher_id !== userId) {
        ctx.status = 403;
        ctx.body = Response.error('Access denied', 'FORBIDDEN');
        return;
      }

      const result = await Attendance.delete(id);

      logger.info(`Attendance record deleted`, { recordId: id });

      ctx.body = Response.success(null, 'Attendance record deleted successfully');
    } catch (error) {
      logger.error('Delete attendance error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to delete attendance record', 'DELETE_ATTENDANCE_ERROR');
    }
  }
}

module.exports = AttendanceController;
