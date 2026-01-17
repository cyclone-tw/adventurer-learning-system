import mongoose, { Schema, Document } from 'mongoose';

export interface IUnit extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subjectId: mongoose.Types.ObjectId;
  academicYear: string; // e.g., "114"
  grade: number; // 1-6
  semester: '上' | '下';
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    name: {
      type: String,
      required: [true, '請提供單元名稱'],
      trim: true,
      maxlength: [100, '單元名稱不能超過 100 個字元'],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, '請選擇科目'],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, '請提供學年度'],
      trim: true,
    },
    grade: {
      type: Number,
      required: [true, '請選擇年級'],
      min: [1, '年級必須在 1-6 之間'],
      max: [6, '年級必須在 1-6 之間'],
    },
    semester: {
      type: String,
      required: [true, '請選擇學期'],
      enum: ['上', '下'],
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

// Compound indexes for efficient queries
UnitSchema.index({ subjectId: 1, academicYear: 1, grade: 1, semester: 1 });
UnitSchema.index({ subjectId: 1, academicYear: 1, grade: 1, semester: 1, order: 1 });
UnitSchema.index({ isActive: 1 });

const Unit = mongoose.model<IUnit>('Unit', UnitSchema);

export default Unit;
