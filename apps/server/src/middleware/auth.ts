import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthRequest, JwtPayload, ErrorCodes, UserRole } from '../types/index.js';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';

// Verify JWT token middleware
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('請提供認證 Token', ErrorCodes.AUTH_TOKEN_INVALID);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw AppError.unauthorized('使用者不存在', ErrorCodes.USER_NOT_FOUND);
    }

    // Attach user info to request
    req.auth = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token 已過期', ErrorCodes.AUTH_TOKEN_EXPIRED));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Token 無效', ErrorCodes.AUTH_TOKEN_INVALID));
    } else {
      next(error);
    }
  }
};

// Role-based authorization middleware
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      return next(AppError.unauthorized('請先登入', ErrorCodes.AUTH_UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(AppError.forbidden('無權限執行此操作', ErrorCodes.AUTH_UNAUTHORIZED));
    }

    next();
  };
};

// Generate JWT token
export const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign(
    { userId, role } as JwtPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
};
