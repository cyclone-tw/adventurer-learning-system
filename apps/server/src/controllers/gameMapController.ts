import { Request, Response, NextFunction } from 'express';
import { GameMap, IGameMap, IMapObject } from '../models/GameMap.js';
import { PlayerMapState } from '../models/PlayerMapState.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess } from '../utils/response.js';
import mongoose from 'mongoose';

// ==================== Teacher/Admin Controllers ====================

/**
 * Get all maps (teacher/admin)
 */
export const getAllMaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const maps = await GameMap.find()
      .sort({ order: 1, createdAt: -1 })
      .populate('createdBy', 'displayName email')
      .lean();

    sendSuccess(res, { maps });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single map (teacher/admin)
 */
export const getMapById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId } = req.params;

    const map = await GameMap.findById(mapId)
      .populate('createdBy', 'displayName email')
      .lean();

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    sendSuccess(res, { map });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new map (teacher/admin)
 */
export const createMap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const {
      name,
      description,
      theme,
      width,
      height,
      tileSize,
      backgroundUrl,
      tilesetUrl,
      ambientMusic,
      spawnPoint,
      requirements,
      order,
    } = req.body;

    // Initialize empty layers
    const emptyLayer = Array(height || 15).fill(null).map(() =>
      Array(width || 20).fill(0)
    );

    const map = await GameMap.create({
      name,
      description,
      theme: theme || 'forest',
      width: width || 20,
      height: height || 15,
      tileSize: tileSize || 32,
      backgroundUrl,
      tilesetUrl,
      ambientMusic,
      layers: {
        ground: emptyLayer,
        obstacles: emptyLayer.map(row => [...row]),
        decorations: emptyLayer.map(row => [...row]),
      },
      spawnPoint: spawnPoint || { x: 1, y: 1 },
      objects: [],
      requirements: requirements || { levelRequired: 1 },
      order: order || 0,
      isActive: true,
      createdBy: userId,
    });

    sendSuccess(res, { map }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update map (teacher/admin)
 */
export const updateMap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;

    const map = await GameMap.findByIdAndUpdate(
      mapId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    sendSuccess(res, { map });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete map (teacher/admin)
 */
export const deleteMap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId } = req.params;

    const map = await GameMap.findByIdAndDelete(mapId);

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    // Also delete player states for this map
    await PlayerMapState.deleteMany({ mapId });

    sendSuccess(res, { message: 'Map deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update map layers (teacher/admin)
 */
export const updateMapLayers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId } = req.params;
    const { layers } = req.body;

    const map = await GameMap.findByIdAndUpdate(
      mapId,
      { $set: { layers } },
      { new: true }
    );

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    sendSuccess(res, { map });
  } catch (error) {
    next(error);
  }
};

/**
 * Add object to map (teacher/admin)
 */
export const addMapObject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId } = req.params;
    const objectData = req.body;

    // Generate unique ID for the object
    objectData.id = new mongoose.Types.ObjectId().toString();

    const map = await GameMap.findByIdAndUpdate(
      mapId,
      { $push: { objects: objectData } },
      { new: true }
    );

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    sendSuccess(res, { map, addedObject: objectData });
  } catch (error) {
    next(error);
  }
};

/**
 * Update map object (teacher/admin)
 */
export const updateMapObject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId, objectId } = req.params;
    const updates = req.body;

    const map = await GameMap.findOneAndUpdate(
      { _id: mapId, 'objects.id': objectId },
      { $set: { 'objects.$': { ...updates, id: objectId } } },
      { new: true }
    );

    if (!map) {
      throw new AppError('Map or object not found', 404);
    }

    sendSuccess(res, { map });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove map object (teacher/admin)
 */
export const removeMapObject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mapId, objectId } = req.params;

    const map = await GameMap.findByIdAndUpdate(
      mapId,
      { $pull: { objects: { id: objectId } } },
      { new: true }
    );

    if (!map) {
      throw new AppError('Map not found', 404);
    }

    sendSuccess(res, { map });
  } catch (error) {
    next(error);
  }
};

// ==================== Student Controllers ====================

