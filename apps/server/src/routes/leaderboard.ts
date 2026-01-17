import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getLeaderboard,
  getLeaderboardValidation,
  getMyRanks,
} from '../controllers/leaderboardController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /leaderboard - Get leaderboard
router.get('/', getLeaderboardValidation, getLeaderboard);

// GET /leaderboard/my-rank - Get current user's ranks
router.get('/my-rank', getMyRanks);

export default router;
