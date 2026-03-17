/**
 * Audit and Access Log Routes
 */
const Router = require('koa-router');
const AuditController = require('../controllers/audit.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = new Router({ prefix: '/audit-logs' });

// All audit routes require super admin role
router.use(roleMiddleware(['super_admin']));

router.get('/', AuditController.getAuditLogs);
router.get('/access', AuditController.getAccessLogs);
router.get('/access/stats', AuditController.getAccessStats);

module.exports = router;
