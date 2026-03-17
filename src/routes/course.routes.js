/**
 * Course Routes
 */
const Router = require('koa-router');
const CourseController = require('../controllers/course.controller');

const router = new Router({ prefix: '/courses' });

router.get('/', CourseController.getAll);
router.get('/:id', CourseController.getById);
router.post('/', CourseController.create);
router.put('/:id', CourseController.update);
router.delete('/:id', CourseController.delete);
router.post('/:id/students', CourseController.addStudents);
router.delete('/:id/students/:studentId', CourseController.removeStudent);

module.exports = router;
