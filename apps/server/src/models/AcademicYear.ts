import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademicYear extends Document {
  _id: mongoose.Types.ObjectId;
  year: string; // e.g., "114", "115"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    year: {
      type: String,
      required: [true, '請提供學年度'],
      unique: true,
      trim: true,
      maxlength: [10, '學年度不能超過 10 個字元'],
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
AcademicYearSchema.index({ year: -1 }); // Descending for newest first

const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', AcademicYearSchema);

export default AcademicYear;
