import { Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import PlayerItem from '../models/PlayerItem.js';
import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Helper to get active promotions and calculate discounted price
const getActivePromotions = async () => {
  const now = new Date();
  return Announcement.find({
    type: 'promotion',
    isActive: true,
    showInShop: true,
    $or: [
      { startDate: { $lte: now }, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: null, endDate: null },
    ],
  }).lean();
};

const calculateDiscountedPrice = (
  itemId: string,
  originalPrice: number,
  promotions: any[]
): { discountedPrice: number; discount: any | null } => {
  for (const promo of promotions) {
    if (!promo.discount) continue;

    // Check if this item is eligible for discount
    const itemIds = promo.discount.itemIds?.map((id: any) => id.toString()) || [];
    const appliesToAll = itemIds.length === 0;
    const appliesToItem = itemIds.includes(itemId);

    if (!appliesToAll && !appliesToItem) continue;

    // Calculate discounted price
    let discountedPrice = originalPrice;
    if (promo.discount.type === 'percentage') {
      discountedPrice = Math.floor(originalPrice * (100 - promo.discount.value) / 100);
    } else if (promo.discount.type === 'fixed') {
      discountedPrice = Math.max(1, originalPrice - promo.discount.value);
    }

    return {
      discountedPrice,
      discount: {
        promotionId: promo._id,
        promotionTitle: promo.title,
        type: promo.discount.type,
        value: promo.discount.value,
        originalPrice,
      },
    };
  }

  return { discountedPrice: originalPrice, discount: null };
};

// Validation rules
export const buyItemValidation = [
  param('itemId').isMongoId().withMessage('無效的道具 ID'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('購買數量必須介於 1-99'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /shop - Get all items available in shop
export const getShopItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    // Get all active items
    const items = await Item.find({ isActive: true })
      .sort({ order: 1, rarity: 1 })
      .lean();

    // Get active promotions
    const promotions = await getActivePromotions();

    // Get player's current gold
    const user = await User.findById(req.auth.userId).select('studentProfile.gold').lean();
    const playerGold = user?.studentProfile?.gold || 0;

    // Get player's current inventory to show owned quantities
    const playerItems = await PlayerItem.find({
      playerId: req.auth.userId,
    }).lean();

    const playerItemMap = new Map(
      playerItems.map((pi) => [pi.itemId.toString(), pi.quantity])
    );

    // Enrich items with ownership info and discount
    const enrichedItems = items.map((item) => {
      const { discountedPrice, discount } = calculateDiscountedPrice(
        item._id.toString(),
        item.price,
        promotions
      );
      return {
        ...item,
        originalPrice: item.price,
        price: discountedPrice,
        discount,
        owned: playerItemMap.get(item._id.toString()) || 0,
        canAfford: playerGold >= discountedPrice,
      };
    });

    // Get active shop promotions for display
    const activePromotions = promotions.map((p) => ({
      _id: p._id,
      title: p.title,
      content: p.content,
      icon: p.icon,
      endDate: p.endDate,
      discount: p.discount,
    }));

    sendSuccess(res, {
      items: enrichedItems,
      playerGold,
      promotions: activePromotions,
    });
  } catch (error) {
    next(error);
  }
};

// POST /shop/buy/:itemId - Buy an item
export const buyItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { itemId } = req.params;
    const quantity = Number(req.body.quantity) || 1;
    const playerId = req.auth.userId;

    // Get item
    const item = await Item.findOne({ _id: itemId, isActive: true });
    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Get active promotions and calculate discounted price
    const promotions = await getActivePromotions();
    const { discountedPrice, discount } = calculateDiscountedPrice(
      itemId,
      item.price,
      promotions
    );

    // Calculate total cost with discount
    const totalCost = discountedPrice * quantity;

    // Get player
    const user = await User.findById(playerId);
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到玩家資料', ErrorCodes.USER_NOT_FOUND);
    }

    // Check if player has enough gold
    if (user.studentProfile.gold < totalCost) {
      throw AppError.badRequest('金幣不足', ErrorCodes.VALIDATION_ERROR);
    }

    // Check max stack limit
    if (item.maxStack > 0) {
      const existingItem = await PlayerItem.findOne({ playerId, itemId });
      const currentQuantity = existingItem?.quantity || 0;

      if (currentQuantity + quantity > item.maxStack) {
        throw AppError.badRequest(
          `此道具最多只能持有 ${item.maxStack} 個`,
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct gold
      user.studentProfile.gold -= totalCost;
      await user.save({ session });

      // Add item to inventory
      await PlayerItem.findOneAndUpdate(
        { playerId, itemId },
        {
          $inc: { quantity },
          $setOnInsert: { acquiredAt: new Date() },
        },
        { upsert: true, new: true, session }
      );

      await session.commitTransaction();

      sendSuccess(res, {
        message: `成功購買 ${item.name} x${quantity}${discount ? ' (折扣價)' : ''}`,
        item: {
          _id: item._id,
          name: item.name,
          icon: item.icon,
          quantity,
        },
        cost: totalCost,
        originalCost: discount ? item.price * quantity : undefined,
        discount: discount ? {
          type: discount.type,
          value: discount.value,
          saved: (item.price - discountedPrice) * quantity,
        } : undefined,
        remainingGold: user.studentProfile.gold,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    next(error);
  }
};
