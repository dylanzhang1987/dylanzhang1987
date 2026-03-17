/**
 * Attendance Record Model
 */
const pool = require('../config/db');

class Attendance {
  static async findAll(options = {}) {
    const { courseId, studentId, date, status, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT ar.*, c.name as course_name, s.name as student_name, s.student_no, u.name as recorded_by_name
      FROM attendance_records ar
      INNER JOIN courses c ON ar.course_id = c.id
      INNER JOIN students s ON ar.student_id = s.id
      INNER JOIN users u ON ar.recorded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (courseId) {
      query += ' AND ar.course_id = ?';
      params.push(courseId);
    }

    if (studentId) {
      query += ' AND ar.student_id = ?';
      params.push(studentId);
    }

    if (date) {
      query += ' AND ar.attendance_date = ?';
      params.push(date);
    }

    if (status) {
      query += ' AND ar.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ar.attendance_date DESC, c.name, s.name LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM attendance_records WHERE 1=1';
    const countParams = [];

    if (courseId) {
      countQuery += ' AND course_id = ?';
      countParams.push(courseId);
    }

    if (studentId) {
      countQuery += ' AND student_id = ?';
      countParams.push(studentId);
    }

    if (date) {
      countQuery += ' AND attendance_date = ?';
      countParams.push(date);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [count] = await pool.query(countQuery, countParams);

    return {
      data: rows,
      total: count[0].total,
      page,
      pageSize
    };
  }

  static async findByCourseAndDate(courseId, date) {
    const [rows] = await pool.query(
      `SELECT ar.*, s.name as student_name, s.student_no
       FROM attendance_records ar
       INNER JOIN students s ON ar.student_id = s.id
       WHERE ar.course_id = ? AND ar.attendance_date = ?
       ORDER BY s.name`,
      [courseId, date]
    );
    return rows;
  }

  static async findByStudent(studentId, options = {}) {
    const { courseId, startDate, endDate } = options;

    let query = `
      SELECT ar.*, c.name as course_name
      FROM attendance_records ar
      INNER JOIN courses c ON ar.course_id = c.id
      WHERE ar.student_id = ?
    `;
    const params = [studentId];

    if (courseId) {
      query += ' AND ar.course_id = ?';
      params.push(courseId);
    }

    if (startDate) {
      query += ' AND ar.attendance_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND ar.attendance_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY ar.attendance_date DESC, c.name';

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async create(data) {
    const { course_id, student_id, attendance_date, status, notes, recorded_by } = data;

    const [result] = await pool.query(
      `INSERT INTO attendance_records (course_id, student_id, attendance_date, status, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         notes = VALUES(notes),
         recorded_by = VALUES(recorded_by)`,
      [course_id, student_id, attendance_date, status || 'present', notes, recorded_by]
    );

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT ar.*, c.name as course_name, s.name as student_name, u.name as recorded_by_name
       FROM attendance_records ar
       INNER JOIN courses c ON ar.course_id = c.id
       INNER JOIN students s ON ar.student_id = s.id
       INNER JOIN users u ON ar.recorded_by = u.id
       WHERE ar.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async update(id, data) {
    const { status, notes } = data;

    const fields = [];
    const params = [];

    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      fields.push('notes = ?');
      params.push(notes);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);

    await pool.query(
      `UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  static async batchCreate(records, recordedBy) {
    const values = records.map(r => [
      r.course_id,
      r.student_id,
      r.attendance_date,
      r.status || 'present',
      r.notes || null,
      recordedBy
    ]);

    await pool.query(
      `INSERT INTO attendance_records (course_id, student_id, attendance_date, status, notes, recorded_by)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         notes = VALUES(notes),
         recorded_by = VALUES(recorded_by)`,
      [values]
    );

    return records.length;
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM attendance_records WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getCourseDates(courseId) {
    const [rows] = await pool.query(
      `SELECT DISTINCT attendance_date
       FROM attendance_records
       WHERE course_id = ?
       ORDER BY attendance_date DESC`,
      [courseId]
    );
    return rows.map(r => r.attendance_date);
  }
}

module.exports = Attendance;
