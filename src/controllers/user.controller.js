/**
 * User Controller
 */
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Response = require('../utils/response');
const logger = require('../utils/logger');

class UserController {
  static async getAll(ctx) {
    try {
      const { role, page, pageSize, search } = ctx.query;
      const result = await User.findAll({ role, page, pageSize, search });

      ctx.body = Response.paginated(
        result.data,
        parseInt(page) || 1,
        parseInt(pageSize) || 10,
        result.total
      );
    } catch (error) {
      logger.error('Get users error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get users', 'GET_USERS_ERROR');
    }
  }

  static async getById(ctx) {
    try {
      const { id } = ctx.params;
      const user = await User.findById(id);

      if (!user) {
        ctx.status = 404;
        ctx.body = Response.error('User not found', 'USER_NOT_FOUND');
        return;
      }

      ctx.body = Response.success(user);
    } catch (error) {
      logger.error('Get user error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to get user', 'GET_USER_ERROR');
    }
  }

  static async create(ctx) {
    try {
      const data = ctx.request.body;

      // Validate required fields
      if (!data.username || !data.email || !data.password || !data.name) {
        ctx.status = 400;
        ctx.body = Response.error('Missing required fields', 'VALIDATION_ERROR');
        return;
      }

      // Check if username exists
      const existingUsername = await User.findByUsername(data.username);
      if (existingUsername) {
        ctx.status = 400;
        ctx.body = Response.error('Username already exists', 'USERNAME_EXISTS');
        return;
      }

      // Check if email exists
      const existingEmail = await User.findByEmail(data.email);
      if (existingEmail) {
        ctx.status = 400;
        ctx.body = Response.error('Email already exists', 'EMAIL_EXISTS');
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await User.create({
        ...data,
        password: hashedPassword
      });

      logger.info(`User created: ${user.username}`, { userId: user.id });

      ctx.body = Response.success(user, 'User created successfully');
    } catch (error) {
      logger.error('Create user error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to create user', 'CREATE_USER_ERROR');
    }
  }

  static async update(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;

      // Check if user exists
      const existing = await User.findById(id);
      if (!existing) {
        ctx.status = 404;
        ctx.body = Response.error('User not found', 'USER_NOT_FOUND');
        return;
      }

      // Check username uniqueness if changed
      if (data.username && data.username !== existing.username) {
        const existingUsername = await User.findByUsername(data.username);
        if (existingUsername) {
          ctx.status = 400;
          ctx.body = Response.error('Username already exists', 'USERNAME_EXISTS');
          return;
        }
      }

      // Check email uniqueness if changed
      if (data.email && data.email !== existing.email) {
        const existingEmail = await User.findByEmail(data.email);
        if (existingEmail) {
          ctx.status = 400;
          ctx.body = Response.error('Email already exists', 'EMAIL_EXISTS');
          return;
        }
      }

      const user = await User.update(id, data);

      logger.info(`User updated: ${user.username}`, { userId: user.id });

      ctx.body = Response.success(user, 'User updated successfully');
    } catch (error) {
      logger.error('Update user error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to update user', 'UPDATE_USER_ERROR');
    }
  }

  static async delete(ctx) {
    try {
      const { id } = ctx.params;

      // Prevent deleting self
      if (id == ctx.state.user.id) {
        ctx.status = 400;
        ctx.body = Response.error('Cannot delete your own account', 'CANNOT_DELETE_SELF');
        return;
      }

      const result = await User.delete(id);

      if (!result) {
        ctx.status = 404;
        ctx.body = Response.error('User not found', 'USER_NOT_FOUND');
        return;
      }

      logger.info(`User deleted`, { userId: id });

      ctx.body = Response.success(null, 'User deleted successfully');
    } catch (error) {
      logger.error('Delete user error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to delete user', 'DELETE_USER_ERROR');
    }
  }

  static async resetPassword(ctx) {
    try {
      const { id } = ctx.params;
      const { password } = ctx.request.body;

      if (!password || password.length < 6) {
        ctx.status = 400;
        ctx.body = Response.error('Password must be at least 6 characters', 'VALIDATION_ERROR');
        return;
      }

      const user = await User.findById(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = Response.error('User not found', 'USER_NOT_FOUND');
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await User.updatePassword(id, hashedPassword);

      logger.info(`Password reset for user`, { userId: id });

      ctx.body = Response.success(null, 'Password reset successfully');
    } catch (error) {
      logger.error('Reset password error', error);
      ctx.status = 500;
      ctx.body = Response.error('Failed to reset password', 'RESET_PASSWORD_ERROR');
    }
  }
}

module.exports = UserController;
