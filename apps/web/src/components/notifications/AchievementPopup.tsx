import { useEffect, useState } from 'react';
import { X, Star, Coins, Sparkles } from 'lucide-react';
import { useNotificationStore, AchievementNotification } from '../../stores/notificationStore';

// Rarity configuration
const RARITY_CONFIG = {
  common: {
    name: '普通',
    gradient: 'from-gray-400 to-gray-600',
    glow: 'shadow-gray-400/50',
    border: 'border-gray-400',
    bg: 'bg-gray-100',
  },
  rare: {
    name: '稀有',
    gradient: 'from-blue-400 to-blue-600',
    glow: 'shadow-blue-400/50',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
  },
  epic: {
    name: '史詩',
    gradient: 'from-purple-400 to-purple-600',
    glow: 'shadow-purple-400/50',
    border: 'border-purple-400',
    bg: 'bg-purple-50',
  },
  legendary: {
    name: '傳說',
    gradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-400/50',
    border: 'border-amber-400',
    bg: 'bg-amber-50',
  },
};

// Confetti particle component
const Confetti = ({ color, delay }: { color: string; delay: number }) => (
  <div
    className={`absolute w-2 h-2 ${color} rounded-full animate-confetti`}
    style={{
      left: `${Math.random() * 100}%`,
      animationDelay: `${delay}ms`,
    }}
  />
);

// Sparkle animation component
const SparkleEffect = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-sparkle"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    ))}
  </div>
);

interface AchievementPopupProps {
  achievement: AchievementNotification['achievement'];
  onClose: () => void;
}

const AchievementPopupContent = ({ achievement, onClose }: AchievementPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const config = RARITY_CONFIG[achievement.rarity];

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti for legendary/epic */}
      {(achievement.rarity === 'legendary' || achievement.rarity === 'epic') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <Confetti
              key={i}
              color={['bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-blue-400'][i % 4]}
              delay={i * 100}
            />
          ))}
        </div>
      )}

      {/* Main popup */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-sm w-full transform transition-all duration-500 ${
          isVisible && !isClosing
            ? 'scale-100 translate-y-0'
            : 'scale-75 translate-y-8'
        } ${config.glow} shadow-xl`}
      >
        {/* Sparkle effect for legendary */}
        {achievement.rarity === 'legendary' && <SparkleEffect />}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with gradient */}
        <div
          className={`relative px-6 pt-8 pb-12 rounded-t-2xl bg-gradient-to-br ${config.gradient} text-white text-center overflow-hidden`}
        >
          {/* Animated rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-32 h-32 rounded-full border-2 border-white/20 animate-ping-slow`} />
            <div className={`absolute w-40 h-40 rounded-full border border-white/10 animate-ping-slower`} />
          </div>

          {/* Achievement unlocked text */}
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium uppercase tracking-wider">
                成就解鎖
              </span>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${config.bg} text-gray-800`}>
              {config.name}
            </div>
          </div>
        </div>

        {/* Icon */}
        <div className="relative -mt-8 flex justify-center">
          <div
            className={`w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-4xl border-4 ${config.border} animate-bounce-subtle`}
          >
            {achievement.icon}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {achievement.name}
          </h3>
          <p className="text-gray-600 mb-4">
            {achievement.description}
          </p>

          {/* Rewards */}
          {(achievement.expReward > 0 || achievement.goldReward > 0) && (
            <div className="flex items-center justify-center gap-4 py-3 px-4 bg-gray-50 rounded-xl">
              {achievement.expReward > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Star className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-bold text-purple-600">+{achievement.expReward} EXP</span>
                </div>
              )}
              {achievement.goldReward > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-bold text-amber-600">+{achievement.goldReward}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Click to close hint */}
        <div className="text-center pb-4 text-xs text-gray-400">
          點擊任意處關閉
        </div>
      </div>
    </div>
  );
};

// Global achievement notification component
const AchievementPopup = () => {
  const { currentAchievement, isShowingAchievement, dismissCurrentAchievement } =
    useNotificationStore();

  if (!isShowingAchievement || !currentAchievement) {
    return null;
  }

  return (
    <AchievementPopupContent
      achievement={currentAchievement.achievement}
      onClose={dismissCurrentAchievement}
    />
  );
};

export default AchievementPopup;
