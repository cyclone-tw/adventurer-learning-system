import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  getClassReport,
  getStudentReport,
  getQuestionAnalysis,
  dateRangeValidation,
} from '../controllers/reportController.js';

const router = Router();

// All routes require authentication and teacher/admin role
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

// GET /reports/dashboard - Get overall dashboard statistics
router.get('/dashboard', getDashboardStats);

// GET /reports/class/:classId - Get class report
router.get('/class/:classId', dateRangeValidation, getClassReport);

// GET /reports/student/:studentId - Get individual student report
router.get('/student/:studentId', dateRangeValidation, getStudentReport);

// GET /reports/questions - Get question analysis report
router.get('/questions', dateRangeValidation, getQuestionAnalysis);

export default router;
