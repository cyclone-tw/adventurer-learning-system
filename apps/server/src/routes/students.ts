import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listStudents,
  listStudentsValidation,
  getStudent,
  getStudentValidation,
  getStudentAttempts,
  getStudentAttemptsValidation,
} from '../controllers/studentController.js';

const router = Router();

// All routes require authentication and teacher/admin role
router.use(authenticate, authorize('teacher', 'admin'));

// GET /students - List all students
router.get('/', listStudentsValidation, listStudents);

// GET /students/:studentId - Get student details
router.get('/:studentId', getStudentValidation, getStudent);

// GET /students/:studentId/attempts - Get student's attempt history
router.get('/:studentId/attempts', getStudentAttemptsValidation, getStudentAttempts);

export default router;
