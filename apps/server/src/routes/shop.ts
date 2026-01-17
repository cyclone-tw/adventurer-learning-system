import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getShopItems,
  buyItem,
  buyItemValidation,
} from '../controllers/shopController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /shop - Get all shop items
router.get('/', getShopItems);

// POST /shop/buy/:itemId - Buy an item
router.post('/buy/:itemId', buyItemValidation, buyItem);

export default router;
