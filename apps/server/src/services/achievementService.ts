import mongoose from 'mongoose';
import Achievement, { AchievementRequirementType } from '../models/Achievement.js';
import PlayerAchievement from '../models/PlayerAchievement.js';
import QuestionAttempt from '../models/QuestionAttempt.js';
import User from '../models/User.js';

export interface UnlockedAchievement {
  _id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  expReward: number;
  goldReward: number;
}

/**
 * Check and unlock achievements for a player
 * Returns array of newly unlocked achievements
 */
export async function checkAchievements(
  playerId: string,
  triggers: AchievementRequirementType[]
): Promise<UnlockedAchievement[]> {
  const unlockedAchievements: UnlockedAchievement[] = [];

  try {
    // Get achievements that match the triggers and aren't already unlocked
    const achievements = await Achievement.find({
      isActive: true,
      requirementType: { $in: triggers },
    }).lean();

    // Get player's already unlocked achievements
    const playerAchievements = await PlayerAchievement.find({
      playerId,
    }).lean();
    const unlockedIds = new Set(
      playerAchievements.map((pa) => pa.achievementId.toString())
    );

    // Get player data
    const player = await User.findById(playerId).lean();
    if (!player) return [];

    // Check each achievement
    for (const achievement of achievements) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement._id.toString())) continue;

      const isUnlocked = await checkAchievementCondition(
        playerId,
        achievement.requirementType,
        achievement.requirementValue,
        achievement.requirementSubject,
        player
      );

      if (isUnlocked) {
        // Unlock the achievement
        await PlayerAchievement.create({
          playerId: new mongoose.Types.ObjectId(playerId),
          achievementId: achievement._id,
          progress: achievement.requirementValue,
          isNew: true,
        });

        // Award rewards
        if (achievement.expReward > 0 || achievement.goldReward > 0) {
          await User.findByIdAndUpdate(playerId, {
            $inc: {
              'studentProfile.exp': achievement.expReward,
              'studentProfile.gold': achievement.goldReward,
            },
          });
        }

        unlockedAchievements.push({
          _id: achievement._id.toString(),
          code: achievement.code,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          expReward: achievement.expReward,
          goldReward: achievement.goldReward,
        });
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }

  return unlockedAchievements;
}

/**
 * Check if a specific achievement condition is met
 */
async function checkAchievementCondition(
  playerId: string,
  type: AchievementRequirementType,
  value: number,
  subject: string | undefined,
  player: any
): Promise<boolean> {
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  switch (type) {
    case 'questions_answered': {
      const count = await QuestionAttempt.countDocuments({ studentId: playerObjectId });
      return count >= value;
    }

    case 'correct_answers': {
      const count = await QuestionAttempt.countDocuments({
        studentId: playerObjectId,
        isCorrect: true,
      });
      return count >= value;
    }

    case 'correct_streak': {
      // Get recent attempts and find max streak
      const attempts = await QuestionAttempt.find({ studentId: playerObjectId })
        .sort({ createdAt: -1 })
        .limit(value * 2) // Get enough to check
        .lean();

      let currentStreak = 0;
      let maxStreak = 0;

      for (const attempt of attempts) {
        if (attempt.isCorrect) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      return maxStreak >= value;
    }

    case 'level_reached': {
      return (player.studentProfile?.level || 1) >= value;
    }

    case 'exp_earned': {
      // Calculate total exp earned from attempts
      const result = await QuestionAttempt.aggregate([
        { $match: { studentId: playerObjectId } },
        { $group: { _id: null, total: { $sum: '$expGained' } } },
      ]);
      const totalExp = result[0]?.total || 0;
      return totalExp >= value;
    }

    case 'gold_earned': {
      // Calculate total gold earned from attempts
      const result = await QuestionAttempt.aggregate([
        { $match: { studentId: playerObjectId } },
        { $group: { _id: null, total: { $sum: '$goldGained' } } },
      ]);
      const totalGold = result[0]?.total || 0;
      return totalGold >= value;
    }

    case 'gold_spent': {
      // This would need purchase tracking - simplified for now
      return false;
    }

    case 'items_purchased': {
      // Count items in inventory
      const PlayerItem = mongoose.model('PlayerItem');
      const result = await PlayerItem.aggregate([
        { $match: { playerId: playerObjectId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const totalItems = result[0]?.total || 0;
      return totalItems >= value;
    }

    case 'login_days': {
      // This would need login tracking - simplified for now
      return false;
    }

    case 'daily_questions': {
      // Count questions answered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await QuestionAttempt.countDocuments({
        studentId: playerObjectId,
        createdAt: { $gte: today },
      });
      return count >= value;
    }

    case 'subject_mastery': {
      // Check subject-specific stats
      if (!subject || !player.studentProfile?.stats) return false;
      const subjectStat = player.studentProfile.stats[subject] || 0;
      return subjectStat >= value;
    }

    case 'perfect_score': {
      // This would need perfect score tracking - simplified for now
      return false;
    }

    default:
      return false;
  }
}

/**
 * Get player's achievement progress for all achievements
 */
export async function getAchievementProgress(
  playerId: string
): Promise<Map<string, number>> {
  const progress = new Map<string, number>();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  try {
    // Questions answered
    const questionsCount = await QuestionAttempt.countDocuments({
      studentId: playerObjectId,
    });
    progress.set('questions_answered', questionsCount);

    // Correct answers
    const correctCount = await QuestionAttempt.countDocuments({
      studentId: playerObjectId,
      isCorrect: true,
    });
    progress.set('correct_answers', correctCount);

    // Current correct streak (most recent consecutive correct answers)
    const recentAttempts = await QuestionAttempt.find({ studentId: playerObjectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('isCorrect')
      .lean();

    let currentStreak = 0;
    for (const attempt of recentAttempts) {
      if (attempt.isCorrect) {
        currentStreak++;
      } else {
        break; // Stop at first incorrect answer
      }
    }
    progress.set('correct_streak', currentStreak);

    // Player level
    const player = await User.findById(playerId).select('studentProfile').lean();
    if (player?.studentProfile) {
      progress.set('level_reached', player.studentProfile.level || 1);
    }

    // Total exp earned
    const expResult = await QuestionAttempt.aggregate([
      { $match: { studentId: playerObjectId } },
      { $group: { _id: null, total: { $sum: '$expGained' } } },
    ]);
    progress.set('exp_earned', expResult[0]?.total || 0);

    // Total gold earned
    const goldResult = await QuestionAttempt.aggregate([
      { $match: { studentId: playerObjectId } },
      { $group: { _id: null, total: { $sum: '$goldGained' } } },
    ]);
    progress.set('gold_earned', goldResult[0]?.total || 0);

    // Items purchased
    try {
      const PlayerItem = mongoose.model('PlayerItem');
      const itemResult = await PlayerItem.aggregate([
        { $match: { playerId: playerObjectId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      progress.set('items_purchased', itemResult[0]?.total || 0);
    } catch {
      // PlayerItem model might not exist
      progress.set('items_purchased', 0);
    }

    // Daily questions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyCount = await QuestionAttempt.countDocuments({
      studentId: playerObjectId,
      createdAt: { $gte: today },
    });
    progress.set('daily_questions', dailyCount);
  } catch (error) {
    console.error('Error getting achievement progress:', error);
  }

  return progress;
}
