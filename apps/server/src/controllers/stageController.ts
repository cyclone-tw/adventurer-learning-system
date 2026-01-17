import { Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Stage from '../models/Stage.js';
import Unit from '../models/Unit.js';
import Question from '../models/Question.js';
import PlayerStageProgress from '../models/PlayerStageProgress.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules
export const createStageValidation = [
  body('name')
    .notEmpty()
    .withMessage('請提供關卡名稱')
    .isLength({ max: 100 })
    .withMessage('關卡名稱不能超過100字'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述不能超過500字'),
  body('icon')
    .optional()
    .isString(),
  body('unitIds')
    .isArray({ min: 1 })
    .withMessage('請至少選擇一個單元'),
  body('unitIds.*')
    .isMongoId()
    .withMessage('無效的單元 ID'),
  body('difficulty')
    .optional()
    .isArray(),
  body('difficulty.*')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('無效的難度'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('排序必須為非負整數'),
  body('questionsPerSession')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每次挑戰題數必須在1-50之間'),
  body('unlockCondition.type')
    .optional()
    .isIn(['none', 'previous', 'level', 'stage'])
    .withMessage('無效的解鎖條件類型'),
  body('rewards.bonusExp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('獎勵經驗值必須為非負整數'),
  body('rewards.bonusGold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('獎勵金幣必須為非負整數'),
];

export const updateStageValidation = [
  param('id').isMongoId().withMessage('無效的關卡 ID'),
  ...createStageValidation.map((validation) => validation.optional()),
];

export const listStagesValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('includeInactive').optional().isBoolean(),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /stages - List all stages (for teachers)
export const listStages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      includeInactive = 'false',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    const [stages, total] = await Promise.all([
      Stage.find(filter)
        .populate('unitIds', 'name subjectId academicYear grade semester')
        .populate('createdBy', 'displayName')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Stage.countDocuments(filter),
    ]);

    // Get question count for each stage
    const stagesWithCount = await Promise.all(
      stages.map(async (stage) => {
        const questionCount = await Question.countDocuments({
          unitId: { $in: stage.unitIds },
          isActive: true,
          ...(stage.difficulty && stage.difficulty.length > 0
            ? { difficulty: { $in: stage.difficulty } }
            : {}),
        });
        return { ...stage, questionCount };
      })
    );

    sendPaginated(res, stagesWithCount, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// GET /stages/student - List stages for students (with progress)
export const listStagesForStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;
    const { subject } = req.query; // Optional subject filter (e.g., 'math', 'chinese')

    // Map subject code to subject name for filtering
    const subjectCodeMap: Record<string, string> = {
      math: '數學',
      chinese: '國語',
      english: '英語',
      science: '自然',
    };

    // Get all active stages
    let stages = await Stage.find({ isActive: true })
      .populate({
        path: 'unitIds',
        select: 'name subjectId',
        populate: {
          path: 'subjectId',
          select: 'name icon code',
        },
      })
      .sort({ order: 1 })
      .lean();

    // Filter by subject if specified
    if (subject && typeof subject === 'string') {
      const targetSubjectName = subjectCodeMap[subject] || subject;
      stages = stages.filter((stage) => {
        // Check if any unit belongs to the requested subject
        return (stage.unitIds as any[]).some((unit) => {
          const subjectInfo = unit?.subjectId;
          return (
            subjectInfo?.name === targetSubjectName ||
            subjectInfo?.code === subject
          );
        });
      });
    }

    // Get player progress for all stages
    const progressRecords = await PlayerStageProgress.find({
      playerId: new mongoose.Types.ObjectId(playerId),
      stageId: { $in: stages.map((s) => s._id) },
    }).lean();

    const progressMap = new Map(
      progressRecords.map((p) => [p.stageId.toString(), p])
    );

    // Get player level for unlock condition checking
    const User = mongoose.model('User');
    const player = await User.findById(playerId).select('studentProfile.level').lean();
    const playerLevel = (player as any)?.studentProfile?.level || 1;

    // Build response with unlock status
    const stagesWithProgress = stages.map((stage, index) => {
      const progress = progressMap.get(stage._id.toString());
      const previousStage = index > 0 ? stages[index - 1] : null;
      const previousProgress = previousStage
        ? progressMap.get(previousStage._id.toString())
        : null;

      // Determine if stage is unlocked
      let isUnlocked = progress?.isUnlocked || false;
      if (!isUnlocked) {
        switch (stage.unlockCondition?.type) {
          case 'none':
            isUnlocked = true;
            break;
          case 'previous':
            isUnlocked = previousProgress?.isCompleted || index === 0;
            break;
          case 'level':
            isUnlocked = playerLevel >= (stage.unlockCondition.value as number || 1);
            break;
          case 'stage':
            const requiredProgress = progressMap.get(stage.unlockCondition.value as string);
            isUnlocked = requiredProgress?.isCompleted || false;
            break;
          default:
            isUnlocked = index === 0; // First stage is always unlocked
        }
      }

      return {
        _id: stage._id,
        name: stage.name,
        description: stage.description,
        icon: stage.icon,
        imageUrl: stage.imageUrl,
        order: stage.order,
        questionsPerSession: stage.questionsPerSession,
        rewards: stage.rewards,
        units: stage.unitIds,
        // Progress info
        isUnlocked,
        isCompleted: progress?.isCompleted || false,
        completedAt: progress?.completedAt,
        bestScore: progress?.bestScore || 0,
        totalAttempts: progress?.totalAttempts || 0,
      };
    });

    sendSuccess(res, stagesWithProgress);
  } catch (error) {
    next(error);
  }
};

// GET /stages/:id - Get single stage
export const getStage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const stage = await Stage.findById(id)
      .populate({
        path: 'unitIds',
        select: 'name subjectId academicYear grade semester',
        populate: {
          path: 'subjectId',
          select: 'name icon code',
        },
      })
      .populate('createdBy', 'displayName');

    if (!stage) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Get question count
    const questionCount = await Question.countDocuments({
      unitId: { $in: stage.unitIds },
      isActive: true,
      ...(stage.difficulty && stage.difficulty.length > 0
        ? { difficulty: { $in: stage.difficulty } }
        : {}),
    });

    sendSuccess(res, { ...stage.toObject(), questionCount });
  } catch (error) {
    next(error);
  }
};

// POST /stages - Create new stage
export const createStage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { unitIds } = req.body;

    // Verify all units exist
    const units = await Unit.find({ _id: { $in: unitIds } });
    if (units.length !== unitIds.length) {
      throw AppError.badRequest('部分單元不存在', ErrorCodes.VALIDATION_ERROR);
    }

    const stage = await Stage.create({
      ...req.body,
      createdBy: req.auth.userId,
    });

    await stage.populate('unitIds', 'name subjectId academicYear grade semester');
    await stage.populate('createdBy', 'displayName');

    sendSuccess(res, stage, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /stages/:id - Update stage
export const updateStage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { id } = req.params;
    const { unitIds } = req.body;

    const stage = await Stage.findById(id);
    if (!stage) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // If updating unitIds, verify they exist
    if (unitIds) {
      const units = await Unit.find({ _id: { $in: unitIds } });
      if (units.length !== unitIds.length) {
        throw AppError.badRequest('部分單元不存在', ErrorCodes.VALIDATION_ERROR);
      }
    }

    const updatedStage = await Stage.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('unitIds', 'name subjectId academicYear grade semester')
      .populate('createdBy', 'displayName');

    sendSuccess(res, updatedStage);
  } catch (error) {
    next(error);
  }
};

// DELETE /stages/:id - Delete (soft) stage
export const deleteStage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const stage = await Stage.findById(id);
    if (!stage) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Soft delete
    stage.isActive = false;
    await stage.save();

    sendSuccess(res, { message: '關卡已刪除' });
  } catch (error) {
    next(error);
  }
};

