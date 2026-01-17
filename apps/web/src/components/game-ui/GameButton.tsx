import { ReactNode, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'golden' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const variantStyles = {
  primary: `
    bg-gradient-to-b from-amber-500 to-amber-700
    border-amber-900
    text-amber-950
    hover:from-amber-400 hover:to-amber-600
    active:from-amber-600 active:to-amber-800
    shadow-[0_4px_0_#78350f]
    active:shadow-[0_0_0_#78350f] active:translate-y-1
  `,
  secondary: `
    bg-gradient-to-b from-stone-500 to-stone-700
    border-stone-800
    text-stone-100
    hover:from-stone-400 hover:to-stone-600
    active:from-stone-600 active:to-stone-800
    shadow-[0_4px_0_#44403c]
    active:shadow-[0_0_0_#44403c] active:translate-y-1
  `,
  danger: `
    bg-gradient-to-b from-red-500 to-red-700
    border-red-900
    text-red-50
    hover:from-red-400 hover:to-red-600
    active:from-red-600 active:to-red-800
    shadow-[0_4px_0_#7f1d1d]
    active:shadow-[0_0_0_#7f1d1d] active:translate-y-1
  `,
  golden: `
    bg-gradient-to-b from-yellow-400 to-amber-500
    border-yellow-700
    text-amber-900
    hover:from-yellow-300 hover:to-amber-400
    active:from-yellow-500 active:to-amber-600
    shadow-[0_4px_0_#a16207]
    active:shadow-[0_0_0_#a16207] active:translate-y-1
    rpg-glow
  `,
  ghost: `
    bg-transparent
    border-amber-600
    text-amber-700
    hover:bg-amber-100
    active:bg-amber-200
    shadow-none
  `,
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

const GameButton = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: GameButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(
        // 基本樣式
        'relative inline-flex items-center justify-center gap-2',
        'font-bold rounded-lg border-3',
        'transition-all duration-100',
        'touch-target touch-feedback',
        // 文字樣式
        'text-shadow-[1px_1px_0_rgba(255,255,255,0.3)]',
        // 變體
        variantStyles[variant],
        sizeStyles[size],
        // 禁用狀態
        isDisabled && 'opacity-50 cursor-not-allowed !shadow-none !translate-y-0',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {rightIcon && !loading && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default GameButton;
