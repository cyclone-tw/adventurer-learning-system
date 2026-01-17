import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import AvatarPart, { AvatarCategory, LAYER_MAP } from '../models/AvatarPart.js';
import StudentAvatar, {
  IStudentAvatar,
  SKIN_TONE_PRESETS,
  HAIR_COLOR_PRESETS,
  EYE_COLOR_PRESETS,
} from '../models/StudentAvatar.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const getPartsValidation = [
  query('category').optional().isIn([
    'body', 'skin_tone', 'face', 'eyes', 'mouth', 'hair',
    'outfit', 'armor', 'weapon', 'accessory', 'effects',
  ]).withMessage('無效的類別'),
  query('rarity').optional().isIn(['common', 'uncommon', 'rare', 'epic', 'legendary'])
    .withMessage('無效的稀有度'),
];

export const updateAvatarValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 20 }).withMessage('角色名稱需在 1-20 字元間'),
  body('skinTone').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('無效的膚色格式'),
  body('hairColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('無效的髮色格式'),
  body('eyeColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('無效的眼睛顏色格式'),
];

export const equipPartValidation = [
  param('partId').isMongoId().withMessage('無效的部件 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// ========== 學生 API ==========

// GET /paper-doll/avatar - Get student's avatar
export const getStudentAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const userId = req.auth.userId;

    // Find or create avatar
    let avatar = await StudentAvatar.findOne({ userId })
      .populate('equipped.body')
      .populate('equipped.face')
      .populate('equipped.eyes')
      .populate('equipped.mouth')
      .populate('equipped.hair')
      .populate('equipped.outfit')
      .populate('equipped.armor')
      .populate('equipped.weapon')
      .populate('equipped.accessory')
      .populate('equipped.effects')
      .lean();

    if (!avatar) {
      // Create default avatar with default parts
      avatar = await createDefaultAvatar(userId);
    }

    sendSuccess(res, {
      avatar,
      colorPresets: {
        skinTone: SKIN_TONE_PRESETS,
        hairColor: HAIR_COLOR_PRESETS,
        eyeColor: EYE_COLOR_PRESETS,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /paper-doll/parts - Get available avatar parts
export const getAvailableParts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { category, rarity } = req.query;

    // Build query
    const query: Record<string, unknown> = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (rarity) {
      query.rarity = rarity;
    }

    // For now, return all default and shop parts
    // Later: filter based on what the student owns
    const parts = await AvatarPart.find(query)
      .sort({ category: 1, layer: 1, rarity: 1 })
      .lean();

    // Group by category
    const byCategory: Record<string, typeof parts> = {};
    for (const part of parts) {
      if (!byCategory[part.category]) {
        byCategory[part.category] = [];
      }
      byCategory[part.category].push(part);
    }

    sendSuccess(res, { parts, byCategory, total: parts.length });
  } catch (error) {
    next(error);
  }
};

// PUT /paper-doll/avatar - Update avatar configuration
export const updateAvatar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const userId = req.auth.userId;
    const { name, skinTone, hairColor, eyeColor } = req.body;

    let avatar = await StudentAvatar.findOne({ userId });

    if (!avatar) {
      avatar = await createDefaultAvatar(userId);
      avatar = await StudentAvatar.findOne({ userId });
    }

    if (!avatar) {
      throw AppError.internal('無法建立角色', ErrorCodes.INTERNAL_ERROR);
    }

    // Update fields
    if (name !== undefined) avatar.name = name;
    if (skinTone !== undefined) avatar.equipped.skinTone = skinTone;
    if (hairColor !== undefined) avatar.equipped.hairColor = hairColor;
    if (eyeColor !== undefined) avatar.equipped.eyeColor = eyeColor;

    // Clear composite cache
    avatar.compositeImageUrl = undefined;
    avatar.compositeUpdatedAt = undefined;

    await avatar.save();

    // Populate and return
    const populatedAvatar = await StudentAvatar.findById(avatar._id)
      .populate('equipped.body')
      .populate('equipped.face')
      .populate('equipped.eyes')
      .populate('equipped.mouth')
      .populate('equipped.hair')
      .populate('equipped.outfit')
      .populate('equipped.armor')
      .populate('equipped.weapon')
      .populate('equipped.accessory')
      .populate('equipped.effects')
      .lean();

    sendSuccess(res, { avatar: populatedAvatar });
  } catch (error) {
    next(error);
  }
};

// POST /paper-doll/avatar/equip/:partId - Equip a part
export const equipPart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const userId = req.auth.userId;
    const { partId } = req.params;

    // Get the part
    const part = await AvatarPart.findById(partId);
    if (!part || !part.isActive) {
      throw AppError.notFound('找不到此部件', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // TODO: Check if player owns this part (for shop/achievement parts)

    // Get or create avatar
    let avatar = await StudentAvatar.findOne({ userId });
    if (!avatar) {
      await createDefaultAvatar(userId);
      avatar = await StudentAvatar.findOne({ userId });
    }

    if (!avatar) {
      throw AppError.internal('無法建立角色', ErrorCodes.INTERNAL_ERROR);
    }

    // Map category to equipped field
    const categoryToField: Record<string, keyof typeof avatar.equipped> = {
      body: 'body',
      face: 'face',
      eyes: 'eyes',
      mouth: 'mouth',
      hair: 'hair',
      outfit: 'outfit',
      armor: 'armor',
      weapon: 'weapon',
      accessory: 'accessory',
      effects: 'effects',
    };

    const field = categoryToField[part.category];
    if (!field) {
      throw AppError.badRequest('此類別無法裝備', ErrorCodes.VALIDATION_ERROR);
    }

    // Equip the part
    (avatar.equipped as Record<string, unknown>)[field] = part._id;

    // Clear composite cache
    avatar.compositeImageUrl = undefined;
    avatar.compositeUpdatedAt = undefined;

    await avatar.save();

    sendSuccess(res, {
      message: `成功裝備 ${part.name}`,
      equipped: {
        category: part.category,
        part: part,
      },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /paper-doll/avatar/unequip/:category - Unequip a category
export const unequipPart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const userId = req.auth.userId;
    const { category } = req.params;

    // Validate category
    const optionalCategories: AvatarCategory[] = ['armor', 'weapon', 'accessory', 'effects'];
    if (!optionalCategories.includes(category as AvatarCategory)) {
      throw AppError.badRequest('此類別為必要部件，無法卸下', ErrorCodes.VALIDATION_ERROR);
    }

    const avatar = await StudentAvatar.findOne({ userId });
    if (!avatar) {
      throw AppError.notFound('找不到角色', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Unequip
    (avatar.equipped as Record<string, unknown>)[category] = undefined;

    // Clear composite cache
    avatar.compositeImageUrl = undefined;
    avatar.compositeUpdatedAt = undefined;

    await avatar.save();

    sendSuccess(res, { message: `成功卸下 ${category}` });
  } catch (error) {
    next(error);
  }
};

// ========== 教師/管理 API ==========

// GET /paper-doll/admin/parts - Get all parts (admin)
export const adminGetParts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const parts = await AvatarPart.find()
      .sort({ category: 1, layer: 1, createdAt: -1 })
      .lean();

    // Group by category
    const byCategory: Record<string, typeof parts> = {};
    for (const part of parts) {
      if (!byCategory[part.category]) {
        byCategory[part.category] = [];
      }
      byCategory[part.category].push(part);
    }

    sendSuccess(res, { parts, byCategory, total: parts.length });
  } catch (error) {
    next(error);
  }
};

// POST /paper-doll/admin/parts - Create new part
export const adminCreatePart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const {
      name,
      category,
      assets,
      transform,
      colorizable,
      defaultColor,
      acquisition,
      rarity,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!name || !category || !assets?.idle) {
      throw AppError.badRequest('缺少必要欄位', ErrorCodes.VALIDATION_ERROR);
    }

    // Get layer from category
    const layer = LAYER_MAP[category as AvatarCategory];
    if (layer === undefined) {
      throw AppError.badRequest('無效的類別', ErrorCodes.VALIDATION_ERROR);
    }

    const part = new AvatarPart({
      name,
      category,
      layer,
      assets,
      transform: transform || {
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        anchor: { x: 0.5, y: 0.5 },
      },
      colorizable: colorizable || false,
      defaultColor,
      acquisition: acquisition || { type: 'default', levelRequired: 1 },
      rarity: rarity || 'common',
      isDefault: isDefault || false,
      isCustom: true,
      uploadedBy: req.auth.userId,
      isActive: true,
    });

    await part.save();

    sendSuccess(res, { part }, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /paper-doll/admin/parts/:id - Update part
export const adminUpdatePart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { id } = req.params;
    const updateData = req.body;

    // Don't allow changing category (would mess up layer)
    if (updateData.category) {
      updateData.layer = LAYER_MAP[updateData.category as AvatarCategory];
    }

    const part = await AvatarPart.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!part) {
      throw AppError.notFound('找不到此部件', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    sendSuccess(res, { part });
  } catch (error) {
    next(error);
  }
};

// DELETE /paper-doll/admin/parts/:id - Delete part
export const adminDeletePart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { id } = req.params;

    const part = await AvatarPart.findById(id);
    if (!part) {
      throw AppError.notFound('找不到此部件', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Don't allow deleting default parts
    if (part.isDefault) {
      throw AppError.badRequest('無法刪除預設部件', ErrorCodes.VALIDATION_ERROR);
    }

    // Soft delete
    part.isActive = false;
    await part.save();

    sendSuccess(res, { message: '部件已刪除' });
  } catch (error) {
    next(error);
  }
};

// ========== Helper Functions ==========

async function createDefaultAvatar(userId: string): Promise<IStudentAvatar | null> {
  // Find default parts for each required category
  const defaultParts = await AvatarPart.find({
    isDefault: true,
    isActive: true,
  }).lean();

  const partsByCategory: Record<string, typeof defaultParts[0]> = {};
  for (const part of defaultParts) {
    // Take the first default for each category
    if (!partsByCategory[part.category]) {
      partsByCategory[part.category] = part;
    }
  }

  // Check if we have all required parts
  const requiredCategories = ['body', 'face', 'eyes', 'mouth', 'hair', 'outfit'];
  const missingCategories = requiredCategories.filter(c => !partsByCategory[c]);

  if (missingCategories.length > 0) {
    // No default parts available yet, create placeholder
    console.warn(`Missing default parts for categories: ${missingCategories.join(', ')}`);

    // Create placeholder parts for missing categories
    for (const category of missingCategories) {
      const placeholderPart = new AvatarPart({
        name: `預設${category}`,
        category,
        layer: LAYER_MAP[category as AvatarCategory],
        assets: {
          idle: '/assets/avatar/placeholder.png',
        },
        transform: {
          offsetX: 0,
          offsetY: 0,
          scale: 1,
          anchor: { x: 0.5, y: 0.5 },
        },
        colorizable: ['body', 'hair', 'eyes'].includes(category),
        acquisition: { type: 'default', levelRequired: 1 },
        rarity: 'common',
        isDefault: true,
        isCustom: false,
        isActive: true,
      });
      await placeholderPart.save();
      partsByCategory[category] = placeholderPart;
    }
  }

  // Create the avatar
  const avatar = new StudentAvatar({
    userId,
    name: '冒險者',
    equipped: {
      body: partsByCategory['body']._id,
      skinTone: SKIN_TONE_PRESETS[1],
      face: partsByCategory['face']._id,
      eyes: partsByCategory['eyes']._id,
      eyeColor: EYE_COLOR_PRESETS[0],
      mouth: partsByCategory['mouth']._id,
      hair: partsByCategory['hair']._id,
      hairColor: HAIR_COLOR_PRESETS[1],
      outfit: partsByCategory['outfit']._id,
    },
  });

  await avatar.save();

  return avatar;
}
