// Shared types and constants for Adventurer Learning System

export const APP_NAME = '冒險者學習系統';

// User roles
export type UserRole = 'student' | 'teacher' | 'admin';

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Common constants
export const RARITY_LEVELS = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type RarityLevel = (typeof RARITY_LEVELS)[number];

export const SUBJECTS = ['math', 'chinese', 'english', 'science', 'social'] as const;
export type Subject = (typeof SUBJECTS)[number];
