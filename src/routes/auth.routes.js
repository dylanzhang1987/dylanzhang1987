/**
 * Authentication Routes
 */
const Router = require('koa-router');
const AuthController = require('../controllers/auth.controller');

const router = new Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getMe);

module.exports = router;
