import { Router } from 'express';
import {
  listAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  createAcademicYearValidation,
  updateAcademicYearValidation,
} from '../controllers/academicYearController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes - list academic years
router.get('/', listAcademicYears);
router.get('/:id', getAcademicYear);

// Protected routes - only teachers and admins can modify
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

router.post('/', createAcademicYearValidation, createAcademicYear);
router.patch('/:id', updateAcademicYearValidation, updateAcademicYear);
router.delete('/:id', deleteAcademicYear);

export default router;
