import mongoose, { Document, Schema } from 'mongoose';

// Daily task requirement types
export type DailyTaskType =
  | 'questions_answered'    // 答題數量
  | 'correct_answers'       // 正確答題數
  | 'correct_streak'        // 連續答對
  | 'subject_questions'     // 特定科目答題
  | 'perfect_answers';      // 滿分次數

export interface IDailyTask extends Document {
  code: string;             // 唯一識別碼
  name: string;
  description: string;
  icon: string;
  taskType: DailyTaskType;
  targetValue: number;      // 目標值
  targetSubject?: string;   // 特定科目（可選）
  expReward: number;        // 獎勵經驗
  goldReward: number;       // 獎勵金幣
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;            // 排序
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dailyTaskSchema = new Schema<IDailyTask>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, '請輸入任務名稱'],
      trim: true,
      maxlength: [50, '任務名稱不能超過 50 字'],
    },
    description: {
      type: String,
      required: [true, '請輸入任務描述'],
      trim: true,
      maxlength: [200, '任務描述不能超過 200 字'],
    },
    icon: {
      type: String,
      required: true,
      default: '📋',
    },
    taskType: {
      type: String,
      required: true,
      enum: [
        'questions_answered',
        'correct_answers',
        'correct_streak',
        'subject_questions',
        'perfect_answers',
      ],
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    targetSubject: {
      type: String,
    },
    expReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    goldReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
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
dailyTaskSchema.index({ code: 1 });
dailyTaskSchema.index({ isActive: 1, order: 1 });
dailyTaskSchema.index({ taskType: 1 });

const DailyTask = mongoose.model<IDailyTask>('DailyTask', dailyTaskSchema);

export default DailyTask;
