/**
 * Statistics Routes
 */
const Router = require('koa-router');
const StatisticsController = require('../controllers/statistics.controller');

const router = new Router({ prefix: '/statistics' });

router.get('/overview', StatisticsController.getOverview);
router.get('/overall', StatisticsController.getOverallStatistics);
router.get('/course/:id', StatisticsController.getCourseStatistics);
router.get('/student/:id', StatisticsController.getStudentStatistics);

module.exports = router;
