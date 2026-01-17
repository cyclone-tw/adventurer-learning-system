import { useState, useEffect } from 'react';
import { Map, Lock, Compass, ArrowLeft, Loader2 } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { GameMapEngine, BattleScene } from '../../components/game';
import { GamePanel, GameButton, GameDialog } from '../../components/game-ui';
import { useUserStore } from '../../stores/userStore';
import { haptics } from '../../utils/haptics';
import { playSound } from '../../utils/soundManager';
import gameMapService, {
  MapListItem,
  GameMapData,
  PlayerMapState,
  MapObject,
  MonsterEncounter,
  InteractionResult,
} from '../../services/gameMap';

type GameState = 'map-list' | 'loading' | 'exploring' | 'battle' | 'dialogue' | 'chest-reward';

const THEME_BACKGROUNDS: Record<string, string> = {
  forest: 'from-green-400 to-emerald-600',
  castle: 'from-amber-400 to-orange-600',
  cave: 'from-gray-500 to-slate-700',
  temple: 'from-yellow-400 to-amber-600',
  village: 'from-orange-300 to-amber-500',
  snow: 'from-blue-200 to-cyan-400',
  desert: 'from-yellow-500 to-orange-500',
  ocean: 'from-blue-400 to-indigo-600',
};

const THEME_ICONS: Record<string, string> = {
  forest: '🌲',
  castle: '🏰',
  cave: '🕳️',
  temple: '⛩️',
  village: '🏘️',
  snow: '❄️',
  desert: '🏜️',
  ocean: '🌊',
};

