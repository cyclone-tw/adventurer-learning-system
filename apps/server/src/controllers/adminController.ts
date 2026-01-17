import { Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import User from '../models/User.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import bcrypt from 'bcryptjs';

// Validation rules
export const createUserValidation = [
  body('email')
    .isEmail()
    .withMessage('請提供有效的電子郵件')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('密碼至少需要 6 個字元'),
  body('displayName')
    .trim()
    .notEmpty()
    .withMessage('請提供顯示名稱')
    .isLength({ max: 50 })
    .withMessage('名稱不能超過 50 個字元'),
  body('role')
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('角色必須是 student、teacher 或 admin'),
];

export const updateUserValidation = [
  param('id').isMongoId().withMessage('無效的使用者 ID'),
  body('displayName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('顯示名稱不能為空')
    .isLength({ max: 50 })
    .withMessage('名稱不能超過 50 個字元'),
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('角色必須是 student、teacher 或 admin'),
];

export const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['student', 'teacher', 'admin']),
  query('search').optional().isString().trim(),
];

// Helper to check validation
const checkValidation = (req: AuthRequest) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
  }
};

// GET /admin/users - List all users with pagination and filters
export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    // Build filter
    const filter: Record<string, unknown> = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    sendPaginated(res, users, { page, limit, total, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /admin/users/:id - Get single user details
export const getUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      throw AppError.notFound('使用者不存在', ErrorCodes.USER_NOT_FOUND);
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

// POST /admin/users - Create new user (teacher or admin)
export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { email, password, displayName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.badRequest('此電子郵件已被註冊', ErrorCodes.VALIDATION_ERROR);
    }

    // Create user data
    const userData: Record<string, unknown> = {
      email,
      displayName,
      role,
    };

    // Add password if provided
    if (password) {
      userData.passwordHash = password; // Will be hashed by pre-save middleware
    }

    // Set profile based on role
    if (role === 'teacher' || role === 'admin') {
      userData.teacherProfile = { classIds: [] };
    } else if (role === 'student') {
      userData.studentProfile = {
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        gold: 0,
        totalQuestionsAnswered: 0,
        correctRate: 0,
        stats: { chinese: 50, math: 50 },
      };
    }

    const user = await User.create(userData);

    sendSuccess(res, user.toPublicJSON(), 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /admin/users/:id - Update user (change role, display name)
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    checkValidation(req);

    const { id } = req.params;
    const { displayName, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('使用者不存在', ErrorCodes.USER_NOT_FOUND);
    }

    // Prevent self-demotion from admin
    if (req.auth?.userId === id && user.role === 'admin' && role && role !== 'admin') {
      throw AppError.badRequest('無法降低自己的管理員權限', ErrorCodes.VALIDATION_ERROR);
    }

    // Update display name if provided
    if (displayName) {
      user.displayName = displayName;
    }

    // Handle role change
    if (role && role !== user.role) {
      const oldRole = user.role;
      user.role = role;

      // Update profile based on new role
      if (role === 'student') {
        // Changing to student - add student profile if not exists
        if (!user.studentProfile) {
          user.studentProfile = {
            level: 1,
            exp: 0,
            expToNextLevel: 100,
            gold: 0,
            totalQuestionsAnswered: 0,
            correctRate: 0,
            stats: { chinese: 50, math: 50 },
          };
        }
        user.teacherProfile = undefined;
      } else if (role === 'teacher' || role === 'admin') {
        // Changing to teacher/admin - add teacher profile if not exists
        if (!user.teacherProfile) {
          user.teacherProfile = { classIds: [] };
        }
        user.studentProfile = undefined;
      }
    }

    await user.save();

    sendSuccess(res, user.toPublicJSON());
  } catch (error) {
    next(error);
  }
};

// DELETE /admin/users/:id - Delete user (soft delete by deactivating)
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.auth?.userId === id) {
      throw AppError.badRequest('無法刪除自己的帳號', ErrorCodes.VALIDATION_ERROR);
    }

    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('使用者不存在', ErrorCodes.USER_NOT_FOUND);
    }

    // Hard delete for now (could implement soft delete later)
    await User.findByIdAndDelete(id);

    sendSuccess(res, { message: '使用者已刪除' });
  } catch (error) {
    next(error);
  }
};

// GET /admin/stats - Get admin dashboard statistics
export const getStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      User.countDocuments({ role: 'admin' }),
      User.find()
        .select('displayName email role createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalStudents,
      totalTeachers,
      totalAdmins,
      recentUsers,
    });
  } catch (error) {
    next(error);
  }
};
