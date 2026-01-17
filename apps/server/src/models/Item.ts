import mongoose, { Schema, Document } from 'mongoose';

// Item types
export type ItemType = 'consumable' | 'equipment' | 'cosmetic';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'head' | 'body' | 'accessory' | 'background' | 'effect' | 'title';

// Effect types for consumable items
export interface ItemEffect {
  type: 'exp_boost' | 'gold_boost' | 'hint' | 'skip' | 'shield' | 'time_extend';
  value: number; // multiplier or count
  duration?: number; // in minutes, for boost effects
}

export interface IItem extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  slot?: EquipmentSlot; // for equipment/cosmetic items
  icon: string; // emoji or image URL
  imageUrl?: string; // for cosmetic items with actual images
  price: number; // in gold
  effects?: ItemEffect[];
  maxStack: number; // max quantity a player can hold (0 = unlimited)
  isActive: boolean;
  order: number; // display order in shop
  createdAt: Date;
  updatedAt: Date;
}

const ItemEffectSchema = new Schema<ItemEffect>(
  {
    type: {
      type: String,
      enum: ['exp_boost', 'gold_boost', 'hint', 'skip', 'shield', 'time_extend'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
    },
  },
  { _id: false }
);

const ItemSchema = new Schema<IItem>(
  {
    name: {
      type: String,
      required: [true, '請提供道具名稱'],
      trim: true,
      maxlength: [50, '名稱不能超過 50 個字元'],
    },
    description: {
      type: String,
      required: [true, '請提供道具描述'],
      maxlength: [200, '描述不能超過 200 個字元'],
    },
    type: {
      type: String,
      enum: ['consumable', 'equipment', 'cosmetic'],
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    slot: {
      type: String,
      enum: ['head', 'body', 'accessory', 'background', 'effect', 'title'],
    },
    icon: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      min: [0, '價格不能為負數'],
    },
    effects: [ItemEffectSchema],
    maxStack: {
      type: Number,
      default: 99,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ItemSchema.index({ type: 1, isActive: 1 });
ItemSchema.index({ order: 1 });

const Item = mongoose.model<IItem>('Item', ItemSchema);

export default Item;
