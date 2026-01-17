import mongoose, { Schema, Document, Types } from 'mongoose';

// 角色裝備配置
export interface EquippedParts {
  body: Types.ObjectId;
  skinTone: string;           // 膚色 Hex
  face: Types.ObjectId;
  eyes: Types.ObjectId;
  eyeColor: string;           // 眼睛顏色 Hex
  mouth: Types.ObjectId;
  hair: Types.ObjectId;
  hairColor: string;          // 頭髮顏色 Hex
  outfit: Types.ObjectId;
  armor?: Types.ObjectId;
  weapon?: Types.ObjectId;
  accessory?: Types.ObjectId;
  effects?: Types.ObjectId;
}

// 學生角色文件介面
export interface IStudentAvatar extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  equipped: EquippedParts;
  compositeImageUrl?: string;
  compositeUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const equippedPartsSchema = new Schema<EquippedParts>(
  {
    body: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    skinTone: {
      type: String,
      default: '#FFDFC4', // 預設膚色
    },
    face: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    eyes: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    eyeColor: {
      type: String,
      default: '#4A3728', // 預設眼睛顏色（棕色）
    },
    mouth: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    hair: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    hairColor: {
      type: String,
      default: '#3D2314', // 預設頭髮顏色（深棕色）
    },
    outfit: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
      required: true,
    },
    armor: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
    },
    weapon: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
    },
    accessory: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
    },
    effects: {
      type: Schema.Types.ObjectId,
      ref: 'AvatarPart',
    },
  },
  { _id: false }
);

const studentAvatarSchema = new Schema<IStudentAvatar>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: '冒險者',
    },
    equipped: {
      type: equippedPartsSchema,
      required: true,
    },
    compositeImageUrl: {
      type: String,
    },
    compositeUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
studentAvatarSchema.index({ userId: 1 }, { unique: true });

// 預設膚色選項
export const SKIN_TONE_PRESETS = [
  '#FFECD4', // 淺膚色
  '#FFDFC4', // 淡膚色
  '#F5D0B0', // 淺褐色
  '#E8B89A', // 小麥色
  '#D4A574', // 褐色
  '#B87E5C', // 深褐色
  '#8D5524', // 棕色
  '#6B3E26', // 深棕色
];

// 預設髮色選項
export const HAIR_COLOR_PRESETS = [
  '#0D0D0D', // 黑色
  '#3D2314', // 深棕色
  '#6B4423', // 棕色
  '#8B4513', // 栗色
  '#D4A76A', // 金棕色
  '#F5D76E', // 金色
  '#FF6B6B', // 紅色
  '#E74C3C', // 深紅色
  '#9B59B6', // 紫色
  '#3498DB', // 藍色
  '#1ABC9C', // 青綠色
  '#95A5A6', // 灰色
];

// 預設眼睛顏色選項
export const EYE_COLOR_PRESETS = [
  '#4A3728', // 棕色
  '#2E1A0C', // 深棕色
  '#1E90FF', // 藍色
  '#228B22', // 綠色
  '#808080', // 灰色
  '#9B59B6', // 紫色
  '#FF6B6B', // 紅色（稀有）
  '#FFD700', // 金色（稀有）
];

export default mongoose.model<IStudentAvatar>('StudentAvatar', studentAvatarSchema);
