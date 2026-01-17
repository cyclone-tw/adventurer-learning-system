import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interfaces
export interface IEquippedItems {
  title?: mongoose.Types.ObjectId;
  head?: mongoose.Types.ObjectId;
  body?: mongoose.Types.ObjectId;
  accessory?: mongoose.Types.ObjectId;
  background?: mongoose.Types.ObjectId;
  effect?: mongoose.Types.ObjectId;
}

export interface IDailyPractice {
  date: Date;
  questionsAnswered: number;
  rewardedQuestions: number; // Max per day for rewards
}

export interface IStudentProfile {
  level: number;
  exp: number;
  expToNextLevel: number;
  gold: number;
  totalQuestionsAnswered: number;
  correctRate: number;
  stats: {
    chinese: number;
    math: number;
    english?: number;
    science?: number;
    social?: number;
    [subject: string]: number | undefined;
  };
  currentAvatarId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  equippedItems?: IEquippedItems;
  dailyPractice?: IDailyPractice;
}

export interface ITeacherProfile {
  school?: string;
  classIds: mongoose.Types.ObjectId[];
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  googleId?: string;
  avatarUrl?: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  studentProfile?: IStudentProfile;
  teacherProfile?: ITeacherProfile;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toPublicJSON(): Partial<IUser>;
}

// Schema
const EquippedItemsSchema = new Schema<IEquippedItems>(
  {
    title: { type: Schema.Types.ObjectId, ref: 'Item' },
    head: { type: Schema.Types.ObjectId, ref: 'Item' },
    body: { type: Schema.Types.ObjectId, ref: 'Item' },
    accessory: { type: Schema.Types.ObjectId, ref: 'Item' },
    background: { type: Schema.Types.ObjectId, ref: 'Item' },
    effect: { type: Schema.Types.ObjectId, ref: 'Item' },
  },
  { _id: false }
);

const DailyPracticeSchema = new Schema<IDailyPractice>(
  {
    date: { type: Date, default: Date.now },
    questionsAnswered: { type: Number, default: 0 },
    rewardedQuestions: { type: Number, default: 0 },
  },
  { _id: false }
);

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    expToNextLevel: { type: Number, default: 100 },
    gold: { type: Number, default: 0 },
    totalQuestionsAnswered: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 },
    stats: {
      type: Map,
      of: Number,
      default: () => ({
        chinese: 50,
        math: 50,
      }),
    },
    currentAvatarId: { type: Schema.Types.ObjectId, ref: 'Avatar' },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    equippedItems: { type: EquippedItemsSchema, default: () => ({}) },
    dailyPractice: { type: DailyPracticeSchema, default: () => ({ date: new Date(), questionsAnswered: 0, rewardedQuestions: 0 }) },
  },
  { _id: false }
);

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    school: { type: String },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, '請提供電子郵件'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, '請提供有效的電子郵件'],
    },
    passwordHash: {
      type: String,
      minlength: [6, '密碼至少需要 6 個字元'],
      select: false, // Don't return password by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow null values while maintaining uniqueness
    },
    avatarUrl: {
      type: String,
    },
    displayName: {
      type: String,
      required: [true, '請提供顯示名稱'],
      trim: true,
      maxlength: [50, '名稱不能超過 50 個字元'],
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    studentProfile: {
      type: StudentProfileSchema,
      default: undefined,
    },
    teacherProfile: {
      type: TeacherProfileSchema,
      default: undefined,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (email index is already created by unique: true in schema)
UserSchema.index({ role: 1 });
UserSchema.index({ 'studentProfile.classId': 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  // Only hash if password is modified and exists
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Pre-save middleware to set profile based on role
UserSchema.pre('save', function (next) {
  if (this.isNew) {
    if (this.role === 'student' && !this.studentProfile) {
      this.studentProfile = {
        level: 1,
        exp: 0,
        expToNextLevel: 100,
        gold: 0,
        totalQuestionsAnswered: 0,
        correctRate: 0,
        stats: {
          chinese: 50,
          math: 50,
        },
      };
    } else if (this.role === 'teacher' && !this.teacherProfile) {
      this.teacherProfile = {
        classIds: [],
      };
    }
  }
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to return public user data (without sensitive fields)
UserSchema.methods.toPublicJSON = function (): Partial<IUser> {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
