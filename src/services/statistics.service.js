/**
 * Statistics Service
 */
const pool = require('../config/db');
const dayjs = require('dayjs');

class StatisticsService {
  static async getOverview(userId, role) {
    // Base query with role-based filtering
    const userFilter = role !== 'super_admin' ? `WHERE teacher_id = ${userId}` : '';

    // Get course counts
    const [courseStats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM courses
      ${role !== 'super_admin' ? `WHERE teacher_id = ?` : ''}
    `, role !== 'super_admin' ? [userId] : []);

    // Get student count (all students accessible to user)
    let studentQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM students s
      ${role !== 'super_admin' ? `
        INNER JOIN course_enrollments ce ON s.id = ce.student_id
        INNER JOIN courses c ON ce.course_id = c.id
        WHERE c.teacher_id = ? AND ce.status = 'active'
      ` : ''}
    `;
    const [studentStats] = await pool.query(studentQuery, role !== 'super_admin' ? [userId] : []);

    // Get attendance stats for current month
    const [attendanceStats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance_records
      WHERE attendance_date >= ? AND attendance_date <= ?
      ${role !== 'super_admin' ? 'AND course_id IN (SELECT id FROM courses WHERE teacher_id = ?)' : ''}
    `, [
      dayjs().startOf('month').format('YYYY-MM-DD'),
      dayjs().endOf('month').format('YYYY-MM-DD'),
      ...((role !== 'super_admin') ? [userId] : [])
    ]);

    // Get recent activity
    const [recentActivity] = await pool.query(`
      SELECT
        al.action,
        al.resource_type,
        al.created_at,
        u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${role !== 'super_admin' ? `WHERE al.user_id = ${userId}` : ''}
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    // Get attendance trend (last 7 days)
    const [attendanceTrend] = await pool.query(`
      SELECT
        DATE(attendance_date) as date,
        status,
        COUNT(*) as count
      FROM attendance_records
      WHERE attendance_date >= ? AND attendance_date <= ?
      ${role !== 'super_admin' ? 'AND course_id IN (SELECT id FROM courses WHERE teacher_id = ?)' : ''}
      GROUP BY DATE(attendance_date), status
      ORDER BY date DESC
    `, [
      dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'),
      ...((role !== 'super_admin') ? [userId] : [])
    ]);

    // Format attendance trend
    const trendData = {};
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      trendData[date] = { present: 0, absent: 0, late: 0, excused: 0 };
    }

    attendanceTrend.forEach(row => {
      if (trendData[row.date]) {
        trendData[row.date][row.status] = row.count;
      }
    });

    return {
      courses: {
        total: courseStats[0].total,
        active: courseStats[0].active
      },
      students: {
        total: studentStats[0].total
      },
      attendance: {
        total: attendanceStats[0].total,
        present: attendanceStats[0].present,
        absent: attendanceStats[0].absent,
        late: attendanceStats[0].late,
        excused: attendanceStats[0].excused
      },
      recentActivity,
      attendanceTrend: Object.entries(trendData).map(([date, stats]) => ({
        date,
        ...stats
      }))
    };
  }

  static async getCourseStatistics(courseId) {
    // Get course info
    const [courses] = await pool.query(
      'SELECT * FROM courses WHERE id = ?',
      [courseId]
    );

    if (!courses.length) {
      throw new Error('Course not found');
    }

    const course = {
      ...courses[0],
      schedule: courses[0].schedule ? JSON.parse(courses[0].schedule) : []
    };

    // Get enrollment stats
    const [enrollment] = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'dropped' THEN 1 ELSE 0 END) as dropped
       FROM course_enrollments
       WHERE course_id = ?`,
      [courseId]
    );

    // Get attendance stats
    const [attendance] = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused,
         COUNT(DISTINCT attendance_date) as class_days
       FROM attendance_records
       WHERE course_id = ?`,
      [courseId]
    );

    // Get student attendance rates
    const [studentAttendance] = await pool.query(
      `SELECT
         s.id,
         s.student_no,
         s.name,
         COUNT(ar.id) as total_classes,
         SUM(CASE WHEN ar.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count
       FROM students s
       INNER JOIN course_enrollments ce ON s.id = ce.student_id
       LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.course_id = ?
       WHERE ce.course_id = ? AND ce.status = 'active'
       GROUP BY s.id, s.student_no, s.name
       ORDER BY s.name`,
      [courseId, courseId]
    );

    // Get daily attendance trend
    const [dailyTrend] = await pool.query(
      `SELECT
         attendance_date as date,
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) as attended,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
       FROM attendance_records
       WHERE course_id = ?
       GROUP BY attendance_date
       ORDER BY attendance_date DESC
       LIMIT 30`,
      [courseId]
    );

