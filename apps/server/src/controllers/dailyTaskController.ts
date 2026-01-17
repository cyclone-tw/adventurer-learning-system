import { Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import DailyTask from '../models/DailyTask.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import {
  getDailyTasksWithProgress,
  claimTaskReward,
  claimAllTaskRewards,
} from '../services/dailyTaskService.js';

// Validation
export const claimTaskValidation = [
  param('taskId').isMongoId().withMessage('無效的任務 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /daily-tasks - Get daily tasks with progress
export const getDailyTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;
    const result = await getDailyTasksWithProgress(playerId);

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// POST /daily-tasks/:taskId/claim - Claim single task reward
export const claimTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { taskId } = req.params;
    const playerId = req.auth.userId;

    const result = await claimTaskReward(playerId, taskId);

    if (!result) {
      throw AppError.badRequest('任務尚未完成或已領取', ErrorCodes.VALIDATION_ERROR);
    }

    sendSuccess(res, {
      message: '成功領取獎勵',
      rewards: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /daily-tasks/claim-all - Claim all completed task rewards
export const claimAllTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const playerId = req.auth.userId;
    const result = await claimAllTaskRewards(playerId);

    if (result.count === 0) {
      throw AppError.badRequest('沒有可領取的任務獎勵', ErrorCodes.VALIDATION_ERROR);
    }

    sendSuccess(res, {
      message: `成功領取 ${result.count} 個任務獎勵`,
      rewards: {
        exp: result.totalExp,
        gold: result.totalGold,
      },
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

// POST /daily-tasks/seed - Seed default daily tasks (admin only)
export const seedDailyTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const defaultTasks = [
      // Easy tasks
      {
        code: 'DAILY_Q3',
        name: '初次挑戰',
        description: '今日完成 3 道題目',
        icon: '📝',
        taskType: 'questions_answered',
        targetValue: 3,
        expReward: 15,
        goldReward: 5,
        difficulty: 'easy',
        order: 1,
      },
      {
        code: 'DAILY_CORRECT_3',
        name: '小試身手',
        description: '今日答對 3 道題目',
        icon: '✅',
        taskType: 'correct_answers',
        targetValue: 3,
        expReward: 20,
        goldReward: 8,
        difficulty: 'easy',
        order: 2,
      },
      // Medium tasks
      {
        code: 'DAILY_Q5',
        name: '勤奮學習',
        description: '今日完成 5 道題目',
        icon: '📚',
        taskType: 'questions_answered',
        targetValue: 5,
        expReward: 25,
        goldReward: 10,
        difficulty: 'medium',
        order: 3,
      },
      {
        code: 'DAILY_CORRECT_5',
        name: '答題高手',
        description: '今日答對 5 道題目',
        icon: '🌟',
        taskType: 'correct_answers',
        targetValue: 5,
        expReward: 30,
        goldReward: 12,
        difficulty: 'medium',
        order: 4,
      },
      {
        code: 'DAILY_STREAK_3',
        name: '連勝開始',
        description: '今日連續答對 3 題',
        icon: '🔥',
        taskType: 'correct_streak',
        targetValue: 3,
        expReward: 25,
        goldReward: 10,
        difficulty: 'medium',
        order: 5,
      },
      // Hard tasks
      {
        code: 'DAILY_Q10',
        name: '學習達人',
        description: '今日完成 10 道題目',
        icon: '🎯',
        taskType: 'questions_answered',
        targetValue: 10,
        expReward: 50,
        goldReward: 20,
        difficulty: 'hard',
        order: 6,
      },
      {
        code: 'DAILY_CORRECT_10',
        name: '學霸',
        description: '今日答對 10 道題目',
        icon: '💯',
        taskType: 'correct_answers',
        targetValue: 10,
        expReward: 60,
        goldReward: 25,
        difficulty: 'hard',
        order: 7,
      },
      {
        code: 'DAILY_STREAK_5',
        name: '火力全開',
        description: '今日連續答對 5 題',
        icon: '💥',
        taskType: 'correct_streak',
        targetValue: 5,
        expReward: 50,
        goldReward: 20,
        difficulty: 'hard',
        order: 8,
      },
    ];

    // Clear existing and insert new
    await DailyTask.deleteMany({});
    const result = await DailyTask.insertMany(defaultTasks);

    sendSuccess(res, {
      message: `成功建立 ${result.length} 個每日任務`,
      count: result.length,
    });
  } catch (error) {
    next(error);
  }
};
