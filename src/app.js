/**
 * Koa Application Entry Point
 */
const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const json = require('koa-json');
const serve = require('koa-static');
const jwt = require('koa-jwt');
const path = require('path');

const config = require('./config/database.config');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const courseRoutes = require('./routes/course.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const statisticsRoutes = require('./routes/statistics.routes');
const auditRoutes = require('./routes/audit.routes');

// Import error handler middleware
const errorHandler = require('./middlewares/error.middleware');
const auditLogMiddleware = require('./middlewares/audit.middleware');
const accessLogMiddleware = require('./middlewares/access.middleware');

const app = new Koa();
const router = new Router();
const apiRouter = new Router({ prefix: '/api' });

// Static files
app.use(serve(path.join(__dirname, '../uploads')));

// Error handling
app.use(errorHandler);

// Access logging
app.use(accessLogMiddleware);

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

// Body parser
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb'
}));

// Pretty JSON response
app.use(json());

// Public routes (no authentication required)
apiRouter.use('/auth', authRoutes.routes());

// Protected routes (require JWT authentication)
apiRouter.use(
  jwt({ secret: config.jwt.secret, key: 'user' })
  .unless({ path: [/^\/api\/auth/] })
);

// Audit logging for protected routes
app.use(auditLogMiddleware);

// API Routes
apiRouter.use('/users', userRoutes.routes());
apiRouter.use('/students', studentRoutes.routes());
apiRouter.use('/courses', courseRoutes.routes());
apiRouter.use('/attendance', attendanceRoutes.routes());
apiRouter.use('/statistics', statisticsRoutes.routes());
apiRouter.use('/audit-logs', auditRoutes.routes());

// Health check
router.get('/health', ctx => {
  ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
});

// Mount API router
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Mount root router
app.use(router.routes());
app.use(router.allowedMethods());

// 404 handler
app.use(async ctx => {
  ctx.status = 404;
  ctx.body = { error: 'Not Found', message: 'The requested resource was not found' };
});

const PORT = config.port || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Database: ${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`);
});

module.exports = app;
