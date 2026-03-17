/**
 * Attendance Routes
 */
const Router = require('koa-router');
const AttendanceController = require('../controllers/attendance.controller');

const router = new Router({ prefix: '/attendance' });

router.get('/', AttendanceController.getAll);
router.get('/course/:courseId', AttendanceController.getByCourse);
router.post('/', AttendanceController.create);
router.post('/batch', AttendanceController.batchCreate);
router.put('/:id', AttendanceController.update);
router.delete('/:id', AttendanceController.delete);

module.exports = router;
