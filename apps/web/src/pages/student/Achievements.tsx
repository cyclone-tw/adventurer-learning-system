import { useState, useEffect } from 'react';
import { Award, Lock, Star, Coins, CheckCircle } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, ProgressBar } from '../../components/ui';
import {
  achievementService,
  Achievement,
  AchievementCategory,
  AchievementsResponse,
  CATEGORY_NAMES,
  CATEGORY_ICONS,
  RARITY_CONFIG,
} from '../../services/achievements';

const Achievements = () => {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      const response = await achievementService.getAchievements();
      setData(response);

      // Mark all as seen
      if (response.stats.newCount > 0) {
        await achievementService.markAllAchievementsSeen();
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered achievements
  const getFilteredAchievements = (): Achievement[] => {
    if (!data) return [];

    let achievements: Achievement[] = [];

    if (selectedCategory === 'all') {
      achievements = [
        ...data.achievements.learning,
        ...data.achievements.adventure,
        ...data.achievements.social,
        ...data.achievements.special,
      ];
    } else {
      achievements = data.achievements[selectedCategory];
    }

    if (showUnlockedOnly) {
      achievements = achievements.filter((a) => a.isUnlocked);
    }

    return achievements;
  };

  const filteredAchievements = getFilteredAchievements();

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">成就</h1>
              <p className="text-white/80">完成挑戰，收集成就徽章！</p>
            </div>
            {data && (
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {data.stats.unlocked}/{data.stats.total}
                </div>
                <div className="text-sm text-white/80">
                  已解鎖 {data.stats.percentage}%
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {data && (
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${data.stats.percentage}%` }}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Category Filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              全部
            </button>
            {(['learning', 'adventure', 'social', 'special'] as AchievementCategory[]).map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="hidden sm:inline">{CATEGORY_NAMES[cat]}</span>
                </button>
              )
            )}
          </div>

          {/* Show unlocked only toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            只顯示已解鎖
          </label>
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入成就...</p>
          </div>
        ) : filteredAchievements.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              {showUnlockedOnly ? '尚未解鎖任何成就' : '沒有符合條件的成就'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAchievements.map((achievement) => (
              <AchievementCard key={achievement._id} achievement={achievement} />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

// Achievement Card Component
const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const rarityConfig = RARITY_CONFIG[achievement.rarity];
  const isLocked = !achievement.isUnlocked;

  return (
    <Card
      variant="elevated"
      padding="md"
      className={`relative overflow-hidden transition-all ${
        isLocked ? 'opacity-60' : ''
      } ${achievement.isNew ? 'ring-2 ring-purple-400' : ''}`}
    >
      {/* New badge */}
      {achievement.isNew && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">
          NEW
        </div>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
            isLocked
              ? 'bg-gray-100'
              : `${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor}`
          }`}
        >
          {isLocked && achievement.isHidden ? (
            <Lock className="w-8 h-8 text-gray-400" />
          ) : (
            achievement.icon
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-bold truncate ${
                isLocked ? 'text-gray-500' : 'text-gray-900'
              }`}
            >
              {achievement.name}
            </h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${rarityConfig.bgColor} ${rarityConfig.color}`}
            >
              {rarityConfig.name}
            </span>
          </div>

          <p className={`text-sm mb-2 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
            {achievement.description}
          </p>

          {/* Rewards */}
          {!isLocked && (achievement.expReward || achievement.goldReward) ? (
            <div className="flex items-center gap-3 text-xs">
              {achievement.expReward ? (
                <span className="flex items-center gap-1 text-purple-600">
                  <Star className="w-3 h-3" />+{achievement.expReward} EXP
                </span>
              ) : null}
              {achievement.goldReward ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <Coins className="w-3 h-3" />+{achievement.goldReward}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Progress for locked achievements */}
          {isLocked && !achievement.isHidden && achievement.progress !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>進度</span>
                <span>
                  {achievement.progress}/{achievement.requirementValue}
                </span>
              </div>
              <ProgressBar
                value={achievement.progress}
                max={achievement.requirementValue}
                size="sm"
              />
            </div>
          )}

          {/* Unlocked indicator */}
          {!isLocked && (
            <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
              <CheckCircle className="w-3 h-3" />
              已解鎖
              {achievement.unlockedAt && (
                <span className="text-gray-400 ml-1">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Achievements;
