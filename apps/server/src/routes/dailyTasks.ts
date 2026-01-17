import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDailyTasks,
  claimTask,
  claimTaskValidation,
  claimAllTasks,
  seedDailyTasks,
} from '../controllers/dailyTaskController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /daily-tasks - Get daily tasks with progress
router.get('/', getDailyTasks);

// POST /daily-tasks/claim-all - Claim all completed task rewards
router.post('/claim-all', claimAllTasks);

// POST /daily-tasks/:taskId/claim - Claim single task reward
router.post('/:taskId/claim', claimTaskValidation, claimTask);

// POST /daily-tasks/seed - Seed default daily tasks (admin only)
router.post('/seed', authorize('admin'), seedDailyTasks);

export default router;
