/**
 * Audit Log Model
 */
const pool = require('../config/db');

class AuditLog {
  static async findAll(options = {}) {
    const { userId, action, resourceType, resourceId, startDate, endDate, page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT al.*, u.name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }

    if (action) {
      query += ' AND al.action = ?';
      params.push(action);
    }

    if (resourceType) {
      query += ' AND al.resource_type = ?';
      params.push(resourceType);
    }

    if (resourceId) {
      query += ' AND al.resource_id = ?';
      params.push(resourceId);
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
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];

    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }

    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }

    if (resourceType) {
      countQuery += ' AND resource_type = ?';
      countParams.push(resourceType);
    }

    if (resourceId) {
      countQuery += ' AND resource_id = ?';
      countParams.push(resourceId);
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
      data: rows.map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null
      })),
      total: count[0].total,
      page,
      pageSize
    };
  }

  static async create(data) {
    const { user_id, action, resource_type, resource_id, details, ip_address, user_agent } = data;

    const [result] = await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        action,
        resource_type,
        resource_id,
        details ? JSON.stringify(details) : null,
        ip_address,
        user_agent
      ]
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT al.*, u.name as user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = ?`,
      [id]
    );
    const log = rows[0];
    if (log && log.details) {
      log.details = JSON.parse(log.details);
    }
    return log;
  }
}

module.exports = AuditLog;
