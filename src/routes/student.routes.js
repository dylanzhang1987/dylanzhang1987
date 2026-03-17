/**
 * Student Routes
 */
const Router = require('koa-router');
const multer = require('@koa/multer');
const StudentController = require('../controllers/student.controller');
const config = require('../config/database.config');

const router = new Router({ prefix: '/students' });

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

router.get('/', StudentController.getAll);
router.get('/import/template', StudentController.getTemplate);
router.get('/:id', StudentController.getById);
router.post('/', StudentController.create);
router.post('/import', upload.single('file'), StudentController.importStudents);
router.put('/:id', StudentController.update);
router.delete('/:id', StudentController.delete);

module.exports = router;
