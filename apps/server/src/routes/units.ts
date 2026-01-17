import { Router } from 'express';
import {
  listUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitsGrouped,
  listUnitsValidation,
  createUnitValidation,
  updateUnitValidation,
} from '../controllers/unitController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes - list units (for students to see)
router.get('/', listUnitsValidation, listUnits);
router.get('/grouped', getUnitsGrouped);
router.get('/:id', getUnit);

// Protected routes - only teachers and admins can modify
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

router.post('/', createUnitValidation, createUnit);
router.patch('/:id', updateUnitValidation, updateUnit);
router.delete('/:id', deleteUnit);

export default router;
