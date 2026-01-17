import api, { ApiResponse } from './api';

export interface QuizQuestion {
  _id: string;
  // New hierarchy fields
  subjectId?: {
    _id: string;
    name: string;
    code: string;
    icon: string;
  } | null;
  unitId?: {
    _id: string;
    name: string;
    academicYear: string;
    grade: number;
    semester: '上' | '下';
  } | null;
  // Legacy fields
  subject?: 'chinese' | 'math' | 'english' | 'science' | 'social';
  categoryId?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
  content: {
    text: string;
    media?: {
      type: 'image' | 'audio' | 'video';
      url: string;
    };
  };
  options?: {
    id: string;
    text: string;
    media?: {
      type: 'image' | 'audio' | 'video';
      url: string;
    };
  }[];
  baseExp?: number;
  baseGold?: number;
  adventureContext?: {
    monsterName?: string;
    monsterDescription?: string;
    backgroundImageUrl?: string;
  };
}

export interface UnlockedAchievement {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  expReward: number;
  goldReward: number;
}

export interface CompletedTask {
  taskId: string;
  name: string;
  icon: string;
  expReward: number;
  goldReward: number;
}

export interface AnswerResult {
  attemptId: string;
  isCorrect: boolean;
  correctAnswer: string | string[];
  explanation?: string;
  rewards: {
    exp: number;
    gold: number;
  };
  unlockedAchievements?: UnlockedAchievement[];
  completedTasks?: CompletedTask[];
}

export interface AttemptHistory {
  _id: string;
  questionId: {
    _id: string;
    subject: string;
    type: string;
    content: { text: string };
    difficulty: string;
  };
  submittedAnswer: string | string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  expGained: number;
  goldGained: number;
  createdAt: string;
}

export interface StudentStats {
  overview: {
    totalAttempts: number;
    correctAttempts: number;
    correctRate: number;
    totalExp: number;
    totalGold: number;
  };
  bySubject: {
    subject: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }[];
  recentAttempts: AttemptHistory[];
}

export interface GetRandomQuestionParams {
  // New hierarchy params (preferred)
  subjectId?: string;
  unitIds?: string[]; // Array of unit IDs for multi-unit selection
  // Legacy params
  subject?: 'chinese' | 'math' | 'english' | 'science' | 'social';
  difficulty?: 'easy' | 'medium' | 'hard';
  categoryId?: string;
}

export const attemptsService = {
  // Get a random question
  async getRandomQuestion(params: GetRandomQuestionParams = {}): Promise<QuizQuestion> {
    // Convert unitIds array to comma-separated string for API
    const apiParams: Record<string, string | undefined> = {};
    if (params.subjectId) apiParams.subjectId = params.subjectId;
    if (params.unitIds && params.unitIds.length > 0) {
      apiParams.unitIds = params.unitIds.join(',');
    }
    if (params.subject) apiParams.subject = params.subject;
    if (params.difficulty) apiParams.difficulty = params.difficulty;
    if (params.categoryId) apiParams.categoryId = params.categoryId;

    const response = await api.get<ApiResponse<QuizQuestion>>('/attempts/question/random', { params: apiParams });
    return response.data.data;
  },

  // Submit an answer
  async submitAnswer(
    questionId: string,
    answer: string | string[],
    timeSpentSeconds?: number
  ): Promise<AnswerResult> {
    const response = await api.post<ApiResponse<AnswerResult>>(`/attempts/${questionId}`, {
      answer,
      timeSpentSeconds,
    });
    return response.data.data;
  },

  // Get attempt history
  async getHistory(page = 1, limit = 20): Promise<{
    data: AttemptHistory[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get<
      ApiResponse<AttemptHistory[]> & {
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }
    >('/attempts/history', { params: { page, limit } });
    return {
      data: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  // Get student stats
  async getStats(): Promise<StudentStats> {
    const response = await api.get<ApiResponse<StudentStats>>('/attempts/stats');
    return response.data.data;
  },
};

export default attemptsService;
