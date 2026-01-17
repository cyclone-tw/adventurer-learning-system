// Question related types

export type Subject = 'chinese' | 'math' | 'english' | 'science' | 'social';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';

export interface MediaItem {
  type: 'image' | 'audio' | 'video';
  url: string;
  publicId?: string;
  caption?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface AdventureContext {
  description: string;
  monsterName?: string;
  monsterImageUrl?: string;
}

export interface QuestionContent {
  text: string;
  imageUrl?: string;
  media?: MediaItem[];
  adventureContext?: AdventureContext;
}

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuestionAnswer {
  correct: string | string[];
  explanation?: string;
}

export interface QuestionStats {
  totalAttempts: number;
  correctCount: number;
  avgTimeSeconds: number;
}

export interface Category {
  _id: string;
  subject: Subject;
  name: string;
  description?: string;
  order: number;
  questionCount?: number;
  mapConfig?: {
    mapName: string;
    backgroundColor?: string;
    iconUrl?: string;
  };
}

export interface Question {
  _id: string;
  // New hierarchy fields
  subjectId?: {
    _id: string;
    name: string;
    code: string;
    icon: string;
  } | string;
  unitId?: {
    _id: string;
    name: string;
    academicYear: string;
    grade: number;
    semester: '上' | '下';
  } | string;
  // Legacy fields (kept for backward compatibility)
  subject?: Subject;
  categoryId?: Category | string;
  tags: string[];
  difficulty: Difficulty;
  baseExp: number;
  baseGold: number;
  type: QuestionType;
  content: QuestionContent;
  options?: QuestionOption[];
  answer: QuestionAnswer;
  stats: QuestionStats;
  correctRate: number;
  createdBy: {
    _id: string;
    displayName: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFormData {
  // New hierarchy fields
  subjectId?: string;
  unitId?: string;
  // Legacy fields (for backward compatibility)
  subject?: Subject;
  categoryId?: string;
  difficulty: Difficulty;
  type: QuestionType;
  content: QuestionContent;
  options?: QuestionOption[];
  answer: QuestionAnswer;
  tags: string[];
  baseExp?: number;
  baseGold?: number;
}

export interface QuestionFilters {
  // New hierarchy fields
  subjectId?: string;
  unitId?: string;
  // Legacy fields
  subject?: Subject;
  categoryId?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  search?: string;
  page?: number;
  limit?: number;
}

// Subject display names
export const SUBJECT_NAMES: Record<Subject, string> = {
  chinese: '國語',
  math: '數學',
  english: '英語',
  science: '自然',
  social: '社會',
};

// Difficulty display names and colors
export const DIFFICULTY_CONFIG: Record<Difficulty, { name: string; color: string; bgColor: string }> = {
  easy: { name: '簡單', color: 'text-green-700', bgColor: 'bg-green-100' },
  medium: { name: '中等', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  hard: { name: '困難', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Question type display names
export const QUESTION_TYPE_NAMES: Record<QuestionType, string> = {
  single_choice: '單選題',
  multiple_choice: '多選題',
  fill_blank: '填空題',
  true_false: '是非題',
};

// Default rewards by difficulty
export const DEFAULT_REWARDS: Record<Difficulty, { exp: number; gold: number }> = {
  easy: { exp: 10, gold: 5 },
  medium: { exp: 20, gold: 10 },
  hard: { exp: 30, gold: 15 },
};
