import mongoose, { Document, Schema } from 'mongoose';

// Direction enum
export type Direction = 'up' | 'down' | 'left' | 'right';

// Completed object record
export interface ICompletedObject {
  objectId: string;
  completedAt: Date;
  canRespawn: boolean;
  respawnAt?: Date;
}

// Current quest progress
export interface IQuestProgress {
  questId: mongoose.Types.ObjectId;
  progress: number;
  target: number;
  description: string;
}

// Player map state document interface
export interface IPlayerMapState extends Document {
  playerId: mongoose.Types.ObjectId;
  mapId: mongoose.Types.ObjectId;

  // Current position
  position: { x: number; y: number };
  direction: Direction;

  // Completed objects (opened chests, defeated monsters)
  completedObjects: ICompletedObject[];

  // Quest progress
  currentQuests: IQuestProgress[];

  // Save point
  lastSavePoint?: { x: number; y: number };

  // Stats for this map
  stats: {
    totalVisits: number;
    monstersDefeated: number;
    chestsOpened: number;
    timeSpent: number;  // In seconds
  };

  // Discovery
  exploredAreas: string[];  // Grid coordinates like "5,3"

  // First entry flag
  firstEntry: boolean;

  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Player Map State Schema
const PlayerMapStateSchema = new Schema<IPlayerMapState>({
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mapId: {
    type: Schema.Types.ObjectId,
    ref: 'GameMap',
    required: true
  },

  position: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 }
  },
  direction: {
    type: String,
    enum: ['up', 'down', 'left', 'right'],
    default: 'down'
  },

  completedObjects: [{
    objectId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    canRespawn: { type: Boolean, default: false },
    respawnAt: Date
  }],

  currentQuests: [{
    questId: { type: Schema.Types.ObjectId },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    description: String
  }],

  lastSavePoint: {
    x: Number,
    y: Number
  },

  stats: {
    totalVisits: { type: Number, default: 1 },
    monstersDefeated: { type: Number, default: 0 },
    chestsOpened: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }
  },

  exploredAreas: [{ type: String }],

  firstEntry: { type: Boolean, default: true },

  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Compound index for player + map
PlayerMapStateSchema.index({ playerId: 1, mapId: 1 }, { unique: true });
PlayerMapStateSchema.index({ playerId: 1 });

// Methods

// Check if an object is completed and not respawned
PlayerMapStateSchema.methods.isObjectCompleted = function(objectId: string): boolean {
  const completed = this.completedObjects.find((c: ICompletedObject) => c.objectId === objectId);
  if (!completed) return false;

  // Check if it can respawn and has respawned
  if (completed.canRespawn && completed.respawnAt && completed.respawnAt <= new Date()) {
    return false;
  }

  return true;
};

// Mark an object as completed
PlayerMapStateSchema.methods.completeObject = function(
  objectId: string,
  canRespawn: boolean,
  respawnSeconds?: number
): void {
  const existingIndex = this.completedObjects.findIndex(
    (c: ICompletedObject) => c.objectId === objectId
  );

  const completedObject: ICompletedObject = {
    objectId,
    completedAt: new Date(),
    canRespawn,
    respawnAt: respawnSeconds ? new Date(Date.now() + respawnSeconds * 1000) : undefined
  };

  if (existingIndex >= 0) {
    this.completedObjects[existingIndex] = completedObject;
  } else {
    this.completedObjects.push(completedObject);
  }

  this.lastUpdated = new Date();
};

// Update position
PlayerMapStateSchema.methods.updatePosition = function(
  x: number,
  y: number,
  direction: Direction
): void {
  this.position = { x, y };
  this.direction = direction;
  this.lastUpdated = new Date();

  // Add to explored areas
  const areaKey = `${x},${y}`;
  if (!this.exploredAreas.includes(areaKey)) {
    this.exploredAreas.push(areaKey);
  }
};

export const PlayerMapState = mongoose.model<IPlayerMapState>('PlayerMapState', PlayerMapStateSchema);
