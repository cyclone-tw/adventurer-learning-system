import api, { ApiResponse } from './api';

// Types
export type LeaderboardType = 'exp' | 'level' | 'gold' | 'correctRate' | 'questionsAnswered';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface LeaderboardTitle {
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  rank: number;
  _id: string;
  name: string;
  avatar?: string;
  level: number;
  value: number;
  isCurrentUser: boolean;
  title?: LeaderboardTitle | null;
}

export interface LeaderboardResponse {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
}

export interface RankInfo {
  rank: number;
  total: number;
}

export interface MyRanksResponse {
  userId: string;
  ranks: {
    exp: RankInfo;
    level: RankInfo;
    gold: RankInfo;
    correctRate: RankInfo;
  };
  profile: {
    level: number;
    exp: number;
    gold: number;
    correctRate: number;
    totalQuestionsAnswered: number;
  };
}

// Leaderboard type display names
export const LEADERBOARD_TYPE_NAMES: Record<LeaderboardType, string> = {
  exp: '經驗值',
  level: '等級',
  gold: '金幣',
  correctRate: '正確率',
  questionsAnswered: '答題數',
};

// Period display names
export const PERIOD_NAMES: Record<LeaderboardPeriod, string> = {
  daily: '今日',
  weekly: '本週',
  monthly: '本月',
  all: '總排行',
};

// Leaderboard service
export const leaderboardService = {
  // Get leaderboard
  async getLeaderboard(options: {
    type?: LeaderboardType;
    period?: LeaderboardPeriod;
    classId?: string;
    limit?: number;
  } = {}): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();

    if (options.type) params.append('type', options.type);
    if (options.period) params.append('period', options.period);
    if (options.classId) params.append('classId', options.classId);
    if (options.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/leaderboard?${queryString}` : '/leaderboard';

    const response = await api.get<ApiResponse<LeaderboardResponse>>(url);
    return response.data.data;
  },

  // Get my ranks
  async getMyRanks(): Promise<MyRanksResponse> {
    const response = await api.get<ApiResponse<MyRanksResponse>>('/leaderboard/my-rank');
    return response.data.data;
  },
};

export default leaderboardService;
