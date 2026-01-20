import api from './api';

// Types
export type MapTheme = 'forest' | 'castle' | 'cave' | 'temple' | 'village' | 'snow' | 'desert' | 'ocean';
export type MapObjectType = 'monster' | 'npc' | 'chest' | 'portal' | 'save_point' | 'decoration';
export type MonsterDifficulty = 'easy' | 'medium' | 'hard' | 'boss';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MonsterData {
  name: string;
  imageUrl: string;
  description?: string;
  difficulty: MonsterDifficulty;
  hp: number;
  questionPool: {
    subjectId?: string;
    unitId?: string;
    categoryId?: string;
    count: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
  rewards: {
    exp: number;
    gold: number;
    dropItems?: Array<{ itemId: string; chance: number }>;
  };
  respawnTime: number;
  attackAnimation?: string;
  hurtAnimation?: string;
}

export interface NpcData {
  name: string;
  imageUrl: string;
  dialogues: string[];
  questId?: string;
}

export interface ChestData {
  items: Array<{ itemId: string; quantity: number }>;
  gold: number;
  exp?: number;
  isOneTime: boolean;
}

export interface PortalData {
  targetMapId: string;
  targetPosition: { x: number; y: number };
  requiresKey?: string;
}

export interface MapObject {
  id: string;
  type: MapObjectType;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  imageUrl?: string;
  monsterData?: MonsterData;
  npcData?: NpcData;
  chestData?: ChestData;
  portalData?: PortalData;
  isVisible: boolean;
  collides: boolean;
}

export interface GameMapData {
  _id: string;
  name: string;
  description: string;
  theme: MapTheme;
  width: number;
  height: number;
  tileSize: number;
  backgroundUrl?: string;
  tilesetUrl?: string;
  ambientMusic?: string;
  layers: {
    ground: number[][];
    obstacles: number[][];
    decorations: number[][];
  };
  spawnPoint?: { x: number; y: number };
  objects: MapObject[];
  requirements?: {
    levelRequired: number;
    questsRequired?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlayerMapState {
  position: { x: number; y: number };
  direction: Direction;
  stats: {
    totalVisits: number;
    monstersDefeated: number;
    chestsOpened: number;
    timeSpent: number;
  };
  firstEntry: boolean;
}

export interface MapListItem {
  _id: string;
  name: string;
  description: string;
  theme: MapTheme;
  backgroundUrl?: string;
  isUnlocked: boolean;
  unlockReason?: string;
  hasVisited: boolean;
  stats: {
    totalVisits: number;
    monstersDefeated: number;
    chestsOpened: number;
    timeSpent: number;
  } | null;
}

export interface BattleQuestion {
  _id: string;
  content: {
    text: string;
    imageUrl?: string;
  };
  type: 'single_choice' | 'multiple_choice' | 'fill_blank' | 'true_false';
  options?: Array<{ id: string; text: string }>;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface MonsterEncounter {
  type: 'battle';
  monster: {
    id: string;
    name: string;
    imageUrl: string;
    description?: string;
    difficulty: MonsterDifficulty;
    hp: number;
    rewards: {
      exp: number;
      gold: number;
    };
  };
  questions: BattleQuestion[];
}

export interface ChestReward {
  type: 'chest';
  rewards: {
    gold: number;
    exp: number;
    items: Array<{ itemId: string; quantity: number }>;
  };
}

export interface NpcDialogue {
  type: 'dialogue';
  npc: {
    name: string;
    imageUrl: string;
    dialogues: string[];
    questId?: string;
  };
}

export interface PortalDestination {
  type: 'portal';
  destination: {
    mapId: string;
    position: { x: number; y: number };
  };
  requiresKey?: string;
}

export interface SavePointResult {
  type: 'save_point';
  message: string;
  position: { x: number; y: number };
}

export type InteractionResult = MonsterEncounter | ChestReward | NpcDialogue | PortalDestination | SavePointResult;

export interface BattleResult {
  victory: boolean;
  rewards: {
    exp: number;
    gold: number;
    items: Array<{ itemId: string; quantity: number }>;
  };
  stats: {
    correctAnswers: number;
    totalQuestions: number;
  };
}

// API Service
export const gameMapService = {
  // Get available maps for student
  async getStudentMaps(): Promise<MapListItem[]> {
    const response = await api.get('/game-maps/student');
    return response.data.data.maps;
  },

  // Enter a map
  async enterMap(mapId: string): Promise<{ map: GameMapData; playerState: PlayerMapState }> {
    const response = await api.post(`/game-maps/student/${mapId}/enter`);
    return response.data.data;
  },

  // Update position
  async updatePosition(
    mapId: string,
    x: number,
    y: number,
    direction: Direction
  ): Promise<{ position: { x: number; y: number }; direction: Direction }> {
    const response = await api.put(`/game-maps/student/${mapId}/position`, { x, y, direction });
    return response.data.data;
  },

  // Interact with object
  async interactWithObject(mapId: string, objectId: string): Promise<InteractionResult> {
    const response = await api.post(`/game-maps/student/${mapId}/objects/${objectId}/interact`);
    return response.data.data;
  },

  // Complete battle
  async completeBattle(
    mapId: string,
    objectId: string,
    victory: boolean,
    correctAnswers: number,
    totalQuestions: number
  ): Promise<BattleResult> {
    const response = await api.post(`/game-maps/student/${mapId}/objects/${objectId}/complete-battle`, {
      victory,
      correctAnswers,
      totalQuestions,
    });
    return response.data.data;
  },

  // Save game time
  async saveGameTime(mapId: string, timeSpent: number): Promise<{ totalTimeSpent: number }> {
    const response = await api.post(`/game-maps/student/${mapId}/save-time`, { timeSpent });
    return response.data.data;
  },

  // Teacher/Admin APIs
  async getAllMaps(): Promise<GameMapData[]> {
    const response = await api.get('/game-maps');
    return response.data.data.maps;
  },

  async getMapById(mapId: string): Promise<GameMapData> {
    const response = await api.get(`/game-maps/${mapId}`);
    return response.data.data.map;
  },

  async createMap(data: Partial<GameMapData>): Promise<GameMapData> {
    const response = await api.post('/game-maps', data);
    return response.data.data.map;
  },

  async updateMap(mapId: string, data: Partial<GameMapData>): Promise<GameMapData> {
    const response = await api.put(`/game-maps/${mapId}`, data);
    return response.data.data.map;
  },

  async deleteMap(mapId: string): Promise<void> {
    await api.delete(`/game-maps/${mapId}`);
  },

  async addMapObject(mapId: string, object: Partial<MapObject>): Promise<{ map: GameMapData; addedObject: MapObject }> {
    const response = await api.post(`/game-maps/${mapId}/objects`, object);
    return response.data.data;
  },

  async updateMapObject(mapId: string, objectId: string, data: Partial<MapObject>): Promise<GameMapData> {
    const response = await api.put(`/game-maps/${mapId}/objects/${objectId}`, data);
    return response.data.data.map;
  },

  async removeMapObject(mapId: string, objectId: string): Promise<GameMapData> {
    const response = await api.delete(`/game-maps/${mapId}/objects/${objectId}`);
    return response.data.data.map;
  },
};

export default gameMapService;
