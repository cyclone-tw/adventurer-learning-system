import api, { ApiResponse } from './api';

// Types
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export interface DailyTask {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  taskType: string;
  targetValue: number;
  targetSubject?: string;
  expReward: number;
  goldReward: number;
  difficulty: TaskDifficulty;
  progress: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface DailyTasksResponse {
  tasks: DailyTask[];
  stats: {
    total: number;
    completed: number;
    claimed: number;
  };
}

export interface CompletedTask {
  taskId: string;
  name: string;
  icon: string;
  expReward: number;
  goldReward: number;
}

// Difficulty display config
export const DIFFICULTY_CONFIG: Record<
  TaskDifficulty,
  { name: string; color: string; bgColor: string; borderColor: string }
> = {
  easy: {
    name: '簡單',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  medium: {
    name: '中等',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  hard: {
    name: '困難',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
  },
};

// Daily task service
export const dailyTaskService = {
  // Get daily tasks with progress
  async getDailyTasks(): Promise<DailyTasksResponse> {
    const response = await api.get<ApiResponse<DailyTasksResponse>>('/daily-tasks');
    return response.data.data;
  },

  // Claim single task reward
  async claimTask(taskId: string): Promise<{ message: string; rewards: { expReward: number; goldReward: number } }> {
    const response = await api.post<ApiResponse<{ message: string; rewards: { expReward: number; goldReward: number } }>>(
      `/daily-tasks/${taskId}/claim`
    );
    return response.data.data;
  },

  // Claim all completed task rewards
  async claimAllTasks(): Promise<{ message: string; rewards: { exp: number; gold: number }; count: number }> {
    const response = await api.post<ApiResponse<{ message: string; rewards: { exp: number; gold: number }; count: number }>>(
      '/daily-tasks/claim-all'
    );
    return response.data.data;
  },
};

export default dailyTaskService;