/**
 * Get available maps for student
 */
export const getStudentMaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const playerLevel = user.studentProfile?.level || 1;

    // Get all active maps
    const maps = await GameMap.find({ isActive: true })
      .sort({ order: 1 })
      .select('name description theme width height spawnPoint requirements order backgroundUrl')
      .lean();

    // Get player states for all maps
    const playerStates = await PlayerMapState.find({ playerId: userId }).lean();
    const stateMap = new Map(playerStates.map(s => [s.mapId.toString(), s]));

    // Determine which maps are unlocked
    const mapsWithStatus = maps.map((map, index) => {
      const state = stateMap.get(map._id.toString());
      const prevMap = index > 0 ? maps[index - 1] : null;
      const prevMapState = prevMap ? stateMap.get(prevMap._id.toString()) : null;

      // Check unlock conditions
      let isUnlocked = true;
      let unlockReason = '';

      if (map.requirements.levelRequired > playerLevel) {
        isUnlocked = false;
        unlockReason = `需要等級 ${map.requirements.levelRequired}`;
      }

      if (map.requirements.previousMapId && !prevMapState) {
        isUnlocked = false;
        unlockReason = '需要完成前一張地圖';
      }

      return {
        _id: map._id,
        name: map.name,
        description: map.description,
        theme: map.theme,
        backgroundUrl: map.backgroundUrl,
        isUnlocked,
        unlockReason,
        hasVisited: !!state,
        stats: state?.stats || null,
      };
    });

    sendSuccess(res, { maps: mapsWithStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * Enter a map (student)
 */
export const enterMap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { mapId } = req.params;

    const map = await GameMap.findById(mapId);
    if (!map || !map.isActive) {
      throw new AppError('Map not found or not available', 404);
    }

    // Check level requirement
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const playerLevel = user.studentProfile?.level || 1;
    if (map.requirements.levelRequired > playerLevel) {
      throw new AppError(`需要等級 ${map.requirements.levelRequired} 才能進入此地圖`, 403);
    }

    // Get or create player state
    let playerState = await PlayerMapState.findOne({ playerId: userId, mapId });

    if (!playerState) {
      playerState = await PlayerMapState.create({
        playerId: userId,
        mapId,
        position: map.spawnPoint,
        direction: 'down',
        completedObjects: [],
        currentQuests: [],
        stats: {
          totalVisits: 1,
          monstersDefeated: 0,
          chestsOpened: 0,
          timeSpent: 0,
        },
        exploredAreas: [`${map.spawnPoint.x},${map.spawnPoint.y}`],
        firstEntry: true,
      });
    } else {
      // Update visit count
      playerState.stats.totalVisits += 1;
      playerState.firstEntry = false;
      await playerState.save();
    }

    // Filter out completed objects for the response
    const activeObjects = map.objects.filter(obj => {
      const completed = playerState!.completedObjects.find(c => c.objectId === obj.id);
      if (!completed) return true;

      // Check if respawned
      if (completed.canRespawn && completed.respawnAt && completed.respawnAt <= new Date()) {
        return true;
      }

      // One-time objects stay hidden
      return false;
    });

    sendSuccess(res, {
      map: {
        _id: map._id,
        name: map.name,
        description: map.description,
        theme: map.theme,
        width: map.width,
        height: map.height,
        tileSize: map.tileSize,
        backgroundUrl: map.backgroundUrl,
        tilesetUrl: map.tilesetUrl,
        ambientMusic: map.ambientMusic,
        layers: map.layers,
        spawnPoint: map.spawnPoint,
        objects: activeObjects,
      },
      playerState: {
        position: playerState.position,
        direction: playerState.direction,
        stats: playerState.stats,
        firstEntry: playerState.firstEntry,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update player position (student)
 */
export const updatePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { mapId } = req.params;
    const { x, y, direction } = req.body;

    const playerState = await PlayerMapState.findOne({ playerId: userId, mapId });
    if (!playerState) {
      throw new AppError('Player state not found. Enter the map first.', 404);
    }

    playerState.position = { x, y };
    playerState.direction = direction || playerState.direction;
    playerState.lastUpdated = new Date();

    // Add to explored areas
    const areaKey = `${x},${y}`;
    if (!playerState.exploredAreas.includes(areaKey)) {
      playerState.exploredAreas.push(areaKey);
    }

    await playerState.save();

    sendSuccess(res, {
      position: playerState.position,
      direction: playerState.direction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interact with map object (student)
 */
export const interactWithObject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { mapId, objectId } = req.params;

    const map = await GameMap.findById(mapId);
    if (!map) {
      throw new AppError('Map not found', 404);
    }

    const mapObject = map.objects.find(obj => obj.id === objectId);
    if (!mapObject) {
      throw new AppError('Object not found on map', 404);
    }

    const playerState = await PlayerMapState.findOne({ playerId: userId, mapId });
    if (!playerState) {
      throw new AppError('Player state not found', 404);
    }

    // Check if object is already completed
    const completed = playerState.completedObjects.find(c => c.objectId === objectId);
    if (completed && !(completed.canRespawn && completed.respawnAt && completed.respawnAt <= new Date())) {
      throw new AppError('Object already completed', 400);
    }

    // Handle different object types
    let result: Record<string, unknown> = {};

    switch (mapObject.type) {
      case 'chest':
        result = await handleChestInteraction(mapObject, playerState, userId);
        break;
      case 'monster':
        result = await handleMonsterEncounter(mapObject, playerState);
        break;
      case 'npc':
        result = handleNpcInteraction(mapObject);
        break;
      case 'portal':
        result = handlePortalInteraction(mapObject);
        break;
      case 'save_point':
        result = await handleSavePoint(mapObject, playerState);
        break;
      default:
        throw new AppError('Unknown object type', 400);
    }

    await playerState.save();

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

// Helper functions for object interactions

async function handleChestInteraction(
  mapObject: IMapObject,
  playerState: mongoose.Document & { completedObjects: Array<{objectId: string; completedAt: Date; canRespawn: boolean; respawnAt?: Date}>; stats: { chestsOpened: number } },
  userId: mongoose.Types.ObjectId
): Promise<Record<string, unknown>> {
  const chestData = mapObject.chestData;
  if (!chestData) {
    throw new AppError('Invalid chest data', 400);
  }

  // Get user and add rewards
  const user = await User.findById(userId);
  if (!user || !user.studentProfile) {
    throw new AppError('User not found', 404);
  }

  // Add gold
  user.studentProfile.gold += chestData.gold;

  // Add exp
  if (chestData.exp) {
    user.studentProfile.exp += chestData.exp;
  }

  await user.save();

  // Mark chest as completed
  playerState.completedObjects.push({
    objectId: mapObject.id,
    completedAt: new Date(),
    canRespawn: !chestData.isOneTime,
    respawnAt: chestData.isOneTime ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  playerState.stats.chestsOpened += 1;

  return {
    type: 'chest',
    rewards: {
      gold: chestData.gold,
      exp: chestData.exp || 0,
      items: chestData.items,
    },
  };
}

async function handleMonsterEncounter(
  mapObject: IMapObject,
  _playerState: mongoose.Document
): Promise<Record<string, unknown>> {
  const monsterData = mapObject.monsterData;
  if (!monsterData) {
    throw new AppError('Invalid monster data', 400);
  }

  // Build query for questions
  const query: Record<string, unknown> = { isActive: true };

  if (monsterData.questionPool.subjectId) {
    query['metadata.subjectId'] = monsterData.questionPool.subjectId;
  }
  if (monsterData.questionPool.unitId) {
    query['metadata.unitId'] = monsterData.questionPool.unitId;
  }
  if (monsterData.questionPool.categoryId) {
    query['metadata.categoryId'] = monsterData.questionPool.categoryId;
  }
  if (monsterData.questionPool.difficulty) {
    query.difficulty = monsterData.questionPool.difficulty;
  }

  // Get random questions
  const questions = await Question.aggregate([
    { $match: query },
    { $sample: { size: monsterData.questionPool.count } },
    { $project: {
      _id: 1,
      content: 1,
      type: 1,
      options: 1,
      difficulty: 1,
    }}
  ]);

  return {
    type: 'battle',
    monster: {
      id: mapObject.id,
      name: monsterData.name,
      imageUrl: monsterData.imageUrl,
      description: monsterData.description,
      difficulty: monsterData.difficulty,
      hp: monsterData.hp,
      rewards: monsterData.rewards,
    },
    questions,
  };
}

function handleNpcInteraction(mapObject: IMapObject): Record<string, unknown> {
  const npcData = mapObject.npcData;
  if (!npcData) {
    throw new AppError('Invalid NPC data', 400);
  }

  return {
    type: 'dialogue',
    npc: {
      name: npcData.name,
      imageUrl: npcData.imageUrl,
      dialogues: npcData.dialogues,
      questId: npcData.questId,
    },
  };
}

function handlePortalInteraction(mapObject: IMapObject): Record<string, unknown> {
  const portalData = mapObject.portalData;
  if (!portalData) {
    throw new AppError('Invalid portal data', 400);
  }

  return {
    type: 'portal',
    destination: {
      mapId: portalData.targetMapId,
      position: portalData.targetPosition,
    },
    requiresKey: portalData.requiresKey,
  };
}

async function handleSavePoint(
  mapObject: IMapObject,
  playerState: mongoose.Document & { lastSavePoint?: { x: number; y: number } }
): Promise<Record<string, unknown>> {
  playerState.lastSavePoint = mapObject.position;

  return {
    type: 'save_point',
    message: '進度已儲存！',
    position: mapObject.position,
  };
}

/**
 * Complete monster battle (student)
 */
export const completeBattle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { mapId, objectId } = req.params;
    const { victory, correctAnswers, totalQuestions } = req.body;

    const map = await GameMap.findById(mapId);
    if (!map) {
      throw new AppError('Map not found', 404);
    }

    const mapObject = map.objects.find(obj => obj.id === objectId);
    if (!mapObject || mapObject.type !== 'monster') {
      throw new AppError('Monster not found', 404);
    }

    const playerState = await PlayerMapState.findOne({ playerId: userId, mapId });
    if (!playerState) {
      throw new AppError('Player state not found', 404);
    }

    const user = await User.findById(userId);
    if (!user || !user.studentProfile) {
      throw new AppError('User not found', 404);
    }

    let rewards = { exp: 0, gold: 0, items: [] as Array<{ itemId: string; quantity: number }> };

    if (victory && mapObject.monsterData) {
      const monsterRewards = mapObject.monsterData.rewards;

      // Calculate rewards based on performance
      const performanceMultiplier = correctAnswers / totalQuestions;
      rewards.exp = Math.round(monsterRewards.exp * performanceMultiplier);
      rewards.gold = Math.round(monsterRewards.gold * performanceMultiplier);

      // Add rewards to user
      user.studentProfile.exp += rewards.exp;
      user.studentProfile.gold += rewards.gold;

      // TODO: Handle item drops based on chance

      await user.save();

      // Mark monster as defeated
      playerState.completedObjects.push({
        objectId: mapObject.id,
        completedAt: new Date(),
        canRespawn: mapObject.monsterData.respawnTime > 0,
        respawnAt: mapObject.monsterData.respawnTime > 0
          ? new Date(Date.now() + mapObject.monsterData.respawnTime * 1000)
          : undefined,
      });

      playerState.stats.monstersDefeated += 1;
      await playerState.save();
    }

    sendSuccess(res, {
      victory,
      rewards,
      stats: {
        correctAnswers,
        totalQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save game time (student)
 */
export const saveGameTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { mapId } = req.params;
    const { timeSpent } = req.body;

    const playerState = await PlayerMapState.findOne({ playerId: userId, mapId });
    if (!playerState) {
      throw new AppError('Player state not found', 404);
    }

    playerState.stats.timeSpent += timeSpent;
    playerState.lastUpdated = new Date();
    await playerState.save();

    sendSuccess(res, { totalTimeSpent: playerState.stats.timeSpent });
  } catch (error) {
    next(error);
  }
};
