import { Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const createSubjectValidation = [
  body('name').trim().notEmpty().withMessage('請提供科目名稱'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('請提供科目代碼')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('科目代碼只能包含小寫字母、數字和底線'),
  body('icon').optional().trim(),
  body('order').optional().isInt({ min: 0 }).toInt(),
];

export const updateSubjectValidation = [
  param('id').isMongoId().withMessage('無效的科目 ID'),
  body('name').optional().trim().notEmpty().withMessage('科目名稱不能為空'),
  body('code')
    .optional()
    .trim()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('科目代碼只能包含小寫字母、數字和底線'),
  body('icon').optional().trim(),
  body('order').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean(),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /subjects - List all subjects
export const listSubjects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const filter: Record<string, unknown> = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    const subjects = await Subject.find(filter).sort({ order: 1, name: 1 });
    sendSuccess(res, subjects);
  } catch (error) {
    next(error);
  }
};

// GET /subjects/:id - Get single subject
export const getSubject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw AppError.notFound('科目不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    sendSuccess(res, subject);
  } catch (error) {
    next(error);
  }
};

// POST /subjects - Create subject
export const createSubject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { name, code, icon, order } = req.body;

    // Check if code already exists
    const existing = await Subject.findOne({ code });
    if (existing) {
      throw AppError.badRequest('此科目代碼已存在', ErrorCodes.VALIDATION_ERROR);
    }

    const subject = await Subject.create({
      name,
      code,
      icon: icon || '📚',
      order: order ?? 0,
    });

    sendSuccess(res, subject, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /subjects/:id - Update subject
export const updateSubject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { name, code, icon, order, isActive } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw AppError.notFound('科目不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if new code conflicts with existing
    if (code && code !== subject.code) {
      const existing = await Subject.findOne({ code });
      if (existing) {
        throw AppError.badRequest('此科目代碼已存在', ErrorCodes.VALIDATION_ERROR);
      }
      subject.code = code;
    }

    if (name !== undefined) subject.name = name;
    if (icon !== undefined) subject.icon = icon;
    if (order !== undefined) subject.order = order;
    if (isActive !== undefined) subject.isActive = isActive;

    await subject.save();
    sendSuccess(res, subject);
  } catch (error) {
    next(error);
  }
};

// DELETE /subjects/:id - Delete subject
export const deleteSubject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      throw AppError.notFound('科目不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if there are units using this subject
    const unitCount = await Unit.countDocuments({ subjectId: subject._id });
    if (unitCount > 0) {
      throw AppError.badRequest(
        `無法刪除：此科目下有 ${unitCount} 個單元`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    await subject.deleteOne();
    sendSuccess(res, { message: '科目已刪除' });
  } catch (error) {
    next(error);
  }
};
