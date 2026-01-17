import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Unit from '../models/Unit.js';
import Subject from '../models/Subject.js';
import Question from '../models/Question.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules
export const listUnitsValidation = [
  query('subjectId').optional().isMongoId().withMessage('無效的科目 ID'),
  query('academicYear').optional().isString(),
  query('grade').optional().isInt({ min: 1, max: 6 }).toInt(),
  query('semester').optional().isIn(['上', '下']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createUnitValidation = [
  body('name').trim().notEmpty().withMessage('請提供單元名稱'),
  body('subjectId').isMongoId().withMessage('請選擇科目'),
  body('academicYear').trim().notEmpty().withMessage('請提供學年度'),
  body('grade').isInt({ min: 1, max: 6 }).withMessage('年級必須在 1-6 之間').toInt(),
  body('semester').isIn(['上', '下']).withMessage('學期必須是「上」或「下」'),
  body('order').optional().isInt({ min: 0 }).toInt(),
];

export const updateUnitValidation = [
  param('id').isMongoId().withMessage('無效的單元 ID'),
  body('name').optional().trim().notEmpty().withMessage('單元名稱不能為空'),
  body('subjectId').optional().isMongoId().withMessage('無效的科目 ID'),
  body('academicYear').optional().trim().notEmpty().withMessage('學年度不能為空'),
  body('grade').optional().isInt({ min: 1, max: 6 }).withMessage('年級必須在 1-6 之間').toInt(),
  body('semester').optional().isIn(['上', '下']).withMessage('學期必須是「上」或「下」'),
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

// GET /units - List units with filters
export const listUnits = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === 'true';

    // Build filter
    const filter: Record<string, unknown> = {};

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (req.query.subjectId) {
      filter.subjectId = new mongoose.Types.ObjectId(req.query.subjectId as string);
    }

    if (req.query.academicYear) {
      filter.academicYear = req.query.academicYear;
    }

    if (req.query.grade) {
      filter.grade = Number(req.query.grade);
    }

    if (req.query.semester) {
      filter.semester = req.query.semester;
    }

    const [units, total] = await Promise.all([
      Unit.find(filter)
        .populate('subjectId', 'name code icon')
        .sort({ academicYear: -1, grade: 1, semester: 1, order: 1, name: 1 })
        .skip(skip)
        .limit(limit),
      Unit.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, units, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /units/:id - Get single unit
export const getUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const unit = await Unit.findById(req.params.id).populate('subjectId', 'name code icon');
    if (!unit) {
      throw AppError.notFound('單元不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }
    sendSuccess(res, unit);
  } catch (error) {
    next(error);
  }
};

// POST /units - Create unit
export const createUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { name, subjectId, academicYear, grade, semester, order } = req.body;

    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      throw AppError.notFound('科目不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    const unit = await Unit.create({
      name,
      subjectId,
      academicYear,
      grade,
      semester,
      order: order ?? 0,
    });

    // Populate and return
    await unit.populate('subjectId', 'name code icon');
    sendSuccess(res, unit, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /units/:id - Update unit
export const updateUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { name, subjectId, academicYear, grade, semester, order, isActive } = req.body;

    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      throw AppError.notFound('單元不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if new subject exists
    if (subjectId && subjectId !== unit.subjectId.toString()) {
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw AppError.notFound('科目不存在', ErrorCodes.RESOURCE_NOT_FOUND);
      }
      unit.subjectId = subjectId;
    }

    if (name !== undefined) unit.name = name;
    if (academicYear !== undefined) unit.academicYear = academicYear;
    if (grade !== undefined) unit.grade = grade;
    if (semester !== undefined) unit.semester = semester;
    if (order !== undefined) unit.order = order;
    if (isActive !== undefined) unit.isActive = isActive;

    await unit.save();
    await unit.populate('subjectId', 'name code icon');
    sendSuccess(res, unit);
  } catch (error) {
    next(error);
  }
};

// DELETE /units/:id - Delete unit
export const deleteUnit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) {
      throw AppError.notFound('單元不存在', ErrorCodes.RESOURCE_NOT_FOUND);
    }

    // Check if there are questions using this unit
    const questionCount = await Question.countDocuments({ unitId: unit._id });
    if (questionCount > 0) {
      throw AppError.badRequest(
        `無法刪除：此單元下有 ${questionCount} 道題目`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    await unit.deleteOne();
    sendSuccess(res, { message: '單元已刪除' });
  } catch (error) {
    next(error);
  }
};

// GET /units/grouped - Get units grouped by subject and grade
export const getUnitsGrouped = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const units = await Unit.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
      { $match: { 'subject.isActive': true } },
      {
        $group: {
          _id: {
            subjectId: '$subjectId',
            subjectName: '$subject.name',
            subjectCode: '$subject.code',
            subjectIcon: '$subject.icon',
            academicYear: '$academicYear',
            grade: '$grade',
            semester: '$semester',
          },
          units: {
            $push: {
              _id: '$_id',
              name: '$name',
              order: '$order',
            },
          },
        },
      },
      {
        $sort: {
          '_id.subjectName': 1,
          '_id.academicYear': -1,
          '_id.grade': 1,
          '_id.semester': 1,
        },
      },
    ]);

    // Restructure for easier frontend consumption
    const grouped = units.map((item) => ({
      subject: {
        _id: item._id.subjectId,
        name: item._id.subjectName,
        code: item._id.subjectCode,
        icon: item._id.subjectIcon,
      },
      academicYear: item._id.academicYear,
      grade: item._id.grade,
      semester: item._id.semester,
      gradeLabel: `${item._id.academicYear}_${item._id.grade}${item._id.semester}`,
      units: item.units.sort((a: { order: number }, b: { order: number }) => a.order - b.order),
    }));

    sendSuccess(res, grouped);
  } catch (error) {
    next(error);
  }
};
