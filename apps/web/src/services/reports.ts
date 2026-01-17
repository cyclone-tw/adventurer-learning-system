import api, { ApiResponse } from './api';

// Types
export interface DashboardStats {
  overview: {
    totalClasses: number;
    totalStudents: number;
    totalQuestions: number;
    totalAttempts: number;
    correctRate: number;
    todayAttempts: number;
  };
  weeklyTrend: Array<{
    date: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  classes: Array<{
    _id: string;
    name: string;
    studentCount: number;
  }>;
  recentActivity: Array<{
    _id: string;
    student: {
      _id: string;
      name: string;
      avatarUrl?: string;
    };
    question: {
      text: string;
      subject?: string;
      difficulty?: string;
    };
    isCorrect: boolean;
    expGained: number;
    createdAt: string;
  }>;
  studentsNeedingAttention: Array<{
    _id: string;
    name: string;
    avatarUrl?: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
}

export interface ClassReport {
  class: {
    _id: string;
    name: string;
    description?: string;
    studentCount: number;
    inviteCode: string;
  };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    correctRate: number;
    totalExp: number;
    avgTimeSpent: number;
  };
  bySubject: Array<{
    subject: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  topStudents: Array<{
    _id: string;
    name: string;
    attempts: number;
    correct: number;
    correctRate: number;
    totalExp: number;
  }>;
  students: Array<{
    _id: string;
    name: string;
    email: string;
    level: number;
    exp: number;
    correctRate: number;
  }>;
}

export interface StudentReport {
  student: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    gold: number;
    correctRate: number;
    totalQuestionsAnswered: number;
  };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    correctRate: number;
    totalExp: number;
    totalGold: number;
    avgTimeSpent: number;
  };
  bySubject: Array<{
    subject: string;
    attempts: number;
    correct: number;
    correctRate: number;
    avgTime: number;
  }>;
  byDifficulty: Array<{
    difficulty: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  dailyTrend: Array<{
    date: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  recentAttempts: Array<{
    _id: string;
    question: {
      _id: string;
      subject: string;
      type: string;
      content: string;
      difficulty: string;
    };
    isCorrect: boolean;
    timeSpent: number;
    expGained: number;
    goldGained: number;
    createdAt: string;
  }>;
  classes: Array<{
    _id: string;
    name: string;
  }>;
}

export interface QuestionAnalysis {
  summary: {
    totalQuestions: number;
    totalAttempts: number;
    avgCorrectRate: number;
  };
  byDifficulty: Array<{
    difficulty: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  byType: Array<{
    type: string;
    attempts: number;
    correct: number;
    correctRate: number;
  }>;
  hardQuestions: Array<{
    _id: string;
    subject: string;
    difficulty: string;
    type: string;
    content: string;
    attempts: number;
    correctRate: number;
    avgTime: number;
  }>;
  easyQuestions: Array<{
    _id: string;
    subject: string;
    difficulty: string;
    type: string;
    content: string;
    attempts: number;
    correctRate: number;
    avgTime: number;
  }>;
  mostAttempted: Array<{
    _id: string;
    subject: string;
    difficulty: string;
    type: string;
    content: string;
    attempts: number;
    correctRate: number;
    avgTime: number;
  }>;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// Subject display names
export const SUBJECT_NAMES: Record<string, string> = {
  chinese: '國語',
  math: '數學',
  english: '英語',
  science: '自然',
  social: '社會',
};

// Difficulty display names
export const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '簡單',
  medium: '中等',
  hard: '困難',
};

// Question type display names
export const TYPE_NAMES: Record<string, string> = {
  single_choice: '單選題',
  multiple_choice: '多選題',
  true_false: '是非題',
  fill_blank: '填空題',
};

// Report service
export const reportService = {
  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/reports/dashboard');
    return response.data.data;
  },

  // Get class report
  async getClassReport(classId: string, dateRange?: DateRange): Promise<ClassReport> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const queryString = params.toString();
    const url = `/reports/class/${classId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ApiResponse<ClassReport>>(url);
    return response.data.data;
  },

  // Get student report
  async getStudentReport(studentId: string, dateRange?: DateRange): Promise<StudentReport> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
    if (dateRange?.endDate) params.append('endDate', dateRange.endDate);

    const queryString = params.toString();
    const url = `/reports/student/${studentId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ApiResponse<StudentReport>>(url);
    return response.data.data;
  },

  // Get question analysis
  async getQuestionAnalysis(options?: DateRange & { classId?: string }): Promise<QuestionAnalysis> {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.classId) params.append('classId', options.classId);

    const queryString = params.toString();
    const url = `/reports/questions${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ApiResponse<QuestionAnalysis>>(url);
    return response.data.data;
  },
};

export default reportService;
