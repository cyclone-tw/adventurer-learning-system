import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  submittedAnswer: string | string[]; // Single answer or multiple answers
  isCorrect: boolean;
  timeSpentSeconds: number;
  expGained: number;
  goldGained: number;
  createdAt: Date;
}

const QuestionAttemptSchema = new Schema<IQuestionAttempt>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    submittedAnswer: {
      type: Schema.Types.Mixed, // Can be string or string[]
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    expGained: {
      type: Number,
      default: 0,
      min: 0,
    },
    goldGained: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
QuestionAttemptSchema.index({ studentId: 1, createdAt: -1 });
QuestionAttemptSchema.index({ studentId: 1, questionId: 1 });
QuestionAttemptSchema.index({ questionId: 1, isCorrect: 1 });

const QuestionAttempt = mongoose.model<IQuestionAttempt>('QuestionAttempt', QuestionAttemptSchema);

export default QuestionAttempt;
