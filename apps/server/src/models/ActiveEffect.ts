import mongoose, { Schema, Document } from 'mongoose';

export interface IActiveEffect extends Document {
  _id: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  effectType: 'exp_boost' | 'gold_boost' | 'shield' | 'time_extend';
  value: number;
  expiresAt: Date;
  createdAt: Date;
}

const ActiveEffectSchema = new Schema<IActiveEffect>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    effectType: {
      type: String,
      enum: ['exp_boost', 'gold_boost', 'shield', 'time_extend'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding active effects
ActiveEffectSchema.index({ playerId: 1, effectType: 1, expiresAt: 1 });

// Static method to get active effects for a player
ActiveEffectSchema.statics.getActiveEffects = async function (playerId: mongoose.Types.ObjectId) {
  return this.find({
    playerId,
    expiresAt: { $gt: new Date() },
  }).populate('itemId', 'name icon');
};

const ActiveEffect = mongoose.model<IActiveEffect>('ActiveEffect', ActiveEffectSchema);

export default ActiveEffect;
