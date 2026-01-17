import { Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Category from '../models/Category.js';
import Question from '../models/Question.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

// Validation rules
export const createCategoryValidation = [
  body('subject')
    .isIn(['chinese', 'math', 'english', 'science', 'social'])
    .withMessage('無效的學科'),
  body('name')
    .notEmpty()
    .withMessage('請提供分類名稱')
    .isLength({ max: 100 })
    .withMessage('分類名稱不能超過 100 個字元'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述不能超過 500 個字元'),
  body('parentId').optional().isMongoId().withMessage('無效的父分類 ID'),
  body('order').optional().isInt({ min: 0 }).withMessage('排序必須為非負整數'),
];

export const updateCategoryValidation = [
  param('id').isMongoId().withMessage('無效的分類 ID'),
  body('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social'])
    .withMessage('無效的學科'),
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('分類名稱不能超過 100 個字元'),
];

export const listCategoriesValidation = [
  query('subject')
    .optional()
    .isIn(['chinese', 'math', 'english', 'science', 'social']),
];

// Helper to check validation errors
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /categories - List categories with optional subject filter
export const listCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { subject, includeCount = 'false' } = req.query;

    // Build query
    const query: Record<string, unknown> = { isActive: true };
    if (subject) query.subject = subject;

    // Get categories
    const categories = await Category.find(query)
      .sort({ subject: 1, order: 1, name: 1 })
      .lean();

    // Optionally include question count for each category
    if (includeCount === 'true') {
      const categoriesWithCount = await Promise.all(
        categories.map(async (cat) => {
          const questionCount = await Question.countDocuments({
            categoryId: cat._id,
            isActive: true,
          });
          return { ...cat, questionCount };
        })
      );
      sendSuccess(res, categoriesWithCount);
    } else {
      sendSuccess(res, categories);
    }
  } catch (error) {
    next(error);
  }
};

// GET /categories/:id - Get single category
export const getCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      throw AppError.notFound('分類不存在', ErrorCodes.VALIDATION_ERROR);
    }

    // Get question count
    const questionCount = await Question.countDocuments({
      categoryId: category._id,
      isActive: true,
    });

    sendSuccess(res, { ...category.toObject(), questionCount });
  } catch (error) {
    next(error);
  }
};

// POST /categories - Create new category
export const createCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { subject, name, description, parentId, order, mapConfig } = req.body;

    // Check if category with same name exists in the same subject
    const existingCategory = await Category.findOne({
      subject,
      name,
      isActive: true,
    });

    if (existingCategory) {
      throw AppError.badRequest(
        '此學科下已存在相同名稱的分類',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // If parentId is provided, verify it exists
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        throw AppError.badRequest('父分類不存在', ErrorCodes.VALIDATION_ERROR);
      }
      if (parentCategory.subject !== subject) {
        throw AppError.badRequest(
          '父分類必須與子分類在相同學科下',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Create category
    const category = await Category.create({
      subject,
      name,
      description,
      parentId,
      order: order ?? 0,
      mapConfig,
    });

    sendSuccess(res, category, 201);
  } catch (error) {
    next(error);
  }
};

// PUT /categories/:id - Update category
export const updateCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { id } = req.params;

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('分類不存在', ErrorCodes.VALIDATION_ERROR);
    }

    const { name, subject } = req.body;

    // If changing name, check for duplicates
    if (name && name !== category.name) {
      const targetSubject = subject || category.subject;
      const existingCategory = await Category.findOne({
        subject: targetSubject,
        name,
        isActive: true,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw AppError.badRequest(
          '此學科下已存在相同名稱的分類',
          ErrorCodes.VALIDATION_ERROR
        );
      }
    }

    // Update category
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    sendSuccess(res, updatedCategory);
  } catch (error) {
    next(error);
  }
};

// DELETE /categories/:id - Soft delete category
export const deleteCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('分類不存在', ErrorCodes.VALIDATION_ERROR);
    }

    // Check if there are questions using this category
    const questionCount = await Question.countDocuments({
      categoryId: id,
      isActive: true,
    });

    if (questionCount > 0) {
      throw AppError.badRequest(
        `此分類下還有 ${questionCount} 道題目，請先移動或刪除題目`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    sendSuccess(res, { message: '分類已刪除' });
  } catch (error) {
    next(error);
  }
};

// GET /categories/subjects - Get subjects with category counts
export const getSubjectsWithCounts = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subjects = ['chinese', 'math', 'english', 'science', 'social'];
    const subjectNames: Record<string, string> = {
      chinese: '國語',
      math: '數學',
      english: '英語',
      science: '自然',
      social: '社會',
    };

    const result = await Promise.all(
      subjects.map(async (subject) => {
        const categoryCount = await Category.countDocuments({
          subject,
          isActive: true,
        });
        const questionCount = await Question.countDocuments({
          subject,
          isActive: true,
        });
        return {
          subject,
          name: subjectNames[subject],
          categoryCount,
          questionCount,
        };
      })
    );

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};
