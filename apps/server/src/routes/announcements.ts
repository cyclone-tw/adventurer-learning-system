import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listAnnouncements,
  getActiveAnnouncements,
  getActivePromotions,
  getAnnouncement,
  createAnnouncement,
  createAnnouncementValidation,
  updateAnnouncement,
  updateAnnouncementValidation,
  deleteAnnouncement,
} from '../controllers/announcementController.js';

const router = Router();

// Public routes (for students)
router.get('/active', authenticate, getActiveAnnouncements);
router.get('/promotions/active', authenticate, getActivePromotions);

// Teacher/Admin routes
router.get('/', authenticate, authorize('teacher', 'admin'), listAnnouncements);
router.get('/:id', authenticate, authorize('teacher', 'admin'), getAnnouncement);
router.post('/', authenticate, authorize('teacher', 'admin'), createAnnouncementValidation, createAnnouncement);
router.patch('/:id', authenticate, authorize('teacher', 'admin'), updateAnnouncementValidation, updateAnnouncement);
router.delete('/:id', authenticate, authorize('teacher', 'admin'), deleteAnnouncement);

export default router;
