import { Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import Item from '../models/Item.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const createItemValidation = [
  body('name').notEmpty().trim().withMessage('請提供道具名稱'),
  body('description').notEmpty().trim().withMessage('請提供道具描述'),
  body('type').isIn(['consumable', 'equipment', 'cosmetic']).withMessage('無效的道具類型'),
  body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('無效的稀有度'),
  body('icon').notEmpty().withMessage('請提供道具圖示'),
  body('price').isInt({ min: 0 }).withMessage('價格必須為非負整數'),
  body('effects').optional().isArray(),
  body('maxStack').optional().isInt({ min: 0 }).withMessage('最大堆疊數必須為非負整數'),
];

export const updateItemValidation = [
  param('itemId').isMongoId().withMessage('無效的道具 ID'),
  body('name').optional().trim(),
  body('description').optional().trim(),
  body('type').optional().isIn(['consumable', 'equipment', 'cosmetic']).withMessage('無效的道具類型'),
  body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('無效的稀有度'),
  body('price').optional().isInt({ min: 0 }).withMessage('價格必須為非負整數'),
  body('isActive').optional().isBoolean(),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /items - List all items (admin)
export const listItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const items = await Item.find().sort({ order: 1, createdAt: -1 }).lean();
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
};

// POST /items - Create item (admin)
export const createItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { name, description, type, rarity, icon, price, effects, maxStack, order } = req.body;

    const item = await Item.create({
      name,
      description,
      type,
      rarity: rarity || 'common',
      icon,
      price,
      effects: effects || [],
      maxStack: maxStack ?? 99,
      order: order ?? 0,
    });

    sendSuccess(res, item, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /items/:itemId - Update item (admin)
export const updateItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { itemId } = req.params;
    const updates = req.body;

    const item = await Item.findByIdAndUpdate(
      itemId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
};

// DELETE /items/:itemId - Delete item (admin)
export const deleteItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { itemId } = req.params;

    const item = await Item.findByIdAndDelete(itemId);
    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, { message: '道具已刪除' });
  } catch (error) {
    next(error);
  }
};

// POST /items/seed - Seed default items (admin)
export const seedItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if items already exist
    const existingCount = await Item.countDocuments();
    if (existingCount > 0) {
      throw AppError.badRequest('已有道具存在，無法重新初始化', ErrorCodes.VALIDATION_ERROR);
    }

    // Default items
    const defaultItems = [
      {
        name: '經驗加倍藥水',
        description: '使用後 30 分鐘內獲得的經驗值加倍',
        type: 'consumable',
        rarity: 'rare',
        icon: '🧪',
        price: 100,
        effects: [{ type: 'exp_boost', value: 2, duration: 30 }],
        maxStack: 10,
        order: 1,
      },
      {
        name: '金幣加倍藥水',
        description: '使用後 30 分鐘內獲得的金幣加倍',
        type: 'consumable',
        rarity: 'rare',
        icon: '💎',
        price: 100,
        effects: [{ type: 'gold_boost', value: 2, duration: 30 }],
        maxStack: 10,
        order: 2,
      },
      {
        name: '護盾藥水',
        description: '使用後答錯題目不會扣除連續答對紀錄',
        type: 'consumable',
        rarity: 'epic',
        icon: '🛡️',
        price: 150,
        effects: [{ type: 'shield', value: 1, duration: 30 }],
        maxStack: 5,
        order: 3,
      },
      {
        name: '小型經驗石',
        description: '立即獲得 50 經驗值',
        type: 'consumable',
        rarity: 'common',
        icon: '💠',
        price: 30,
        effects: [],
        maxStack: 99,
        order: 4,
      },
      {
        name: '中型經驗石',
        description: '立即獲得 150 經驗值',
        type: 'consumable',
        rarity: 'rare',
        icon: '💎',
        price: 80,
        effects: [],
        maxStack: 50,
        order: 5,
      },
      {
        name: '幸運草',
        description: '增加獲得稀有道具的機率（尚未實裝）',
        type: 'consumable',
        rarity: 'epic',
        icon: '🍀',
        price: 200,
        effects: [],
        maxStack: 5,
        order: 6,
      },
      {
        name: '勇者徽章',
        description: '連續答對 10 題的象徵',
        type: 'cosmetic',
        rarity: 'rare',
        icon: '🏅',
        price: 500,
        effects: [],
        maxStack: 1,
        order: 10,
      },
      {
        name: '智者之冠',
        description: '展示你的學習成就',
        type: 'cosmetic',
        rarity: 'legendary',
        icon: '👑',
        price: 2000,
        effects: [],
        maxStack: 1,
        order: 11,
      },
    ];

    await Item.insertMany(defaultItems);

    sendSuccess(res, { message: `已建立 ${defaultItems.length} 個預設道具` }, 201);
  } catch (error) {
    next(error);
  }
};
