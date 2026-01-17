import { Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import PlayerItem from '../models/PlayerItem.js';
import User from '../models/User.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Valid equipment slots
const VALID_SLOTS = ['title', 'head', 'body', 'accessory', 'background', 'effect'] as const;
type EquipmentSlot = typeof VALID_SLOTS[number];

// Validation rules
export const equipItemValidation = [
  param('playerItemId').isMongoId().withMessage('無效的道具 ID'),
];

export const unequipItemValidation = [
  param('playerItemId').isMongoId().withMessage('無效的道具 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /avatar - Get current avatar configuration
export const getAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get user with equipped items
    const user = await User.findById(playerId).lean();
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const equippedItems = user.studentProfile.equippedItems || {};

    // Build avatar config with item details
    const avatar: Record<string, unknown> = {};

    for (const slot of VALID_SLOTS) {
      const itemId = equippedItems[slot];
      if (itemId) {
        const item = await Item.findById(itemId).lean();
        if (item) {
          // Find the player item to get playerItemId
          const playerItem = await PlayerItem.findOne({
            playerId,
            itemId: item._id,
          }).lean();

          avatar[slot] = {
            playerItemId: playerItem?._id?.toString() || '',
            item: {
              _id: item._id,
              name: item.name,
              icon: item.icon,
              imageUrl: item.imageUrl,
              slot: item.slot,
              rarity: item.rarity,
            },
          };
        }
      } else {
        avatar[slot] = null;
      }
    }

    sendSuccess(res, { avatar });
  } catch (error) {
    next(error);
  }
};

// GET /avatar/items - Get all equippable items
export const getEquippableItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get user equipped items
    const user = await User.findById(playerId).lean();
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const equippedItemIds = user.studentProfile.equippedItems || {};

    // Get player's cosmetic/equipment items
    const playerItems = await PlayerItem.find({ playerId, quantity: { $gt: 0 } })
      .populate('itemId')
      .lean();

    const items: unknown[] = [];
    const bySlot: Record<string, unknown[]> = {};

    // Initialize bySlot
    for (const slot of VALID_SLOTS) {
      bySlot[slot] = [];
    }

    for (const pi of playerItems) {
      const item = pi.itemId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        description: string;
        type: string;
        rarity: string;
        slot?: string;
        icon: string;
        imageUrl?: string;
      };

      if (!item || (item.type !== 'cosmetic' && item.type !== 'equipment') || !item.slot) {
        continue;
      }

      const isEquipped = equippedItemIds[item.slot as EquipmentSlot]?.toString() === item._id.toString();

      const equippableItem = {
        playerItemId: pi._id.toString(),
        isEquipped,
        equippedAt: isEquipped ? new Date().toISOString() : undefined,
        item: {
          _id: item._id,
          name: item.name,
          description: item.description,
          type: item.type,
          rarity: item.rarity,
          slot: item.slot,
          icon: item.icon,
          imageUrl: item.imageUrl,
        },
      };

      items.push(equippableItem);
      if (bySlot[item.slot]) {
        bySlot[item.slot].push(equippableItem);
      }
    }

    sendSuccess(res, { items, bySlot });
  } catch (error) {
    next(error);
  }
};

// POST /avatar/equip/:playerItemId - Equip an item
export const equipItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { playerItemId } = req.params;
    const playerId = req.auth.userId;

    // Get player item with item details
    const playerItem = await PlayerItem.findOne({
      _id: playerItemId,
      playerId,
    }).populate('itemId');

    if (!playerItem) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const item = playerItem.itemId as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      type: string;
      slot?: string;
      icon: string;
      imageUrl?: string;
      rarity: string;
    };

    // Check if item is equippable
    if (item.type !== 'cosmetic' && item.type !== 'equipment') {
      throw AppError.badRequest('此道具無法裝備', ErrorCodes.VALIDATION_ERROR);
    }

    if (!item.slot) {
      throw AppError.badRequest('此道具沒有裝備欄位', ErrorCodes.VALIDATION_ERROR);
    }

    // Get user and update equipped items
    const user = await User.findById(playerId);
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Initialize equippedItems if not exists
    if (!user.studentProfile.equippedItems) {
      user.studentProfile.equippedItems = {};
    }

    // Equip the item
    const slot = item.slot as EquipmentSlot;
    user.studentProfile.equippedItems[slot] = item._id;
    await user.save();

    sendSuccess(res, {
      message: `成功裝備 ${item.name}`,
      equipped: {
        playerItemId: playerItem._id.toString(),
        slot,
        item: {
          _id: item._id,
          name: item.name,
          icon: item.icon,
          imageUrl: item.imageUrl,
          rarity: item.rarity,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /avatar/unequip/:playerItemId - Unequip an item
export const unequipItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { playerItemId } = req.params;
    const playerId = req.auth.userId;

    // Get player item with item details
    const playerItem = await PlayerItem.findOne({
      _id: playerItemId,
      playerId,
    }).populate('itemId');

    if (!playerItem) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const item = playerItem.itemId as unknown as {
      _id: mongoose.Types.ObjectId;
      slot?: string;
    };

    if (!item.slot) {
      throw AppError.badRequest('此道具沒有裝備欄位', ErrorCodes.VALIDATION_ERROR);
    }

    // Get user
    const user = await User.findById(playerId);
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const slot = item.slot as EquipmentSlot;

    // Check if this item is actually equipped
    const equippedItems = user.studentProfile.equippedItems;
    if (!equippedItems || equippedItems[slot]?.toString() !== item._id.toString()) {
      throw AppError.badRequest('此道具未裝備', ErrorCodes.VALIDATION_ERROR);
    }

    // Unequip the item
    equippedItems[slot] = undefined;
    await user.save();

    sendSuccess(res, {
      message: '成功卸下裝備',
      unequipped: {
        playerItemId: playerItem._id.toString(),
        slot,
      },
    });
  } catch (error) {
    next(error);
  }
};
