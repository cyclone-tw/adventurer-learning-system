import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import Question from '../models/Question.js';
import Category from '../models/Category.js';
import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules - updated to support new curriculum hierarchy
export const createQuestionValidation = [
  // New curriculum hierarchy (preferred)
  body('subjectId')
    .optional()
    .isMongoId()
    .withMessage('無效的科目 ID'),
  body('unitId')
    .optional()
    .isMongoId()
    .withMessage('無效的單元 ID'),
  // Legacy fields (backward compatibility)
  body('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social'])
    .withMessage('無效的學科'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('無效的分類 ID'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('無效的難度'),
  body('type')
    .isIn(['single_choice', 'multiple_choice', 'fill_blank', 'true_false'])
    .withMessage('無效的題型'),
  body('content.text')
    .notEmpty()
    .withMessage('請提供題目內容'),
  body('answer.correct')
    .notEmpty()
    .withMessage('請提供正確答案'),
  body('baseExp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('經驗值必須為非負整數'),
  body('baseGold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('金幣必須為非負整數'),
];

export const updateQuestionValidation = [
  param('id').isMongoId().withMessage('無效的題目 ID'),
  body('subjectId')
    .optional()
    .isMongoId()
    .withMessage('無效的科目 ID'),
  body('unitId')
    .optional()
    .isMongoId()
    .withMessage('無效的單元 ID'),
  body('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social'])
    .withMessage('無效的學科'),
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('無效的分類 ID'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('無效的難度'),
];

export const listQuestionsValidation = [
  query('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social']),
  query('subjectId').optional().isMongoId(),
  query('unitId').optional().isMongoId(),
  query('categoryId').optional().isMongoId(),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

// Helper to check validation errors
const checkValidation = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /questions - List questions with filters and pagination
export const listQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const {
      subject,
      subjectId,
      unitId,
      categoryId,
      difficulty,
      type,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    // Build query
    const query: Record<string, unknown> = { isActive: true };

    // New hierarchy fields (preferred)
    if (subjectId) query.subjectId = subjectId;
    if (unitId) query.unitId = unitId;
    // Legacy fields
    if (subject) query.subject = subject;
    if (categoryId) query.categoryId = categoryId;
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;

    // Search in content.text
    if (search) {
      query['content.text'] = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('subjectId', 'name icon code')
        .populate('unitId', 'name academicYear grade semester')
        .populate('categoryId', 'name subject')
        .populate('createdBy', 'displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Question.countDocuments(query),
    ]);

    sendPaginated(res, questions, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

// GET /questions/:id - Get single question
export const getQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id)
      .populate('subjectId', 'name icon code')
      .populate('unitId', 'name academicYear grade semester')
      .populate('categoryId', 'name subject')
      .populate('createdBy', 'displayName');

    if (!question) {
      throw AppError.notFound('題目不存在', ErrorCodes.QUESTION_NOT_FOUND);
    }

    sendSuccess(res, question);
  } catch (error) {
    next(error);
  }
};

// POST /questions - Create new question
export const createQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const { subjectId, unitId, categoryId } = req.body;

    // Verify subject exists (new hierarchy)
    if (subjectId) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw AppError.badRequest('科目不存在', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Verify unit exists and belongs to subject (new hierarchy)
    if (unitId) {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        throw AppError.badRequest('單元不存在', ErrorCodes.VALIDATION_ERROR);
      }
      // Verify unit belongs to the selected subject
      if (subjectId && unit.subjectId.toString() !== subjectId) {
        throw AppError.badRequest('單元不屬於選擇的科目', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Verify category exists (legacy)
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        throw AppError.badRequest('分類不存在', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Create question
    const question = await Question.create({
      ...req.body,
      createdBy: req.auth.userId,
    });

    // Populate for response
    await question.populate('subjectId', 'name icon code');
    await question.populate('unitId', 'name academicYear grade semester');
    await question.populate('categoryId', 'name subject');
    await question.populate('createdBy', 'displayName');

    sendSuccess(res, question, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /questions/:id - Update question
export const updateQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { id } = req.params;
    const { subjectId, unitId, categoryId } = req.body;

    // Check if question exists
    const question = await Question.findById(id);
    if (!question) {
      throw AppError.notFound('題目不存在', ErrorCodes.QUESTION_NOT_FOUND);
    }

    // If changing subject, verify it exists
    if (subjectId) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw AppError.badRequest('科目不存在', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // If changing unit, verify it exists and belongs to subject
    if (unitId) {
      const unit = await Unit.findById(unitId);
      if (!unit) {
        throw AppError.badRequest('單元不存在', ErrorCodes.VALIDATION_ERROR);
      }
      // Use new subjectId if provided, otherwise use question's existing subjectId
      const targetSubjectId = subjectId || question.subjectId?.toString();
      if (targetSubjectId && unit.subjectId.toString() !== targetSubjectId) {
        throw AppError.badRequest('單元不屬於選擇的科目', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // If changing category, verify it exists (legacy)
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        throw AppError.badRequest('分類不存在', ErrorCodes.VALIDATION_ERROR);
      }
    }

    // Update question
    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('subjectId', 'name icon code')
      .populate('unitId', 'name academicYear grade semester')
      .populate('categoryId', 'name subject')
      .populate('createdBy', 'displayName');

    sendSuccess(res, updatedQuestion);
  } catch (error) {
    next(error);
  }
};

// DELETE /questions/:id - Soft delete question
export const deleteQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);
    if (!question) {
      throw AppError.notFound('題目不存在', ErrorCodes.QUESTION_NOT_FOUND);
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    sendSuccess(res, { message: '題目已刪除' });
  } catch (error) {
    next(error);
  }
};

// GET /questions/random - Get random questions for students
export const getRandomQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subject, difficulty, count = '1', excludeIds, categoryId } = req.query;

    if (!subject) {
      throw AppError.badRequest('請提供學科', ErrorCodes.VALIDATION_ERROR);
    }

    const countNum = Math.min(parseInt(count as string, 10) || 1, 10);
    const excludeIdArray = excludeIds
      ? (excludeIds as string).split(',').filter(Boolean)
      : [];

    // Use the static method on Question model
    const questions = await (Question as any).getRandom(subject as string, countNum, {
      difficulty: difficulty as string,
      excludeIds: excludeIdArray,
      categoryId: categoryId as string,
    });

    sendSuccess(res, countNum === 1 ? questions[0] : questions);
  } catch (error) {
    next(error);
  }
};
