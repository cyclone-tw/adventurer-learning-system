import { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';

interface VirtualJoystickProps {
  size?: number;
  onMove: (direction: { x: number; y: number }) => void;
  onRelease: () => void;
  className?: string;
  disabled?: boolean;
  disableKeyboard?: boolean;
}

const VirtualJoystick = ({
  size = 120,
  onMove,
  onRelease,
  className,
  disabled = false,
  disableKeyboard = false,
}: VirtualJoystickProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickSize = size * 0.4;
  const maxDistance = (size - stickSize) / 2;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();
      setIsDragging(true);
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !containerRef.current || disabled) return;
      e.preventDefault();

      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let deltaX = touch.clientX - centerX;
      let deltaY = touch.clientY - centerY;

      // 限制範圍
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
      }

      setPosition({ x: deltaX, y: deltaY });

      // 正規化為 -1 到 1
      onMove({
        x: deltaX / maxDistance,
        y: deltaY / maxDistance,
      });
    },
    [isDragging, maxDistance, onMove, disabled]
  );

  const handleTouchEnd = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    onRelease();
  }, [onRelease]);

  // 處理鍵盤控制（桌面端）
  useEffect(() => {
    if (disabled || disableKeyboard) return;

    const keys: Record<string, { x: number; y: number }> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      KeyW: { x: 0, y: -1 },
      KeyS: { x: 0, y: 1 },
      KeyA: { x: -1, y: 0 },
      KeyD: { x: 1, y: 0 },
    };

    const pressedKeys = new Set<string>();

    const updateDirection = () => {
      let x = 0;
      let y = 0;

      pressedKeys.forEach((key) => {
        if (keys[key]) {
          x += keys[key].x;
          y += keys[key].y;
        }
      });

      // 正規化對角線移動
      const magnitude = Math.sqrt(x * x + y * y);
      if (magnitude > 1) {
        x /= magnitude;
        y /= magnitude;
      }

      if (x !== 0 || y !== 0) {
        setPosition({ x: x * maxDistance, y: y * maxDistance });
        onMove({ x, y });
      } else {
        setPosition({ x: 0, y: 0 });
        onRelease();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (keys[e.code] && !e.repeat) {
        pressedKeys.add(e.code);
        updateDirection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys[e.code]) {
        pressedKeys.delete(e.code);
        updateDirection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [maxDistance, onMove, onRelease, disabled, disableKeyboard]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative touch-none select-none',
        disabled && 'opacity-50',
        className
      )}
      style={{ width: size, height: size }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 底座 */}
      <div
        className={clsx(
          'absolute inset-0 rounded-full',
          'bg-gradient-to-b from-stone-700/80 to-stone-900/80',
          'border-4 border-stone-600/50',
          'shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)]'
        )}
      >
        {/* 方向指示 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-2 text-stone-500 text-xl">▲</div>
          <div className="absolute bottom-2 text-stone-500 text-xl">▼</div>
          <div className="absolute left-2 text-stone-500 text-xl">◄</div>
          <div className="absolute right-2 text-stone-500 text-xl">►</div>
        </div>
      </div>

      {/* 搖桿 */}
      <div
        className={clsx(
          'absolute rounded-full',
          'bg-gradient-to-b from-amber-400 to-amber-600',
          'border-3 border-amber-700',
          'shadow-[0_4px_8px_rgba(0,0,0,0.4)]',
          'transition-transform duration-50',
          isDragging && 'scale-110'
        )}
        style={{
          width: stickSize,
          height: stickSize,
          left: '50%',
          top: '50%',
          marginLeft: -stickSize / 2,
          marginTop: -stickSize / 2,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        {/* 高光 */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </div>
  );
};

export default VirtualJoystick;
