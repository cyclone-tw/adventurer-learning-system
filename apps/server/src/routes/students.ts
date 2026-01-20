import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listStudents,
  listStudentsValidation,
  getStudent,
  getStudentValidation,
  getStudentAttempts,
  getStudentAttemptsValidation,
  updateStudent,
  updateStudentValidation,
} from '../controllers/studentController.js';

const router = Router();

// All routes require authentication and teacher/admin role
router.use(authenticate, authorize('teacher', 'admin'));

// GET /students - List all students
router.get('/', listStudentsValidation, listStudents);

// GET /students/:studentId - Get student details
router.get('/:studentId', getStudentValidation, getStudent);

// PATCH /students/:studentId - Update student info
router.patch('/:studentId', updateStudentValidation, updateStudent);

// GET /students/:studentId/attempts - Get student's attempt history
router.get('/:studentId/attempts', getStudentAttemptsValidation, getStudentAttempts);

export default router;
