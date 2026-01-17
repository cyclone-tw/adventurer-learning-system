export { default as User } from './User.js';
export { default as Category } from './Category.js';
export { default as Question } from './Question.js';
export { default as DailyTask } from './DailyTask.js';
export { default as PlayerDailyTask } from './PlayerDailyTask.js';
export { GameMap } from './GameMap.js';
export { PlayerMapState } from './PlayerMapState.js';
export { default as AvatarPart, LAYER_MAP } from './AvatarPart.js';
export { default as StudentAvatar, SKIN_TONE_PRESETS, HAIR_COLOR_PRESETS, EYE_COLOR_PRESETS } from './StudentAvatar.js';

// Re-export types
export type { IUser, IStudentProfile, ITeacherProfile } from './User.js';
export type { ICategory, IMapConfig } from './Category.js';
export type {
  IQuestion,
  IQuestionContent,
  IQuestionOption,
  IQuestionAnswer,
  IQuestionStats,
  IAdventureContext,
  IMediaItem,
} from './Question.js';
export type {
  IGameMap,
  IMapObject,
  IMonsterData,
  INpcData,
  IChestData,
  IPortalData,
  MapTheme,
  MapObjectType,
  MonsterDifficulty,
} from './GameMap.js';
export type {
  IPlayerMapState,
  ICompletedObject,
  IQuestProgress,
  Direction,
} from './PlayerMapState.js';
export type {
  IAvatarPart,
  AvatarCategory,
  AvatarRarity,
  AcquisitionType,
} from './AvatarPart.js';
export type {
  IStudentAvatar,
  EquippedParts,
} from './StudentAvatar.js';
