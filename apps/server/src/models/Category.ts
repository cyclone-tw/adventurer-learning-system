import mongoose, { Schema, Document } from 'mongoose';

// Interfaces
export interface IMapConfig {
  mapName: string;
  iconUrl?: string;
  backgroundColor?: string;
}

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  subject: 'chinese' | 'math' | 'english' | 'science' | 'social';
  name: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId;
  order: number;
  mapConfig?: IMapConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const MapConfigSchema = new Schema<IMapConfig>(
  {
    mapName: { type: String, required: true },
    iconUrl: { type: String },
    backgroundColor: { type: String },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    subject: {
      type: String,
      required: [true, '請選擇學科'],
      enum: ['chinese', 'math', 'english', 'science', 'social'],
    },
    name: {
      type: String,
      required: [true, '請提供分類名稱'],
      trim: true,
      maxlength: [100, '分類名稱不能超過 100 個字元'],
    },
    description: {
      type: String,
      maxlength: [500, '描述不能超過 500 個字元'],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    order: {
      type: Number,
      default: 0,
    },
    mapConfig: {
      type: MapConfigSchema,
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

// Indexes
CategorySchema.index({ subject: 1 });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ subject: 1, order: 1 });

// Virtual for getting children categories
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

// Enable virtuals in JSON
CategorySchema.set('toJSON', { virtuals: true });
CategorySchema.set('toObject', { virtuals: true });

const Category = mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
