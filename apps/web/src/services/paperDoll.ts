import api from './api';

// 部件類別
export type AvatarCategory =
  | 'body'
  | 'skin_tone'
  | 'face'
  | 'eyes'
  | 'mouth'
  | 'hair'
  | 'outfit'
  | 'armor'
  | 'weapon'
  | 'accessory'
  | 'effects';

// 稀有度
export type AvatarRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Sprite Sheet 動畫配置
export interface SpriteAnimation {
  row: number;
  frames: number;
  frameRate: number;
}

// 圖片資源
export interface AvatarAssets {
  idle: string;
  walk?: string[];
  attack?: string[];
  hurt?: string[];
  spriteSheet?: {
    url: string;
    frameWidth: number;
    frameHeight: number;
    animations: Record<string, SpriteAnimation>;
  };
}

// 定位與縮放
export interface AvatarTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  anchor: { x: number; y: number };
}

// 部件資料
export interface AvatarPart {
  _id: string;
  name: string;
  category: AvatarCategory;
  layer: number;
  assets: AvatarAssets;
  transform: AvatarTransform;
  colorizable: boolean;
  defaultColor?: string;
  colorMask?: string;
  acquisition: {
    type: 'default' | 'shop' | 'achievement' | 'event' | 'custom';
    price?: number;
    achievementId?: string;
    levelRequired?: number;
  };
  rarity: AvatarRarity;
  isDefault: boolean;
  isCustom: boolean;
  uploadedBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 裝備配置
export interface EquippedParts {
  body: AvatarPart | string;
  skinTone: string;
  face: AvatarPart | string;
  eyes: AvatarPart | string;
  eyeColor: string;
  mouth: AvatarPart | string;
  hair: AvatarPart | string;
  hairColor: string;
  outfit: AvatarPart | string;
  armor?: AvatarPart | string;
  weapon?: AvatarPart | string;
  accessory?: AvatarPart | string;
  effects?: AvatarPart | string;
}

// 學生角色
export interface StudentAvatar {
  _id: string;
  userId: string;
  name: string;
  equipped: EquippedParts;
  compositeImageUrl?: string;
  compositeUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 顏色預設值
export interface ColorPresets {
  skinTone: string[];
  hairColor: string[];
  eyeColor: string[];
}

// API 回應
export interface GetAvatarResponse {
  avatar: StudentAvatar;
  colorPresets: ColorPresets;
}

export interface GetPartsResponse {
  parts: AvatarPart[];
  byCategory: Record<AvatarCategory, AvatarPart[]>;
  total: number;
}

// 稀有度配色
export const RARITY_COLORS: Record<AvatarRarity, { bg: string; text: string; border: string }> = {
  common: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  uncommon: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
  rare: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
  epic: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
  legendary: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
};

// 類別標籤
export const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  body: '身體',
  skin_tone: '膚色',
  face: '臉型',
  eyes: '眼睛',
  mouth: '嘴巴',
  hair: '頭髮',
  outfit: '服裝',
  armor: '盔甲',
  weapon: '武器',
  accessory: '配件',
  effects: '特效',
};

// 圖層順序
export const LAYER_ORDER: AvatarCategory[] = [
  'body',
  'face',
  'eyes',
  'mouth',
  'hair',
  'outfit',
  'armor',
  'weapon',
  'accessory',
  'effects',
];

// Paper Doll 服務
const paperDollService = {
  // ========== 學生 API ==========

  // 取得學生角色
  async getAvatar(): Promise<GetAvatarResponse> {
    const response = await api.get<{ data: GetAvatarResponse }>('/paper-doll/avatar');
    return response.data.data;
  },

  // 取得可用部件
  async getParts(params?: {
    category?: AvatarCategory;
    rarity?: AvatarRarity;
  }): Promise<GetPartsResponse> {
    const response = await api.get<{ data: GetPartsResponse }>('/paper-doll/parts', { params });
    return response.data.data;
  },

  // 更新角色設定
  async updateAvatar(data: {
    name?: string;
    skinTone?: string;
    hairColor?: string;
    eyeColor?: string;
  }): Promise<StudentAvatar> {
    const response = await api.put<{ data: { avatar: StudentAvatar } }>('/paper-doll/avatar', data);
    return response.data.data.avatar;
  },

  // 裝備部件
  async equipPart(partId: string): Promise<{ category: AvatarCategory; part: AvatarPart }> {
    const response = await api.post<{ data: { equipped: { category: AvatarCategory; part: AvatarPart } } }>(
      `/paper-doll/avatar/equip/${partId}`
    );
    return response.data.data.equipped;
  },

  // 卸下部件
  async unequipPart(category: AvatarCategory): Promise<void> {
    await api.delete(`/paper-doll/avatar/unequip/${category}`);
  },

  // ========== 教師 API ==========

  // 取得所有部件（管理用）
  async adminGetParts(): Promise<GetPartsResponse> {
    const response = await api.get<{ data: GetPartsResponse }>('/paper-doll/admin/parts');
    return response.data.data;
  },

  // 新增部件
  async adminCreatePart(data: Partial<AvatarPart>): Promise<AvatarPart> {
    const response = await api.post<{ data: { part: AvatarPart } }>('/paper-doll/admin/parts', data);
    return response.data.data.part;
  },

  // 更新部件
  async adminUpdatePart(id: string, data: Partial<AvatarPart>): Promise<AvatarPart> {
    const response = await api.put<{ data: { part: AvatarPart } }>(`/paper-doll/admin/parts/${id}`, data);
    return response.data.data.part;
  },

  // 刪除部件
  async adminDeletePart(id: string): Promise<void> {
    await api.delete(`/paper-doll/admin/parts/${id}`);
  },
};

export default paperDollService;
