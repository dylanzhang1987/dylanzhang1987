/**
 * User Model
 */
const pool = require('../config/db');

class User {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, email, name, role, phone, avatar, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  static async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  static async findAll(options = {}) {
    const { role, page = 1, pageSize = 10, search } = options;
    const offset = (page - 1) * pageSize;

    let query = 'SELECT id, username, email, name, role, phone, avatar, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    if (search) {
      countQuery += ' AND (name LIKE ? OR email LIKE ? OR username LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
    const { username, email, password, name, role, phone, avatar } = data;

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, name, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, password, name, role || 'teacher', phone, avatar]
    );

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const { username, email, name, role, phone, avatar, is_active } = data;
    const fields = [];
    const params = [];

    if (username !== undefined) {
      fields.push('username = ?');
      params.push(username);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      params.push(email);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (role !== undefined) {
      fields.push('role = ?');
      params.push(role);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      params.push(phone);
    }
    if (avatar !== undefined) {
      fields.push('avatar = ?');
      params.push(avatar);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(is_active);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }

  static async updatePassword(id, password) {
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [password, id]
    );
    return this.findById(id);
  }

  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async createSession(userId, token, ipAddress, userAgent, expiresAt) {
    const [result] = await pool.query(
      'INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [userId, token, ipAddress, userAgent, expiresAt]
    );
    return result.insertId;
  }

  static async removeSession(token) {
    const [result] = await pool.query(
      'DELETE FROM user_sessions WHERE token = ?',
      [token]
    );
    return result.affectedRows > 0;
  }

  static async removeAllSessions(userId) {
    const [result] = await pool.query(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows;
  }
}

module.exports = User;
