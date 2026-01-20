import api, { ApiResponse } from './api';

// Types
export interface StudentListItem {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  gold: number;
  totalQuestionsAnswered: number;
  correctRate: number;
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: string | null;
  createdAt: string;
  lastLoginAt: string;
  classes: { _id: string; name: string }[]; // 學生所屬班級
}

export interface StudentDetail {
  student: {
    _id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    gold: number;
    createdAt: string;
    lastLoginAt: string;
    classes: { _id: string; name: string }[]; // 學生所屬班級
  };
  stats: {
    overview: {
      totalAttempts: number;
      correctAttempts: number;
      correctRate: number;
      totalExp: number;
      totalGold: number;
      avgTimeSeconds: number;
      firstAttemptAt: string | null;
      lastAttemptAt: string | null;
    };
    bySubject: {
      subjectId: string | null;
      subjectName: string;
      subjectIcon: string | null;
      attempts: number;
      correct: number;
      correctRate: number;
      totalExp: number;
    }[];
    byUnit: {
      unitId: string;
      unitName: string;
      academicYear: string;
      grade: number;
      semester: '上' | '下';
      attempts: number;
      correct: number;
      correctRate: number;
    }[];
    byDifficulty: {
      difficulty: 'easy' | 'medium' | 'hard' | 'unknown';
      attempts: number;
      correct: number;
      correctRate: number;
      avgTime: number;
    }[];
    weakUnits: {
      unitId: string;
      unitName: string;
      academicYear: string;
      grade: number;
      semester: '上' | '下';
      attempts: number;
      correct: number;
      correctRate: number;
    }[];
    stageProgress: {
      stageId: string;
      stageName: string;
      stageIcon: string;
      order: number;
      isUnlocked: boolean;
      isCompleted: boolean;
      completedAt: string | null;
      bestScore: number;
      totalAttempts: number;
    }[];
    learningTrend: {
      thisWeek: {
        attempts: number;
        correct: number;
        correctRate: number;
        avgTime: number;
      };
      lastWeek: {
        attempts: number;
        correct: number;
        correctRate: number;
        avgTime: number;
      };
      improvement: {
        attemptsChange: number;
        correctRateChange: number;
        avgTimeChange: number;
      };
    };
    recentActivity: {
      _id: string; // date string YYYY-MM-DD
      attempts: number;
      correct: number;
      exp: number;
    }[];
  };
}

export interface StudentAttempt {
  _id: string;
  submittedAnswer: string | string[];
  isCorrect: boolean;
  timeSpentSeconds: number;
  expGained: number;
  goldGained: number;
  createdAt: string;
  question: {
    _id: string;
    type: string;
    difficulty: string;
    content: { text: string };
    answer: { correct: string | string[]; explanation?: string };
  };
  subject?: {
    _id: string;
    name: string;
    icon: string;
  };
  unit?: {
    _id: string;
    name: string;
    academicYear: string;
    grade: number;
    semester: '上' | '下';
  };
}

export interface ListStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'displayName' | 'level' | 'exp' | 'correctRate' | 'totalQuestionsAnswered' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ListAttemptsParams {
  page?: number;
  limit?: number;
  subjectId?: string;
  unitId?: string;
  isCorrect?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateStudentInput {
  displayName?: string;
  email?: string;
  password?: string;
}

export const studentsService = {
  // List all students
  async list(params: ListStudentsParams = {}): Promise<PaginatedResponse<StudentListItem>> {
    const response = await api.get<
      ApiResponse<StudentListItem[]> & { pagination: PaginatedResponse<StudentListItem>['pagination'] }
    >('/students', { params });
    return {
      data: response.data.data,
      pagination: response.data.pagination!,
    };
  },

  // Get student details
  async get(studentId: string): Promise<StudentDetail> {
    const response = await api.get<ApiResponse<StudentDetail>>(`/students/${studentId}`);
    return response.data.data;
  },

  // Update student info
  async update(
    studentId: string,
    data: UpdateStudentInput
  ): Promise<{ message: string; student: { _id: string; displayName: string; email: string } }> {
    const response = await api.patch<
      ApiResponse<{ message: string; student: { _id: string; displayName: string; email: string } }>
    >(`/students/${studentId}`, data);
    return response.data.data;
  },

  // Get student attempts
  async getAttempts(
    studentId: string,
    params: ListAttemptsParams = {}
  ): Promise<PaginatedResponse<StudentAttempt>> {
    const apiParams: Record<string, string | number | undefined> = {};
    if (params.page) apiParams.page = params.page;
    if (params.limit) apiParams.limit = params.limit;
    if (params.subjectId) apiParams.subjectId = params.subjectId;
    if (params.unitId) apiParams.unitId = params.unitId;
    if (params.isCorrect !== undefined) apiParams.isCorrect = params.isCorrect.toString();

    const response = await api.get<
      ApiResponse<StudentAttempt[]> & { pagination: PaginatedResponse<StudentAttempt>['pagination'] }
    >(`/students/${studentId}/attempts`, { params: apiParams });
    return {
      data: response.data.data,
      pagination: response.data.pagination!,
    };
  },
};

export default studentsService;
