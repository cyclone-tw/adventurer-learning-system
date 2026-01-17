import { Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Achievement from '../models/Achievement.js';
import PlayerAchievement from '../models/PlayerAchievement.js';
import User from '../models/User.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { getAchievementProgress } from '../services/achievementService.js';

// Validation
export const markAchievementSeenValidation = [
  param('achievementId').isMongoId().withMessage('無效的成就 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /achievements - Get all achievements with player progress
export const getAchievements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    // Get all active achievements
    const achievements = await Achievement.find({ isActive: true })
      .sort({ category: 1, order: 1 })
      .lean();

    // Get player's unlocked achievements
    const playerAchievements = await PlayerAchievement.find({ playerId }).lean();
    const unlockedMap = new Map(
      playerAchievements.map((pa) => [pa.achievementId.toString(), pa])
    );

    // Get real-time progress for all achievement types
    const progressMap = await getAchievementProgress(playerId);

    // Combine data
    const result = achievements.map((achievement) => {
      const playerData = unlockedMap.get(achievement._id.toString());
      const isUnlocked = !!playerData;

      // Calculate real progress based on requirement type
      let currentProgress = 0;
      if (isUnlocked) {
        // Already unlocked - show full progress
        currentProgress = achievement.requirementValue;
      } else {
        // Get current progress from progressMap
        const rawProgress = progressMap.get(achievement.requirementType) || 0;
        // Cap progress at requirementValue
        currentProgress = Math.min(rawProgress, achievement.requirementValue);
      }

      // Hide hidden achievements that aren't unlocked
      if (achievement.isHidden && !isUnlocked) {
        return {
          _id: achievement._id,
          code: achievement.code,
          name: '???',
          description: '完成神秘條件解鎖此成就',
          icon: '❓',
          category: achievement.category,
          rarity: achievement.rarity,
          isUnlocked: false,
          isHidden: true,
          progress: 0,
          requirementValue: achievement.requirementValue,
        };
      }

      return {
        _id: achievement._id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        rarity: achievement.rarity,
        requirementType: achievement.requirementType,
        requirementValue: achievement.requirementValue,
        expReward: achievement.expReward,
        goldReward: achievement.goldReward,
        isUnlocked,
        isHidden: achievement.isHidden,
        unlockedAt: playerData?.unlockedAt,
        isNew: playerData?.isNew || false,
        progress: currentProgress,
      };
    });

    // Group by category
    const grouped = {
      learning: result.filter((a) => a.category === 'learning'),
      adventure: result.filter((a) => a.category === 'adventure'),
      social: result.filter((a) => a.category === 'social'),
      special: result.filter((a) => a.category === 'special'),
    };

    // Stats
    const totalCount = achievements.length;
    const unlockedCount = playerAchievements.length;
    const newCount = playerAchievements.filter((pa) => pa.isNew).length;

    sendSuccess(res, {
      achievements: grouped,
      stats: {
        total: totalCount,
        unlocked: unlockedCount,
        percentage: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
        newCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /achievements/new - Get newly unlocked achievements
export const getNewAchievements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    const newAchievements = await PlayerAchievement.find({
      playerId,
      isNew: true,
    })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .lean();

    sendSuccess(res, {
      achievements: newAchievements.map((pa) => ({
        _id: pa._id,
        achievement: pa.achievementId,
        unlockedAt: pa.unlockedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// POST /achievements/:achievementId/seen - Mark achievement as seen
export const markAchievementSeen = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { achievementId } = req.params;
    const playerId = req.auth.userId;

    await PlayerAchievement.findOneAndUpdate(
      { playerId, achievementId },
      { isNew: false }
    );

    sendSuccess(res, { message: '已標記為已讀' });
  } catch (error) {
    next(error);
  }
};

// POST /achievements/mark-all-seen - Mark all achievements as seen
export const markAllAchievementsSeen = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;

    await PlayerAchievement.updateMany({ playerId, isNew: true }, { isNew: false });

    sendSuccess(res, { message: '已全部標記為已讀' });
  } catch (error) {
    next(error);
  }
};

// POST /achievements/seed - Seed default achievements (admin only)
export const seedAchievements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const defaultAchievements = [
      // Learning achievements
      {
        code: 'FIRST_QUESTION',
        name: '初次挑戰',
        description: '回答第一道題目',
        icon: '🎯',
        category: 'learning',
        rarity: 'common',
        requirementType: 'questions_answered',
        requirementValue: 1,
        expReward: 10,
        goldReward: 5,
        order: 1,
      },
      {
        code: 'QUESTION_10',
        name: '小試身手',
        description: '累計回答 10 道題目',
        icon: '📝',
        category: 'learning',
        rarity: 'common',
        requirementType: 'questions_answered',
        requirementValue: 10,
        expReward: 30,
        goldReward: 15,
        order: 2,
      },
      {
        code: 'QUESTION_50',
        name: '勤奮學者',
        description: '累計回答 50 道題目',
        icon: '📚',
        category: 'learning',
        rarity: 'rare',
        requirementType: 'questions_answered',
        requirementValue: 50,
        expReward: 100,
        goldReward: 50,
        order: 3,
      },
      {
        code: 'QUESTION_100',
        name: '學習達人',
        description: '累計回答 100 道題目',
        icon: '🎓',
        category: 'learning',
        rarity: 'epic',
        requirementType: 'questions_answered',
        requirementValue: 100,
        expReward: 200,
        goldReward: 100,
        order: 4,
      },
      {
        code: 'QUESTION_500',
        name: '知識巨人',
        description: '累計回答 500 道題目',
        icon: '🏛️',
        category: 'learning',
        rarity: 'legendary',
        requirementType: 'questions_answered',
        requirementValue: 500,
        expReward: 500,
        goldReward: 250,
        order: 5,
      },
      {
        code: 'CORRECT_10',
        name: '正確起步',
        description: '累計答對 10 道題目',
        icon: '✅',
        category: 'learning',
        rarity: 'common',
        requirementType: 'correct_answers',
        requirementValue: 10,
        expReward: 30,
        goldReward: 15,
        order: 10,
      },
      {
        code: 'CORRECT_50',
        name: '答題高手',
        description: '累計答對 50 道題目',
        icon: '🌟',
        category: 'learning',
        rarity: 'rare',
        requirementType: 'correct_answers',
        requirementValue: 50,
        expReward: 100,
        goldReward: 50,
        order: 11,
      },
      {
        code: 'CORRECT_100',
        name: '學霸',
        description: '累計答對 100 道題目',
        icon: '💯',
        category: 'learning',
        rarity: 'epic',
        requirementType: 'correct_answers',
        requirementValue: 100,
        expReward: 200,
        goldReward: 100,
        order: 12,
      },
      {
        code: 'STREAK_5',
        name: '連勝開始',
        description: '連續答對 5 題',
        icon: '🔥',
        category: 'learning',
        rarity: 'common',
        requirementType: 'correct_streak',
        requirementValue: 5,
        expReward: 25,
        goldReward: 10,
        order: 20,
      },
      {
        code: 'STREAK_10',
        name: '火力全開',
        description: '連續答對 10 題',
        icon: '🔥',
        category: 'learning',
        rarity: 'rare',
        requirementType: 'correct_streak',
        requirementValue: 10,
        expReward: 75,
        goldReward: 30,
        order: 21,
      },
      {
        code: 'STREAK_20',
        name: '完美連擊',
        description: '連續答對 20 題',
        icon: '💥',
        category: 'learning',
        rarity: 'epic',
        requirementType: 'correct_streak',
        requirementValue: 20,
        expReward: 150,
        goldReward: 75,
        order: 22,
      },
      // Adventure achievements
      {
        code: 'LEVEL_5',
        name: '冒險者',
        description: '達到等級 5',
        icon: '⚔️',
        category: 'adventure',
        rarity: 'common',
        requirementType: 'level_reached',
        requirementValue: 5,
        expReward: 50,
        goldReward: 25,
        order: 1,
      },
      {
        code: 'LEVEL_10',
        name: '資深冒險者',
        description: '達到等級 10',
        icon: '🗡️',
        category: 'adventure',
        rarity: 'rare',
        requirementType: 'level_reached',
        requirementValue: 10,
        expReward: 100,
        goldReward: 50,
        order: 2,
      },
      {
        code: 'LEVEL_20',
        name: '傳奇勇者',
        description: '達到等級 20',
        icon: '👑',
        category: 'adventure',
        rarity: 'epic',
        requirementType: 'level_reached',
        requirementValue: 20,
        expReward: 200,
        goldReward: 100,
        order: 3,
      },
      {
        code: 'GOLD_100',
        name: '存錢罐',
        description: '累計獲得 100 金幣',
        icon: '💰',
        category: 'adventure',
        rarity: 'common',
        requirementType: 'gold_earned',
        requirementValue: 100,
        expReward: 20,
        goldReward: 10,
        order: 10,
      },
      {
        code: 'GOLD_500',
        name: '小富翁',
        description: '累計獲得 500 金幣',
        icon: '💎',
        category: 'adventure',
        rarity: 'rare',
        requirementType: 'gold_earned',
        requirementValue: 500,
        expReward: 50,
        goldReward: 25,
        order: 11,
      },
      {
        code: 'GOLD_1000',
        name: '財富大亨',
        description: '累計獲得 1000 金幣',
        icon: '🏆',
        category: 'adventure',
        rarity: 'epic',
        requirementType: 'gold_earned',
        requirementValue: 1000,
        expReward: 100,
        goldReward: 50,
        order: 12,
      },
      {
        code: 'SHOPPER_1',
        name: '初次購物',
        description: '購買第一個道具',
        icon: '🛒',
        category: 'adventure',
        rarity: 'common',
        requirementType: 'items_purchased',
        requirementValue: 1,
        expReward: 15,
        goldReward: 0,
        order: 20,
      },
      {
        code: 'SHOPPER_10',
        name: '購物達人',
        description: '購買 10 個道具',
        icon: '🛍️',
        category: 'adventure',
        rarity: 'rare',
        requirementType: 'items_purchased',
        requirementValue: 10,
        expReward: 50,
        goldReward: 20,
        order: 21,
      },
      // Special achievements
      {
        code: 'DAILY_10',
        name: '今日之星',
        description: '單日完成 10 道題目',
        icon: '⭐',
        category: 'special',
        rarity: 'rare',
        requirementType: 'daily_questions',
        requirementValue: 10,
        expReward: 50,
        goldReward: 25,
        order: 1,
      },
      {
        code: 'DAILY_20',
        name: '學習狂人',
        description: '單日完成 20 道題目',
        icon: '🌟',
        category: 'special',
        rarity: 'epic',
        requirementType: 'daily_questions',
        requirementValue: 20,
        expReward: 100,
        goldReward: 50,
        order: 2,
      },
    ];

    // Clear existing and insert new
    await Achievement.deleteMany({});
    const result = await Achievement.insertMany(defaultAchievements);

    sendSuccess(res, {
      message: `成功建立 ${result.length} 個成就`,
      count: result.length,
    });
  } catch (error) {
    next(error);
  }
};
