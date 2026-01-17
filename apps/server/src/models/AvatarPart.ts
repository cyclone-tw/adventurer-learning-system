import mongoose, { Schema, Document, Types } from 'mongoose';

// 部件類別
export type AvatarCategory =
  | 'body'        // 身體
  | 'skin_tone'   // 膚色
  | 'face'        // 臉型
  | 'eyes'        // 眼睛
  | 'mouth'       // 嘴巴
  | 'hair'        // 髮型
  | 'outfit'      // 服裝
  | 'armor'       // 盔甲
  | 'weapon'      // 武器
  | 'accessory'   // 配件
  | 'effects';    // 特效

// 稀有度
export type AvatarRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// 取得方式類型
export type AcquisitionType = 'default' | 'shop' | 'achievement' | 'event' | 'custom';

// Sprite Sheet 動畫配置
interface SpriteAnimation {
  row: number;
  frames: number;
  frameRate: number;
}

// Sprite Sheet 配置
interface SpriteSheetConfig {
  url: string;
  frameWidth: number;
  frameHeight: number;
  animations: Record<string, SpriteAnimation>;
}

// 圖片資源
interface AvatarAssets {
  idle: string;                   // 靜態圖片 URL
  walk?: string[];                // 行走動畫幀
  attack?: string[];              // 攻擊動畫幀
  hurt?: string[];                // 受傷動畫幀
  spriteSheet?: SpriteSheetConfig;
}

// 定位與縮放
interface AvatarTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  anchor: { x: number; y: number };
}

// 取得方式
interface AvatarAcquisition {
  type: AcquisitionType;
  price?: number;
  achievementId?: Types.ObjectId;
  levelRequired?: number;
}

// AvatarPart 文件介面
export interface IAvatarPart extends Document {
  _id: Types.ObjectId;
  name: string;
  category: AvatarCategory;
  layer: number;  // 0-7
  assets: AvatarAssets;
  transform: AvatarTransform;
  colorizable: boolean;
  defaultColor?: string;
  colorMask?: string;
  acquisition: AvatarAcquisition;
  rarity: AvatarRarity;
  isDefault: boolean;
  isCustom: boolean;
  uploadedBy?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const spriteAnimationSchema = new Schema<SpriteAnimation>(
  {
    row: { type: Number, required: true },
    frames: { type: Number, required: true },
    frameRate: { type: Number, required: true, default: 8 },
  },
  { _id: false }
);

const spriteSheetSchema = new Schema<SpriteSheetConfig>(
  {
    url: { type: String, required: true },
    frameWidth: { type: Number, required: true },
    frameHeight: { type: Number, required: true },
    animations: { type: Map, of: spriteAnimationSchema },
  },
  { _id: false }
);

const assetsSchema = new Schema<AvatarAssets>(
  {
    idle: { type: String, required: true },
    walk: [{ type: String }],
    attack: [{ type: String }],
    hurt: [{ type: String }],
    spriteSheet: spriteSheetSchema,
  },
  { _id: false }
);

const transformSchema = new Schema<AvatarTransform>(
  {
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },
    scale: { type: Number, default: 1 },
    anchor: {
      x: { type: Number, default: 0.5 },
      y: { type: Number, default: 0.5 },
    },
  },
  { _id: false }
);

const acquisitionSchema = new Schema<AvatarAcquisition>(
  {
    type: {
      type: String,
      enum: ['default', 'shop', 'achievement', 'event', 'custom'],
      required: true,
    },
    price: { type: Number },
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement' },
    levelRequired: { type: Number, default: 1 },
  },
  { _id: false }
);

const avatarPartSchema = new Schema<IAvatarPart>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['body', 'skin_tone', 'face', 'eyes', 'mouth', 'hair', 'outfit', 'armor', 'weapon', 'accessory', 'effects'],
      required: true,
    },
    layer: {
      type: Number,
      required: true,
      min: 0,
      max: 7,
    },
    assets: {
      type: assetsSchema,
      required: true,
    },
    transform: {
      type: transformSchema,
      default: () => ({
        offsetX: 0,
        offsetY: 0,
        scale: 1,
        anchor: { x: 0.5, y: 0.5 },
      }),
    },
    colorizable: {
      type: Boolean,
      default: false,
    },
    defaultColor: {
      type: String,
    },
    colorMask: {
      type: String,
    },
    acquisition: {
      type: acquisitionSchema,
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
avatarPartSchema.index({ category: 1, isActive: 1 });
avatarPartSchema.index({ rarity: 1 });
avatarPartSchema.index({ 'acquisition.type': 1 });
avatarPartSchema.index({ uploadedBy: 1 });
avatarPartSchema.index({ isDefault: 1 });

// 圖層對應表
export const LAYER_MAP: Record<AvatarCategory, number> = {
  body: 0,
  skin_tone: 0,
  face: 1,
  eyes: 1,
  mouth: 1,
  hair: 2,
  outfit: 3,
  armor: 4,
  weapon: 5,
  accessory: 6,
  effects: 7,
};

export default mongoose.model<IAvatarPart>('AvatarPart', avatarPartSchema);