    return {
      course,
      enrollment: enrollment[0],
      attendance: {
        total: attendance[0].total,
        present: attendance[0].present,
        absent: attendance[0].absent,
        late: attendance[0].late,
        excused: attendance[0].excused,
        classDays: attendance[0].class_days,
        attendanceRate: attendance[0].total > 0
          ? (((attendance[0].present + attendance[0].late) / attendance[0].total) * 100).toFixed(2)
          : 0
      },
      studentAttendance: studentAttendance.map(s => ({
        ...s,
        attendanceRate: s.total_classes > 0
          ? ((s.attended / s.total_classes) * 100).toFixed(2)
          : 0
      })),
      dailyTrend: dailyTrend.reverse()
    };
  }

  static async getStudentStatistics(studentId) {
    // Get student info
    const [students] = await pool.query(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    if (!students.length) {
      throw new Error('Student not found');
    }

    const student = students[0];

    // Get enrolled courses
    const [courses] = await pool.query(
      `SELECT c.*, ce.enrollment_date, ce.status as enrollment_status
       FROM courses c
       INNER JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE ce.student_id = ? AND ce.status = 'active'
       ORDER BY c.start_date DESC`,
      [studentId]
    );

    // Get overall attendance stats
    const [attendance] = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused,
         COUNT(DISTINCT course_id) as courses_attended
       FROM attendance_records
       WHERE student_id = ?`,
      [studentId]
    );

    // Get attendance by course
    const [byCourse] = await pool.query(
      `SELECT
         c.id,
         c.name,
         COUNT(ar.id) as total_classes,
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late,
         SUM(CASE WHEN ar.status = 'excused' THEN 1 ELSE 0 END) as excused
       FROM courses c
       INNER JOIN course_enrollments ce ON c.id = ce.course_id
       LEFT JOIN attendance_records ar ON c.id = ar.course_id AND ar.student_id = ?
       WHERE ce.student_id = ? AND ce.status = 'active'
       GROUP BY c.id, c.name`,
      [studentId, studentId]
    );

    // Get monthly attendance trend
    const [monthlyTrend] = await pool.query(
      `SELECT
         DATE_FORMAT(attendance_date, '%Y-%m') as month,
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) as attended
       FROM attendance_records
       WHERE student_id = ?
       GROUP BY DATE_FORMAT(attendance_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [studentId]
    );

    return {
      student,
      enrolledCourses: courses.length,
      courses,
      attendance: {
        total: attendance[0].total,
        present: attendance[0].present,
        absent: attendance[0].absent,
        late: attendance[0].late,
        excused: attendance[0].excused,
        attendanceRate: attendance[0].total > 0
          ? (((attendance[0].present + attendance[0].late + attendance[0].excused) / attendance[0].total) * 100).toFixed(2)
          : 0
      },
      attendanceByCourse: byCourse.map(c => ({
        ...c,
        attendanceRate: c.total_classes > 0
          ? (((c.present + c.late + c.excused) / c.total_classes) * 100).toFixed(2)
          : 0
      })),
      monthlyTrend: monthlyTrend.reverse()
    };
  }

  static async getOverallStatistics(userId, role) {
    const userFilter = role !== 'super_admin' ? `WHERE teacher_id = ?` : '';
    const params = role !== 'super_admin' ? [userId] : [];

    // Course type distribution
    const [courseTypes] = await pool.query(`
      SELECT course_type, COUNT(*) as count
      FROM courses
      ${role !== 'super_admin' ? 'WHERE teacher_id = ?' : ''}
      GROUP BY course_type
    `, params);

    // Grade distribution (from students)
    const [gradeDistribution] = await pool.query(`
      SELECT grade, COUNT(*) as count
      FROM students s
      ${role !== 'super_admin' ? `
        INNER JOIN course_enrollments ce ON s.id = ce.student_id
        INNER JOIN courses c ON ce.course_id = c.id
        WHERE c.teacher_id = ?
      ` : ''}
      GROUP BY grade
      ORDER BY grade
    `, params);

    // Monthly enrollment trend
    const [enrollmentTrend] = await pool.query(`
      SELECT
        DATE_FORMAT(enrollment_date, '%Y-%m') as month,
        COUNT(*) as count
      FROM course_enrollments
      WHERE enrollment_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ${role !== 'super_admin' ? 'AND course_id IN (SELECT id FROM courses WHERE teacher_id = ?)' : ''}
      GROUP BY DATE_FORMAT(enrollment_date, '%Y-%m')
      ORDER BY month
    `, params);

    // Top courses by enrollment
    const [topCourses] = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT ce.student_id) as student_count
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
      ${role !== 'super_admin' ? 'WHERE c.teacher_id = ?' : ''}
      GROUP BY c.id, c.name
      ORDER BY student_count DESC
      LIMIT 10
    `, params);

    return {
      courseTypes,
      gradeDistribution,
      enrollmentTrend,
      topCourses
    };
  }
}

module.exports = StatisticsService;
