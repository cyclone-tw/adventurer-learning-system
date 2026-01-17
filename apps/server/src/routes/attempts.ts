import { Router } from 'express';
import {
  submitAnswer,
  getRandomQuestion,
  getAttemptHistory,
  getStudentStats,
  submitAnswerValidation,
  getRandomQuestionValidation,
} from '../controllers/attemptController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// All attempt routes require authentication
router.use(authenticate);

// Student-only routes
router.use(authorize('student'));

// GET /api/v1/attempts/question/random - Get random question
router.get('/question/random', getRandomQuestionValidation, getRandomQuestion);

// GET /api/v1/attempts/history - Get attempt history
router.get('/history', getAttemptHistory);

// GET /api/v1/attempts/stats - Get student stats
router.get('/stats', getStudentStats);

// POST /api/v1/attempts/:questionId - Submit answer
router.post('/:questionId', submitAnswerValidation, submitAnswer);

export default router;
