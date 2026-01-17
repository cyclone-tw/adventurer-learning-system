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

// Theme colors for different map themes
const THEME_COLORS: Record<string, { ground: string; obstacle: string; bg: string }> = {
  forest: { ground: '#90EE90', obstacle: '#228B22', bg: '#87CEEB' },
  castle: { ground: '#D2B48C', obstacle: '#8B4513', bg: '#B0C4DE' },
  cave: { ground: '#696969', obstacle: '#2F4F4F', bg: '#1a1a2e' },
  temple: { ground: '#F5DEB3', obstacle: '#CD853F', bg: '#FFF8DC' },
  village: { ground: '#DEB887', obstacle: '#8B4513', bg: '#87CEEB' },
  snow: { ground: '#FFFAFA', obstacle: '#B0E0E6', bg: '#E0FFFF' },
  desert: { ground: '#F4A460', obstacle: '#8B4513', bg: '#FFE4B5' },
  ocean: { ground: '#4169E1', obstacle: '#00008B', bg: '#ADD8E6' },
};

// Object type icons/colors
const OBJECT_STYLES: Record<string, { emoji: string; color: string }> = {
  monster: { emoji: '👾', color: '#FF4444' },
  npc: { emoji: '👤', color: '#4444FF' },
  chest: { emoji: '📦', color: '#FFD700' },
  portal: { emoji: '🌀', color: '#9400D3' },
  save_point: { emoji: '💾', color: '#00FF00' },
  decoration: { emoji: '🌳', color: '#228B22' },
};

