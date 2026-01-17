import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getSubjectsWithCounts,
  createCategoryValidation,
  updateCategoryValidation,
  listCategoriesValidation,
} from '../controllers/categoriesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /categories/subjects - Get all subjects with category and question counts
router.get('/subjects', authenticate, getSubjectsWithCounts);

// GET /categories - List categories (optionally filtered by subject)
router.get('/', authenticate, listCategoriesValidation, listCategories);

// GET /categories/:id - Get single category
router.get('/:id', authenticate, getCategory);

// POST /categories - Create new category (teachers only)
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  createCategoryValidation,
  createCategory
);

// PUT /categories/:id - Update category (teachers only)
router.put(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  updateCategoryValidation,
  updateCategory
);

// DELETE /categories/:id - Delete category (teachers only)
router.delete(
  '/:id',
  authenticate,
  authorize('teacher', 'admin'),
  deleteCategory
);

export default router;
