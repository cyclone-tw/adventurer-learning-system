import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const ProgressBar = ({
  value,
  max,
  showLabel = false,
  color = 'blue',
  size = 'md',
  animated = false,
}: ProgressBarProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorStyles = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    white: 'bg-white/80',
  };

  const sizeStyles = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const trackColor = color === 'white' ? 'bg-white/30' : 'bg-gray-200';

  return (
    <div className="w-full">
      <div
        className={clsx(
          'w-full rounded-full overflow-hidden',
          trackColor,
          sizeStyles[size]
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            colorStyles[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-sm text-gray-600 text-right">
          {value} / {max}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
