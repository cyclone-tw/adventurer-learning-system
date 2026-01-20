import { useRef, useEffect, useCallback, useState } from 'react';
import { GameMapData, MapObject, Direction, PlayerMapState } from '../../services/gameMap';
import { VirtualJoystick, GameButton } from '../game-ui';
import { haptics } from '../../utils/haptics';
import { playSound } from '../../utils/soundManager';

interface GameMapEngineProps {
  map: GameMapData;
  playerState: PlayerMapState;
  onMove: (x: number, y: number, direction: Direction) => void;
  onInteract: (object: MapObject) => void;
  onExit: () => void;
  playerImageUrl?: string;
}

// Sprite configuration
const SPRITE_CONFIG = {
  player: {
    src: '/assets/sprites/characters/player.png',
    frameWidth: 48,
    frameHeight: 48,
    animations: {
      idle: { row: 0, frames: 4 },
      down: { row: 0, frames: 4 },
      up: { row: 1, frames: 4 },
      right: { row: 2, frames: 4 },
      left: { row: 2, frames: 4, flip: true },
      move_down: { row: 3, frames: 4 },
      move_up: { row: 4, frames: 4 },
      move_right: { row: 5, frames: 4 },
      move_left: { row: 5, frames: 4, flip: true },
    },
  },
  skeleton: {
    src: '/assets/sprites/characters/skeleton.png',
    frameWidth: 48,
    frameHeight: 48,
  },
  slime: {
    src: '/assets/sprites/characters/slime.png',
    frameWidth: 32,
    frameHeight: 32,
  },
  chest: {
    src: '/assets/sprites/objects/chest_01.png',
    frameWidth: 32,
    frameHeight: 32,
  },
  chest_open: {
    src: '/assets/sprites/objects/chest_02.png',
    frameWidth: 32,
    frameHeight: 32,
  },
};

// Tileset paths
const TILESETS = {
  grass: '/assets/sprites/tilesets/grass.png',
  plains: '/assets/sprites/tilesets/plains.png',
  water: '/assets/sprites/tilesets/water1.png',
  fences: '/assets/sprites/tilesets/fences.png',
  decor: '/assets/sprites/tilesets/decor_16x16.png',
};

// Image cache
const imageCache: Record<string, HTMLImageElement> = {};

// Load image with caching
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (imageCache[src]) {
      resolve(imageCache[src]);
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache[src] = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
};

// Object type icons/colors (fallback)
const OBJECT_STYLES: Record<string, { emoji: string; color: string }> = {
  monster: { emoji: '👾', color: '#FF4444' },
  npc: { emoji: '👤', color: '#4444FF' },
  chest: { emoji: '📦', color: '#FFD700' },
  portal: { emoji: '🌀', color: '#9400D3' },
  save_point: { emoji: '💾', color: '#00FF00' },
  decoration: { emoji: '🌳', color: '#228B22' },
};

