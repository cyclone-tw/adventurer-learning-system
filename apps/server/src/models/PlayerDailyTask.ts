import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPlayerDailyTask extends Document {
  playerId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  date: Date;               // 任務日期（只記錄年月日）
  progress: number;         // 當前進度
  isCompleted: boolean;     // 是否完成
  isClaimed: boolean;       // 是否已領取獎勵
  completedAt?: Date;       // 完成時間
  claimedAt?: Date;         // 領取時間
  createdAt: Date;
  updatedAt: Date;
}

const playerDailyTaskSchema = new Schema<IPlayerDailyTask>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'DailyTask',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isClaimed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    claimedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicates for same player-task-date
playerDailyTaskSchema.index({ playerId: 1, taskId: 1, date: 1 }, { unique: true });
playerDailyTaskSchema.index({ playerId: 1, date: 1 });

const PlayerDailyTask: Model<IPlayerDailyTask> = mongoose.model<IPlayerDailyTask>(
  'PlayerDailyTask',
  playerDailyTaskSchema
);

export default PlayerDailyTask;
