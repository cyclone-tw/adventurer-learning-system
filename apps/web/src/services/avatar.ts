import api, { ApiResponse } from './api';

// Types
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'background' | 'effect' | 'title';

export interface EquippedItem {
  playerItemId: string;
  item: {
    _id: string;
    name: string;
    icon: string;
    imageUrl?: string;
    slot: EquipmentSlot;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
}

export interface AvatarConfig {
  head: EquippedItem | null;
  body: EquippedItem | null;
  accessory: EquippedItem | null;
  background: EquippedItem | null;
  effect: EquippedItem | null;
  title: EquippedItem | null;
}

export interface EquippableItem {
  playerItemId: string;
  isEquipped: boolean;
  equippedAt?: string;
  item: {
    _id: string;
    name: string;
    description: string;
    type: 'equipment' | 'cosmetic';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    slot: EquipmentSlot;
    icon: string;
    imageUrl?: string;
  };
}

export interface EquippableItemsResponse {
  items: EquippableItem[];
  bySlot: Record<EquipmentSlot, EquippableItem[]>;
}

// Slot display names
export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  head: '頭飾',
  body: '服裝',
  accessory: '飾品',
  background: '背景',
  effect: '特效',
  title: '稱號',
};

// Slot icons
export const SLOT_ICONS: Record<EquipmentSlot, string> = {
  head: '👑',
  body: '👕',
  accessory: '💍',
  background: '🖼️',
  effect: '✨',
  title: '🏷️',
};

// Rarity config
export const RARITY_CONFIG = {
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

// Avatar service
export const avatarService = {
  // Get current avatar configuration
  async getAvatar(): Promise<{ avatar: AvatarConfig }> {
    const response = await api.get<ApiResponse<{ avatar: AvatarConfig }>>('/avatar');
    return response.data.data;
  },

  // Get all equippable items
  async getEquippableItems(): Promise<EquippableItemsResponse> {
    const response = await api.get<ApiResponse<EquippableItemsResponse>>('/avatar/items');
    return response.data.data;
  },

  // Equip an item
  async equipItem(playerItemId: string): Promise<{
    message: string;
    equipped: {
      playerItemId: string;
      slot: EquipmentSlot;
      item: {
        _id: string;
        name: string;
        icon: string;
        imageUrl?: string;
        rarity: string;
      };
    };
  }> {
    const response = await api.post<ApiResponse<{
      message: string;
      equipped: {
        playerItemId: string;
        slot: EquipmentSlot;
        item: {
          _id: string;
          name: string;
          icon: string;
          imageUrl?: string;
          rarity: string;
        };
      };
    }>>(`/avatar/equip/${playerItemId}`);
    return response.data.data;
  },

  // Unequip an item
  async unequipItem(playerItemId: string): Promise<{
    message: string;
    unequipped: {
      playerItemId: string;
      slot: EquipmentSlot;
    };
  }> {
    const response = await api.post<ApiResponse<{
      message: string;
      unequipped: {
        playerItemId: string;
        slot: EquipmentSlot;
      };
    }>>(`/avatar/unequip/${playerItemId}`);
    return response.data.data;
  },
};

export default avatarService;
