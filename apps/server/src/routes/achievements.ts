import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAchievements,
  getNewAchievements,
  markAchievementSeen,
  markAchievementSeenValidation,
  markAllAchievementsSeen,
  seedAchievements,
} from '../controllers/achievementController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /achievements - Get all achievements with player progress
router.get('/', getAchievements);

// GET /achievements/new - Get newly unlocked achievements
router.get('/new', getNewAchievements);

// POST /achievements/:achievementId/seen - Mark achievement as seen
router.post('/:achievementId/seen', markAchievementSeenValidation, markAchievementSeen);

// POST /achievements/mark-all-seen - Mark all achievements as seen
router.post('/mark-all-seen', markAllAchievementsSeen);

// POST /achievements/seed - Seed default achievements (admin only)
router.post('/seed', authorize('admin'), seedAchievements);

export default router;
