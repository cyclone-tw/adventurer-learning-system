import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';
import { ErrorCodes } from '../types/index.js';
import { config } from '../config/index.js';

// Not found handler
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  sendError(res, 'NOT_FOUND', `找不到路徑: ${req.originalUrl}`, 404);
};

// Global error handler
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('Error:', err);
  }

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.statusCode);
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    sendError(res, ErrorCodes.VALIDATION_ERROR, err.message, 400);
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, ErrorCodes.VALIDATION_ERROR, '無效的 ID 格式', 400);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, ErrorCodes.AUTH_TOKEN_INVALID, 'Token 無效', 401);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendError(res, ErrorCodes.AUTH_TOKEN_EXPIRED, 'Token 已過期', 401);
    return;
  }

  // Handle duplicate key error (MongoDB)
  if ((err as { code?: number }).code === 11000) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, '資料已存在', 400);
    return;
  }

  // Default to internal server error
  const message = config.nodeEnv === 'development' ? err.message : '伺服器內部錯誤';
  sendError(res, ErrorCodes.INTERNAL_ERROR, message, 500);
};
