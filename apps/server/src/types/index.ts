import { Request } from 'express';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User types
export type UserRole = 'student' | 'teacher' | 'admin';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

// AuthRequest - use this type for route handlers that require authentication
// We use 'auth' property instead of 'user' to avoid conflicts with passport's types
export interface AuthRequest extends Request {
  auth?: JwtPayload;
}

// Error codes
export const ErrorCodes = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',

  // Business logic errors
  INSUFFICIENT_GOLD: 'INSUFFICIENT_GOLD',
  LEVEL_REQUIREMENT_NOT_MET: 'LEVEL_REQUIREMENT_NOT_MET',
  INVALID_JOIN_CODE: 'INVALID_JOIN_CODE',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
