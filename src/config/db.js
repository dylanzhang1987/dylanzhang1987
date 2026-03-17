/**
 * MySQL Database Connection Pool
 */
const mysql = require('mysql2/promise');
const config = require('./database.config');
const logger = require('../utils/logger');

// Create connection pool
const pool = mysql.createPool(config.mysql);

// Test connection
pool.getConnection()
  .then(connection => {
    logger.info('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    logger.error('Database connection failed', err.message);
  });

module.exports = pool;
