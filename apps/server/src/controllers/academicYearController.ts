import { Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import AcademicYear from '../models/AcademicYear.js';
import Unit from '../models/Unit.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';

// Validation rules
export const createAcademicYearValidation = [
  body('year').trim().notEmpty().withMessage('請提供學年度'),
];

export const updateAcademicYearValidation = [
  param('id').isMongoId().withMessage('無效的學年度 ID'),
  body('year').optional().trim().notEmpty().withMessage('學年度不能為空'),
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

// GET /academic-years - List all academic years
export const listAcademicYears = async (
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

    const years = await AcademicYear.find(filter).sort({ year: -1 });
    sendSuccess(res, years);
  } catch (error) {
    next(error);
  }
};

// GET /academic-years/:id - Get single academic year
export const getAcademicYear = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      throw AppError.notFound('學年度不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    sendSuccess(res, year);
  } catch (error) {
    next(error);
  }
};

// POST /academic-years - Create academic year
export const createAcademicYear = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { year } = req.body;

    // Check if year already exists
    const existing = await AcademicYear.findOne({ year });
    if (existing) {
      throw AppError.badRequest('此學年度已存在', ErrorCodes.VALIDATION_ERROR);
    }

    const academicYear = await AcademicYear.create({ year });
    sendSuccess(res, academicYear, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /academic-years/:id - Update academic year
export const updateAcademicYear = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { year, isActive } = req.body;

    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      throw AppError.notFound('學年度不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if new year conflicts with existing
    if (year && year !== academicYear.year) {
      const existing = await AcademicYear.findOne({ year });
      if (existing) {
        throw AppError.badRequest('此學年度已存在', ErrorCodes.VALIDATION_ERROR);
      }
      academicYear.year = year;
    }

    if (isActive !== undefined) academicYear.isActive = isActive;

    await academicYear.save();
    sendSuccess(res, academicYear);
  } catch (error) {
    next(error);
  }
};

// DELETE /academic-years/:id - Delete academic year
export const deleteAcademicYear = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const academicYear = await AcademicYear.findById(req.params.id);
    if (!academicYear) {
      throw AppError.notFound('學年度不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if there are units using this academic year
    const unitCount = await Unit.countDocuments({ academicYear: academicYear.year });
    if (unitCount > 0) {
      throw AppError.badRequest(
        `無法刪除：此學年度下有 ${unitCount} 個單元`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    await academicYear.deleteOne();
    sendSuccess(res, { message: '學年度已刪除' });
  } catch (error) {
    next(error);
  }
};
