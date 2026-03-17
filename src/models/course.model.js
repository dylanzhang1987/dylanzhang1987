/**
 * Course Model
 */
const pool = require('../config/db');

class Course {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll(options = {}) {
    const { teacherId, page = 1, pageSize = 10, is_active, search } = options;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT c.*, u.name as teacher_name
      FROM courses c
      INNER JOIN users u ON c.teacher_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (teacherId) {
      query += ' AND c.teacher_id = ?';
      params.push(teacherId);
    }

    if (is_active !== undefined) {
      query += ' AND c.is_active = ?';
      params.push(is_active);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.course_type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM courses c
      WHERE 1=1
    `;
    const countParams = [];

    if (teacherId) {
      countQuery += ' AND c.teacher_id = ?';
      countParams.push(teacherId);
    }

    if (is_active !== undefined) {
      countQuery += ' AND c.is_active = ?';
      countParams.push(is_active);
    }

    if (search) {
      countQuery += ' AND (c.name LIKE ? OR c.course_type LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [count] = await pool.query(countQuery, countParams);

    return {
      data: rows.map(row => ({
        ...row,
        schedule: row.schedule ? JSON.parse(row.schedule) : []
      })),
      total: count[0].total,
      page,
      pageSize
    };
  }

  static async create(data) {
    const {
      name, description, teacher_id, course_type, level,
      max_students, start_date, end_date, schedule,
      room, tuition, is_active
    } = data;

    const [result] = await pool.query(
      `INSERT INTO courses
       (name, description, teacher_id, course_type, level, max_students,
        start_date, end_date, schedule, room, tuition, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, teacher_id, course_type, level, max_students || 30,
       start_date, end_date, schedule ? JSON.stringify(schedule) : null,
       room, tuition || 0, is_active !== undefined ? is_active : 1]
    );

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const {
      name, description, teacher_id, course_type, level,
      max_students, start_date, end_date, schedule,
      room, tuition, is_active
    } = data;

    const fields = [];
    const params = [];

    const allFields = {
      name, description, teacher_id, course_type, level,
      max_students, start_date, end_date, schedule,
      room, tuition, is_active
    };

    for (const [key, value] of Object.entries(allFields)) {
      if (value !== undefined) {
        if (key === 'schedule') {
          fields.push('schedule = ?');
          params.push(value ? JSON.stringify(value) : null);
        } else {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);

    await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM courses WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getEnrolledStudents(courseId) {
    const [rows] = await pool.query(
      `SELECT s.*, ce.enrollment_date, ce.status as enrollment_status
       FROM students s
       INNER JOIN course_enrollments ce ON s.id = ce.student_id
       WHERE ce.course_id = ? AND ce.status = 'active'
       ORDER BY s.name`,
      [courseId]
    );
    return rows;
  }

  static async addStudent(courseId, studentId) {
    const [result] = await pool.query(
      `INSERT INTO course_enrollments (course_id, student_id, enrollment_date, status)
       VALUES (?, ?, CURDATE(), 'active')
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [courseId, studentId]
    );
    return result.insertId;
  }

  static async addStudents(courseId, studentIds) {
    const values = studentIds.map(id => [courseId, id, new Date().toISOString().split('T')[0], 'active']);
    await pool.query(
      `INSERT INTO course_enrollments (course_id, student_id, enrollment_date, status)
       VALUES ?
       ON DUPLICATE KEY UPDATE status = 'active'`,
      [values]
    );
    return studentIds.length;
  }

  static async removeStudent(courseId, studentId) {
    const [result] = await pool.query(
      `UPDATE course_enrollments
       SET status = 'dropped'
       WHERE course_id = ? AND student_id = ?`,
      [courseId, studentId]
    );
    return result.affectedRows > 0;
  }

  static async getStats(courseId) {
    // Get enrollment count
    const [enrollment] = await pool.query(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ? AND status = "active"',
      [courseId]
    );

    // Get attendance stats
    const [attendance] = await pool.query(
      `SELECT
         status,
         COUNT(*) as count,
         COUNT(DISTINCT attendance_date) as class_days
       FROM attendance_records
       WHERE course_id = ?
       GROUP BY status`,
      [courseId]
    );

    const stats = {
      enrolledStudents: enrollment[0].count,
      totalClasses: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    attendance.forEach(row => {
      if (row.status === 'present' || row.status === 'late' || row.status === 'excused') {
        stats.totalClasses = Math.max(stats.totalClasses, row.class_days);
      }
      if (row.status !== 'class_days') {
        stats[row.status] = row.count;
      }
    });

    return stats;
  }
}

module.exports = Course;
