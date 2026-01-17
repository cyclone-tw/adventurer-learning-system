import { Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import QuestionAttempt from '../models/QuestionAttempt.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import ActiveEffect from '../models/ActiveEffect.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { checkAchievements } from '../services/achievementService.js';
import { updateTaskProgress } from '../services/dailyTaskService.js';

// Validation rules
export const submitAnswerValidation = [
  param('questionId').isMongoId().withMessage('無效的題目 ID'),
  body('answer')
    .notEmpty()
    .withMessage('請提供答案'),
  body('timeSpentSeconds')
    .optional()
    .isInt({ min: 0 })
    .withMessage('時間必須為非負整數'),
];

export const getRandomQuestionValidation = [
  query('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social'])
    .withMessage('無效的學科'),
  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('無效的難度'),
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('無效的分類 ID'),
  // New hierarchy parameters
  query('subjectId')
    .optional()
    .isMongoId()
    .withMessage('無效的科目 ID'),
  query('unitIds')
    .optional()
    .custom((value) => {
      // Accept comma-separated MongoDB IDs or single ID
      if (!value) return true;
      const ids = value.split(',');
      return ids.every((id: string) => mongoose.Types.ObjectId.isValid(id.trim()));
    })
    .withMessage('無效的單元 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// Helper to check answer correctness
const checkAnswer = (
  question: any,
  submittedAnswer: string | string[]
): boolean => {
  const correctAnswer = question.answer.correct;

  // Normalize answers for comparison
  const normalize = (val: string) => val.toString().trim().toLowerCase();

  if (question.type === 'multiple_choice') {
    // Multiple choice: compare arrays
    const submitted = Array.isArray(submittedAnswer)
      ? submittedAnswer.map(normalize).sort()
      : [normalize(submittedAnswer)];
    const correct = Array.isArray(correctAnswer)
      ? correctAnswer.map(normalize).sort()
      : [normalize(correctAnswer)];

    return (
      submitted.length === correct.length &&
      submitted.every((val, idx) => val === correct[idx])
    );
  } else if (question.type === 'fill_blank') {
    // Fill blank: case-insensitive comparison, trim whitespace
    const submitted = normalize(
      Array.isArray(submittedAnswer) ? submittedAnswer[0] : submittedAnswer
    );
    const correct = normalize(
      Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer
    );
    return submitted === correct;
  } else {
    // Single choice, true/false: direct comparison
    const submitted = normalize(
      Array.isArray(submittedAnswer) ? submittedAnswer[0] : submittedAnswer
    );
    const correct = normalize(
      Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer
    );
    return submitted === correct;
  }
};

// Daily practice limit for quick practice (stage battles don't have this limit)
const DAILY_PRACTICE_REWARD_LIMIT = 20; // Max questions per day that give rewards

// Calculate rewards based on difficulty and correctness
const calculateRewards = (
  question: { baseExp?: number; baseGold?: number; difficulty: 'easy' | 'medium' | 'hard' },
  isCorrect: boolean
): { exp: number; gold: number } => {
  if (!isCorrect) {
    return { exp: 0, gold: 0 };
  }

  const expByDifficulty: Record<string, number> = { easy: 10, medium: 20, hard: 30 };
  const goldByDifficulty: Record<string, number> = { easy: 5, medium: 10, hard: 15 };

  // Use question's base values or defaults
  const baseExp = question.baseExp || expByDifficulty[question.difficulty] || 10;
  const baseGold = question.baseGold || goldByDifficulty[question.difficulty] || 5;

  return { exp: baseExp, gold: baseGold };
};

// Helper to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper to check and update daily practice limits
const checkDailyPracticeLimit = async (
  studentId: string
): Promise<{ canEarnRewards: boolean; questionsAnsweredToday: number; rewardedToday: number }> => {
  const student = await User.findById(studentId);
  if (!student || !student.studentProfile) {
    return { canEarnRewards: false, questionsAnsweredToday: 0, rewardedToday: 0 };
  }

  const today = new Date();
  let dailyPractice = student.studentProfile.dailyPractice;

  // Reset if it's a new day
  if (!dailyPractice || !isSameDay(new Date(dailyPractice.date), today)) {
    dailyPractice = {
      date: today,
      questionsAnswered: 0,
      rewardedQuestions: 0,
    };
    student.studentProfile.dailyPractice = dailyPractice;
    await student.save();
  }

  const canEarnRewards = dailyPractice.rewardedQuestions < DAILY_PRACTICE_REWARD_LIMIT;

  return {
    canEarnRewards,
    questionsAnsweredToday: dailyPractice.questionsAnswered,
    rewardedToday: dailyPractice.rewardedQuestions,
  };
};

// POST /attempts/:questionId - Submit answer for a question
export const submitAnswer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { questionId } = req.params;
    const { answer, timeSpentSeconds = 0, source = 'practice' } = req.body;
    const studentId = req.auth.userId;

    // Get the question
    const question = await Question.findById(questionId);
    if (!question || !question.isActive) {
      throw AppError.notFound('題目不存在', ErrorCodes.QUESTION_NOT_FOUND);
    }

    // Check the answer
    const isCorrect = checkAnswer(question, answer);

    // Check daily practice limit (only for 'practice' source, not 'stage' or 'exploration')
    let dailyLimitInfo = { canEarnRewards: true, questionsAnsweredToday: 0, rewardedToday: 0 };
    const isQuickPractice = source === 'practice';

    if (isQuickPractice) {
      dailyLimitInfo = await checkDailyPracticeLimit(studentId);
    }

    // Calculate base rewards
    let rewards = calculateRewards(question, isCorrect);

    // Apply daily limit - no rewards if exceeded
    const rewardsLimited = isQuickPractice && !dailyLimitInfo.canEarnRewards;
    if (rewardsLimited) {
      rewards = { exp: 0, gold: 0 };
    }

    // Apply active effects (exp_boost, gold_boost) only if rewards not limited
    if (isCorrect && !rewardsLimited) {
      const activeEffects = await ActiveEffect.find({
        playerId: new mongoose.Types.ObjectId(studentId),
        expiresAt: { $gt: new Date() },
      });

      for (const effect of activeEffects) {
        if (effect.effectType === 'exp_boost') {
          rewards.exp = Math.floor(rewards.exp * effect.value);
        } else if (effect.effectType === 'gold_boost') {
          rewards.gold = Math.floor(rewards.gold * effect.value);
        }
      }
    }

    // Create attempt record
    const attempt = await QuestionAttempt.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      questionId: question._id,
      submittedAnswer: answer,
      isCorrect,
      timeSpentSeconds,
      expGained: rewards.exp,
      goldGained: rewards.gold,
    });

    // Update question statistics
    await Question.findByIdAndUpdate(questionId, {
      $inc: {
        'stats.totalAttempts': 1,
        'stats.correctCount': isCorrect ? 1 : 0,
      },
    });

    // Update student profile
    const student = await User.findById(studentId);
    if (student && student.studentProfile) {
      // Always increment total questions answered
      student.studentProfile.totalQuestionsAnswered += 1;

      // Update daily practice counts for quick practice
      if (isQuickPractice) {
        const today = new Date();
        if (!student.studentProfile.dailyPractice ||
            !isSameDay(new Date(student.studentProfile.dailyPractice.date), today)) {
          student.studentProfile.dailyPractice = {
            date: today,
            questionsAnswered: 1,
            rewardedQuestions: isCorrect && !rewardsLimited ? 1 : 0,
          };
        } else {
          student.studentProfile.dailyPractice.questionsAnswered += 1;
          if (isCorrect && !rewardsLimited) {
            student.studentProfile.dailyPractice.rewardedQuestions += 1;
          }
        }
      }

      // Give rewards if correct and not limited
      if (isCorrect && !rewardsLimited) {
        student.studentProfile.exp += rewards.exp;
        student.studentProfile.gold += rewards.gold;

        // Update subject-specific stats (increase if correct)
        if (question.subject) {
          const subjectStats = student.studentProfile.stats;
          const currentStat = subjectStats[question.subject] ?? 50;
          subjectStats[question.subject] = Math.min(100, currentStat + 2);
        }

        // Check for level up
        while (student.studentProfile.exp >= student.studentProfile.expToNextLevel) {
          student.studentProfile.exp -= student.studentProfile.expToNextLevel;
          student.studentProfile.level += 1;
          student.studentProfile.expToNextLevel = Math.floor(
            student.studentProfile.expToNextLevel * 1.2
          );
        }
      }

      // Update correct rate
      const totalAttempts = await QuestionAttempt.countDocuments({ studentId });
      const correctAttempts = await QuestionAttempt.countDocuments({
        studentId,
        isCorrect: true,
      });
      student.studentProfile.correctRate = Math.round(
        (correctAttempts / totalAttempts) * 100
      );

      await student.save();

      // Update daily limit info after save
      if (isQuickPractice && student.studentProfile.dailyPractice) {
        dailyLimitInfo.questionsAnsweredToday = student.studentProfile.dailyPractice.questionsAnswered;
        dailyLimitInfo.rewardedToday = student.studentProfile.dailyPractice.rewardedQuestions;
        dailyLimitInfo.canEarnRewards = dailyLimitInfo.rewardedToday < DAILY_PRACTICE_REWARD_LIMIT;
      }
    }

    // Check achievements
    const achievementTriggers: ('questions_answered' | 'correct_answers' | 'correct_streak' | 'level_reached' | 'exp_earned' | 'gold_earned' | 'daily_questions')[] = [
      'questions_answered',
      'daily_questions',
    ];
    if (isCorrect) {
      achievementTriggers.push('correct_answers', 'correct_streak', 'exp_earned', 'gold_earned');
    }

    const unlockedAchievements = await checkAchievements(studentId, achievementTriggers);

    // Update daily task progress
    const completedTasks = await updateTaskProgress(studentId, isCorrect);

    // Return result with explanation and daily limit info
    sendSuccess(res, {
      attemptId: attempt._id,
      isCorrect,
      correctAnswer: question.answer.correct,
      explanation: question.answer.explanation,
      rewards: {
        exp: rewards.exp,
        gold: rewards.gold,
      },
      unlockedAchievements,
      completedTasks,
      // Daily practice limit info (only for quick practice)
      dailyPractice: isQuickPractice
        ? {
            questionsAnsweredToday: dailyLimitInfo.questionsAnsweredToday,
            rewardedQuestionsToday: dailyLimitInfo.rewardedToday,
            dailyLimit: DAILY_PRACTICE_REWARD_LIMIT,
            canEarnMoreRewards: dailyLimitInfo.canEarnRewards,
            rewardsLimited: rewardsLimited,
          }
        : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// GET /attempts/question/random - Get a random question for the student
export const getRandomQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { subject, difficulty, categoryId, subjectId, unitIds } = req.query;

    // Build filter
    const filter: Record<string, unknown> = { isActive: true };

    // New hierarchy filters (preferred)
    if (unitIds) {
      // Parse comma-separated unit IDs
      const unitIdArray = (unitIds as string).split(',').map(
        (id) => new mongoose.Types.ObjectId(id.trim())
      );
      filter.unitId = { $in: unitIdArray };
    } else if (subjectId) {
      // Filter by subject using new hierarchy
      filter.subjectId = new mongoose.Types.ObjectId(subjectId as string);
    }

    // Legacy filters (for backward compatibility)
    if (!subjectId && !unitIds) {
      if (subject) {
        filter.subject = subject;
      }
      if (categoryId) {
        filter.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      }
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    // Get random question using aggregation
    const questions = await Question.aggregate([
      { $match: filter },
      { $sample: { size: 1 } },
      // Populate subjectId for returning subject info
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
      throw AppError.notFound('沒有找到符合條件的題目', ErrorCodes.QUESTION_NOT_FOUND);
    }

    const question = questions[0];

    // Don't send the correct answer to the client
    const questionForClient = {
      _id: question._id,
      // New hierarchy fields
      subjectId: question.subjectInfo?.[0] || null,
      unitId: question.unitInfo?.[0] || null,
      // Legacy fields
      subject: question.subject,
      categoryId: question.categoryId,
      difficulty: question.difficulty,
      type: question.type,
      content: question.content,
      options: question.options,
      baseExp: question.baseExp,
      baseGold: question.baseGold,
      adventureContext: question.adventureContext,
    };

    sendSuccess(res, questionForClient);
  } catch (error) {
    next(error);
  }
};

// GET /attempts/history - Get student's attempt history
export const getAttemptHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      QuestionAttempt.find({ studentId: req.auth.userId })
        .populate('questionId', 'subject type content.text difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QuestionAttempt.countDocuments({ studentId: req.auth.userId }),
    ]);

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, attempts, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /attempts/stats - Get student's stats summary
export const getStudentStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const studentId = req.auth.userId;

    // Get aggregated stats
    const [totalStats, subjectStats, recentAttempts] = await Promise.all([
      QuestionAttempt.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
            totalGold: { $sum: '$goldGained' },
          },
        },
      ]),
      QuestionAttempt.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
        {
          $lookup: {
            from: 'questions',
            localField: 'questionId',
            foreignField: '_id',
            as: 'question',
          },
        },
        { $unwind: '$question' },
        {
          $group: {
            _id: '$question.subject',
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
      ]),
      QuestionAttempt.find({ studentId })
        .populate('questionId', 'subject type content.text')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const stats = totalStats[0] || {
      totalAttempts: 0,
      correctAttempts: 0,
      totalExp: 0,
      totalGold: 0,
    };

    sendSuccess(res, {
      overview: {
        totalAttempts: stats.totalAttempts,
        correctAttempts: stats.correctAttempts,
        correctRate: stats.totalAttempts > 0
          ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
          : 0,
        totalExp: stats.totalExp,
        totalGold: stats.totalGold,
      },
      bySubject: subjectStats.map((s) => ({
        subject: s._id,
        attempts: s.attempts,
        correct: s.correct,
        correctRate: s.attempts > 0
          ? Math.round((s.correct / s.attempts) * 100)
          : 0,
      })),
      recentAttempts,
    });
  } catch (error) {
    next(error);
  }
};
