import { clsx } from 'clsx';
import { Heart, Zap, Star, Clock } from 'lucide-react';

interface GameProgressBarProps {
  type: 'hp' | 'mp' | 'exp' | 'timer';
  current: number;
  max: number;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const typeConfig = {
  hp: {
    icon: Heart,
    gradient: 'from-red-400 via-red-500 to-red-600',
    lowGradient: 'from-red-600 via-red-700 to-red-800',
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-800',
    iconColor: 'text-red-500',
    lowThreshold: 0.25,
  },
  mp: {
    icon: Zap,
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    lowGradient: 'from-blue-600 via-blue-700 to-blue-800',
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-800',
    iconColor: 'text-blue-500',
    lowThreshold: 0.2,
  },
  exp: {
    icon: Star,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    lowGradient: 'from-yellow-400 via-amber-500 to-orange-500',
    bgColor: 'bg-amber-900/50',
    borderColor: 'border-amber-700',
    iconColor: 'text-amber-500',
    lowThreshold: 0,
  },
  timer: {
    icon: Clock,
    gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
    lowGradient: 'from-red-500 via-red-600 to-red-700',
    bgColor: 'bg-emerald-900/50',
    borderColor: 'border-emerald-700',
    iconColor: 'text-emerald-500',
    lowThreshold: 0.25,
  },
};

const sizeConfig = {
  sm: {
    height: 'h-3',
    iconSize: 'w-4 h-4',
    fontSize: 'text-xs',
    padding: 'px-1',
  },
  md: {
    height: 'h-5',
    iconSize: 'w-5 h-5',
    fontSize: 'text-sm',
    padding: 'px-2',
  },
  lg: {
    height: 'h-7',
    iconSize: 'w-6 h-6',
    fontSize: 'text-base',
    padding: 'px-3',
  },
};

const GameProgressBar = ({
  type,
  current,
  max,
  showLabel = true,
  showIcon = true,
  size = 'md',
  animated = true,
  className,
}: GameProgressBarProps) => {
  const config = typeConfig[type];
  const sizeStyle = sizeConfig[size];
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = (current / max) <= config.lowThreshold;
  const Icon = config.icon;

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {/* 圖標 */}
      {showIcon && (
        <Icon
          className={clsx(
            sizeStyle.iconSize,
            config.iconColor,
            isLow && type === 'hp' && 'rpg-blink'
          )}
        />
      )}

      {/* 進度條容器 */}
      <div className="flex-1 relative">
        {/* 背景 */}
        <div
          className={clsx(
            'relative overflow-hidden rounded-full border-2',
            sizeStyle.height,
            config.bgColor,
            config.borderColor,
            // 內陰影
            'shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          )}
        >
          {/* 填充條 */}
          <div
            className={clsx(
              'absolute inset-0 rounded-full',
              'bg-gradient-to-r',
              isLow ? config.lowGradient : config.gradient,
              animated && 'transition-all duration-300',
              isLow && type !== 'exp' && 'rpg-blink'
            )}
            style={{ width: `${percentage}%` }}
          >
            {/* 高光效果 */}
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
          </div>

          {/* 標籤 */}
          {showLabel && size !== 'sm' && (
            <div
              className={clsx(
                'absolute inset-0 flex items-center justify-center',
                sizeStyle.fontSize,
                'font-bold text-white',
                'text-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]'
              )}
            >
              {current} / {max}
            </div>
          )}
        </div>
      </div>

      {/* 外部標籤（小尺寸時） */}
      {showLabel && size === 'sm' && (
        <span className={clsx(sizeStyle.fontSize, 'font-bold text-gray-700 min-w-[60px]')}>
          {current}/{max}
        </span>
      )}
    </div>
  );
};

export default GameProgressBar;
