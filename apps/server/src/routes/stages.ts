import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listStages,
  listStagesForStudent,
  getStage,
  createStage,
  updateStage,
  deleteStage,
  getStageQuestion,
  startStageSession,
  completeStageSession,
  createStageValidation,
  updateStageValidation,
  listStagesValidation,
} from '../controllers/stageController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student routes (must be before /:id routes)
router.get('/student', listStagesForStudent);

// Teacher/Admin routes
router.get('/', authorize('teacher', 'admin'), listStagesValidation, listStages);
router.post('/', authorize('teacher', 'admin'), createStageValidation, createStage);
router.get('/:id', getStage);
router.put('/:id', authorize('teacher', 'admin'), updateStageValidation, updateStage);
router.delete('/:id', authorize('teacher', 'admin'), deleteStage);

// Gameplay routes (for students)
router.get('/:id/question', getStageQuestion);
router.post('/:id/start', startStageSession);
router.post('/:id/complete', completeStageSession);

export default router;
