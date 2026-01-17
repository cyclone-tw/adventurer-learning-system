import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getInventory,
  useItem,
  useItemValidation,
  getActiveEffects,
  useQuizItem,
  useQuizItemValidation,
  getQuizItems,
  equipItem,
  equipItemValidation,
  unequipItem,
  unequipSlotValidation,
  getEquippedItems,
} from '../controllers/inventoryController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /inventory - Get player's inventory
router.get('/', getInventory);

// GET /inventory/effects - Get active effects
router.get('/effects', getActiveEffects);

// GET /inventory/quiz-items - Get quiz-usable items and active effects
router.get('/quiz-items', getQuizItems);

// GET /inventory/equipped - Get equipped items with details
router.get('/equipped', getEquippedItems);

// POST /inventory/use/:itemId - Use an item (duration-based effects)
router.post('/use/:itemId', useItemValidation, useItem);

// POST /inventory/quiz-use/:itemId/:questionId - Use hint/skip item during quiz
router.post('/quiz-use/:itemId/:questionId', useQuizItemValidation, useQuizItem);

// POST /inventory/equip/:itemId - Equip a cosmetic item
router.post('/equip/:itemId', equipItemValidation, equipItem);

// POST /inventory/unequip/:slot - Unequip an item from a slot
router.post('/unequip/:slot', unequipSlotValidation, unequipItem);

export default router;
