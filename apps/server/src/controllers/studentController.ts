import { Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User from '../models/User.js';
import QuestionAttempt from '../models/QuestionAttempt.js';
import PlayerStageProgress from '../models/PlayerStageProgress.js';
import Class from '../models/Class.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules
export const listStudentsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須大於 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須介於 1-100'),
  query('search').optional().isString().trim(),
  query('sortBy')
    .optional()
    .isIn(['displayName', 'level', 'exp', 'correctRate', 'totalQuestionsAnswered', 'createdAt', 'lastLoginAt'])
    .withMessage('無效的排序欄位'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('排序順序必須為 asc 或 desc'),
];

export const getStudentValidation = [
  param('studentId').isMongoId().withMessage('無效的學生 ID'),
];

export const getStudentAttemptsValidation = [
  param('studentId').isMongoId().withMessage('無效的學生 ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須大於 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每頁數量必須介於 1-100'),
  query('subjectId').optional().isMongoId().withMessage('無效的科目 ID'),
  query('unitId').optional().isMongoId().withMessage('無效的單元 ID'),
  query('isCorrect').optional().isIn(['true', 'false']).withMessage('isCorrect 必須為 true 或 false'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /students - List all students with stats (for teachers)
export const listStudents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build filter
    const filter: Record<string, unknown> = { role: 'student' };

    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sortField = sortBy.startsWith('studentProfile.')
      ? sortBy
      : ['level', 'exp', 'correctRate', 'totalQuestionsAnswered'].includes(sortBy)
        ? `studentProfile.${sortBy}`
        : sortBy;

    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    // Execute query
    const [students, total] = await Promise.all([
      User.find(filter)
        .select('displayName email avatarUrl studentProfile createdAt lastLoginAt')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Get attempt counts for all students in one query
    const studentIds = students.map((s) => s._id);
    const [attemptCounts, allClasses] = await Promise.all([
      QuestionAttempt.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        {
          $group: {
            _id: '$studentId',
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            lastAttemptAt: { $max: '$createdAt' },
          },
        },
      ]),
      // Get all classes that contain any of these students
      Class.find(
        { students: { $in: studentIds }, isActive: true },
        { _id: 1, name: 1, students: 1 }
      ).lean(),
    ]);

    // Create a map for quick lookup
    const attemptMap = new Map(
      attemptCounts.map((a) => [a._id.toString(), a])
    );

    // Create a map of student ID to their classes
    const studentClassesMap = new Map<string, { _id: string; name: string }[]>();
    for (const cls of allClasses) {
      for (const studentId of cls.students) {
        const sid = studentId.toString();
        if (!studentClassesMap.has(sid)) {
          studentClassesMap.set(sid, []);
        }
        studentClassesMap.get(sid)!.push({ _id: cls._id.toString(), name: cls.name });
      }
    }

    // Enrich students with attempt data and class info
    const enrichedStudents = students.map((student) => {
      const attempts = attemptMap.get(student._id.toString());
      const classes = studentClassesMap.get(student._id.toString()) || [];
      return {
        _id: student._id,
        displayName: student.displayName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        level: student.studentProfile?.level || 1,
        exp: student.studentProfile?.exp || 0,
        expToNextLevel: student.studentProfile?.expToNextLevel || 100,
        gold: student.studentProfile?.gold || 0,
        totalQuestionsAnswered: student.studentProfile?.totalQuestionsAnswered || 0,
        correctRate: student.studentProfile?.correctRate || 0,
        totalAttempts: attempts?.totalAttempts || 0,
        correctAttempts: attempts?.correctAttempts || 0,
        lastAttemptAt: attempts?.lastAttemptAt || null,
        createdAt: student.createdAt,
        lastLoginAt: student.lastLoginAt,
        classes, // 新增：學生所屬班級
      };
    });

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, enrichedStudents, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /students/:studentId - Get student details with stats
export const getStudent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { studentId } = req.params;

    // Get student and their classes
    const [student, studentClasses] = await Promise.all([
      User.findOne({
        _id: studentId,
        role: 'student',
      }).select('-passwordHash').lean(),
      Class.find(
        { students: new mongoose.Types.ObjectId(studentId), isActive: true },
        { _id: 1, name: 1 }
      ).lean(),
    ]);

    if (!student) {
      throw AppError.notFound('找不到該學生', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Format classes
    const classes = studentClasses.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
    }));

    // Get aggregated stats
    const [overallStats, subjectStats, unitStats, recentActivity, difficultyStats, weakUnits, stageProgress, learningTrend] = await Promise.all([
      // Overall stats
      QuestionAttempt.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
            totalGold: { $sum: '$goldGained' },
            avgTimeSeconds: { $avg: '$timeSpentSeconds' },
            firstAttemptAt: { $min: '$createdAt' },
            lastAttemptAt: { $max: '$createdAt' },
          },
        },
      ]),
      // Stats by subject (using new hierarchy)
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
          $lookup: {
            from: 'subjects',
            localField: 'question.subjectId',
            foreignField: '_id',
            as: 'subject',
          },
        },
        {
          $group: {
            _id: {
              subjectId: '$question.subjectId',
              legacySubject: '$question.subject',
            },
            subjectInfo: { $first: { $arrayElemAt: ['$subject', 0] } },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
          },
        },
        { $sort: { attempts: -1 } },
      ]),
      // Stats by unit
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
        { $match: { 'question.unitId': { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'units',
            localField: 'question.unitId',
            foreignField: '_id',
            as: 'unit',
          },
        },
        { $unwind: '$unit' },
        {
          $group: {
            _id: '$question.unitId',
            unitName: { $first: '$unit.name' },
            academicYear: { $first: '$unit.academicYear' },
            grade: { $first: '$unit.grade' },
            semester: { $first: '$unit.semester' },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
        { $sort: { attempts: -1 } },
        { $limit: 10 },
      ]),
      // Recent activity (last 7 days)
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            exp: { $sum: '$expGained' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Stats by difficulty
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
            _id: '$question.difficulty',
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            avgTime: { $avg: '$timeSpentSeconds' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Weak units (units with low correct rate, min 3 attempts)
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
        { $match: { 'question.unitId': { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'units',
            localField: 'question.unitId',
            foreignField: '_id',
            as: 'unit',
          },
        },
        { $unwind: '$unit' },
        {
          $group: {
            _id: '$question.unitId',
            unitName: { $first: '$unit.name' },
            academicYear: { $first: '$unit.academicYear' },
            grade: { $first: '$unit.grade' },
            semester: { $first: '$unit.semester' },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
        { $match: { attempts: { $gte: 3 } } },
        {
          $addFields: {
            correctRate: { $multiply: [{ $divide: ['$correct', '$attempts'] }, 100] },
          },
        },
        { $match: { correctRate: { $lt: 60 } } },
        { $sort: { correctRate: 1 } },
        { $limit: 5 },
      ]),
      // Stage progress
      PlayerStageProgress.aggregate([
        { $match: { playerId: new mongoose.Types.ObjectId(studentId) } },
        {
          $lookup: {
            from: 'stages',
            localField: 'stageId',
            foreignField: '_id',
            as: 'stage',
          },
        },
        { $unwind: '$stage' },
        {
          $project: {
            stageId: '$stageId',
            stageName: '$stage.name',
            stageIcon: '$stage.icon',
            order: '$stage.order',
            isUnlocked: 1,
            isCompleted: 1,
            completedAt: 1,
            bestScore: 1,
            totalAttempts: 1,
          },
        },
        { $sort: { order: 1 } },
      ]),
      // Learning trend (compare last 7 days vs previous 7 days)
      Promise.all([
        QuestionAttempt.aggregate([
          {
            $match: {
              studentId: new mongoose.Types.ObjectId(studentId),
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: null,
              attempts: { $sum: 1 },
              correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
              avgTime: { $avg: '$timeSpentSeconds' },
            },
          },
        ]),
        QuestionAttempt.aggregate([
          {
            $match: {
              studentId: new mongoose.Types.ObjectId(studentId),
              createdAt: {
                $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: null,
              attempts: { $sum: 1 },
              correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
              avgTime: { $avg: '$timeSpentSeconds' },
            },
          },
        ]),
      ]),
    ]);

    const stats = overallStats[0] || {
      totalAttempts: 0,
      correctAttempts: 0,
      totalExp: 0,
      totalGold: 0,
      avgTimeSeconds: 0,
    };

    // Process learning trend
    const [recentWeek, previousWeek] = learningTrend;
    const recentStats = recentWeek[0] || { attempts: 0, correct: 0, avgTime: 0 };
    const prevStats = previousWeek[0] || { attempts: 0, correct: 0, avgTime: 0 };

    const recentCorrectRate = recentStats.attempts > 0
      ? (recentStats.correct / recentStats.attempts) * 100
      : 0;
    const prevCorrectRate = prevStats.attempts > 0
      ? (prevStats.correct / prevStats.attempts) * 100
      : 0;

    sendSuccess(res, {
      student: {
        _id: student._id,
        displayName: student.displayName,
        email: student.email,
        avatarUrl: student.avatarUrl,
        level: student.studentProfile?.level || 1,
        exp: student.studentProfile?.exp || 0,
        expToNextLevel: student.studentProfile?.expToNextLevel || 100,
        gold: student.studentProfile?.gold || 0,
        createdAt: student.createdAt,
        lastLoginAt: student.lastLoginAt,
        classes, // 新增：學生所屬班級
      },
      stats: {
        overview: {
          totalAttempts: stats.totalAttempts,
          correctAttempts: stats.correctAttempts,
          correctRate: stats.totalAttempts > 0
            ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
            : 0,
          totalExp: stats.totalExp,
          totalGold: stats.totalGold,
          avgTimeSeconds: Math.round(stats.avgTimeSeconds || 0),
          firstAttemptAt: stats.firstAttemptAt,
          lastAttemptAt: stats.lastAttemptAt,
        },
        bySubject: subjectStats.map((s) => ({
          subjectId: s._id.subjectId,
          subjectName: s.subjectInfo?.name || s._id.legacySubject || '未分類',
          subjectIcon: s.subjectInfo?.icon || null,
          attempts: s.attempts,
          correct: s.correct,
          correctRate: s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0,
          totalExp: s.totalExp,
        })),
        byUnit: unitStats.map((u) => ({
          unitId: u._id,
          unitName: u.unitName,
          academicYear: u.academicYear,
          grade: u.grade,
          semester: u.semester,
          attempts: u.attempts,
          correct: u.correct,
          correctRate: u.attempts > 0 ? Math.round((u.correct / u.attempts) * 100) : 0,
        })),
        byDifficulty: difficultyStats.map((d: any) => ({
          difficulty: d._id || 'unknown',
          attempts: d.attempts,
          correct: d.correct,
          correctRate: d.attempts > 0 ? Math.round((d.correct / d.attempts) * 100) : 0,
          avgTime: Math.round(d.avgTime || 0),
        })),
        weakUnits: weakUnits.map((u: any) => ({
          unitId: u._id,
          unitName: u.unitName,
          academicYear: u.academicYear,
          grade: u.grade,
          semester: u.semester,
          attempts: u.attempts,
          correct: u.correct,
          correctRate: Math.round(u.correctRate),
        })),
        stageProgress: stageProgress.map((s: any) => ({
          stageId: s.stageId,
          stageName: s.stageName,
          stageIcon: s.stageIcon,
          order: s.order,
          isUnlocked: s.isUnlocked,
          isCompleted: s.isCompleted,
          completedAt: s.completedAt,
          bestScore: s.bestScore,
          totalAttempts: s.totalAttempts,
        })),
        learningTrend: {
          thisWeek: {
            attempts: recentStats.attempts,
            correct: recentStats.correct,
            correctRate: Math.round(recentCorrectRate),
            avgTime: Math.round(recentStats.avgTime || 0),
          },
          lastWeek: {
            attempts: prevStats.attempts,
            correct: prevStats.correct,
            correctRate: Math.round(prevCorrectRate),
            avgTime: Math.round(prevStats.avgTime || 0),
          },
          improvement: {
            attemptsChange: recentStats.attempts - prevStats.attempts,
            correctRateChange: Math.round(recentCorrectRate - prevCorrectRate),
            avgTimeChange: Math.round((recentStats.avgTime || 0) - (prevStats.avgTime || 0)),
          },
        },
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /students/:studentId/attempts - Get student's attempt history
export const getStudentAttempts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { studentId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const subjectId = req.query.subjectId as string | undefined;
    const unitId = req.query.unitId as string | undefined;
    const isCorrect = req.query.isCorrect as string | undefined;

    // Build match stage
    const matchStage: Record<string, unknown> = {
      studentId: new mongoose.Types.ObjectId(studentId),
    };

    if (isCorrect !== undefined) {
      matchStage.isCorrect = isCorrect === 'true';
    }

    // Build pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
    ];

    // Add subject/unit filters after lookup
    if (subjectId) {
      pipeline.push({
        $match: { 'question.subjectId': new mongoose.Types.ObjectId(subjectId) },
      });
    }
    if (unitId) {
      pipeline.push({
        $match: { 'question.unitId': new mongoose.Types.ObjectId(unitId) },
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await QuestionAttempt.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Get paginated results
    pipeline.push(
      {
        $lookup: {
          from: 'subjects',
          localField: 'question.subjectId',
          foreignField: '_id',
          as: 'subject',
        },
      },
      {
        $lookup: {
          from: 'units',
          localField: 'question.unitId',
          foreignField: '_id',
          as: 'unit',
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          submittedAnswer: 1,
          isCorrect: 1,
          timeSpentSeconds: 1,
          expGained: 1,
          goldGained: 1,
          createdAt: 1,
          question: {
            _id: '$question._id',
            type: '$question.type',
            difficulty: '$question.difficulty',
            content: '$question.content',
            answer: '$question.answer',
          },
          subject: { $arrayElemAt: ['$subject', 0] },
          unit: { $arrayElemAt: ['$unit', 0] },
        },
      }
    );

    const attempts = await QuestionAttempt.aggregate(pipeline);

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, attempts, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};
