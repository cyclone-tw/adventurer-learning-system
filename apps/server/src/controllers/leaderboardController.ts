import { Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User.js';
import QuestionAttempt from '../models/QuestionAttempt.js';
import Class from '../models/Class.js';
import Item from '../models/Item.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const getLeaderboardValidation = [
  query('type')
    .optional()
    .isIn(['exp', 'level', 'gold', 'correctRate', 'questionsAnswered'])
    .withMessage('無效的排行榜類型'),
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'all'])
    .withMessage('無效的時間範圍'),
  query('classId')
    .optional()
    .isMongoId()
    .withMessage('無效的班級 ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('數量必須在 1-100 之間'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// Get time filter based on period
const getTimeFilter = (period: string): Date | null => {
  const now = new Date();
  switch (period) {
    case 'daily':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'weekly':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case 'monthly':
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    default:
      return null;
  }
};

// GET /leaderboard - Get leaderboard
export const getLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const type = (req.query.type as string) || 'exp';
    const period = (req.query.period as string) || 'all';
    const classId = req.query.classId as string;
    const limit = Number(req.query.limit) || 20;
    const currentUserId = req.auth.userId;

    // Build student filter
    let studentIds: mongoose.Types.ObjectId[] | null = null;

    if (classId) {
      // Get students from the specific class
      const classData = await Class.findById(classId).select('students');
      if (!classData) {
        throw AppError.notFound('找不到班級', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      studentIds = classData.students;
    }

    // Different query strategies based on type and period
    if (period === 'all') {
      // For all-time leaderboard, use user profile data directly
      const leaderboard = await getProfileBasedLeaderboard(
        type,
        limit,
        studentIds,
        currentUserId
      );
      sendSuccess(res, leaderboard);
    } else {
      // For time-based leaderboards, aggregate from attempts
      const timeFilter = getTimeFilter(period);
      const leaderboard = await getAttemptBasedLeaderboard(
        type,
        limit,
        studentIds,
        currentUserId,
        timeFilter
      );
      sendSuccess(res, leaderboard);
    }
  } catch (error) {
    next(error);
  }
};

// Get leaderboard from user profiles (all-time)
async function getProfileBasedLeaderboard(
  type: string,
  limit: number,
  studentIds: mongoose.Types.ObjectId[] | null,
  currentUserId: string
) {
  // Build match filter
  const matchFilter: Record<string, unknown> = { role: 'student' };
  if (studentIds) {
    matchFilter._id = { $in: studentIds };
  }

  // Build sort field
  let sortField: string;
  switch (type) {
    case 'level':
      sortField = 'studentProfile.level';
      break;
    case 'gold':
      sortField = 'studentProfile.gold';
      break;
    case 'correctRate':
      sortField = 'studentProfile.correctRate';
      break;
    case 'questionsAnswered':
      sortField = 'studentProfile.totalQuestionsAnswered';
      break;
    case 'exp':
    default:
      sortField = 'studentProfile.exp';
  }

  // Get top users
  const users = await User.find(matchFilter)
    .sort({ [sortField]: -1, 'studentProfile.level': -1 })
    .limit(limit)
    .select('displayName avatarUrl studentProfile.level studentProfile.exp studentProfile.gold studentProfile.correctRate studentProfile.totalQuestionsAnswered studentProfile.equippedItems.title')
    .lean();

  // Fetch title details for users who have equipped titles
  const titleIds = users
    .map((u) => u.studentProfile?.equippedItems?.title)
    .filter((id): id is mongoose.Types.ObjectId => !!id);

  const titles = titleIds.length > 0
    ? await Item.find({ _id: { $in: titleIds } }).select('name icon rarity').lean()
    : [];

  const titleMap = new Map(titles.map((t) => [t._id.toString(), t]));

  // Find current user's rank
  const currentUserRank = await findUserRank(matchFilter, sortField, currentUserId);

  // Get current user data if not in top list
  let currentUser = null;
  const isInTopList = users.some((u) => u._id.toString() === currentUserId);

  if (!isInTopList) {
    const userData = await User.findById(currentUserId)
      .select('displayName avatarUrl studentProfile.level studentProfile.exp studentProfile.gold studentProfile.correctRate studentProfile.totalQuestionsAnswered studentProfile.equippedItems.title')
      .lean();
    if (userData) {
      // Fetch title if equipped
      let userTitle = null;
      if (userData.studentProfile?.equippedItems?.title) {
        const titleItem = await Item.findById(userData.studentProfile.equippedItems.title)
          .select('name icon rarity')
          .lean();
        if (titleItem) {
          userTitle = { name: titleItem.name, icon: titleItem.icon, rarity: titleItem.rarity };
        }
      }

      currentUser = {
        ...userData,
        rank: currentUserRank,
        title: userTitle,
      };
    }
  }

  // Format leaderboard
  const leaderboard = users.map((user, index) => {
    const titleId = user.studentProfile?.equippedItems?.title?.toString();
    const title = titleId ? titleMap.get(titleId) : null;

    return {
      rank: index + 1,
      _id: user._id,
      name: user.displayName,
      avatar: user.avatarUrl,
      level: user.studentProfile?.level || 1,
      value: getValue(user, type),
      isCurrentUser: user._id.toString() === currentUserId,
      title: title
        ? { name: title.name, icon: title.icon, rarity: title.rarity }
        : null,
    };
  });

  return {
    type,
    period: 'all',
    leaderboard,
    currentUser: currentUser
      ? {
          rank: currentUserRank,
          _id: currentUser._id,
          name: currentUser.displayName,
          avatar: currentUser.avatarUrl,
          level: currentUser.studentProfile?.level || 1,
          value: getValue(currentUser, type),
          isCurrentUser: true,
          title: currentUser.title,
        }
      : null,
  };
}

// Get leaderboard from attempts (time-based)
async function getAttemptBasedLeaderboard(
  type: string,
  limit: number,
  studentIds: mongoose.Types.ObjectId[] | null,
  currentUserId: string,
  timeFilter: Date | null
) {
  // Build match filter
  const matchFilter: Record<string, unknown> = {};
  if (studentIds) {
    matchFilter.studentId = { $in: studentIds };
  }
  if (timeFilter) {
    matchFilter.createdAt = { $gte: timeFilter };
  }

  // Aggregate attempts
  const aggregation = await QuestionAttempt.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$studentId',
        totalExp: { $sum: '$expGained' },
        totalGold: { $sum: '$goldGained' },
        totalAttempts: { $sum: 1 },
        correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $addFields: {
        correctRate: {
          $cond: [
            { $gt: ['$totalAttempts', 0] },
            { $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] },
            0,
          ],
        },
      },
    },
    {
      $sort: getSortForType(type),
    },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: '$user._id',
        name: '$user.name',
        avatar: '$user.avatar',
        level: '$user.studentProfile.level',
        totalExp: 1,
        totalGold: 1,
        totalAttempts: 1,
        correctAttempts: 1,
        correctRate: 1,
      },
    },
  ]);

  // Find current user's data in the period
  const currentUserData = await QuestionAttempt.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(currentUserId),
        ...(timeFilter ? { createdAt: { $gte: timeFilter } } : {}),
      },
    },
    {
      $group: {
        _id: '$studentId',
        totalExp: { $sum: '$expGained' },
        totalGold: { $sum: '$goldGained' },
        totalAttempts: { $sum: 1 },
        correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $addFields: {
        correctRate: {
          $cond: [
            { $gt: ['$totalAttempts', 0] },
            { $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] },
            0,
          ],
        },
      },
    },
  ]);

  // Format leaderboard
  const leaderboard = aggregation.map((item, index) => ({
    rank: index + 1,
    _id: item._id,
    name: item.name,
    avatar: item.avatar,
    level: item.level || 1,
    value: getValueFromAggregation(item, type),
    isCurrentUser: item._id.toString() === currentUserId,
  }));

  // Calculate current user rank
  const currentUserInList = leaderboard.find((l) => l.isCurrentUser);
  let currentUser = null;

  if (!currentUserInList && currentUserData.length > 0) {
    const userData = await User.findById(currentUserId)
      .select('name avatar studentProfile.level')
      .lean();

    if (userData) {
      // Count how many users have better scores
      const userValue = getValueFromAggregation(currentUserData[0], type);
      const rankCount = await countBetterScores(matchFilter, type, userValue);

      currentUser = {
        rank: rankCount + 1,
        _id: userData._id,
        name: userData.displayName,
        avatar: userData.avatarUrl,
        level: userData.studentProfile?.level || 1,
        value: userValue,
        isCurrentUser: true,
      };
    }
  }

  return {
    type,
    period: timeFilter ? getPeriodName(timeFilter) : 'all',
    leaderboard,
    currentUser,
  };
}

