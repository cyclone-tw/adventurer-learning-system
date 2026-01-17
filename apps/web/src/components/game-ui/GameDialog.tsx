import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import GamePanel from './GamePanel';
import GameButton from './GameButton';

interface Speaker {
  name: string;
  avatarUrl?: string;
  position?: 'left' | 'right';
}

interface Choice {
  text: string;
  action: () => void;
}

interface GameDialogProps {
  speaker?: Speaker;
  content: string;
  choices?: Choice[];
  onNext?: () => void;
  onClose?: () => void;
  typewriter?: boolean;
  typewriterSpeed?: number;
  className?: string;
}

const GameDialog = ({
  speaker,
  content,
  choices,
  onNext,
  onClose,
  typewriter = true,
  typewriterSpeed = 30,
  className,
}: GameDialogProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(typewriter);

  // 打字機效果
  useEffect(() => {
    if (!typewriter) {
      setDisplayedText(content);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedText(content.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, typewriterSpeed);

    return () => clearInterval(timer);
  }, [content, typewriter, typewriterSpeed]);

  // 點擊跳過打字
  const handleClick = () => {
    if (isTyping) {
      setDisplayedText(content);
      setIsTyping(false);
    } else if (!choices && onNext) {
      onNext();
    }
  };

  return (
    <div
      className={clsx(
        'fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[600px] lg:w-[700px]',
        'z-50',
        className
      )}
      onClick={handleClick}
    >
      <GamePanel variant="parchment" size="lg">
        {/* 說話者資訊 */}
        {speaker && (
          <div
            className={clsx(
              'flex items-center gap-3 mb-3 pb-3 border-b-2 border-amber-300',
              speaker.position === 'right' && 'flex-row-reverse'
            )}
          >
            {/* 頭像 */}
            <div className="w-16 h-16 rounded-lg overflow-hidden border-3 border-amber-700 bg-amber-200 flex-shrink-0">
              {speaker.avatarUrl ? (
                <img
                  src={speaker.avatarUrl}
                  alt={speaker.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  👤
                </div>
              )}
            </div>

            {/* 名稱 */}
            <div
              className={clsx(
                'px-4 py-1 bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg',
                'border-2 border-amber-800'
              )}
            >
              <span className="font-game-title text-amber-100 font-bold">
                {speaker.name}
              </span>
            </div>
          </div>
        )}

        {/* 對話內容 */}
        <div className="min-h-[80px] mb-4">
          <p className="text-lg text-stone-800 leading-relaxed">
            {displayedText}
            {isTyping && <span className="animate-pulse">▋</span>}
          </p>
        </div>

        {/* 選項或提示 */}
        {choices && choices.length > 0 && !isTyping ? (
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <GameButton
                key={index}
                variant="secondary"
                size="md"
                onClick={(e) => {
                  e.stopPropagation();
                  choice.action();
                }}
                className="w-full justify-start"
              >
                <span className="text-amber-400 mr-2">{index + 1}.</span>
                {choice.text}
              </GameButton>
            ))}
          </div>
        ) : (
          <div className="text-center">
            {!isTyping && (
              <span className="text-sm text-stone-500 animate-pulse">
                {onClose ? '點擊關閉' : '點擊繼續 ▼'}
              </span>
            )}
          </div>
        )}

        {/* 關閉按鈕 */}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full border-2 border-red-700 text-white font-bold shadow-lg"
          >
            ✕
          </button>
        )}
      </GamePanel>
    </div>
  );
};

export default GameDialog;
