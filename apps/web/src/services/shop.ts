import api, { ApiResponse } from './api';

// Types
export type ItemType = 'consumable' | 'equipment' | 'cosmetic';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemEffect {
  type: 'exp_boost' | 'gold_boost' | 'hint' | 'skip' | 'shield' | 'time_extend';
  value: number;
  duration?: number;
}

export interface ItemDiscount {
  promotionId: string;
  promotionTitle: string;
  type: 'percentage' | 'fixed';
  value: number;
  originalPrice: number;
}

export interface ShopPromotion {
  _id: string;
  title: string;
  content: string;
  icon: string;
  endDate?: string;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    itemIds?: string[];
  };
}

export interface ShopItem {
  _id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  price: number;
  originalPrice?: number;
  discount?: ItemDiscount;
  effects?: ItemEffect[];
  maxStack: number;
  owned: number;
  canAfford: boolean;
}

export interface InventoryItem {
  _id: string;
  item: {
    _id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    icon: string;
    effects?: ItemEffect[];
  };
  quantity: number;
  acquiredAt: string;
}

export interface ActiveEffect {
  _id: string;
  item: {
    _id: string;
    name: string;
    icon: string;
  };
  effectType: string;
  value: number;
  expiresAt: string;
  remainingMinutes: number;
}

export interface BuyResult {
  message: string;
  item: {
    _id: string;
    name: string;
    icon: string;
    quantity: number;
  };
  cost: number;
  remainingGold: number;
}

export interface UseItemResult {
  message: string;
  item: {
    _id: string;
    name: string;
    icon: string;
  };
  appliedEffects: {
    type: string;
    value: number;
    duration?: number;
  }[];
  remainingQuantity: number;
}

export interface QuizItem {
  _id: string;
  name: string;
  icon: string;
  description: string;
  rarity: ItemRarity;
  effects: ItemEffect[];
  quantity: number;
}

export interface UseQuizItemResult {
  message: string;
  item: {
    _id: string;
    name: string;
    icon: string;
  };
  hint?: string;
  skip?: boolean;
  correctAnswer?: string;
  remainingQuantity: number;
}

export type EquipmentSlot = 'title' | 'head' | 'body' | 'accessory' | 'background' | 'effect';

export interface EquippedItemDetail {
  _id: string;
  name: string;
  icon: string;
  imageUrl?: string;
  rarity: ItemRarity;
}

export interface CosmeticItem {
  _id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  rarity: ItemRarity;
  slot: EquipmentSlot;
  quantity: number;
}

export interface EquipItemResult {
  message: string;
  slot: EquipmentSlot;
  item: {
    _id: string;
    name: string;
    icon: string;
    rarity: ItemRarity;
  };
  equippedItems: Record<EquipmentSlot, string | undefined>;
}

// Rarity colors
export const RARITY_CONFIG: Record<ItemRarity, { name: string; color: string; bgColor: string }> = {
  common: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  rare: { name: '稀有', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  epic: { name: '史詩', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  legendary: { name: '傳說', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

// Effect type names
export const EFFECT_TYPE_NAMES: Record<string, string> = {
  exp_boost: '經驗加倍',
  gold_boost: '金幣加倍',
  hint: '提示',
  skip: '跳過',
  shield: '護盾',
  time_extend: '延長時間',
};

export const shopService = {
  // Get all shop items
  async getShopItems(): Promise<{ items: ShopItem[]; playerGold: number; promotions: ShopPromotion[] }> {
    const response = await api.get<ApiResponse<{ items: ShopItem[]; playerGold: number; promotions: ShopPromotion[] }>>('/shop');
    return response.data.data;
  },

  // Buy an item
  async buyItem(itemId: string, quantity = 1): Promise<BuyResult> {
    const response = await api.post<ApiResponse<BuyResult>>(`/shop/buy/${itemId}`, { quantity });
    return response.data.data;
  },

  // Get inventory
  async getInventory(): Promise<{ inventory: InventoryItem[]; activeEffects: ActiveEffect[] }> {
    const response = await api.get<ApiResponse<{ inventory: InventoryItem[]; activeEffects: ActiveEffect[] }>>('/inventory');
    return response.data.data;
  },

  // Use an item
  async useItem(itemId: string): Promise<UseItemResult> {
    const response = await api.post<ApiResponse<UseItemResult>>(`/inventory/use/${itemId}`);
    return response.data.data;
  },

  // Get active effects
  async getActiveEffects(): Promise<{ activeEffects: ActiveEffect[] }> {
    const response = await api.get<ApiResponse<{ activeEffects: ActiveEffect[] }>>('/inventory/effects');
    return response.data.data;
  },

  // Get quiz-usable items and active effects
  async getQuizItems(): Promise<{ quizItems: QuizItem[]; activeEffects: ActiveEffect[] }> {
    const response = await api.get<ApiResponse<{ quizItems: QuizItem[]; activeEffects: ActiveEffect[] }>>('/inventory/quiz-items');
    return response.data.data;
  },

  // Use item during quiz (hint/skip)
  async useQuizItem(itemId: string, questionId: string): Promise<UseQuizItemResult> {
    const response = await api.post<ApiResponse<UseQuizItemResult>>(`/inventory/quiz-use/${itemId}/${questionId}`);
    return response.data.data;
  },

  // Get equipped items and available cosmetic items
  async getEquippedItems(): Promise<{ equippedItems: Record<EquipmentSlot, EquippedItemDetail | undefined>; availableItems: CosmeticItem[] }> {
    const response = await api.get<ApiResponse<{ equippedItems: Record<EquipmentSlot, EquippedItemDetail | undefined>; availableItems: CosmeticItem[] }>>('/inventory/equipped');
    return response.data.data;
  },

  // Equip an item
  async equipItem(itemId: string): Promise<EquipItemResult> {
    const response = await api.post<ApiResponse<EquipItemResult>>(`/inventory/equip/${itemId}`);
    return response.data.data;
  },

  // Unequip an item from a slot
  async unequipItem(slot: EquipmentSlot): Promise<{ message: string; slot: EquipmentSlot }> {
    const response = await api.post<ApiResponse<{ message: string; slot: EquipmentSlot }>>(`/inventory/unequip/${slot}`);
    return response.data.data;
  },
};

export default shopService;
