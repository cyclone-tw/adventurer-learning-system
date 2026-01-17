import mongoose, { Schema, Document } from 'mongoose';

// Unlock condition types
export type UnlockConditionType = 'none' | 'previous' | 'level' | 'stage';

export interface IUnlockCondition {
  type: UnlockConditionType;
  value?: number | string; // Level number or stage ID
}

export interface IStageRewards {
  bonusExp: number;
  bonusGold: number;
  firstClearBonus?: {
    exp: number;
    gold: number;
  };
}

export interface IStage extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;

  // Question sources
  unitIds: mongoose.Types.ObjectId[];
  difficulty?: ('easy' | 'medium' | 'hard')[];

  // Stage settings
  order: number;
  questionsPerSession: number;

  // Unlock conditions
  unlockCondition: IUnlockCondition;

  // Rewards
  rewards: IStageRewards;

  // Status
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UnlockConditionSchema = new Schema<IUnlockCondition>(
  {
    type: {
      type: String,
      enum: ['none', 'previous', 'level', 'stage'],
      default: 'none',
    },
    value: {
      type: Schema.Types.Mixed, // Number for level, String for stage ID
    },
  },
  { _id: false }
);

const StageRewardsSchema = new Schema<IStageRewards>(
  {
    bonusExp: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonusGold: {
      type: Number,
      default: 0,
      min: 0,
    },
    firstClearBonus: {
      exp: { type: Number, default: 0, min: 0 },
      gold: { type: Number, default: 0, min: 0 },
    },
  },
  { _id: false }
);

const StageSchema = new Schema<IStage>(
  {
    name: {
      type: String,
      required: [true, '請提供關卡名稱'],
      trim: true,
      maxlength: [100, '關卡名稱不能超過100字'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, '描述不能超過500字'],
    },
    icon: {
      type: String,
      default: '🏰',
    },
    imageUrl: {
      type: String,
    },

    // Question sources - array of unit IDs
    unitIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Unit',
    }],

    // Difficulty filter (optional)
    difficulty: [{
      type: String,
      enum: ['easy', 'medium', 'hard'],
    }],

    // Stage order in the map
    order: {
      type: Number,
      default: 0,
    },

    // How many questions per session
    questionsPerSession: {
      type: Number,
      default: 10,
      min: [1, '每次挑戰至少1題'],
      max: [50, '每次挑戰最多50題'],
    },

    // Unlock conditions
    unlockCondition: {
      type: UnlockConditionSchema,
      default: () => ({ type: 'none' }),
    },

    // Rewards for completing the stage
    rewards: {
      type: StageRewardsSchema,
      default: () => ({
        bonusExp: 0,
        bonusGold: 0,
        firstClearBonus: { exp: 50, gold: 25 },
      }),
    },

    // Is this stage visible to students
    isActive: {
      type: Boolean,
      default: true,
    },

    // Who created this stage
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '請提供建立者'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StageSchema.index({ order: 1 });
StageSchema.index({ isActive: 1 });
StageSchema.index({ createdBy: 1 });
StageSchema.index({ unitIds: 1 });

const Stage = mongoose.model<IStage>('Stage', StageSchema);

export default Stage;
