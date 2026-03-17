/**
 * Student Model
 */
const pool = require('../config/db');

class Student {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByStudentNo(studentNo) {
    const [rows] = await pool.query(
      'SELECT * FROM students WHERE student_no = ?',
      [studentNo]
    );
    return rows[0];
  }

  static async findAll(options = {}) {
    const { page = 1, pageSize = 10, search, is_active } = options;
    const offset = (page - 1) * pageSize;

    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR student_no LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM students WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR student_no LIKE ? OR phone LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (is_active !== undefined) {
      countQuery += ' AND is_active = ?';
      countParams.push(is_active);
    }

    const [count] = await pool.query(countQuery, countParams);

    return {
      data: rows,
      total: count[0].total,
      page,
      pageSize
    };
  }

  static async create(data) {
    const {
      student_no, name, gender, birth_date, phone,
      parent_name, parent_phone, address, school, grade,
      enrollment_date, avatar, notes
    } = data;

    const [result] = await pool.query(
      `INSERT INTO students
       (student_no, name, gender, birth_date, phone, parent_name, parent_phone,
        address, school, grade, enrollment_date, avatar, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_no, name, gender, birth_date, phone, parent_name, parent_phone,
       address, school, grade, enrollment_date, avatar, notes]
    );

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const {
      student_no, name, gender, birth_date, phone,
      parent_name, parent_phone, address, school, grade,
      enrollment_date, avatar, notes, is_active
    } = data;

    const fields = [];
    const params = [];

    const allFields = {
      student_no, name, gender, birth_date, phone,
      parent_name, parent_phone, address, school, grade,
      enrollment_date, avatar, notes, is_active
    };

    for (const [key, value] of Object.entries(allFields)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);

    await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM students WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getEnrolledCourses(studentId) {
    const [rows] = await pool.query(
      `SELECT c.*, ce.enrollment_date, ce.status as enrollment_status
       FROM courses c
       INNER JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE ce.student_id = ? AND c.is_active = 1
       ORDER BY c.start_date DESC`,
      [studentId]
    );
    return rows;
  }

  static async getAttendanceStats(studentId, courseId = null) {
    let query = `
      SELECT
        status,
        COUNT(*) as count
      FROM attendance_records
      WHERE student_id = ?
    `;
    const params = [studentId];

    if (courseId) {
      query += ' AND course_id = ?';
      params.push(courseId);
    }

    query += ' GROUP BY status';

    const [rows] = await pool.query(query, params);

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0
    };

    rows.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });

    return stats;
  }
}

module.exports = Student;
