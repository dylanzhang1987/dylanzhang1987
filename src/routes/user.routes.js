/**
 * User Routes
 */
const Router = require('koa-router');
const UserController = require('../controllers/user.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = new Router({ prefix: '/users' });

// All user routes require super admin role
router.use(roleMiddleware(['super_admin']));

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);
router.put('/:id/password', UserController.resetPassword);

module.exports = router;
