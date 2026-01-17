import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAvatar,
  getEquippableItems,
  equipItem,
  equipItemValidation,
  unequipItem,
  unequipItemValidation,
} from '../controllers/avatarController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /avatar - Get current avatar configuration
router.get('/', getAvatar);

// GET /avatar/items - Get all equippable items
router.get('/items', getEquippableItems);

// POST /avatar/equip/:playerItemId - Equip an item
router.post('/equip/:playerItemId', equipItemValidation, equipItem);

// POST /avatar/unequip/:playerItemId - Unequip an item
router.post('/unequip/:playerItemId', unequipItemValidation, unequipItem);

export default router;
