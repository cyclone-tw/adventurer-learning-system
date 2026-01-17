import { Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
import PlayerItem from '../models/PlayerItem.js';
import ActiveEffect from '../models/ActiveEffect.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

import Question from '../models/Question.js';
import User from '../models/User.js';

// Valid equipment slots
const VALID_SLOTS = ['title', 'head', 'body', 'accessory', 'background', 'effect'] as const;
type EquipmentSlot = typeof VALID_SLOTS[number];

// Validation rules
export const useItemValidation = [
  param('itemId').isMongoId().withMessage('無效的道具 ID'),
];

export const useQuizItemValidation = [
  param('itemId').isMongoId().withMessage('無效的道具 ID'),
  param('questionId').isMongoId().withMessage('無效的題目 ID'),
];

export const equipItemValidation = [
  param('itemId').isMongoId().withMessage('無效的道具 ID'),
];

export const unequipSlotValidation = [
  param('slot').isIn(VALID_SLOTS).withMessage('無效的裝備槽位'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /inventory - Get player's inventory
export const getInventory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get player items with item details
    const playerItems = await PlayerItem.find({ playerId, quantity: { $gt: 0 } })
      .populate('itemId')
      .sort({ acquiredAt: -1 })
      .lean();

    // Get active effects
    const activeEffects = await ActiveEffect.find({
      playerId,
      expiresAt: { $gt: new Date() },
    })
      .populate('itemId', 'name icon')
      .lean();

    // Format response
    const inventory = playerItems.map((pi) => ({
      _id: pi._id,
      item: pi.itemId,
      quantity: pi.quantity,
      acquiredAt: pi.acquiredAt,
    }));

    const effects = activeEffects.map((ae) => ({
      _id: ae._id,
      item: ae.itemId,
      effectType: ae.effectType,
      value: ae.value,
      expiresAt: ae.expiresAt,
      remainingMinutes: Math.ceil((new Date(ae.expiresAt).getTime() - Date.now()) / 60000),
    }));

    sendSuccess(res, {
      inventory,
      activeEffects: effects,
    });
  } catch (error) {
    next(error);
  }
};

// POST /inventory/use/:itemId - Use a consumable item
export const useItem = async (
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
    const playerId = req.auth.userId;

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if item is consumable
    if (item.type !== 'consumable') {
      throw AppError.badRequest('此道具無法使用', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if player owns this item
    const playerItem = await PlayerItem.findOne({ playerId, itemId });
    if (!playerItem || playerItem.quantity < 1) {
      throw AppError.badRequest('你沒有此道具', ErrorCodes.VALIDATION_ERROR);
    }

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Decrease item quantity
      playerItem.quantity -= 1;
      if (playerItem.quantity === 0) {
        await PlayerItem.deleteOne({ _id: playerItem._id }, { session });
      } else {
        await playerItem.save({ session });
      }

      // Apply effects
      const appliedEffects: { type: string; value: number; duration?: number }[] = [];

      if (item.effects && item.effects.length > 0) {
        for (const effect of item.effects) {
          if (['exp_boost', 'gold_boost', 'shield', 'time_extend'].includes(effect.type)) {
            // Duration-based effects
            const duration = effect.duration || 30; // default 30 minutes
            const expiresAt = new Date(Date.now() + duration * 60 * 1000);

            // Check if same effect already active, extend duration
            const existingEffect = await ActiveEffect.findOne({
              playerId,
              effectType: effect.type,
              expiresAt: { $gt: new Date() },
            });

            if (existingEffect) {
              // Extend existing effect
              existingEffect.expiresAt = new Date(
                existingEffect.expiresAt.getTime() + duration * 60 * 1000
              );
              await existingEffect.save({ session });
            } else {
              // Create new effect
              await ActiveEffect.create(
                [
                  {
                    playerId,
                    itemId: item._id,
                    effectType: effect.type,
                    value: effect.value,
                    expiresAt,
                  },
                ],
                { session }
              );
            }

            appliedEffects.push({
              type: effect.type,
              value: effect.value,
              duration,
            });
          }
          // Instant effects like 'hint' and 'skip' are handled during quiz
        }
      }

      await session.commitTransaction();

      sendSuccess(res, {
        message: `成功使用 ${item.name}`,
        item: {
          _id: item._id,
          name: item.name,
          icon: item.icon,
        },
        appliedEffects,
        remainingQuantity: playerItem.quantity,
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

// GET /inventory/effects - Get player's active effects
export const getActiveEffects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    const activeEffects = await ActiveEffect.find({
      playerId,
      expiresAt: { $gt: new Date() },
    })
      .populate('itemId', 'name icon')
      .lean();

    const effects = activeEffects.map((ae) => ({
      _id: ae._id,
      item: ae.itemId,
      effectType: ae.effectType,
      value: ae.value,
      expiresAt: ae.expiresAt,
      remainingMinutes: Math.ceil((new Date(ae.expiresAt).getTime() - Date.now()) / 60000),
    }));

    sendSuccess(res, { activeEffects: effects });
  } catch (error) {
    next(error);
  }
};

// POST /inventory/quiz-use/:itemId/:questionId - Use hint/skip item during quiz
export const useQuizItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { itemId, questionId } = req.params;
    const playerId = req.auth.userId;

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if item is consumable
    if (item.type !== 'consumable') {
      throw AppError.badRequest('此道具無法使用', ErrorCodes.VALIDATION_ERROR);
    }

    // Check item has hint or skip effect
    const quizEffects = item.effects?.filter(e => ['hint', 'skip'].includes(e.type)) || [];
    if (quizEffects.length === 0) {
      throw AppError.badRequest('此道具不能在答題中使用', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if player owns this item
    const playerItem = await PlayerItem.findOne({ playerId, itemId });
    if (!playerItem || playerItem.quantity < 1) {
      throw AppError.badRequest('你沒有此道具', ErrorCodes.VALIDATION_ERROR);
    }

    // Get question for hint
    const question = await Question.findById(questionId);
    if (!question) {
      throw AppError.notFound('找不到此題目', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Consume item
    playerItem.quantity -= 1;
    if (playerItem.quantity === 0) {
      await PlayerItem.deleteOne({ _id: playerItem._id });
    } else {
      await playerItem.save();
    }

    // Process effects
    const results: {
      hint?: string;
      skip?: boolean;
      correctAnswer?: string | string[];
    } = {};

    for (const effect of quizEffects) {
      if (effect.type === 'hint') {
        // Generate hint from explanation or correct answer
        if (question.answer.explanation) {
          // Show first part of explanation as hint
          const explanation = question.answer.explanation;
          results.hint = explanation.length > 50
            ? explanation.substring(0, 50) + '...'
            : explanation;
        } else if (question.type === 'single_choice' || question.type === 'multiple_choice') {
          // Hint: eliminate wrong answers (show 2 options)
          const correctAnswers = Array.isArray(question.answer.correct)
            ? question.answer.correct
            : [question.answer.correct];
          const wrongOptions = question.options?.filter(o => !correctAnswers.includes(o.id)) || [];
          if (wrongOptions.length > 0) {
            const eliminatedOption = wrongOptions[0];
            results.hint = `提示：${eliminatedOption.text} 不是正確答案`;
          } else {
            results.hint = '這題的答案就在選項中，仔細思考！';
          }
        } else {
          results.hint = '仔細閱讀題目，答案就在其中！';
        }
      } else if (effect.type === 'skip') {
        results.skip = true;
        // Return correct answer when skipping
        if (question.type === 'single_choice' || question.type === 'multiple_choice') {
          const correctIds = Array.isArray(question.answer.correct)
            ? question.answer.correct
            : [question.answer.correct];
          const correctOptions = question.options?.filter(o => correctIds.includes(o.id)) || [];
          results.correctAnswer = correctOptions.map(o => o.text).join(', ');
        } else if (question.type === 'true_false') {
          results.correctAnswer = question.answer.correct === 'true' ? '正確' : '錯誤';
        } else {
          results.correctAnswer = Array.isArray(question.answer.correct)
            ? question.answer.correct.join(', ')
            : question.answer.correct;
        }
      }
    }

    sendSuccess(res, {
      message: `成功使用 ${item.name}`,
      item: {
        _id: item._id,
        name: item.name,
        icon: item.icon,
      },
      ...results,
      remainingQuantity: playerItem.quantity,
    });
  } catch (error) {
    next(error);
  }
};

// GET /inventory/quiz-items - Get player's quiz-usable items
export const getQuizItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get player items that have hint or skip effects
    const playerItems = await PlayerItem.find({ playerId, quantity: { $gt: 0 } })
      .populate('itemId')
      .lean();

    // Filter items with quiz effects
    const quizItems = playerItems
      .filter((pi) => {
        const item = pi.itemId as unknown as { effects?: { type: string }[] };
        return item?.effects?.some((e) => ['hint', 'skip'].includes(e.type));
      })
      .map((pi) => {
        const item = pi.itemId as unknown as {
          _id: string;
          name: string;
          icon: string;
          description: string;
          rarity: string;
          effects: { type: string; value: number }[];
        };
        return {
          _id: item._id,
          name: item.name,
          icon: item.icon,
          description: item.description,
          rarity: item.rarity,
          effects: item.effects,
          quantity: pi.quantity,
        };
      });

    // Get active effects (exp_boost, gold_boost)
    const activeEffects = await ActiveEffect.find({
      playerId,
      expiresAt: { $gt: new Date() },
    })
      .populate('itemId', 'name icon')
      .lean();

    const effects = activeEffects.map((ae) => ({
      _id: ae._id,
      item: ae.itemId,
      effectType: ae.effectType,
      value: ae.value,
      remainingMinutes: Math.ceil((new Date(ae.expiresAt).getTime() - Date.now()) / 60000),
    }));

    sendSuccess(res, {
      quizItems,
      activeEffects: effects,
    });
  } catch (error) {
    next(error);
  }
};

// POST /inventory/equip/:itemId - Equip a cosmetic item
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

    const { itemId } = req.params;
    const playerId = req.auth.userId;

    // Get item details
    const item = await Item.findById(itemId);
    if (!item) {
      throw AppError.notFound('找不到此道具', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if item is cosmetic or equipment
    if (item.type !== 'cosmetic' && item.type !== 'equipment') {
      throw AppError.badRequest('此道具無法裝備', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if item has a slot
    if (!item.slot) {
      throw AppError.badRequest('此道具沒有裝備欄位', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if player owns this item
    const playerItem = await PlayerItem.findOne({ playerId, itemId });
    if (!playerItem || playerItem.quantity < 1) {
      throw AppError.badRequest('你沒有此道具', ErrorCodes.VALIDATION_ERROR);
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
      equippedItems: user.studentProfile.equippedItems,
      slot,
      item: {
        _id: item._id,
        name: item.name,
        icon: item.icon,
        rarity: item.rarity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /inventory/unequip/:slot - Unequip an item from a slot
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

    const { slot } = req.params;
    const playerId = req.auth.userId;

    // Validate slot
    if (!VALID_SLOTS.includes(slot as EquipmentSlot)) {
      throw AppError.badRequest('無效的裝備欄位', ErrorCodes.VALIDATION_ERROR);
    }

    // Get user
    const user = await User.findById(playerId);
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if slot has an item
    const equippedItems = user.studentProfile.equippedItems;
    if (!equippedItems || !equippedItems[slot as EquipmentSlot]) {
      throw AppError.badRequest('此欄位沒有裝備', ErrorCodes.VALIDATION_ERROR);
    }

    // Unequip the item
    equippedItems[slot as EquipmentSlot] = undefined;
    await user.save();

    sendSuccess(res, {
      message: '成功卸下裝備',
      equippedItems: user.studentProfile.equippedItems,
      slot,
    });
  } catch (error) {
    next(error);
  }
};

// GET /inventory/equipped - Get player's equipped items with details
export const getEquippedItems = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get user with populated equipped items
    const user = await User.findById(playerId).lean();
    if (!user || !user.studentProfile) {
      throw AppError.notFound('找不到使用者', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const equippedItems = user.studentProfile.equippedItems || {};

    // Fetch item details for each equipped slot
    const equippedDetails: Record<string, unknown> = {};
    for (const slot of VALID_SLOTS) {
      const itemId = equippedItems[slot];
      if (itemId) {
        const item = await Item.findById(itemId).lean();
        if (item) {
          equippedDetails[slot] = {
            _id: item._id,
            name: item.name,
            icon: item.icon,
            imageUrl: item.imageUrl,
            rarity: item.rarity,
          };
        }
      }
    }

    // Get cosmetic items owned by player
    const playerItems = await PlayerItem.find({ playerId, quantity: { $gt: 0 } })
      .populate('itemId')
      .lean();

    const cosmeticItems = playerItems
      .filter((pi) => {
        const item = pi.itemId as unknown as { type: string; slot?: string };
        return item && (item.type === 'cosmetic' || item.type === 'equipment') && item.slot;
      })
      .map((pi) => {
        const item = pi.itemId as unknown as {
          _id: string;
          name: string;
          description: string;
          icon: string;
          imageUrl?: string;
          rarity: string;
          slot: string;
        };
        return {
          _id: item._id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          imageUrl: item.imageUrl,
          rarity: item.rarity,
          slot: item.slot,
          quantity: pi.quantity,
        };
      });

    sendSuccess(res, {
      equippedItems: equippedDetails,
      availableItems: cosmeticItems,
    });
  } catch (error) {
    next(error);
  }
};
