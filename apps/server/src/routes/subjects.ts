import { Router } from 'express';
import {
  listSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  createSubjectValidation,
  updateSubjectValidation,
} from '../controllers/subjectController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes - list subjects (for students to see)
router.get('/', listSubjects);
router.get('/:id', getSubject);

// Protected routes - only teachers and admins can modify
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

router.post('/', createSubjectValidation, createSubject);
router.patch('/:id', updateSubjectValidation, updateSubject);
router.delete('/:id', deleteSubject);

export default router;
