/**
 * Student Controller
 */
const Student = require('../models/student.model');
const ImportService = require('../services/import.service');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class StudentController {
  static async getAll(ctx) {
    try {
      const { page, pageSize, search, is_active } = ctx.query;
      const result = await Student.findAll({ page, pageSize, search, is_active });

      ctx.body = Response.paginated(
        result.data,
        parseInt(page) || 1,
        parseInt(pageSize) || 10,
        result.total
      );
    } catch (error) {
      logger.error('Get students error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get students', 'GET_STUDENTS_ERROR');
    }
  }

  static async getById(ctx) {
    try {
      const { id } = ctx.params;
      const student = await Student.findById(id);

      if (!student) {
        ctx.status = 404;
        ctx.body = Response.error('Student not found', 'STUDENT_NOT_FOUND');
        return;
      }

      // Get enrolled courses and attendance stats
      const courses = await Student.getEnrolledCourses(id);
      const stats = await Student.getAttendanceStats(id);

      ctx.body = Response.success({ ...student, courses, stats });
    } catch (error) {
      logger.error('Get student error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get student', 'GET_STUDENT_ERROR');
    }
  }

  static async create(ctx) {
    try {
      const data = ctx.request.body;

      // Validate required fields
      if (!data.student_no || !data.name) {
        ctx.status = 400;
        ctx.body = Response.error('Student number and name are required', 'VALIDATION_ERROR');
        return;
      }

      // Check if student number exists
      const existing = await Student.findByStudentNo(data.student_no);
      if (existing) {
        ctx.status = 400;
        ctx.body = Response.error('Student number already exists', 'STUDENT_EXISTS');
        return;
      }

      const student = await Student.create(data);

      logger.info(`Student created: ${student.name}`, { studentId: student.id });

      ctx.body = Response.success(student, 'Student created successfully');
    } catch (error) {
      logger.error('Create student error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to create student', 'CREATE_STUDENT_ERROR');
    }
  }

  static async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      const existing = await Student.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('Student not found', 'STUDENT_NOT_FOUND');
        return;
      }

      // Check student number uniqueness if changed
      if (data.student_no && data.student_no !== existing.student_no) {
        const existingNo = await Student.findByStudentNo(data.student_no);
        if (existingNo) {
          ctx.status = 400;
          ctx.body = Response.error('Student number already exists', 'STUDENT_EXISTS');
          return;
        }
      }

      const student = await Student.update(id, data);

      logger.info(`Student updated: ${student.name}`, { studentId: student.id });

      ctx.body = Response.success(student, 'Student updated successfully');
    } catch (error) {
      logger.error('Update student error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to update student', 'UPDATE_STUDENT_ERROR');
    }
  }

  static async delete(ctx) {
    try {
      const { id } = ctx.params;
      const result = await Student.delete(id);

      if (!result) {
        ctx.status = 404;
        ctx.body = Response.error('Student not found', 'STUDENT_NOT_FOUND');
        return;
      }

      logger.info(`Student deleted`, { studentId: id });

      ctx.body = Response.success(null, 'Student deleted successfully');
    } catch (error) {
      logger.error('Delete student error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to delete student', 'DELETE_STUDENT_ERROR');
    }
  }

  static async importStudents(ctx) {
    try {
      const file = ctx.request.files?.file;

      if (!file) {
        ctx.status = 400;
        ctx.body = Response.error('No file uploaded', 'NO_FILE');
        return;
      }

      const { skipErrors = 'false', updateExisting = 'false' } = ctx.query;

      const results = await ImportService.processImport(file, {
        skipErrors: skipErrors === 'true',
        updateExisting: updateExisting === 'true'
      });

      logger.info(`Student import completed`, {
        total: results.total,
        success: results.success,
        failed: results.failed
      });

      ctx.body = Response.success(results, 'Import completed');
    } catch (error) {
      logger.error('Import students error', error);
      ctx.status = 500;
      ctx.body = Response.error(error.message, 'IMPORT_ERROR');
    }
  }

  static async getTemplate(ctx) {
    try {
      const template = ImportService.getTemplate();
      ctx.body = Response.success(template, 'Template retrieved');
    } catch (error) {
      logger.error('Get template error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get template', 'GET_TEMPLATE_ERROR');
    }
  }
}

module.exports = StudentController;
