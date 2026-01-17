import { ErrorCode, ErrorCodes } from '../types/index.js';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  // Factory methods for common errors
  static badRequest(message: string, code: ErrorCode = ErrorCodes.VALIDATION_ERROR) {
    return new AppError(code, message, 400);
  }

  static unauthorized(message: string = '未授權的請求', code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED) {
    return new AppError(code, message, 401);
  }

  static forbidden(message: string = '無權限執行此操作', code: ErrorCode = ErrorCodes.AUTH_UNAUTHORIZED) {
    return new AppError(code, message, 403);
  }

  static notFound(message: string, code: ErrorCode) {
    return new AppError(code, message, 404);
  }

  static internal(message: string = '伺服器內部錯誤') {
    return new AppError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}