// GET /stages/:id/question - Get random question from stage
export const getStageQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { id } = req.params;
    const playerId = req.auth.userId;

    const stage = await Stage.findById(id);
    if (!stage || !stage.isActive) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Build question filter
    const filter: Record<string, unknown> = {
      unitId: { $in: stage.unitIds },
      isActive: true,
    };

    if (stage.difficulty && stage.difficulty.length > 0) {
      filter.difficulty = { $in: stage.difficulty };
    }

    // Get random question
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 1 } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'unitId',
          foreignField: '_id',
          as: 'unitInfo',
        },
      },
    ]);

    if (questions.length === 0) {
      throw AppError.notFound('此關卡沒有可用的題目', ErrorCodes.QUESTION_NOT_FOUND);
    }

    const question = questions[0];

    // Update or create progress record (start new session if needed)
    let progress = await PlayerStageProgress.findOne({
      playerId: new mongoose.Types.ObjectId(playerId),
      stageId: stage._id,
    });

    if (!progress) {
      progress = await PlayerStageProgress.create({
        playerId: new mongoose.Types.ObjectId(playerId),
        stageId: stage._id,
        isUnlocked: true,
      });
    }

    // Return question without answer
    sendSuccess(res, {
      _id: question._id,
      subjectId: question.subjectInfo?.[0] || null,
      unitId: question.unitInfo?.[0] || null,
      difficulty: question.difficulty,
      type: question.type,
      content: question.content,
      options: question.options,
      baseExp: question.baseExp,
      baseGold: question.baseGold,
      // Stage info
      stageId: stage._id,
      stageName: stage.name,
      questionsPerSession: stage.questionsPerSession,
      currentProgress: {
        sessionCorrect: progress.currentSessionCorrect,
        sessionTotal: progress.currentSessionTotal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /stages/:id/start - Start a new stage session
export const startStageSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { id } = req.params;
    const playerId = req.auth.userId;

    const stage = await Stage.findById(id);
    if (!stage || !stage.isActive) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Reset or create progress for new session
    const progress = await PlayerStageProgress.findOneAndUpdate(
      {
        playerId: new mongoose.Types.ObjectId(playerId),
        stageId: stage._id,
      },
      {
        $set: {
          isUnlocked: true,
          currentSessionCorrect: 0,
          currentSessionTotal: 0,
        },
        $inc: { totalAttempts: 1 },
      },
      { upsert: true, new: true }
    );

    sendSuccess(res, {
      stageId: stage._id,
      stageName: stage.name,
      questionsPerSession: stage.questionsPerSession,
      progress: {
        sessionCorrect: progress.currentSessionCorrect,
        sessionTotal: progress.currentSessionTotal,
        bestScore: progress.bestScore,
        isCompleted: progress.isCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /stages/:id/complete - Complete stage session
export const completeStageSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { id } = req.params;
    const { correctCount, totalCount } = req.body;
    const playerId = req.auth.userId;

    const stage = await Stage.findById(id);
    if (!stage) {
      throw AppError.notFound('關卡不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Update progress
    const progress = await PlayerStageProgress.findOne({
      playerId: new mongoose.Types.ObjectId(playerId),
      stageId: stage._id,
    });

    if (!progress) {
      throw AppError.badRequest('請先開始關卡', ErrorCodes.VALIDATION_ERROR);
    }

    // Determine if passed (e.g., 60% correct rate)
    const passRate = 0.6;
    const isPassed = correctCount / totalCount >= passRate;
    const isFirstClear = !progress.isCompleted && isPassed;

    // Update progress
    progress.currentSessionCorrect = correctCount;
    progress.currentSessionTotal = totalCount;
    progress.totalQuestionsAnswered += totalCount;
    progress.totalCorrect += correctCount;

    if (correctCount > progress.bestScore) {
      progress.bestScore = correctCount;
    }

    if (isPassed && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    await progress.save();

    // Calculate bonus rewards
    let bonusExp = 0;
    let bonusGold = 0;

    if (isPassed) {
      bonusExp += stage.rewards.bonusExp;
      bonusGold += stage.rewards.bonusGold;

      if (isFirstClear && stage.rewards.firstClearBonus) {
        bonusExp += stage.rewards.firstClearBonus.exp;
        bonusGold += stage.rewards.firstClearBonus.gold;
      }

      // Apply rewards to player
      if (bonusExp > 0 || bonusGold > 0) {
        const User = mongoose.model('User');
        await User.findByIdAndUpdate(playerId, {
          $inc: {
            'studentProfile.exp': bonusExp,
            'studentProfile.gold': bonusGold,
          },
        });
      }
    }

    sendSuccess(res, {
      isPassed,
      isFirstClear,
      correctCount,
      totalCount,
      correctRate: Math.round((correctCount / totalCount) * 100),
      rewards: {
        bonusExp,
        bonusGold,
      },
      progress: {
        isCompleted: progress.isCompleted,
        bestScore: progress.bestScore,
        totalAttempts: progress.totalAttempts,
      },
    });
  } catch (error) {
    next(error);
  }
};
