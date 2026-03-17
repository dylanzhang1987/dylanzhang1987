/**
 * Access Log Model
 */
const pool = require('../config/db');

class AccessLog {
  static async findAll(options = {}) {
    const { userId, path, method, statusCode, startDate, endDate, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT al.*, u.name as user_name
      FROM access_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }

    if (path) {
      query += ' AND al.path LIKE ?';
      params.push(`%${path}%`);
    }

    if (method) {
      query += ' AND al.method = ?';
      params.push(method);
    }

    if (statusCode) {
      query += ' AND al.status_code = ?';
      params.push(statusCode);
    }

    if (startDate) {
      query += ' AND al.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND al.created_at <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM access_logs WHERE 1=1';
    const countParams = [];

    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }

    if (path) {
      countQuery += ' AND path LIKE ?';
      countParams.push(`%${path}%`);
    }

    if (method) {
      countQuery += ' AND method = ?';
      countParams.push(method);
    }

    if (statusCode) {
      countQuery += ' AND status_code = ?';
      countParams.push(statusCode);
    }

    if (startDate) {
      countQuery += ' AND created_at >= ?';
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ' AND created_at <= ?';
      countParams.push(endDate);
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
    const { user_id, path, method, status_code, ip_address, user_agent, response_time } = data;

    await pool.query(
      `INSERT INTO access_logs (user_id, path, method, status_code, ip_address, user_agent, response_time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, path, method, status_code, ip_address, user_agent, response_time]
    );
  }

  static async getStats(options = {}) {
    const { startDate, endDate } = options;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    // Get request count by user
    const [byUser] = await pool.query(
      `SELECT u.id, u.name, COUNT(*) as count
       FROM access_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       GROUP BY u.id, u.name
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get request count by path
    const [byPath] = await pool.query(
      `SELECT path, COUNT(*) as count
       FROM access_logs
       ${whereClause}
       GROUP BY path
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get request count by method
    const [byMethod] = await pool.query(
      `SELECT method, COUNT(*) as count
       FROM access_logs
       ${whereClause}
       GROUP BY method
       ORDER BY count DESC`,
      params
    );

    // Get total requests and error rate
    const [total] = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors,
         AVG(response_time) as avg_response_time
       FROM access_logs
       ${whereClause}`,
      params
    );

    return {
      total: total[0].total,
      errors: total[0].errors,
      errorRate: total[0].total > 0 ? (total[0].errors / total[0].total * 100).toFixed(2) : 0,
      avgResponseTime: total[0].avg_response_time ? total[0].avg_response_time.toFixed(2) : 0,
      byUser,
      byPath,
      byMethod
    };
  }
}

module.exports = AccessLog;
