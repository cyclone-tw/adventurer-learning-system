import { useState } from 'react';
import { GameMapEngine } from '../../components/game';
import { GameMapData, PlayerMapState, MapObject } from '../../services/gameMap';

// Demo map data - 森林地圖
const DEMO_MAP: GameMapData = {
  _id: 'demo-map',
  name: '數學森林',
  subject: '數學',
  description: '一片充滿數學精靈的神秘森林',
  theme: 'forest',
  backgroundUrl: '',
  tilesetUrl: '',
  ambientMusic: '',
  width: 20,
  height: 15,
  tileSize: 48,
  layers: {
    // Ground layer - 0 = grass, 1-7 = different grass variations
    ground: Array(15).fill(null).map(() =>
      Array(20).fill(null).map(() => Math.floor(Math.random() * 4))
    ),
    // Obstacle layer - 0 = walkable, 1+ = obstacle
    obstacles: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    decorations: Array(15).fill(null).map(() => Array(20).fill(0)),
  },
  objects: [
    // Monsters
    {
      id: 'monster-1',
      type: 'monster',
      position: { x: 5, y: 4 },
      isVisible: true,
      collides: true,
      monsterData: {
        name: '史萊姆',
        imageUrl: '/assets/sprites/characters/slime.png',
        difficulty: 'easy',
        questionPool: { subject: '數學', count: 3 },
        rewards: { exp: 50, gold: 20 },
        respawnTime: 300,
      },
    },
    {
      id: 'monster-2',
      type: 'monster',
      position: { x: 15, y: 7 },
      isVisible: true,
      collides: true,
      monsterData: {
        name: '骷髏戰士',
        imageUrl: '/assets/sprites/characters/skeleton.png',
        difficulty: 'medium',
        questionPool: { subject: '數學', count: 5 },
        rewards: { exp: 100, gold: 50 },
        respawnTime: 600,
      },
    },
    {
      id: 'monster-3',
      type: 'monster',
      position: { x: 8, y: 11 },
      isVisible: true,
      collides: true,
      monsterData: {
        name: '史萊姆',
        imageUrl: '/assets/sprites/characters/slime.png',
        difficulty: 'easy',
        questionPool: { subject: '數學', count: 3 },
        rewards: { exp: 50, gold: 20 },
        respawnTime: 300,
      },
    },
    // Chests
    {
      id: 'chest-1',
      type: 'chest',
      position: { x: 18, y: 2 },
      isVisible: true,
      collides: true,
      chestData: {
        items: [],
        gold: 100,
        isOneTime: true,
      },
    },
    {
      id: 'chest-2',
      type: 'chest',
      position: { x: 2, y: 12 },
      isVisible: true,
      collides: true,
      chestData: {
        items: [],
        gold: 50,
        isOneTime: true,
      },
    },
    // NPC
    {
      id: 'npc-1',
      type: 'npc',
      position: { x: 10, y: 4 },
      isVisible: true,
      collides: true,
      npcData: {
        name: '數學老師',
        imageUrl: '',
        dialogues: [
          '歡迎來到數學森林！',
          '這裡有許多數學精靈等著你挑戰。',
          '答對題目就能打敗它們，獲得經驗值和金幣！',
          '加油，小冒險者！',
        ],
      },
    },
    // Portal
    {
      id: 'portal-1',
      type: 'portal',
      position: { x: 18, y: 12 },
      isVisible: true,
      collides: false,
    },
    // Save Point
    {
      id: 'save-1',
      type: 'save_point',
      position: { x: 3, y: 3 },
      isVisible: true,
      collides: false,
    },
  ],
  requirements: {
    levelRequired: 1,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const INITIAL_PLAYER_STATE: PlayerMapState = {
  mapId: 'demo-map',
  position: { x: 3, y: 7 },
  direction: 'right',
  completedObjects: [],
  currentQuests: [],
  lastUpdated: new Date(),
};

const MapDemo = () => {
  const [playerState, setPlayerState] = useState(INITIAL_PLAYER_STATE);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);

  const handleMove = (x: number, y: number, direction: 'up' | 'down' | 'left' | 'right') => {
    setPlayerState((prev) => ({
      ...prev,
      position: { x, y },
      direction,
    }));
  };

  const handleInteract = (object: MapObject) => {
    const timestamp = new Date().toLocaleTimeString();
    let message = '';

    switch (object.type) {
      case 'monster':
        message = `⚔️ [${timestamp}] 遭遇 ${object.monsterData?.name}！`;
        break;
      case 'npc':
        message = `💬 [${timestamp}] ${object.npcData?.name}: "${object.npcData?.dialogues[0]}"`;
        break;
      case 'chest':
        message = `📦 [${timestamp}] 打開寶箱！獲得 ${object.chestData?.gold} 金幣`;
        break;
      case 'portal':
        message = `🌀 [${timestamp}] 發現傳送門！`;
        break;
      case 'save_point':
        message = `💾 [${timestamp}] 進度已儲存`;
        break;
      default:
        message = `[${timestamp}] 互動: ${object.type}`;
    }

    setInteractionLog((prev) => [message, ...prev].slice(0, 10));
  };

  const handleExit = () => {
    setInteractionLog((prev) => ['🚪 離開地圖', ...prev].slice(0, 10));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-700 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🗺️ 地圖探索 Demo</h1>
          <p className="text-green-200">使用 WASD 或方向鍵移動，空白鍵互動</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-xl p-4 shadow-2xl">
              <GameMapEngine
                map={DEMO_MAP}
                playerState={playerState}
                onMove={handleMove}
                onInteract={handleInteract}
                onExit={handleExit}
              />
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Player Info */}
            <div className="bg-amber-100 rounded-xl p-4 border-4 border-amber-700">
              <h3 className="font-bold text-amber-900 mb-3">👤 玩家資訊</h3>
              <div className="space-y-2 text-sm">
                <p>📍 位置: ({playerState.position.x}, {playerState.position.y})</p>
                <p>🧭 方向: {playerState.direction}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-blue-100 rounded-xl p-4 border-4 border-blue-700">
              <h3 className="font-bold text-blue-900 mb-3">📖 圖例</h3>
              <div className="space-y-2 text-sm">
                <p>👾 史萊姆/骷髏 - 怪物</p>
                <p>📦 寶箱 - 可開啟獲得金幣</p>
                <p>👤 NPC - 對話獲取資訊</p>
                <p>🌀 傳送門 - 前往其他地圖</p>
                <p>💾 存檔點 - 儲存進度</p>
              </div>
            </div>

            {/* Interaction Log */}
            <div className="bg-gray-800 rounded-xl p-4 border-4 border-gray-600">
              <h3 className="font-bold text-white mb-3">📜 互動記錄</h3>
              <div className="space-y-1 text-sm text-gray-300 max-h-48 overflow-y-auto">
                {interactionLog.length === 0 ? (
                  <p className="text-gray-500 italic">尚無互動記錄</p>
                ) : (
                  interactionLog.map((log, i) => (
                    <p key={i} className={i === 0 ? 'text-yellow-400' : ''}>
                      {log}
                    </p>
                  ))
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-purple-100 rounded-xl p-4 border-4 border-purple-700">
              <h3 className="font-bold text-purple-900 mb-3">🎮 控制方式</h3>
              <div className="space-y-2 text-sm text-purple-800">
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">W/↑</kbd> 向上</p>
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">S/↓</kbd> 向下</p>
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">A/←</kbd> 向左</p>
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">D/→</kbd> 向右</p>
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">空白鍵</kbd> 互動</p>
                <p><kbd className="px-2 py-1 bg-purple-200 rounded">ESC</kbd> 離開</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapDemo;
