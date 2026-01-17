import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listItems,
  createItem,
  createItemValidation,
  updateItem,
  updateItemValidation,
  deleteItem,
  seedItems,
} from '../controllers/itemController.js';

const router = Router();

// All routes require authentication and teacher/admin role
router.use(authenticate, authorize('teacher', 'admin'));

// GET /items - List all items
router.get('/', listItems);

// POST /items - Create item
router.post('/', createItemValidation, createItem);

// POST /items/seed - Seed default items
router.post('/seed', seedItems);

// PATCH /items/:itemId - Update item
router.patch('/:itemId', updateItemValidation, updateItem);

// DELETE /items/:itemId - Delete item
router.delete('/:itemId', deleteItem);

export default router;