// Helper functions
function getValue(user: any, type: string): number {
  switch (type) {
    case 'level':
      return user.studentProfile?.level || 1;
    case 'gold':
      return user.studentProfile?.gold || 0;
    case 'correctRate':
      return user.studentProfile?.correctRate || 0;
    case 'questionsAnswered':
      return user.studentProfile?.totalQuestionsAnswered || 0;
    case 'exp':
    default:
      return user.studentProfile?.exp || 0;
  }
}

function getValueFromAggregation(item: any, type: string): number {
  switch (type) {
    case 'gold':
      return Math.round(item.totalGold || 0);
    case 'correctRate':
      return Math.round(item.correctRate || 0);
    case 'questionsAnswered':
      return item.totalAttempts || 0;
    case 'exp':
    default:
      return Math.round(item.totalExp || 0);
  }
}

function getSortForType(type: string): Record<string, 1 | -1> {
  switch (type) {
    case 'gold':
      return { totalGold: -1 };
    case 'correctRate':
      return { correctRate: -1, totalAttempts: -1 };
    case 'questionsAnswered':
      return { totalAttempts: -1 };
    case 'exp':
    default:
      return { totalExp: -1 };
  }
}

async function findUserRank(
  matchFilter: Record<string, unknown>,
  sortField: string,
  userId: string
): Promise<number> {
  const user = await User.findById(userId).lean();
  if (!user) return 0;

  const userValue = sortField.split('.').reduce((obj, key) => obj?.[key], user as any) || 0;

  const betterCount = await User.countDocuments({
    ...matchFilter,
    [sortField]: { $gt: userValue },
  });

  return betterCount + 1;
}

