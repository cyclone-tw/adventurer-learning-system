import { Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import QuestionAttempt from '../models/QuestionAttempt.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('無效的開始日期格式'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('無效的結束日期格式'),
  query('classId')
    .optional()
    .isMongoId()
    .withMessage('無效的班級 ID'),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// Helper to get date range filter
const getDateFilter = (startDate?: string, endDate?: string) => {
  const filter: Record<string, unknown> = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = end;
    }
  }
  return filter;
};

// GET /reports/dashboard - Get overall dashboard statistics
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const teacherId = req.auth.userId;

    // Get teacher's classes
    const classes = await Class.find({ teacherId, isActive: true });
    const classIds = classes.map((c) => c._id);
    const studentIds = classes.flatMap((c) => c.students);

    // Get overall stats
    const [
      totalStudents,
      totalQuestions,
      totalAttempts,
      correctAttempts,
      todayAttempts,
      weeklyTrend,
      recentActivity,
      studentsNeedingAttention,
    ] = await Promise.all([
      // Total unique students in teacher's classes
      User.countDocuments({ _id: { $in: studentIds }, role: 'student' }),
      // Total questions created by teacher
      Question.countDocuments({ createdBy: teacherId, isActive: true }),
      // Total attempts by students in teacher's classes
      QuestionAttempt.countDocuments({ studentId: { $in: studentIds } }),
      // Correct attempts
      QuestionAttempt.countDocuments({ studentId: { $in: studentIds }, isCorrect: true }),
      // Today's attempts
      QuestionAttempt.countDocuments({
        studentId: { $in: studentIds },
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      // Weekly trend (last 7 days)
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Recent activity (last 10 attempts)
      QuestionAttempt.find({ studentId: { $in: studentIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('studentId', 'displayName avatarUrl')
        .populate('questionId', 'content.text subject difficulty')
        .lean(),
      // Students needing attention (low correct rate with >= 10 attempts)
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: '$studentId',
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
        {
          $match: {
            attempts: { $gte: 5 },
            $expr: { $lt: [{ $divide: ['$correct', '$attempts'] }, 0.5] },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: '$student' },
        {
          $project: {
            _id: 1,
            name: '$student.displayName',
            avatarUrl: '$student.avatarUrl',
            attempts: 1,
            correct: 1,
            correctRate: {
              $multiply: [{ $divide: ['$correct', '$attempts'] }, 100],
            },
          },
        },
        { $sort: { correctRate: 1 } },
        { $limit: 5 },
      ]),
    ]);

    const correctRate = totalAttempts > 0
      ? Math.round((correctAttempts / totalAttempts) * 100)
      : 0;

    sendSuccess(res, {
      overview: {
        totalClasses: classes.length,
        totalStudents,
        totalQuestions,
        totalAttempts,
        correctRate,
        todayAttempts,
      },
      weeklyTrend: weeklyTrend.map((day) => ({
        date: day._id,
        attempts: day.attempts,
        correct: day.correct,
        correctRate: day.attempts > 0
          ? Math.round((day.correct / day.attempts) * 100)
          : 0,
      })),
      classes: classes.map((c) => ({
        _id: c._id,
        name: c.name,
        studentCount: c.students.length,
      })),
      recentActivity: recentActivity.map((a: any) => ({
        _id: a._id,
        student: {
          _id: a.studentId?._id,
          name: a.studentId?.displayName || '未知學生',
          avatarUrl: a.studentId?.avatarUrl,
        },
        question: {
          text: a.questionId?.content?.text || '題目已刪除',
          subject: a.questionId?.subject,
          difficulty: a.questionId?.difficulty,
        },
        isCorrect: a.isCorrect,
        expGained: a.expGained,
        createdAt: a.createdAt,
      })),
      studentsNeedingAttention: studentsNeedingAttention.map((s: any) => ({
        _id: s._id,
        name: s.name,
        avatarUrl: s.avatarUrl,
        attempts: s.attempts,
        correct: s.correct,
        correctRate: Math.round(s.correctRate),
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/class/:classId - Get class report
export const getClassReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    // Get class
    const classDoc = await Class.findById(classId).populate('students', 'name email studentProfile');
    if (!classDoc) {
      throw AppError.notFound('班級不存在', ErrorCodes.NOT_FOUND);
    }

    // Verify teacher owns this class
    if (classDoc.teacherId.toString() !== req.auth.userId && req.auth.role !== 'admin') {
      throw AppError.forbidden('無權限查看此班級', ErrorCodes.AUTH_FORBIDDEN);
    }

    const studentIds = classDoc.students.map((s: any) => s._id);
    const dateFilter = getDateFilter(startDate as string, endDate as string);

    // Get class stats
    const [attemptStats, subjectStats, topStudents] = await Promise.all([
      // Overall attempt stats
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
            avgTimeSpent: { $avg: '$timeSpentSeconds' },
          },
        },
      ]),
      // Stats by subject
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
            ...dateFilter,
          },
        },
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
      // Top performing students
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: '$studentId',
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'student',
          },
        },
        { $unwind: '$student' },
        {
          $project: {
            _id: 1,
            name: '$student.name',
            attempts: 1,
            correct: 1,
            correctRate: {
              $cond: [
                { $gt: ['$attempts', 0] },
                { $multiply: [{ $divide: ['$correct', '$attempts'] }, 100] },
                0,
              ],
            },
            totalExp: 1,
          },
        },
        { $sort: { totalExp: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const stats = attemptStats[0] || {
      totalAttempts: 0,
      correctAttempts: 0,
      totalExp: 0,
      avgTimeSpent: 0,
    };

    sendSuccess(res, {
      class: {
        _id: classDoc._id,
        name: classDoc.name,
        description: classDoc.description,
        studentCount: classDoc.students.length,
        inviteCode: classDoc.inviteCode,
      },
      stats: {
        totalAttempts: stats.totalAttempts,
        correctAttempts: stats.correctAttempts,
        correctRate: stats.totalAttempts > 0
          ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
          : 0,
        totalExp: stats.totalExp,
        avgTimeSpent: Math.round(stats.avgTimeSpent || 0),
      },
      bySubject: subjectStats.map((s) => ({
        subject: s._id,
        attempts: s.attempts,
        correct: s.correct,
        correctRate: s.attempts > 0
          ? Math.round((s.correct / s.attempts) * 100)
          : 0,
      })),
      topStudents: topStudents.map((s) => ({
        _id: s._id,
        name: s.name,
        attempts: s.attempts,
        correct: s.correct,
        correctRate: Math.round(s.correctRate),
        totalExp: s.totalExp,
      })),
      students: classDoc.students.map((s: any) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        level: s.studentProfile?.level || 1,
        exp: s.studentProfile?.exp || 0,
        correctRate: s.studentProfile?.correctRate || 0,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/student/:studentId - Get individual student report
export const getStudentReport = async (
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
    const { startDate, endDate } = req.query;

    // Get student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw AppError.notFound('學生不存在', ErrorCodes.USER_NOT_FOUND);
    }

    // Verify teacher has access to this student (student is in one of their classes)
    const teacherClasses = await Class.find({
      teacherId: req.auth.userId,
      students: studentId,
      isActive: true,
    });

    if (teacherClasses.length === 0 && req.auth.role !== 'admin') {
      throw AppError.forbidden('無權限查看此學生', ErrorCodes.AUTH_FORBIDDEN);
    }

    const dateFilter = getDateFilter(startDate as string, endDate as string);

    // Get student stats
    const [overallStats, subjectStats, difficultyStats, dailyTrend, recentAttempts] = await Promise.all([
      // Overall stats
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            ...dateFilter,
          },
        },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            correctAttempts: { $sum: { $cond: ['$isCorrect', 1, 0] } },
            totalExp: { $sum: '$expGained' },
            totalGold: { $sum: '$goldGained' },
            avgTimeSpent: { $avg: '$timeSpentSeconds' },
          },
        },
      ]),
      // By subject
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            ...dateFilter,
          },
        },
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
            avgTime: { $avg: '$timeSpentSeconds' },
          },
        },
      ]),
      // By difficulty
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            ...dateFilter,
          },
        },
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
          },
        },
      ]),
      // Daily trend (last 14 days)
      QuestionAttempt.aggregate([
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(studentId),
            createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Recent attempts
      QuestionAttempt.find({ studentId })
        .populate('questionId', 'subject type content.text difficulty')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const stats = overallStats[0] || {
      totalAttempts: 0,
      correctAttempts: 0,
      totalExp: 0,
      totalGold: 0,
      avgTimeSpent: 0,
    };

    sendSuccess(res, {
      student: {
        _id: student._id,
        name: student.displayName,
        email: student.email,
        avatar: student.avatarUrl,
        level: student.studentProfile?.level || 1,
        exp: student.studentProfile?.exp || 0,
        expToNextLevel: student.studentProfile?.expToNextLevel || 100,
        gold: student.studentProfile?.gold || 0,
        correctRate: student.studentProfile?.correctRate || 0,
        totalQuestionsAnswered: student.studentProfile?.totalQuestionsAnswered || 0,
      },
      stats: {
        totalAttempts: stats.totalAttempts,
        correctAttempts: stats.correctAttempts,
        correctRate: stats.totalAttempts > 0
          ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
          : 0,
        totalExp: stats.totalExp,
        totalGold: stats.totalGold,
        avgTimeSpent: Math.round(stats.avgTimeSpent || 0),
      },
      bySubject: subjectStats.map((s) => ({
        subject: s._id,
        attempts: s.attempts,
        correct: s.correct,
        correctRate: s.attempts > 0
          ? Math.round((s.correct / s.attempts) * 100)
          : 0,
        avgTime: Math.round(s.avgTime || 0),
      })),
      byDifficulty: difficultyStats.map((d) => ({
        difficulty: d._id,
        attempts: d.attempts,
        correct: d.correct,
        correctRate: d.attempts > 0
          ? Math.round((d.correct / d.attempts) * 100)
          : 0,
      })),
      dailyTrend: dailyTrend.map((day) => ({
        date: day._id,
        attempts: day.attempts,
        correct: day.correct,
        correctRate: day.attempts > 0
          ? Math.round((day.correct / day.attempts) * 100)
          : 0,
      })),
      recentAttempts: recentAttempts.map((a) => ({
        _id: a._id,
        question: a.questionId,
        isCorrect: a.isCorrect,
        timeSpent: a.timeSpentSeconds,
        expGained: a.expGained,
        goldGained: a.goldGained,
        createdAt: a.createdAt,
      })),
      classes: teacherClasses.map((c) => ({
        _id: c._id,
        name: c.name,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// GET /reports/questions - Get question analysis report
export const getQuestionAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { startDate, endDate, classId } = req.query;
    const teacherId = req.auth.userId;

    // Build student filter if classId provided
    let studentFilter: mongoose.Types.ObjectId[] = [];
    if (classId) {
      const classDoc = await Class.findById(classId);
      if (classDoc && classDoc.teacherId.toString() === teacherId) {
        studentFilter = classDoc.students.map((id) => new mongoose.Types.ObjectId(id));
      }
    }

    const dateFilter = getDateFilter(startDate as string, endDate as string);

    // Get question performance
    const questionStats = await QuestionAttempt.aggregate([
      {
        $match: {
          ...(studentFilter.length > 0 ? { studentId: { $in: studentFilter } } : {}),
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$questionId',
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          avgTime: { $avg: '$timeSpentSeconds' },
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      // Filter to only teacher's questions
      { $match: { 'question.createdBy': new mongoose.Types.ObjectId(teacherId) } },
      {
        $project: {
          _id: 1,
          attempts: 1,
          correct: 1,
          correctRate: {
            $cond: [
              { $gt: ['$attempts', 0] },
              { $multiply: [{ $divide: ['$correct', '$attempts'] }, 100] },
              0,
            ],
          },
          avgTime: 1,
          question: {
            _id: '$question._id',
            subject: '$question.subject',
            difficulty: '$question.difficulty',
            type: '$question.type',
            content: '$question.content.text',
          },
        },
      },
      { $sort: { attempts: -1 } },
    ]);

    // Categorize questions
    const hardQuestions = questionStats
      .filter((q) => q.correctRate < 40 && q.attempts >= 5)
      .slice(0, 10);
    const easyQuestions = questionStats
      .filter((q) => q.correctRate > 80 && q.attempts >= 5)
      .slice(0, 10);
    const mostAttempted = questionStats.slice(0, 10);

    // Summary by difficulty
    const byDifficulty = await QuestionAttempt.aggregate([
      {
        $match: {
          ...(studentFilter.length > 0 ? { studentId: { $in: studentFilter } } : {}),
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      { $match: { 'question.createdBy': new mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: '$question.difficulty',
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
    ]);

    // Summary by type
    const byType = await QuestionAttempt.aggregate([
      {
        $match: {
          ...(studentFilter.length > 0 ? { studentId: { $in: studentFilter } } : {}),
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      { $match: { 'question.createdBy': new mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: '$question.type',
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
    ]);

    sendSuccess(res, {
      summary: {
        totalQuestions: questionStats.length,
        totalAttempts: questionStats.reduce((sum, q) => sum + q.attempts, 0),
        avgCorrectRate: questionStats.length > 0
          ? Math.round(
              questionStats.reduce((sum, q) => sum + q.correctRate, 0) / questionStats.length
            )
          : 0,
      },
      byDifficulty: byDifficulty.map((d) => ({
        difficulty: d._id,
        attempts: d.attempts,
        correct: d.correct,
        correctRate: d.attempts > 0
          ? Math.round((d.correct / d.attempts) * 100)
          : 0,
      })),
      byType: byType.map((t) => ({
        type: t._id,
        attempts: t.attempts,
        correct: t.correct,
        correctRate: t.attempts > 0
          ? Math.round((t.correct / t.attempts) * 100)
          : 0,
      })),
      hardQuestions: hardQuestions.map((q) => ({
        ...q.question,
        attempts: q.attempts,
        correctRate: Math.round(q.correctRate),
        avgTime: Math.round(q.avgTime || 0),
      })),
      easyQuestions: easyQuestions.map((q) => ({
        ...q.question,
        attempts: q.attempts,
        correctRate: Math.round(q.correctRate),
        avgTime: Math.round(q.avgTime || 0),
      })),
      mostAttempted: mostAttempted.map((q) => ({
        ...q.question,
        attempts: q.attempts,
        correctRate: Math.round(q.correctRate),
        avgTime: Math.round(q.avgTime || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
};
