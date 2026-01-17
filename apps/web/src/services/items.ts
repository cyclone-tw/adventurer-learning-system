import api, { ApiResponse } from './api';

// Types
export type ItemType = 'consumable' | 'equipment' | 'cosmetic';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'background' | 'effect' | 'title';

export interface ItemEffect {
  type: 'exp_boost' | 'gold_boost' | 'hint' | 'skip' | 'shield' | 'time_extend';
  value: number;
  duration?: number;
}

export interface Item {
  _id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  slot?: EquipmentSlot;
  icon: string;
  imageUrl?: string;
  price: number;
  effects?: ItemEffect[];
  maxStack: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemData {
  name: string;
  description: string;
  type: ItemType;
  rarity?: ItemRarity;
  slot?: EquipmentSlot;
  icon: string;
  price: number;
  effects?: ItemEffect[];
  maxStack?: number;
  order?: number;
}

export interface UpdateItemData {
  name?: string;
  description?: string;
  type?: ItemType;
  rarity?: ItemRarity;
  slot?: EquipmentSlot;
  icon?: string;
  price?: number;
  effects?: ItemEffect[];
  maxStack?: number;
  isActive?: boolean;
  order?: number;
}

// Constants
export const ITEM_TYPE_NAMES: Record<ItemType, string> = {
  consumable: '消耗品',
  equipment: '裝備',
  cosmetic: '裝飾品',
};

export const RARITY_CONFIG: Record<ItemRarity, { name: string; color: string; bgColor: string }> = {
  common: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  rare: { name: '稀有', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  epic: { name: '史詩', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  legendary: { name: '傳說', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  head: '頭部',
  body: '身體',
  accessory: '配件',
  background: '背景',
  effect: '特效',
  title: '稱號',
};

export const EFFECT_TYPE_NAMES: Record<string, string> = {
  exp_boost: '經驗加倍',
  gold_boost: '金幣加倍',
  hint: '提示',
  skip: '跳過',
  shield: '護盾',
  time_extend: '延長時間',
};

export const itemService = {
  // List all items (for admin/teacher)
  async list(): Promise<Item[]> {
    const response = await api.get<ApiResponse<Item[]>>('/items');
    return response.data.data;
  },

  // Create item
  async create(data: CreateItemData): Promise<Item> {
    const response = await api.post<ApiResponse<Item>>('/items', data);
    return response.data.data;
  },

  // Update item
  async update(itemId: string, data: UpdateItemData): Promise<Item> {
    const response = await api.patch<ApiResponse<Item>>(`/items/${itemId}`, data);
    return response.data.data;
  },

  // Delete item
  async delete(itemId: string): Promise<void> {
    await api.delete(`/items/${itemId}`);
  },
};

export default itemService;
