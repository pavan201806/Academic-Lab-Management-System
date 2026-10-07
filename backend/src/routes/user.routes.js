const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize, requirePasswordChangeCompleted } = require('../middleware/auth');
const {
  validateObjectIdParam,
  validateCreateTeacherInput,
  validateCreateStudentInput
} = require('../validators');

// All user management routes require authentication, completed password change, and ADMIN_HOD role
router.use(authenticate);
router.use(requirePasswordChangeCompleted);

// Read-only user queries (Admin / Teachers for directory purposes)
router.get('/', authorize('ADMIN_HOD', 'TEACHER'), userController.getUsers);
router.get('/:id', authorize('ADMIN_HOD', 'TEACHER'), validateObjectIdParam('id'), userController.getUserById);

const { excelUpload, handleExcelUploadError } = require('../middleware/upload');

// Admin-only bulk student enrollment
router.post(
  '/bulk-import/preview',
  authorize('ADMIN_HOD'),
  excelUpload.single('file'),
  handleExcelUploadError,
  userController.previewBulkImport
);
router.post(
  '/bulk-import',
  authorize('ADMIN_HOD'),
  excelUpload.single('file'),
  handleExcelUploadError,
  userController.executeBulkImport
);
router.post(
  '/students/bulk-preview',
  authorize('ADMIN_HOD'),
  excelUpload.single('file'),
  handleExcelUploadError,
  userController.previewBulkImport
);
router.post(
  '/students/bulk-import',
  authorize('ADMIN_HOD'),
  excelUpload.single('file'),
  handleExcelUploadError,
  userController.executeBulkImport
);

// Admin-only bulk student deletion
router.post('/bulk-delete/preview', authorize('ADMIN_HOD'), userController.previewBulkDeleteStudents);
router.post('/students/bulk-delete/preview', authorize('ADMIN_HOD'), userController.previewBulkDeleteStudents);
router.post('/bulk-delete', authorize('ADMIN_HOD'), userController.bulkDeleteStudents);
router.post('/students/bulk-delete', authorize('ADMIN_HOD'), userController.bulkDeleteStudents);
router.delete('/bulk', authorize('ADMIN_HOD'), userController.bulkDeleteStudents);
router.delete('/students/bulk', authorize('ADMIN_HOD'), userController.bulkDeleteStudents);

// Admin-only write operations
router.post('/teachers', authorize('ADMIN_HOD'), validateCreateTeacherInput, userController.createTeacher);
router.post('/teacher', authorize('ADMIN_HOD'), validateCreateTeacherInput, userController.createTeacher);
router.post('/students', authorize('ADMIN_HOD'), validateCreateStudentInput, userController.createStudent);
router.post('/student', authorize('ADMIN_HOD'), validateCreateStudentInput, userController.createStudent);
router.put('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.updateUser);
router.patch('/:id/reset-password', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.resetPassword);
router.patch('/:id/status', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.toggleActive);
router.delete('/students/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.deleteStudent);
router.delete('/student/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.deleteStudent);
router.delete('/teachers/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.deleteTeacher);
router.delete('/teacher/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.deleteTeacher);
router.delete('/:id', authorize('ADMIN_HOD'), validateObjectIdParam('id'), userController.deleteUser);

module.exports = router;