export const GameMapEngine: React.FC<GameMapEngineProps> = ({
  map,
  playerState,
  onMove,
  onInteract,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerPosition, setPlayerPosition] = useState(playerState.position);
  const [playerDirection, setPlayerDirection] = useState<Direction>(playerState.direction);
  const [isMoving, setIsMoving] = useState(false);
  const [nearbyObject, setNearbyObject] = useState<MapObject | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  const { tileSize, width, height, layers, objects } = map;

  // Load all images on mount
  useEffect(() => {
    const loadAllImages = async () => {
      try {
        await Promise.all([
          loadImage(SPRITE_CONFIG.player.src),
          loadImage(SPRITE_CONFIG.skeleton.src),
          loadImage(SPRITE_CONFIG.slime.src),
          loadImage(SPRITE_CONFIG.chest.src),
          loadImage(TILESETS.grass),
          loadImage(TILESETS.plains),
        ]);
        setImagesLoaded(true);
      } catch (err) {
        console.error('Failed to load images:', err);
        // Continue anyway with fallback rendering
        setImagesLoaded(true);
      }
    };
    loadAllImages();
  }, []);

  // Animation loop for sprites
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Check if a position is walkable
  const isWalkable = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const obstacle = layers.obstacles[y]?.[x];
      if (obstacle && obstacle !== 0) return false;
      const collidingObject = objects.find(
        (obj) => obj.collides && obj.position.x === x && obj.position.y === y
      );
      if (collidingObject) return false;
      return true;
    },
    [width, height, layers.obstacles, objects]
  );

  // Check for nearby interactable objects
  const checkNearbyObjects = useCallback(
    (x: number, y: number) => {
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const obj = objects.find(
          (o) =>
            o.isVisible &&
            o.position.x === x + dx &&
            o.position.y === y + dy &&
            ['monster', 'npc', 'chest', 'portal', 'save_point'].includes(o.type)
        );
        if (obj) {
          setNearbyObject(obj);
          return;
        }
      }
      setNearbyObject(null);
    },
    [objects]
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isMoving) return;

      let newX = playerPosition.x;
      let newY = playerPosition.y;
      let newDirection: Direction = playerDirection;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY -= 1;
          newDirection = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY += 1;
          newDirection = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX -= 1;
          newDirection = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX += 1;
          newDirection = 'right';
          break;
        case ' ':
        case 'Enter':
          if (nearbyObject) {
            e.preventDefault();
            onInteract(nearbyObject);
          }
          return;
        case 'Escape':
          onExit();
          return;
        default:
          return;
      }

      e.preventDefault();
      setPlayerDirection(newDirection);

      if (isWalkable(newX, newY)) {
        setIsMoving(true);
        setPlayerPosition({ x: newX, y: newY });
        onMove(newX, newY, newDirection);
        setTimeout(() => {
          setIsMoving(false);
          checkNearbyObjects(newX, newY);
        }, 100);
      } else {
        checkNearbyObjects(playerPosition.x, playerPosition.y);
      }
    },
    [isMoving, playerPosition, playerDirection, nearbyObject, isWalkable, onMove, onInteract, onExit, checkNearbyObjects]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    checkNearbyObjects(playerPosition.x, playerPosition.y);
  }, []);

  // Canvas rendering with sprites
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    const viewportWidth = Math.min(width, 15);
    const viewportHeight = Math.min(height, 11);
    const renderTileSize = 48; // Render at 48px for crisp sprites

    let cameraX = playerPosition.x - Math.floor(viewportWidth / 2);
    let cameraY = playerPosition.y - Math.floor(viewportHeight / 2);
    cameraX = Math.max(0, Math.min(width - viewportWidth, cameraX));
    cameraY = Math.max(0, Math.min(height - viewportHeight, cameraY));

    const canvasWidth = viewportWidth * renderTileSize;
    const canvasHeight = viewportHeight * renderTileSize;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Get tileset images
    const grassImg = imageCache[TILESETS.grass];
    const plainsImg = imageCache[TILESETS.plains];

    // Draw ground layer with tileset
    for (let y = 0; y < viewportHeight; y++) {
      for (let x = 0; x < viewportWidth; x++) {
        const mapX = x + cameraX;
        const mapY = y + cameraY;

        if (mapX >= 0 && mapX < width && mapY >= 0 && mapY < height) {
          const groundTile = layers.ground[mapY]?.[mapX] || 0;
          const obstacleTile = layers.obstacles[mapY]?.[mapX] || 0;
          const destX = x * renderTileSize;
          const destY = y * renderTileSize;

          // Draw ground tile from tileset
          if (grassImg) {
            // Use different parts of the grass tileset based on tile value
            const srcX = (groundTile % 8) * 16;
            const srcY = Math.floor(groundTile / 8) * 16;
            ctx.drawImage(
              grassImg,
              srcX, srcY, 16, 16,
              destX, destY, renderTileSize, renderTileSize
            );
          } else {
            // Fallback to solid color
            ctx.fillStyle = groundTile === 0 ? '#90EE90' : '#228B22';
            ctx.fillRect(destX, destY, renderTileSize, renderTileSize);
          }

          // Draw obstacles
          if (obstacleTile !== 0 && plainsImg) {
            const srcX = ((obstacleTile - 1) % 8) * 16;
            const srcY = Math.floor((obstacleTile - 1) / 8) * 16;
            ctx.drawImage(
              plainsImg,
              srcX, srcY, 16, 16,
              destX, destY, renderTileSize, renderTileSize
            );
          } else if (obstacleTile !== 0) {
            ctx.fillStyle = '#228B22';
            ctx.fillRect(destX + 4, destY + 4, renderTileSize - 8, renderTileSize - 8);
          }
        }
      }
    }

    // Draw objects (chests, monsters, etc.)
    const chestImg = imageCache[SPRITE_CONFIG.chest.src];
    const skeletonImg = imageCache[SPRITE_CONFIG.skeleton.src];
    const slimeImg = imageCache[SPRITE_CONFIG.slime.src];

    for (const obj of objects) {
      if (!obj.isVisible) continue;

      const screenX = (obj.position.x - cameraX) * renderTileSize;
      const screenY = (obj.position.y - cameraY) * renderTileSize;

      if (screenX < -renderTileSize || screenX > canvasWidth || screenY < -renderTileSize || screenY > canvasHeight) {
        continue;
      }

      // Draw based on object type
      if (obj.type === 'chest' && chestImg) {
        ctx.drawImage(chestImg, screenX + 8, screenY + 8, renderTileSize - 16, renderTileSize - 16);
      } else if (obj.type === 'monster') {
        // Choose monster sprite based on monsterData
        const monsterName = obj.monsterData?.name?.toLowerCase() || '';
        let monsterImg = slimeImg;
        let frameSize = 32;

        if (monsterName.includes('骷髏') || monsterName.includes('skeleton')) {
          monsterImg = skeletonImg;
          frameSize = 48;
        }

        if (monsterImg) {
          // Draw idle animation frame
          const frameX = animationFrame * frameSize;
          ctx.drawImage(
            monsterImg,
            frameX, 0, frameSize, frameSize,
            screenX, screenY, renderTileSize, renderTileSize
          );
        } else {
          // Fallback emoji
          const style = OBJECT_STYLES[obj.type];
          ctx.fillStyle = style.color + '40';
          ctx.beginPath();
          ctx.arc(screenX + renderTileSize / 2, screenY + renderTileSize / 2, renderTileSize / 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = `${renderTileSize * 0.6}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(style.emoji, screenX + renderTileSize / 2, screenY + renderTileSize / 2);
        }
      } else {
        // Fallback for other objects
        const style = OBJECT_STYLES[obj.type] || OBJECT_STYLES.decoration;
        ctx.fillStyle = style.color + '40';
        ctx.beginPath();
        ctx.arc(screenX + renderTileSize / 2, screenY + renderTileSize / 2, renderTileSize / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `${renderTileSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.emoji, screenX + renderTileSize / 2, screenY + renderTileSize / 2);
      }

      // Highlight nearby object
      if (nearbyObject?.id === obj.id) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX + renderTileSize / 2, screenY + renderTileSize / 2, renderTileSize / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw player with sprite
    const playerImg = imageCache[SPRITE_CONFIG.player.src];
    const playerScreenX = (playerPosition.x - cameraX) * renderTileSize;
    const playerScreenY = (playerPosition.y - cameraY) * renderTileSize;

    if (playerImg) {
      const config = SPRITE_CONFIG.player;
      let animKey = isMoving ? `move_${playerDirection}` : playerDirection;
      const anim = config.animations[animKey as keyof typeof config.animations] || config.animations.down;

      const frameX = animationFrame * config.frameWidth;
      const frameY = anim.row * config.frameHeight;

      ctx.save();

      if ('flip' in anim && anim.flip) {
        ctx.translate(playerScreenX + renderTileSize, playerScreenY);
        ctx.scale(-1, 1);
        ctx.drawImage(
          playerImg,
          frameX, frameY, config.frameWidth, config.frameHeight,
          0, 0, renderTileSize, renderTileSize
        );
      } else {
        ctx.drawImage(
          playerImg,
          frameX, frameY, config.frameWidth, config.frameHeight,
          playerScreenX, playerScreenY, renderTileSize, renderTileSize
        );
      }

      ctx.restore();
    } else {
      // Fallback player rendering
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize - 4, renderTileSize / 3, renderTileSize / 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4F46E5';
      ctx.beginPath();
      ctx.arc(playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize / 2, renderTileSize / 2.5, 0, Math.PI * 2);
      ctx.fill();

      const arrows: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${renderTileSize * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arrows[playerDirection], playerScreenX + renderTileSize / 2, playerScreenY + renderTileSize / 2);
    }

  }, [map, playerPosition, playerDirection, nearbyObject, isMoving, animationFrame, imagesLoaded, width, height, layers, objects]);

  // Touch controls
  const joystickMoveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastJoystickDirection = useRef<Direction | null>(null);

  const handleJoystickMove = useCallback(
    (direction: { x: number; y: number }) => {
      const absX = Math.abs(direction.x);
      const absY = Math.abs(direction.y);

      if (absX < 0.3 && absY < 0.3) {
        if (joystickMoveInterval.current) {
          clearInterval(joystickMoveInterval.current);
          joystickMoveInterval.current = null;
        }
        lastJoystickDirection.current = null;
        return;
      }

      let newDirection: Direction;
      if (absX > absY) {
        newDirection = direction.x > 0 ? 'right' : 'left';
      } else {
        newDirection = direction.y > 0 ? 'down' : 'up';
      }

      if (newDirection === lastJoystickDirection.current && joystickMoveInterval.current) {
        return;
      }

      lastJoystickDirection.current = newDirection;

      if (joystickMoveInterval.current) {
        clearInterval(joystickMoveInterval.current);
      }

      const movePlayer = () => {
        setPlayerPosition((prev) => {
          let newX = prev.x;
          let newY = prev.y;

          switch (newDirection) {
            case 'up': newY -= 1; break;
            case 'down': newY += 1; break;
            case 'left': newX -= 1; break;
            case 'right': newX += 1; break;
          }

          setPlayerDirection(newDirection);

          if (isWalkable(newX, newY)) {
            haptics.light();
            onMove(newX, newY, newDirection);
            setTimeout(() => checkNearbyObjects(newX, newY), 50);
            return { x: newX, y: newY };
          }

          return prev;
        });
      };

      movePlayer();
      joystickMoveInterval.current = setInterval(movePlayer, 150);
    },
    [isWalkable, onMove, checkNearbyObjects]
  );

  const handleJoystickRelease = useCallback(() => {
    if (joystickMoveInterval.current) {
      clearInterval(joystickMoveInterval.current);
      joystickMoveInterval.current = null;
    }
    lastJoystickDirection.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (joystickMoveInterval.current) {
        clearInterval(joystickMoveInterval.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {/* Map Info */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">{map.name}</h2>
        <p className="text-sm text-gray-500">
          位置: ({playerPosition.x}, {playerPosition.y})
        </p>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-4 border-amber-700 rounded-lg shadow-lg bg-gray-900"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Interaction prompt */}
        {nearbyObject && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-lg text-sm">
            按 <kbd className="px-2 py-1 bg-gray-700 rounded">空白鍵</kbd> 與{' '}
            <span className="text-yellow-400">
              {nearbyObject.type === 'monster'
                ? nearbyObject.monsterData?.name
                : nearbyObject.type === 'npc'
                ? nearbyObject.npcData?.name
                : nearbyObject.type === 'chest'
                ? '寶箱'
                : nearbyObject.type === 'portal'
                ? '傳送門'
                : '存檔點'}
            </span>{' '}
            互動
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden flex items-center justify-between w-full px-4 py-2">
        <VirtualJoystick
          size={120}
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          disableKeyboard={true}
        />

        <div className="flex flex-col items-center gap-3">
          <GameButton
            variant={nearbyObject ? 'golden' : 'secondary'}
            size="lg"
            onClick={() => {
              if (nearbyObject) {
                haptics.medium();
                playSound('button_click');
                onInteract(nearbyObject);
              }
            }}
            disabled={!nearbyObject}
            className="w-20 h-20 rounded-full"
          >
            <span className="text-2xl">
              {nearbyObject?.type === 'monster' ? '⚔️' : '💬'}
            </span>
          </GameButton>

          <GameButton
            variant="danger"
            size="md"
            onClick={() => {
              haptics.light();
              onExit();
            }}
            className="rounded-full"
          >
            <span className="text-lg">🚪</span>
          </GameButton>
        </div>
      </div>

      {/* Desktop Controls hint */}
      <div className="hidden md:block text-center text-sm text-gray-500">
        <p>使用 <kbd className="px-1 bg-gray-200 rounded">WASD</kbd> 或方向鍵移動</p>
        <p>按 <kbd className="px-1 bg-gray-200 rounded">空白鍵</kbd> 互動 · 按 <kbd className="px-1 bg-gray-200 rounded">ESC</kbd> 離開</p>
      </div>
    </div>
  );
};

export default GameMapEngine;
