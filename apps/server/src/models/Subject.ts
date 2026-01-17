import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string; // Internal code for URL/API use
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, '請提供科目名稱'],
      trim: true,
      maxlength: [50, '科目名稱不能超過 50 個字元'],
    },
    code: {
      type: String,
      required: [true, '請提供科目代碼'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [20, '科目代碼不能超過 20 個字元'],
      match: [/^[a-z0-9_]+$/, '科目代碼只能包含小寫字母、數字和底線'],
    },
    icon: {
      type: String,
      default: '📚',
      maxlength: [10, '圖示不能超過 10 個字元'],
    },
    order: {
      type: Number,
      default: 0,
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
SubjectSchema.index({ order: 1 });
SubjectSchema.index({ isActive: 1 });

const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
