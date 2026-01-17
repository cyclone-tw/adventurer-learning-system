import api, { ApiResponse } from './api';
import { Unit } from './curriculum';

// Types
export type UnlockConditionType = 'none' | 'previous' | 'level' | 'stage';

export interface UnlockCondition {
  type: UnlockConditionType;
  value?: number | string;
}

export interface StageRewards {
  bonusExp: number;
  bonusGold: number;
  firstClearBonus?: {
    exp: number;
    gold: number;
  };
}

export interface Stage {
  _id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  unitIds: (Unit | string)[];
  difficulty?: ('easy' | 'medium' | 'hard')[];
  order: number;
  questionsPerSession: number;
  unlockCondition: UnlockCondition;
  rewards: StageRewards;
  isActive: boolean;
  questionCount?: number;
  createdBy: {
    _id: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StageForStudent {
  _id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  order: number;
  questionsPerSession: number;
  rewards: StageRewards;
  units: Unit[];
  // Progress
  isUnlocked: boolean;
  isCompleted: boolean;
  completedAt?: string;
  bestScore: number;
  totalAttempts: number;
}

export interface CreateStageData {
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  unitIds: string[];
  difficulty?: ('easy' | 'medium' | 'hard')[];
  order?: number;
  questionsPerSession?: number;
  unlockCondition?: UnlockCondition;
  rewards?: StageRewards;
  isActive?: boolean;
}

export interface UpdateStageData extends Partial<CreateStageData> {}

export interface StageQuestion {
  _id: string;
  subjectId?: {
    _id: string;
    name: string;
    icon: string;
  } | null;
  unitId?: {
    _id: string;
    name: string;
    academicYear: string;
    grade: number;
    semester: '上' | '下';
  } | null;
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
  }[];
  baseExp?: number;
  baseGold?: number;
  // Stage info
  stageId: string;
  stageName: string;
  questionsPerSession: number;
  currentProgress: {
    sessionCorrect: number;
    sessionTotal: number;
  };
}

export interface StageSessionResult {
  isPassed: boolean;
  isFirstClear: boolean;
  correctCount: number;
  totalCount: number;
  correctRate: number;
  rewards: {
    bonusExp: number;
    bonusGold: number;
  };
  progress: {
    isCompleted: boolean;
    bestScore: number;
    totalAttempts: number;
  };
}

// Stage Service
export const stageService = {
  // Teacher APIs
  async list(params: { page?: number; limit?: number; includeInactive?: boolean } = {}): Promise<{
    stages: Stage[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get<ApiResponse<Stage[]>>('/stages', { params });
    return {
      stages: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  async get(id: string): Promise<Stage> {
    const response = await api.get<ApiResponse<Stage>>(`/stages/${id}`);
    return response.data.data;
  },

  async create(data: CreateStageData): Promise<Stage> {
    const response = await api.post<ApiResponse<Stage>>('/stages', data);
    return response.data.data;
  },

  async update(id: string, data: UpdateStageData): Promise<Stage> {
    const response = await api.put<ApiResponse<Stage>>(`/stages/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/stages/${id}`);
  },

  // Student APIs
  async listForStudent(subject?: string): Promise<StageForStudent[]> {
    const params = subject ? { subject } : {};
    const response = await api.get<ApiResponse<StageForStudent[]>>('/stages/student', { params });
    return response.data.data;
  },

  async startSession(stageId: string): Promise<{
    stageId: string;
    stageName: string;
    questionsPerSession: number;
    progress: {
      sessionCorrect: number;
      sessionTotal: number;
      bestScore: number;
      isCompleted: boolean;
    };
  }> {
    const response = await api.post<ApiResponse<{
      stageId: string;
      stageName: string;
      questionsPerSession: number;
      progress: {
        sessionCorrect: number;
        sessionTotal: number;
        bestScore: number;
        isCompleted: boolean;
      };
    }>>(`/stages/${stageId}/start`);
    return response.data.data;
  },

  async getQuestion(stageId: string): Promise<StageQuestion> {
    const response = await api.get<ApiResponse<StageQuestion>>(`/stages/${stageId}/question`);
    return response.data.data;
  },

  async completeSession(stageId: string, correctCount: number, totalCount: number): Promise<StageSessionResult> {
    const response = await api.post<ApiResponse<StageSessionResult>>(`/stages/${stageId}/complete`, {
      correctCount,
      totalCount,
    });
    return response.data.data;
  },
};

export default stageService;
