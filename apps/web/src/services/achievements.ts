import api, { ApiResponse } from './api';

// Types
export type AchievementCategory = 'learning' | 'adventure' | 'social' | 'special';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  requirementType?: string;
  requirementValue: number;
  expReward?: number;
  goldReward?: number;
  isUnlocked: boolean;
  isHidden: boolean;
  unlockedAt?: string;
  isNew?: boolean;
  progress?: number;
}

export interface AchievementsResponse {
  achievements: {
    learning: Achievement[];
    adventure: Achievement[];
    social: Achievement[];
    special: Achievement[];
  };
  stats: {
    total: number;
    unlocked: number;
    percentage: number;
    newCount: number;
  };
}

export interface UnlockedAchievement {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  expReward: number;
  goldReward: number;
}

// Category display names
export const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  learning: '學習成就',
  adventure: '冒險成就',
  social: '社交成就',
  special: '特殊成就',
};

// Category icons
export const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  learning: '📚',
  adventure: '⚔️',
  social: '👥',
  special: '🌟',
};

// Rarity config
export const RARITY_CONFIG: Record<
  AchievementRarity,
  { name: string; color: string; bgColor: string; borderColor: string }
> = {
  common: {
    name: '普通',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  rare: {
    name: '稀有',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
  },
  epic: {
    name: '史詩',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
  },
  legendary: {
    name: '傳說',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
};

// Achievement service
export const achievementService = {
  // Get all achievements with player progress
  async getAchievements(): Promise<AchievementsResponse> {
    const response = await api.get<ApiResponse<AchievementsResponse>>('/achievements');
    return response.data.data;
  },

  // Get newly unlocked achievements
  async getNewAchievements(): Promise<{ achievements: Array<{ _id: string; achievement: Achievement; unlockedAt: string }> }> {
    const response = await api.get<ApiResponse<{ achievements: Array<{ _id: string; achievement: Achievement; unlockedAt: string }> }>>('/achievements/new');
    return response.data.data;
  },

  // Mark achievement as seen
  async markAchievementSeen(achievementId: string): Promise<void> {
    await api.post(`/achievements/${achievementId}/seen`);
  },

  // Mark all achievements as seen
  async markAllAchievementsSeen(): Promise<void> {
    await api.post('/achievements/mark-all-seen');
  },
};

export default achievementService;
