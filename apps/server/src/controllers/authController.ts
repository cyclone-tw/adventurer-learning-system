import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import User, { IUser } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { AuthRequest, ErrorCodes } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import { config } from '../config/index.js';

// Validation rules
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('請提供有效的電子郵件')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密碼至少需要 6 個字元'),
  body('displayName')
    .trim()
    .notEmpty()
    .withMessage('請提供顯示名稱')
    .isLength({ max: 50 })
    .withMessage('名稱不能超過 50 個字元'),
  body('role')
    .isIn(['student'])
    .withMessage('只有學生可以自行註冊'),
  body('classJoinCode')
    .optional()
    .isString(),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('請提供有效的電子郵件')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('請提供密碼'),
];

// Controller functions
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((e) => e.msg).join(', ');
      throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
    }

    const { email, password, displayName, role, classJoinCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.badRequest('此電子郵件已被註冊', ErrorCodes.VALIDATION_ERROR);
    }

    // Handle class join code for students
    let classId;
    if (role === 'student' && classJoinCode) {
      // TODO: Implement class join code validation when Class model is ready
      // const classDoc = await Class.findOne({ joinCode: classJoinCode });
      // if (!classDoc) {
      //   throw AppError.badRequest('班級代碼無效', ErrorCodes.INVALID_JOIN_CODE);
      // }
      // classId = classDoc._id;
    }

    // Create user
    const userData: Record<string, unknown> = {
      email,
      passwordHash: password, // Will be hashed by pre-save middleware
      displayName,
      role,
    };

    // Add classId to student profile if provided
    if (role === 'student' && classId) {
      userData.studentProfile = {
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        gold: 0,
        totalQuestionsAnswered: 0,
        correctRate: 0,
        stats: { chinese: 50, math: 50 },
        classId,
      };
    }

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    sendSuccess(res, {
      user: user.toPublicJSON(),
      token,
    }, 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((e) => e.msg).join(', ');
      throw AppError.badRequest(errorMessages, ErrorCodes.VALIDATION_ERROR);
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw AppError.unauthorized('帳號或密碼錯誤', ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw AppError.unauthorized('帳號或密碼錯誤', ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    sendSuccess(res, {
      user: user.toPublicJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.auth) {
      throw AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      throw AppError.notFound('使用者不存在', ErrorCodes.USER_NOT_FOUND);
    }

    sendSuccess(res, user.toPublicJSON());
  } catch (error) {
    next(error);
  }
};

// Google OAuth callback - generates JWT and redirects to frontend
export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // User is attached by passport after successful authentication
    const user = req.user as IUser;

    if (!user) {
      return res.redirect(`${config.frontendUrl}?error=google_auth_failed`);
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), user.role);

    // Redirect to frontend with token
    // Frontend will extract the token from URL and store it
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${config.frontendUrl}?error=google_auth_failed`);
  }
};
