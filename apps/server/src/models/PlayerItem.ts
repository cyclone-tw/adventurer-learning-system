import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerItem extends Document {
  _id: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  isEquipped: boolean;
  equippedAt?: Date;
  acquiredAt: Date;
  updatedAt: Date;
}

const PlayerItemSchema = new Schema<IPlayerItem>(
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
    quantity: {
      type: Number,
      required: true,
      min: [0, '數量不能為負數'],
      default: 1,
    },
    isEquipped: {
      type: Boolean,
      default: false,
    },
    equippedAt: {
      type: Date,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique player-item pairs
PlayerItemSchema.index({ playerId: 1, itemId: 1 }, { unique: true });

const PlayerItem = mongoose.model<IPlayerItem>('PlayerItem', PlayerItemSchema);

export default PlayerItem;