async function countBetterScores(
  matchFilter: Record<string, unknown>,
  type: string,
  userValue: number
): Promise<number> {
  const fieldMap: Record<string, string> = {
    exp: 'totalExp',
    gold: 'totalGold',
    correctRate: 'correctRate',
    questionsAnswered: 'totalAttempts',
  };

  const field = fieldMap[type] || 'totalExp';

  const result = await QuestionAttempt.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$studentId',
        totalExp: { $sum: '$expGained' },
        totalGold: { $sum: '$goldGained' },
        totalAttempts: { $sum: 1 },
        correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
      },
    },
    {
      $addFields: {
        correctRate: {
          $cond: [
            { $gt: ['$totalAttempts', 0] },
            { $multiply: [{ $divide: ['$correctAttempts', '$totalAttempts'] }, 100] },
            0,
          ],
        },
      },
    },
    { $match: { [field]: { $gt: userValue } } },
    { $count: 'count' },
  ]);

  return result[0]?.count || 0;
}

function getPeriodName(timeFilter: Date): string {
  const now = new Date();
  const diff = now.getTime() - timeFilter.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days <= 1) return 'daily';
  if (days <= 7) return 'weekly';
  return 'monthly';
}

// GET /leaderboard/my-rank - Get current user's ranks
export const getMyRanks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const userId = req.auth.userId;
    const user = await User.findById(userId).select('studentProfile').lean();

    if (!user) {
      throw AppError.notFound('找不到用戶', ErrorCodes.USER_NOT_FOUND);
    }

    // Calculate ranks for different categories
    const [expRank, levelRank, goldRank, correctRateRank] = await Promise.all([
      User.countDocuments({
        role: 'student',
        'studentProfile.exp': { $gt: user.studentProfile?.exp || 0 },
      }),
      User.countDocuments({
        role: 'student',
        'studentProfile.level': { $gt: user.studentProfile?.level || 1 },
      }),
      User.countDocuments({
        role: 'student',
        'studentProfile.gold': { $gt: user.studentProfile?.gold || 0 },
      }),
      User.countDocuments({
        role: 'student',
        'studentProfile.correctRate': { $gt: user.studentProfile?.correctRate || 0 },
      }),
    ]);

    const totalStudents = await User.countDocuments({ role: 'student' });

    sendSuccess(res, {
      userId,
      ranks: {
        exp: { rank: expRank + 1, total: totalStudents },
        level: { rank: levelRank + 1, total: totalStudents },
        gold: { rank: goldRank + 1, total: totalStudents },
        correctRate: { rank: correctRateRank + 1, total: totalStudents },
      },
      profile: user.studentProfile,
    });
  } catch (error) {
    next(error);
  }
};
