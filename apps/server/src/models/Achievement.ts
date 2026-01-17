import mongoose, { Document, Schema } from 'mongoose';

// Achievement requirement types
export type AchievementRequirementType =
  | 'questions_answered'      // 答題數量
  | 'correct_answers'         // 正確答題數
  | 'correct_streak'          // 連續答對
  | 'level_reached'           // 達到等級
  | 'exp_earned'              // 獲得經驗值
  | 'gold_earned'             // 獲得金幣
  | 'gold_spent'              // 花費金幣
  | 'items_purchased'         // 購買道具數
  | 'login_days'              // 登入天數
  | 'daily_questions'         // 單日答題數
  | 'subject_mastery'         // 科目精通度
  | 'perfect_score';          // 滿分次數

export interface IAchievement extends Document {
  code: string;               // 唯一識別碼
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'adventure' | 'social' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirementType: AchievementRequirementType;
  requirementValue: number;   // 達成門檻值
  requirementSubject?: string; // 特定科目（可選）
  expReward: number;          // 達成獎勵經驗
  goldReward: number;         // 達成獎勵金幣
  order: number;              // 排序
  isActive: boolean;
  isHidden: boolean;          // 隱藏成就（達成前不顯示）
  createdAt: Date;
  updatedAt: Date;
}

const achievementSchema = new Schema<IAchievement>(
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
      required: [true, '請輸入成就名稱'],
      trim: true,
      maxlength: [50, '成就名稱不能超過 50 字'],
    },
    description: {
      type: String,
      required: [true, '請輸入成就描述'],
      trim: true,
      maxlength: [200, '成就描述不能超過 200 字'],
    },
    icon: {
      type: String,
      required: true,
      default: '🏆',
    },
    category: {
      type: String,
      enum: ['learning', 'adventure', 'social', 'special'],
      default: 'learning',
    },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    requirementType: {
      type: String,
      required: true,
      enum: [
        'questions_answered',
        'correct_answers',
        'correct_streak',
        'level_reached',
        'exp_earned',
        'gold_earned',
        'gold_spent',
        'items_purchased',
        'login_days',
        'daily_questions',
        'subject_mastery',
        'perfect_score',
      ],
    },
    requirementValue: {
      type: Number,
      required: true,
      min: 1,
    },
    requirementSubject: {
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
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
achievementSchema.index({ code: 1 });
achievementSchema.index({ category: 1, isActive: 1 });
achievementSchema.index({ requirementType: 1 });

const Achievement = mongoose.model<IAchievement>('Achievement', achievementSchema);

export default Achievement;
