import { Response } from 'express';
import { ApiResponse, PaginationInfo } from '../types/index.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  pagination?: PaginationInfo
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400
): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationInfo,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination,
  };

  res.status(statusCode).json(response);
};