// Player directional sprites (simple arrows for now)
const PLAYER_ARROWS: Record<Direction, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
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

  const { tileSize, width, height, theme, layers, objects } = map;
  const colors = THEME_COLORS[theme] || THEME_COLORS.forest;

  // Check if a position is walkable
  const isWalkable = useCallback(
    (x: number, y: number): boolean => {
      // Boundary check
      if (x < 0 || x >= width || y < 0 || y >= height) return false;

      // Obstacle layer check
      const obstacle = layers.obstacles[y]?.[x];
      if (obstacle && obstacle !== 0) return false;

      // Object collision check
      const collidingObject = objects.find(
        (obj) =>
          obj.collides &&
          obj.position.x === x &&
          obj.position.y === y
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
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 }, // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }, // right
        { dx: 0, dy: 0 }, // current
      ];

      for (const { dx, dy } of directions) {
        const checkX = x + dx;
        const checkY = y + dy;

        const obj = objects.find(
          (o) =>
            o.isVisible &&
            o.position.x === checkX &&
            o.position.y === checkY &&
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
          // Interact with nearby object
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

      // Always update direction
      setPlayerDirection(newDirection);

      // Check if new position is walkable
      if (isWalkable(newX, newY)) {
        setIsMoving(true);
        setPlayerPosition({ x: newX, y: newY });
        onMove(newX, newY, newDirection);

        // Brief movement delay
        setTimeout(() => {
          setIsMoving(false);
          checkNearbyObjects(newX, newY);
        }, 100);
      } else {
        // Still check for nearby objects when bumping into something
        checkNearbyObjects(playerPosition.x, playerPosition.y);
      }
    },
    [
      isMoving,
      playerPosition,
      playerDirection,
      nearbyObject,
      isWalkable,
      onMove,
      onInteract,
      onExit,
      checkNearbyObjects,
    ]
  );

  // Set up keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Initial nearby object check
  useEffect(() => {
    checkNearbyObjects(playerPosition.x, playerPosition.y);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate viewport
    const viewportWidth = Math.min(width, 15);
    const viewportHeight = Math.min(height, 11);

    // Calculate camera offset to center on player
    let cameraX = playerPosition.x - Math.floor(viewportWidth / 2);
    let cameraY = playerPosition.y - Math.floor(viewportHeight / 2);

    // Clamp camera to map bounds
    cameraX = Math.max(0, Math.min(width - viewportWidth, cameraX));
    cameraY = Math.max(0, Math.min(height - viewportHeight, cameraY));

    const canvasWidth = viewportWidth * tileSize;
    const canvasHeight = viewportHeight * tileSize;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw ground layer
    for (let y = 0; y < viewportHeight; y++) {
      for (let x = 0; x < viewportWidth; x++) {
        const mapX = x + cameraX;
        const mapY = y + cameraY;

        if (mapX >= 0 && mapX < width && mapY >= 0 && mapY < height) {
          const groundTile = layers.ground[mapY]?.[mapX] || 0;
          const obstacleTile = layers.obstacles[mapY]?.[mapX] || 0;

          // Draw ground
          ctx.fillStyle = groundTile === 0 ? colors.ground : colors.obstacle;
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

          // Draw obstacle
          if (obstacleTile !== 0) {
            ctx.fillStyle = colors.obstacle;
            ctx.fillRect(
              x * tileSize + 2,
              y * tileSize + 2,
              tileSize - 4,
              tileSize - 4
            );
          }

          // Grid lines (subtle)
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }

    // Draw objects
    for (const obj of objects) {
      if (!obj.isVisible) continue;

      const screenX = (obj.position.x - cameraX) * tileSize;
      const screenY = (obj.position.y - cameraY) * tileSize;

      // Skip if off screen
      if (
        screenX < -tileSize ||
        screenX > canvasWidth ||
        screenY < -tileSize ||
        screenY > canvasHeight
      ) {
        continue;
      }

      const style = OBJECT_STYLES[obj.type] || OBJECT_STYLES.decoration;

      // Draw object background
      ctx.fillStyle = style.color + '40'; // Semi-transparent
      ctx.beginPath();
      ctx.arc(
        screenX + tileSize / 2,
        screenY + tileSize / 2,
        tileSize / 2.5,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Draw emoji
      ctx.font = `${tileSize * 0.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.emoji, screenX + tileSize / 2, screenY + tileSize / 2);

      // Highlight if nearby
      if (nearbyObject?.id === obj.id) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          screenX + tileSize / 2,
          screenY + tileSize / 2,
          tileSize / 2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }

    // Draw player
    const playerScreenX = (playerPosition.x - cameraX) * tileSize;
    const playerScreenY = (playerPosition.y - cameraY) * tileSize;

    // Player shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(
      playerScreenX + tileSize / 2,
      playerScreenY + tileSize - 4,
      tileSize / 3,
      tileSize / 6,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Player body
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.arc(
      playerScreenX + tileSize / 2,
      playerScreenY + tileSize / 2,
      tileSize / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Player direction indicator
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${tileSize * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      PLAYER_ARROWS[playerDirection],
      playerScreenX + tileSize / 2,
      playerScreenY + tileSize / 2
    );
  }, [
    map,
    playerPosition,
    playerDirection,
    nearbyObject,
    width,
    height,
    tileSize,
    colors,
    layers,
    objects,
  ]);

  // Touch controls for mobile - continuous movement with joystick
  const joystickMoveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastJoystickDirection = useRef<Direction | null>(null);

  const handleJoystickMove = useCallback(
    (direction: { x: number; y: number }) => {
      // Determine the primary direction based on joystick position
      const absX = Math.abs(direction.x);
      const absY = Math.abs(direction.y);

      // Deadzone threshold
      if (absX < 0.3 && absY < 0.3) {
        // Within deadzone - stop movement
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

      // If direction hasn't changed and interval exists, skip
      if (newDirection === lastJoystickDirection.current && joystickMoveInterval.current) {
        return;
      }

      lastJoystickDirection.current = newDirection;

      // Clear existing interval
      if (joystickMoveInterval.current) {
        clearInterval(joystickMoveInterval.current);
      }

      // Movement function
      const movePlayer = () => {
        setPlayerPosition((prev) => {
          let newX = prev.x;
          let newY = prev.y;

          switch (newDirection) {
            case 'up':
              newY -= 1;
              break;
            case 'down':
              newY += 1;
              break;
            case 'left':
              newX -= 1;
              break;
            case 'right':
              newX += 1;
              break;
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

      // Execute immediate move
      movePlayer();

      // Set up continuous movement
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

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (joystickMoveInterval.current) {
        clearInterval(joystickMoveInterval.current);
      }
    };
  }, []);

  // Touch controls for mobile - legacy (single tap)
  const handleTouchMove = (direction: Direction) => {
    if (isMoving) return;

    let newX = playerPosition.x;
    let newY = playerPosition.y;

    switch (direction) {
      case 'up':
        newY -= 1;
        break;
      case 'down':
        newY += 1;
        break;
      case 'left':
        newX -= 1;
        break;
      case 'right':
        newX += 1;
        break;
    }

    setPlayerDirection(direction);

    if (isWalkable(newX, newY)) {
      setIsMoving(true);
      setPlayerPosition({ x: newX, y: newY });
      onMove(newX, newY, direction);
      haptics.light();

      setTimeout(() => {
        setIsMoving(false);
        checkNearbyObjects(newX, newY);
      }, 100);
    }
  };

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
          className="border-4 border-gray-700 rounded-lg shadow-lg"
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

      {/* Mobile Controls - Virtual Joystick */}
      <div className="md:hidden flex items-center justify-between w-full px-4 py-2">
        {/* Left side - Joystick */}
        <VirtualJoystick
          size={120}
          onMove={handleJoystickMove}
          onRelease={handleJoystickRelease}
          disableKeyboard={true}
        />

        {/* Right side - Action buttons */}
        <div className="flex flex-col items-center gap-3">
          {/* Interact button */}
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

          {/* Exit button */}
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

      {/* Controls hint (desktop) */}
      <div className="hidden md:block text-center text-sm text-gray-500">
        <p>使用 <kbd className="px-1 bg-gray-200 rounded">WASD</kbd> 或方向鍵移動</p>
        <p>按 <kbd className="px-1 bg-gray-200 rounded">空白鍵</kbd> 互動 · 按 <kbd className="px-1 bg-gray-200 rounded">ESC</kbd> 離開</p>
      </div>
    </div>
  );
};

export default GameMapEngine;