const Exploration = () => {
  const { user, refreshUser } = useUserStore();
  const [gameState, setGameState] = useState<GameState>('map-list');
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current exploration state
  const [currentMap, setCurrentMap] = useState<GameMapData | null>(null);
  const [playerState, setPlayerState] = useState<PlayerMapState | null>(null);
  const [currentEncounter, setCurrentEncounter] = useState<MonsterEncounter | null>(null);
  const [dialogueContent, setDialogueContent] = useState<{
    name: string;
    dialogues: string[];
    currentIndex: number;
  } | null>(null);
  const [chestReward, setChestReward] = useState<{
    gold: number;
    exp: number;
    items: Array<{ itemId: string; quantity: number }>;
  } | null>(null);

  // Load maps on mount
  useEffect(() => {
    loadMaps();
  }, []);

  const loadMaps = async () => {
    setLoadingMaps(true);
    setError(null);
    try {
      const mapList = await gameMapService.getStudentMaps();
      setMaps(mapList);
    } catch (err) {
      console.error('Failed to load maps:', err);
      setError('無法載入地圖列表');
    } finally {
      setLoadingMaps(false);
    }
  };

  // Enter a map
  const enterMap = async (mapId: string) => {
    setGameState('loading');
    setError(null);
    playSound('button_click');
    haptics.medium();

    try {
      const { map, playerState: state } = await gameMapService.enterMap(mapId);
      setCurrentMap(map);
      setPlayerState(state);
      setGameState('exploring');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '無法進入地圖';
      setError(errorMessage);
      haptics.error();
      setGameState('map-list');
    }
  };

  // Handle player movement
  const handleMove = async (x: number, y: number, direction: 'up' | 'down' | 'left' | 'right') => {
    if (!currentMap || !playerState) return;

    try {
      await gameMapService.updatePosition(currentMap._id, x, y, direction);
      setPlayerState((prev) =>
        prev ? { ...prev, position: { x, y }, direction } : null
      );
    } catch (err) {
      console.error('Failed to update position:', err);
    }
  };

  // Handle object interaction
  const handleInteract = async (object: MapObject) => {
    if (!currentMap) return;

    try {
      const result: InteractionResult = await gameMapService.interactWithObject(
        currentMap._id,
        object.id
      );

      switch (result.type) {
        case 'battle':
          playSound('attack');
          haptics.attack();
          setCurrentEncounter(result as MonsterEncounter);
          setGameState('battle');
          break;

        case 'dialogue':
          playSound('notification');
          haptics.light();
          setDialogueContent({
            name: result.npc.name,
            dialogues: result.npc.dialogues,
            currentIndex: 0,
          });
          setGameState('dialogue');
          break;

        case 'chest':
          // Sound played in useEffect when chestReward is set
          setChestReward(result.rewards);
          setGameState('chest-reward');
          await refreshUser();
          break;

        case 'portal':
          // Enter the target map
          await enterMap(result.destination.mapId);
          break;

        case 'save_point':
          playSound('notification');
          haptics.success();
          alert(result.message);
          break;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '互動失敗';
      haptics.error();
      alert(errorMessage);
    }
  };

  // Handle battle end
  const handleBattleEnd = async (
    victory: boolean,
    correctAnswers: number,
    totalQuestions: number
  ) => {
    if (!currentMap || !currentEncounter) return;

    // Play victory/defeat sound and haptics
    if (victory) {
      playSound('victory');
      haptics.levelUp();
    } else {
      playSound('defeat');
      haptics.error();
    }

    try {
      await gameMapService.completeBattle(
        currentMap._id,
        currentEncounter.monster.id,
        victory,
        correctAnswers,
        totalQuestions
      );
      await refreshUser();

      // Remove defeated monster from map if victory
      if (victory && currentMap) {
        setCurrentMap((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== currentEncounter.monster.id),
          };
        });
      }
    } catch (err) {
      console.error('Failed to complete battle:', err);
    }

    setCurrentEncounter(null);
    setGameState('exploring');
  };

  // Handle flee from battle
  const handleFlee = () => {
    setCurrentEncounter(null);
    setGameState('exploring');
  };

  // Exit map
  const exitMap = () => {
    setCurrentMap(null);
    setPlayerState(null);
    setGameState('map-list');
    loadMaps(); // Refresh map stats
  };

  // Advance dialogue
  const advanceDialogue = () => {
    if (!dialogueContent) return;

    if (dialogueContent.currentIndex < dialogueContent.dialogues.length - 1) {
      setDialogueContent((prev) =>
        prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
      );
    } else {
      setDialogueContent(null);
      setGameState('exploring');
    }
  };

  // Close chest reward
  const closeChestReward = () => {
    setChestReward(null);
    setGameState('exploring');
  };

  // Render map list
  const renderMapList = () => (
    <div className="space-y-6">
      <Card
        variant="elevated"
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">探索世界</h1>
            <p className="text-white/80">選擇一張地圖開始冒險！</p>
          </div>
          <Compass className="w-12 h-12 text-white/20" />
        </div>
      </Card>

      {loadingMaps ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-500" />
          <p className="text-gray-500">載入地圖中...</p>
        </div>
      ) : error ? (
        <Card variant="outlined" className="bg-red-50 border-red-200 text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="secondary" onClick={loadMaps}>
            重新載入
          </Button>
        </Card>
      ) : maps.length === 0 ? (
        <Card variant="elevated" className="text-center py-12">
          <Map className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">尚無可用地圖</h3>
          <p className="text-gray-500">老師還沒有設定任何地圖，請稍後再來！</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {maps.map((map) => (
            <Card
              key={map._id}
              variant="elevated"
              className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                !map.isUnlocked ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              onClick={() => map.isUnlocked && enterMap(map._id)}
            >
              {/* Theme Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${
                  THEME_BACKGROUNDS[map.theme] || THEME_BACKGROUNDS.forest
                } opacity-20`}
              />

              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  {/* Map Icon */}
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br ${
                      THEME_BACKGROUNDS[map.theme] || THEME_BACKGROUNDS.forest
                    } ${!map.isUnlocked ? 'grayscale' : ''}`}
                  >
                    {map.isUnlocked ? (
                      THEME_ICONS[map.theme] || '🗺️'
                    ) : (
                      <Lock className="w-8 h-8 text-white" />
                    )}
                  </div>

                  {/* Map Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800">{map.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {map.description || '探索這片神秘的土地'}
                    </p>

                    {/* Stats */}
                    {map.hasVisited && map.stats && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>👾 {map.stats.monstersDefeated} 擊敗</span>
                        <span>📦 {map.stats.chestsOpened} 寶箱</span>
                        <span>🕐 {Math.floor(map.stats.timeSpent / 60)}分</span>
                      </div>
                    )}

                    {/* Unlock Reason */}
                    {!map.isUnlocked && map.unlockReason && (
                      <p className="text-sm text-orange-600 mt-2">
                        🔒 {map.unlockReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Render loading screen
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-16 h-16 animate-spin text-purple-500 mb-4" />
      <p className="text-purple-600 font-medium text-lg">正在載入地圖...</p>
    </div>
  );

  // Render exploration
  const renderExploration = () => {
    if (!currentMap || !playerState) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card variant="elevated" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={exitMap}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{THEME_ICONS[currentMap.theme] || '🗺️'}</span>
                <h1 className="text-xl font-bold">{currentMap.name}</h1>
              </div>
              <p className="text-white/80 text-sm">使用方向鍵或 WASD 移動</p>
            </div>
          </div>
        </Card>

        {/* Game Map */}
        <Card variant="elevated" padding="lg">
          <GameMapEngine
            map={currentMap}
            playerState={playerState}
            onMove={handleMove}
            onInteract={handleInteract}
            onExit={exitMap}
          />
        </Card>
      </div>
    );
  };

  // Render dialogue using GameDialog
  const renderDialogue = () => {
    if (!dialogueContent) return null;

    const isLastDialogue = dialogueContent.currentIndex >= dialogueContent.dialogues.length - 1;

    return (
      <div className="fixed inset-0 bg-black/50 z-40" onClick={advanceDialogue}>
        <GameDialog
          speaker={{
            name: dialogueContent.name,
            position: 'left',
          }}
          content={dialogueContent.dialogues[dialogueContent.currentIndex]}
          onNext={advanceDialogue}
          onClose={isLastDialogue ? () => {
            setDialogueContent(null);
            setGameState('exploring');
          } : undefined}
          typewriter={true}
          typewriterSpeed={25}
        />
      </div>
    );
  };

  // Play chest sound when chest reward appears
  useEffect(() => {
    if (chestReward) {
      playSound('chest_open');
      haptics.itemGet();
    }
  }, [chestReward]);

  // Render chest reward with RPG UI
  const renderChestReward = () => {
    if (!chestReward) return null;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <GamePanel
          variant="golden"
          title="🎁 發現寶箱！"
          className="w-full max-w-md"
        >
          <div className="text-center p-4">
            <div className="text-6xl mb-4 animate-bounce">📦</div>

            <div className="space-y-4 mb-6">
              {chestReward.gold > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl border-2 border-amber-400">
                  <span className="text-4xl">💰</span>
                  <p className="font-bold text-amber-700 text-xl mt-2">
                    +{chestReward.gold} 金幣
                  </p>
                </div>
              )}

              {chestReward.exp > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border-2 border-blue-400">
                  <span className="text-4xl">✨</span>
                  <p className="font-bold text-blue-700 text-xl mt-2">
                    +{chestReward.exp} 經驗值
                  </p>
                </div>
              )}

              {chestReward.items && chestReward.items.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border-2 border-purple-400">
                  <span className="text-4xl">🎒</span>
                  <p className="font-bold text-purple-700 text-xl mt-2">
                    獲得 {chestReward.items.length} 個道具！
                  </p>
                </div>
              )}
            </div>

            <GameButton
              variant="golden"
              size="lg"
              onClick={() => {
                playSound('button_click');
                haptics.light();
                closeChestReward();
              }}
              className="w-full"
            >
              太棒了！
            </GameButton>
          </div>
        </GamePanel>
      </div>
    );
  };

  // Render battle
  if (gameState === 'battle' && currentEncounter) {
    return (
      <BattleScene
        encounter={currentEncounter}
        playerName={user?.displayName || '冒險者'}
        playerLevel={user?.studentProfile?.level || 1}
        onBattleEnd={handleBattleEnd}
        onFlee={handleFlee}
      />
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6">
        {gameState === 'map-list' && renderMapList()}
        {gameState === 'loading' && renderLoading()}
        {gameState === 'exploring' && renderExploration()}
      </div>

      {/* Overlays */}
      {gameState === 'dialogue' && renderDialogue()}
      {gameState === 'chest-reward' && renderChestReward()}
    </StudentLayout>
  );
};

export default Exploration;
