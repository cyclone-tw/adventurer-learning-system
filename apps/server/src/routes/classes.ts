import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listClasses,
  listClassesValidation,
  getClass,
  createClass,
  createClassValidation,
  updateClass,
  updateClassValidation,
  deleteClass,
  regenerateInviteCode,
  joinClass,
  joinClassValidation,
  removeStudent,
  manageStudentValidation,
  getMyClasses,
  leaveClass,
  addStudents,
  addStudentsValidation,
} from '../controllers/classController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student routes
// GET /classes/my - Get student's joined classes
router.get('/my', getMyClasses);

// POST /classes/join - Join class with invite code
router.post('/join', joinClassValidation, joinClass);

// POST /classes/:classId/leave - Leave class
router.post('/:classId/leave', leaveClass);

// Teacher routes (require teacher or admin role)
// GET /classes - List teacher's classes
router.get('/', authorize('teacher', 'admin'), listClassesValidation, listClasses);

// GET /classes/:classId - Get class details
router.get('/:classId', authorize('teacher', 'admin'), getClass);

// POST /classes - Create new class
router.post('/', authorize('teacher', 'admin'), createClassValidation, createClass);

// PATCH /classes/:classId - Update class
router.patch('/:classId', authorize('teacher', 'admin'), updateClassValidation, updateClass);

// DELETE /classes/:classId - Delete class
router.delete('/:classId', authorize('teacher', 'admin'), deleteClass);

// POST /classes/:classId/regenerate-code - Regenerate invite code
router.post('/:classId/regenerate-code', authorize('teacher', 'admin'), regenerateInviteCode);

// POST /classes/:classId/students - Add multiple students to class (batch)
router.post(
  '/:classId/students',
  authorize('teacher', 'admin'),
  addStudentsValidation,
  addStudents
);

// DELETE /classes/:classId/students/:studentId - Remove student from class
router.delete(
  '/:classId/students/:studentId',
  authorize('teacher', 'admin'),
  manageStudentValidation,
  removeStudent
);

export default router;
