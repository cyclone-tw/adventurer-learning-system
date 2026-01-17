import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPlayerAchievement extends Document {
  playerId: mongoose.Types.ObjectId;
  achievementId: mongoose.Types.ObjectId;
  unlockedAt: Date;
  progress: number;           // 當前進度（用於顯示接近完成的成就）
  isNew: boolean;             // 是否為新解鎖（用於顯示提示）
  createdAt: Date;
  updatedAt: Date;
}

const playerAchievementSchema = new Schema(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    isNew: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicates
playerAchievementSchema.index({ playerId: 1, achievementId: 1 }, { unique: true });

const PlayerAchievement: Model<IPlayerAchievement> = mongoose.model<IPlayerAchievement>(
  'PlayerAchievement',
  playerAchievementSchema
);

export default PlayerAchievement;
