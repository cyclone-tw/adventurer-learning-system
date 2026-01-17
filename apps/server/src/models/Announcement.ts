import mongoose, { Schema, Document } from 'mongoose';

// Announcement types
export type AnnouncementType = 'info' | 'event' | 'promotion';

// Discount configuration
export interface IDiscountConfig {
  type: 'percentage' | 'fixed'; // 百分比折扣 or 固定金額折扣
  value: number; // 折扣值 (e.g., 20 for 20% off or 20 gold off)
  itemIds?: mongoose.Types.ObjectId[]; // 指定商品，空則全部商品
  minPurchase?: number; // 最低購買金額
}

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: AnnouncementType;
  icon: string;
  imageUrl?: string;
  // Event/Promotion specific
  startDate?: Date;
  endDate?: Date;
  // Discount for promotions
  discount?: IDiscountConfig;
  // Display options
  isPinned: boolean; // 置頂
  showInShop: boolean; // 顯示在商店頁面
  isActive: boolean;
  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountConfigSchema = new Schema<IDiscountConfig>(
  {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [1, '折扣值必須大於 0'],
    },
    itemIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Item',
    }],
    minPurchase: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, '請提供公告標題'],
      trim: true,
      maxlength: [100, '標題不能超過 100 個字元'],
    },
    content: {
      type: String,
      required: [true, '請提供公告內容'],
      maxlength: [2000, '內容不能超過 2000 個字元'],
    },
    type: {
      type: String,
      enum: ['info', 'event', 'promotion'],
      default: 'info',
    },
    icon: {
      type: String,
      default: '📢',
    },
    imageUrl: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    discount: DiscountConfigSchema,
    isPinned: {
      type: Boolean,
      default: false,
    },
    showInShop: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AnnouncementSchema.index({ type: 1, isActive: 1 });
AnnouncementSchema.index({ startDate: 1, endDate: 1 });
AnnouncementSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual for checking if event/promotion is currently active
AnnouncementSchema.virtual('isCurrentlyActive').get(function () {
  if (!this.isActive) return false;
  if (this.type === 'info') return true;

  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
});

// Enable virtuals in JSON
AnnouncementSchema.set('toJSON', { virtuals: true });
AnnouncementSchema.set('toObject', { virtuals: true });

const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

export default Announcement;
