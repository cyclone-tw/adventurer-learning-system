import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerStageProgress extends Document {
  _id: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;

  // Progress status
  isUnlocked: boolean;
  isCompleted: boolean;
  completedAt?: Date;

  // Statistics
  totalAttempts: number;
  bestScore: number; // Best number of correct answers in a session
  totalQuestionsAnswered: number;
  totalCorrect: number;

  // Session tracking
  currentSessionCorrect: number;
  currentSessionTotal: number;

  createdAt: Date;
  updatedAt: Date;
}

const PlayerStageProgressSchema = new Schema<IPlayerStageProgress>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '請提供玩家 ID'],
      index: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      ref: 'Stage',
      required: [true, '請提供關卡 ID'],
      index: true,
    },

    // Progress status
    isUnlocked: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },

    // Statistics
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalQuestionsAnswered: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Current session tracking (reset when starting new session)
    currentSessionCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentSessionTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to ensure one progress record per player per stage
PlayerStageProgressSchema.index({ playerId: 1, stageId: 1 }, { unique: true });

// Virtual for correct rate
PlayerStageProgressSchema.virtual('correctRate').get(function () {
  if (this.totalQuestionsAnswered === 0) return 0;
  return Math.round((this.totalCorrect / this.totalQuestionsAnswered) * 100);
});

// Enable virtuals
PlayerStageProgressSchema.set('toJSON', { virtuals: true });
PlayerStageProgressSchema.set('toObject', { virtuals: true });

const PlayerStageProgress = mongoose.model<IPlayerStageProgress>(
  'PlayerStageProgress',
  PlayerStageProgressSchema
);

export default PlayerStageProgress;
