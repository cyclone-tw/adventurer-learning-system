import mongoose, { Schema, Document } from 'mongoose';

// Interfaces
export interface IAdventureContext {
  description: string;
  monsterName?: string;
  monsterImageUrl?: string;
}

export interface IMediaItem {
  type: 'image' | 'audio' | 'video';
  url: string;
  publicId?: string; // Cloudinary public ID for deletion
  caption?: string;
  duration?: number; // For audio/video in seconds
  width?: number;
  height?: number;
}

export interface IQuestionContent {
  text: string;
  imageUrl?: string; // Legacy support
  media?: IMediaItem[]; // New media array
  adventureContext?: IAdventureContext;
}

export interface IQuestionOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
  imageUrl?: string;
}

export interface IQuestionAnswer {
  correct: string | string[]; // Single answer or multiple answers
  explanation?: string;
}

export interface IQuestionStats {
  totalAttempts: number;
  correctCount: number;
  avgTimeSeconds: number;
}

export interface IQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  // New hierarchy fields
  subjectId?: mongoose.Types.ObjectId;
  unitId?: mongoose.Types.ObjectId;
  // Legacy field (kept for backward compatibility)
  subject?: 'chinese' | 'math' | 'english' | 'science' | 'social';
  categoryId?: mongoose.Types.ObjectId;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  baseExp: number;
  baseGold: number;
  type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
  content: IQuestionContent;
  options?: IQuestionOption[];
  answer: IQuestionAnswer;
  stats: IQuestionStats;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas
const AdventureContextSchema = new Schema<IAdventureContext>(
  {
    description: { type: String, required: true },
    monsterName: { type: String },
    monsterImageUrl: { type: String },
  },
  { _id: false }
);

const MediaItemSchema = new Schema<IMediaItem>(
  {
    type: {
      type: String,
      required: true,
      enum: ['image', 'audio', 'video'],
    },
    url: { type: String, required: true },
    publicId: { type: String }, // For Cloudinary deletion
    caption: { type: String },
    duration: { type: Number }, // For audio/video
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

const QuestionContentSchema = new Schema<IQuestionContent>(
  {
    text: { type: String, required: true },
    imageUrl: { type: String }, // Legacy support
    media: { type: [MediaItemSchema], default: [] }, // New media array
    adventureContext: { type: AdventureContextSchema },
  },
  { _id: false }
);

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
  },
  { _id: false }
);

const QuestionAnswerSchema = new Schema<IQuestionAnswer>(
  {
    correct: { type: Schema.Types.Mixed, required: true }, // String or Array of strings
    explanation: { type: String },
  },
  { _id: false }
);

const QuestionStatsSchema = new Schema<IQuestionStats>(
  {
    totalAttempts: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    avgTimeSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

// Main Question Schema
const QuestionSchema = new Schema<IQuestion>(
  {
    // New hierarchy fields
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      index: true,
    },
    // Legacy fields (kept for backward compatibility)
    subject: {
      type: String,
      enum: ['chinese', 'math', 'english', 'science', 'social'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      required: [true, '請選擇難度'],
      enum: ['easy', 'medium', 'hard'],
    },
    baseExp: {
      type: Number,
      required: true,
      default: 10,
      min: [0, '經驗值不能為負數'],
    },
    baseGold: {
      type: Number,
      required: true,
      default: 5,
      min: [0, '金幣不能為負數'],
    },
    type: {
      type: String,
      required: [true, '請選擇題目類型'],
      enum: ['single_choice', 'multiple_choice', 'fill_blank', 'true_false'],
    },
    content: {
      type: QuestionContentSchema,
      required: [true, '請提供題目內容'],
    },
    options: {
      type: [QuestionOptionSchema],
      validate: {
        validator: function (this: IQuestion, options: IQuestionOption[]) {
          // Options required for choice questions
          if (['single_choice', 'multiple_choice', 'true_false'].includes(this.type)) {
            return options && options.length >= 2;
          }
          return true;
        },
        message: '選擇題至少需要 2 個選項',
      },
    },
    answer: {
      type: QuestionAnswerSchema,
      required: [true, '請提供答案'],
    },
    stats: {
      type: QuestionStatsSchema,
      default: () => ({
        totalAttempts: 0,
        correctCount: 0,
        avgTimeSeconds: 0,
      }),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '請提供建立者'],
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
QuestionSchema.index({ subject: 1 });
QuestionSchema.index({ subjectId: 1 });
QuestionSchema.index({ unitId: 1 });
QuestionSchema.index({ categoryId: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ isActive: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ subject: 1, difficulty: 1, isActive: 1 }); // For random question query (legacy)
QuestionSchema.index({ subjectId: 1, difficulty: 1, isActive: 1 }); // For random question query (new)
QuestionSchema.index({ unitId: 1, difficulty: 1, isActive: 1 }); // For unit-based quiz

// Virtual for correct rate
QuestionSchema.virtual('correctRate').get(function () {
  if (this.stats.totalAttempts === 0) return 0;
  return Math.round((this.stats.correctCount / this.stats.totalAttempts) * 100);
});

// Method to update stats after an attempt
QuestionSchema.methods.updateStats = async function (
  isCorrect: boolean,
  timeSeconds: number
) {
  const oldTotal = this.stats.totalAttempts;
  const oldAvgTime = this.stats.avgTimeSeconds;

  this.stats.totalAttempts += 1;
  if (isCorrect) {
    this.stats.correctCount += 1;
  }

  // Calculate new average time
  this.stats.avgTimeSeconds =
    (oldAvgTime * oldTotal + timeSeconds) / this.stats.totalAttempts;

  await this.save();
};

// Static method to get random questions
QuestionSchema.statics.getRandom = async function (
  subject: string,
  count: number = 1,
  options: {
    difficulty?: string;
    excludeIds?: string[];
    categoryId?: string;
  } = {}
) {
  const query: Record<string, unknown> = {
    subject,
    isActive: true,
  };

  if (options.difficulty) {
    query.difficulty = options.difficulty;
  }

  if (options.categoryId) {
    query.categoryId = new mongoose.Types.ObjectId(options.categoryId);
  }

  if (options.excludeIds && options.excludeIds.length > 0) {
    query._id = {
      $nin: options.excludeIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const questions = await this.aggregate([
    { $match: query },
    { $sample: { size: count } },
    {
      $project: {
        answer: 0, // Don't return answer in random query
      },
    },
  ]);

  return questions;
};

// Enable virtuals
QuestionSchema.set('toJSON', { virtuals: true });
QuestionSchema.set('toObject', { virtuals: true });

const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
