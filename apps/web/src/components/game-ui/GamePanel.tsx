import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface GamePanelProps {
  title?: string;
  variant?: 'default' | 'golden' | 'dark' | 'parchment';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const variantStyles = {
  default: 'bg-gradient-to-b from-amber-100 to-amber-200 border-amber-800',
  golden: 'bg-gradient-to-b from-yellow-200 to-amber-300 border-yellow-700',
  dark: 'bg-gradient-to-b from-stone-800 to-stone-900 border-stone-600 text-amber-100',
  parchment: 'bg-gradient-to-b from-orange-100 to-amber-100 border-amber-700',
};

const sizeStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const GamePanel = ({
  title,
  variant = 'default',
  size = 'md',
  className,
  children,
}: GamePanelProps) => {
  return (
    <div
      className={clsx(
        // 基本樣式
        'relative rounded-lg border-4',
        // 內陰影
        'shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.2)]',
        // 外陰影
        'shadow-lg',
        // 變體
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {/* 角落裝飾 */}
      <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-600 rounded-tl-lg border-2 border-amber-800" />
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-tr-lg border-2 border-amber-800" />
      <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-600 rounded-bl-lg border-2 border-amber-800" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-600 rounded-br-lg border-2 border-amber-800" />

      {/* 標題 */}
      {title && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 rounded border-2 border-amber-800">
          <h3 className="font-game-title text-amber-100 text-sm font-bold whitespace-nowrap">
            {title}
          </h3>
        </div>
      )}

      {/* 內容 */}
      <div className={title ? 'mt-2' : ''}>{children}</div>
    </div>
  );
};

export default GamePanel;
