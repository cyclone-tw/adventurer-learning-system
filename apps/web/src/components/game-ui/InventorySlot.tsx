import { clsx } from 'clsx';

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface Item {
  id: string;
  name: string;
  imageUrl?: string;
  icon?: string;
  quantity?: number;
  rarity?: Rarity;
}

interface InventorySlotProps {
  item?: Item;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
  className?: string;
}

const rarityStyles: Record<Rarity, { border: string; glow: string; bg: string }> = {
  common: {
    border: 'border-stone-400',
    glow: '',
    bg: 'bg-stone-200',
  },
  uncommon: {
    border: 'border-green-500',
    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    bg: 'bg-green-100',
  },
  rare: {
    border: 'border-blue-500',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.6)]',
    bg: 'bg-blue-100',
  },
  epic: {
    border: 'border-purple-500',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.6)]',
    bg: 'bg-purple-100',
  },
  legendary: {
    border: 'border-amber-500',
    glow: 'rpg-glow',
    bg: 'bg-amber-100',
  },
};

const sizeStyles = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const InventorySlot = ({
  item,
  size = 'md',
  selected = false,
  locked = false,
  onClick,
  onLongPress,
  className,
}: InventorySlotProps) => {
  const rarity = item?.rarity || 'common';
  const rarityStyle = rarityStyles[rarity];

  // 長按處理
  let longPressTimer: ReturnType<typeof setTimeout>;

  const handleTouchStart = () => {
    if (onLongPress) {
      longPressTimer = setTimeout(() => {
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
  };

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      disabled={locked}
      className={clsx(
        // 基本樣式
        'relative rounded-lg border-3',
        'transition-all duration-200',
        'touch-target touch-feedback',
        sizeStyles[size],
        // 有物品時
        item && [
          rarityStyle.border,
          rarityStyle.glow,
          rarityStyle.bg,
        ],
        // 空格時
        !item && [
          'border-dashed border-stone-400',
          'bg-stone-100/50',
        ],
        // 選中狀態
        selected && 'ring-2 ring-amber-400 ring-offset-2',
        // 鎖定狀態
        locked && 'opacity-50 cursor-not-allowed',
        // 懸停效果
        !locked && item && 'hover:scale-105',
        className
      )}
    >
      {item ? (
        <>
          {/* 物品圖像 */}
          <div className="absolute inset-1 flex items-center justify-center">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-2xl">{item.icon || '❓'}</span>
            )}
          </div>

          {/* 數量角標 */}
          {item.quantity && item.quantity > 1 && (
            <div
              className={clsx(
                'absolute -bottom-1 -right-1',
                'min-w-[20px] h-5 px-1',
                'bg-stone-800 rounded-full',
                'flex items-center justify-center',
                'text-xs font-bold text-white',
                'border border-stone-600'
              )}
            >
              {item.quantity > 99 ? '99+' : item.quantity}
            </div>
          )}

          {/* 稀有度標記（傳說） */}
          {rarity === 'legendary' && (
            <div className="absolute -top-1 -left-1 text-amber-500 text-sm">
              ⭐
            </div>
          )}
        </>
      ) : (
        // 空格
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-stone-300 text-xl">＋</span>
        </div>
      )}

      {/* 鎖定圖標 */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
          <span className="text-xl">🔒</span>
        </div>
      )}
    </button>
  );
};

export default InventorySlot;
