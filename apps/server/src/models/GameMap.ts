import mongoose, { Document, Schema } from 'mongoose';

// Map themes
export type MapTheme = 'forest' | 'castle' | 'cave' | 'temple' | 'village' | 'snow' | 'desert' | 'ocean';

// Map object types
export type MapObjectType = 'monster' | 'npc' | 'chest' | 'portal' | 'save_point' | 'decoration';

// Monster difficulty
export type MonsterDifficulty = 'easy' | 'medium' | 'hard' | 'boss';

// Monster data interface
export interface IMonsterData {
  name: string;
  imageUrl: string;
  description?: string;
  difficulty: MonsterDifficulty;
  hp: number;  // Number of correct answers needed to defeat
  questionPool: {
    subjectId?: mongoose.Types.ObjectId;
    unitId?: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    count: number;  // Number of questions per encounter
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  rewards: {
    exp: number;
    gold: number;
    dropItems?: Array<{
      itemId: mongoose.Types.ObjectId;
      chance: number;  // 0-100
    }>;
  };
  respawnTime: number;  // Seconds, 0 means no respawn
  attackAnimation?: string;
  hurtAnimation?: string;
}

// NPC data interface
export interface INpcData {
  name: string;
  imageUrl: string;
  dialogues: string[];
  questId?: mongoose.Types.ObjectId;
}

// Chest data interface
export interface IChestData {
  items: Array<{
    itemId: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  gold: number;
  exp?: number;
  isOneTime: boolean;
}

// Portal data interface
export interface IPortalData {
  targetMapId: mongoose.Types.ObjectId;
  targetPosition: { x: number; y: number };
  requiresKey?: mongoose.Types.ObjectId;  // Item ID required to use portal
}

// Map object interface
export interface IMapObject {
  id: string;
  type: MapObjectType;
  position: { x: number; y: number };
  size?: { width: number; height: number };  // Default 1x1
  imageUrl?: string;
  monsterData?: IMonsterData;
  npcData?: INpcData;
  chestData?: IChestData;
  portalData?: IPortalData;
  isVisible: boolean;
  collides: boolean;
}

// Game map document interface
export interface IGameMap extends Document {
  name: string;
  description: string;
  theme: MapTheme;

  // Visual settings
  backgroundUrl?: string;
  tilesetUrl?: string;
  ambientMusic?: string;

  // Map dimensions
  width: number;  // In tiles
  height: number;
  tileSize: number;  // Pixels per tile

  // Map layers (2D arrays of tile indices)
  layers: {
    ground: number[][];
    obstacles: number[][];
    decorations: number[][];
  };

  // Spawn point
  spawnPoint: { x: number; y: number };

  // Objects on the map
  objects: IMapObject[];

  // Entry requirements
  requirements: {
    levelRequired: number;
    previousMapId?: mongoose.Types.ObjectId;
    stageRequired?: mongoose.Types.ObjectId;
  };

  // Metadata
  order: number;  // Display order
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Map Object Schema
const MapObjectSchema = new Schema<IMapObject>({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['monster', 'npc', 'chest', 'portal', 'save_point', 'decoration'],
    required: true
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  size: {
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 }
  },
  imageUrl: String,
  monsterData: {
    name: String,
    imageUrl: String,
    description: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'boss'] },
    hp: Number,
    questionPool: {
      subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
      unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
      categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
      count: Number,
      difficulty: { type: String, enum: ['easy', 'medium', 'hard'] }
    },
    rewards: {
      exp: Number,
      gold: Number,
      dropItems: [{
        itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
        chance: Number
      }]
    },
    respawnTime: Number,
    attackAnimation: String,
    hurtAnimation: String
  },
  npcData: {
    name: String,
    imageUrl: String,
    dialogues: [String],
    questId: { type: Schema.Types.ObjectId }
  },
  chestData: {
    items: [{
      itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
      quantity: Number
    }],
    gold: Number,
    exp: Number,
    isOneTime: Boolean
  },
  portalData: {
    targetMapId: { type: Schema.Types.ObjectId, ref: 'GameMap' },
    targetPosition: {
      x: Number,
      y: Number
    },
    requiresKey: { type: Schema.Types.ObjectId, ref: 'Item' }
  },
  isVisible: { type: Boolean, default: true },
  collides: { type: Boolean, default: true }
}, { _id: false });

// Game Map Schema
const GameMapSchema = new Schema<IGameMap>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  theme: {
    type: String,
    enum: ['forest', 'castle', 'cave', 'temple', 'village', 'snow', 'desert', 'ocean'],
    default: 'forest'
  },

  backgroundUrl: String,
  tilesetUrl: String,
  ambientMusic: String,

  width: { type: Number, required: true, default: 20 },
  height: { type: Number, required: true, default: 15 },
  tileSize: { type: Number, default: 32 },

  layers: {
    ground: { type: [[Number]], default: [] },
    obstacles: { type: [[Number]], default: [] },
    decorations: { type: [[Number]], default: [] }
  },

  spawnPoint: {
    x: { type: Number, default: 1 },
    y: { type: Number, default: 1 }
  },

  objects: [MapObjectSchema],

  requirements: {
    levelRequired: { type: Number, default: 1 },
    previousMapId: { type: Schema.Types.ObjectId, ref: 'GameMap' },
    stageRequired: { type: Schema.Types.ObjectId, ref: 'Stage' }
  },

  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Indexes
GameMapSchema.index({ isActive: 1, order: 1 });
GameMapSchema.index({ theme: 1 });
GameMapSchema.index({ createdBy: 1 });

export const GameMap = mongoose.model<IGameMap>('GameMap', GameMapSchema);
