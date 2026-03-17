/**
 * Authentication Controller
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const config = require('../config/database.config');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  static async login(ctx) {
    try {
      const { username, password } = ctx.request.body;

      if (!username || !password) {
        ctx.status = 400;
        ctx.body = Response.error('Username and password are required', 'VALIDATION_ERROR');
        return;
      }

      // Find user by username or email
      let user = await User.findByUsername(username);
      if (!user) {
        user = await User.findByEmail(username);
      }

      if (!user) {
        ctx.status = 401;
        ctx.body = Response.error('Invalid credentials', 'INVALID_CREDENTIALS');
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        ctx.status = 403;
        ctx.body = Response.error('Account is inactive', 'ACCOUNT_INACTIVE');
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        ctx.status = 401;
        ctx.body = Response.error('Invalid credentials', 'INVALID_CREDENTIALS');
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Create session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await User.createSession(
        user.id,
        token,
        ctx.ip,
        ctx.header['user-agent'],
        expiresAt
      );

      logger.info(`User logged in: ${user.username}`, { userId: user.id });

      ctx.body = Response.success({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar
        }
      }, 'Login successful');
    } catch (error) {
      logger.error('Login error', error);
      ctx.status = 500;
      ctx.body = Response.error('Login failed', 'LOGIN_ERROR');
    }
  }

  static async logout(ctx) {
    try {
      const token = ctx.header.authorization?.replace('Bearer ', '');

      if (token) {
        await User.removeSession(token);
      }

      logger.info(`User logged out`, { userId: ctx.state.user?.id });

      ctx.body = Response.success(null, 'Logout successful');
    } catch (error) {
      logger.error('Logout error', error);
      ctx.status = 500;
      ctx.body = Response.error('Logout failed', 'LOGOUT_ERROR');
    }
  }

  static async getMe(ctx) {
    try {
      const userId = ctx.state.user.id;
      const user = await User.findById(userId);

      if (!user) {
        ctx.status = 404;
        ctx.body = Response.error('User not found', 'USER_NOT_FOUND');
        return;
      }

      ctx.body = Response.success(user);
    } catch (error) {
      logger.error('Get user error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get user info', 'GET_USER_ERROR');
    }
  }
}

module.exports = AuthController;
