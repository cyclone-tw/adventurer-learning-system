import mongoose, { Document, Schema } from 'mongoose';

export interface IClass extends Document {
  name: string;
  description?: string;
  teacherId: mongoose.Types.ObjectId;
  academicYearId?: mongoose.Types.ObjectId;
  inviteCode: string;
  students: mongoose.Types.ObjectId[];
  maxStudents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: [true, '請輸入班級名稱'],
      trim: true,
      maxlength: [50, '班級名稱不能超過 50 字'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, '班級描述不能超過 200 字'],
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '請指定班級教師'],
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 8,
    },
    students: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    maxStudents: {
      type: Number,
      default: 50,
      min: [1, '最少需要 1 名學生'],
      max: [200, '最多 200 名學生'],
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

// Generate unique invite code
classSchema.statics.generateInviteCode = async function(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, I, 1
  let code: string;
  let exists = true;

  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    exists = await this.findOne({ inviteCode: code }) !== null;
  }

  return code!;
};

// Virtual for student count
classSchema.virtual('studentCount').get(function() {
  return this.students?.length || 0;
});

// Ensure virtuals are included in JSON
classSchema.set('toJSON', { virtuals: true });
classSchema.set('toObject', { virtuals: true });

// Indexes
classSchema.index({ inviteCode: 1 });
classSchema.index({ teacherId: 1, isActive: 1 });

const Class = mongoose.model<IClass>('Class', classSchema);

export default Class;
