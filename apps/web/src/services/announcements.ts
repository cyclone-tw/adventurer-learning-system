import api, { ApiResponse } from './api';

// Types
export type AnnouncementType = 'info' | 'event' | 'promotion';

export interface DiscountConfig {
  type: 'percentage' | 'fixed';
  value: number;
  itemIds?: string[];
  minPurchase?: number;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  icon: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  discount?: DiscountConfig;
  isPinned: boolean;
  showInShop: boolean;
  isActive: boolean;
  createdBy?: {
    _id: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
  isCurrentlyActive?: boolean;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type?: AnnouncementType;
  icon?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  discount?: DiscountConfig;
  isPinned?: boolean;
  showInShop?: boolean;
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
  isActive?: boolean;
}

// Constants
export const ANNOUNCEMENT_TYPE_NAMES: Record<AnnouncementType, string> = {
  info: '一般公告',
  event: '活動',
  promotion: '促銷折扣',
};

export const ANNOUNCEMENT_TYPE_COLORS: Record<AnnouncementType, { bg: string; text: string }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-700' },
  event: { bg: 'bg-purple-100', text: 'text-purple-700' },
  promotion: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export const DISCOUNT_TYPE_NAMES: Record<string, string> = {
  percentage: '百分比折扣',
  fixed: '固定金額折扣',
};

export const announcementService = {
  // Get all announcements (for teachers)
  async list(params: { type?: AnnouncementType; includeInactive?: boolean } = {}): Promise<Announcement[]> {
    const response = await api.get<ApiResponse<Announcement[]>>('/announcements', { params });
    return response.data.data;
  },

  // Get single announcement
  async get(id: string): Promise<Announcement> {
    const response = await api.get<ApiResponse<Announcement>>(`/announcements/${id}`);
    return response.data.data;
  },

  // Get active announcements (for students)
  async getActive(): Promise<{ announcements: Announcement[]; promotions: Announcement[] }> {
    const response = await api.get<ApiResponse<{ announcements: Announcement[]; promotions: Announcement[] }>>('/announcements/active');
    return response.data.data;
  },

  // Get active promotions for shop
  async getActivePromotions(): Promise<Announcement[]> {
    const response = await api.get<ApiResponse<Announcement[]>>('/announcements/promotions/active');
    return response.data.data;
  },

  // Create announcement
  async create(data: CreateAnnouncementData): Promise<Announcement> {
    const response = await api.post<ApiResponse<Announcement>>('/announcements', data);
    return response.data.data;
  },

  // Update announcement
  async update(id: string, data: UpdateAnnouncementData): Promise<Announcement> {
    const response = await api.patch<ApiResponse<Announcement>>(`/announcements/${id}`, data);
    return response.data.data;
  },

  // Delete announcement
  async delete(id: string): Promise<void> {
    await api.delete(`/announcements/${id}`);
  },
};

export default announcementService;
