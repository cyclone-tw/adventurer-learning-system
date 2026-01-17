import mongoose from 'mongoose';
import DailyTask, { DailyTaskType } from '../models/DailyTask.js';
import PlayerDailyTask from '../models/PlayerDailyTask.js';
import QuestionAttempt from '../models/QuestionAttempt.js';
import User from '../models/User.js';

// Get today's date (midnight)
export function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Initialize daily tasks for a player (creates records for today if not exist)
export async function initializeDailyTasks(playerId: string): Promise<void> {
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // Get all active daily tasks
  const dailyTasks = await DailyTask.find({ isActive: true }).lean();

  // Get existing player tasks for today
  const existingTasks = await PlayerDailyTask.find({
    playerId: playerObjectId,
    date: today,
  }).lean();

  const existingTaskIds = new Set(existingTasks.map((t) => t.taskId.toString()));

  // Create missing task records
  const newTasks = dailyTasks
    .filter((task) => !existingTaskIds.has(task._id.toString()))
    .map((task) => ({
      playerId: playerObjectId,
      taskId: task._id,
      date: today,
      progress: 0,
      isCompleted: false,
      isClaimed: false,
    }));

  if (newTasks.length > 0) {
    await PlayerDailyTask.insertMany(newTasks);
  }
}

// Get daily tasks with player progress
export async function getDailyTasksWithProgress(playerId: string): Promise<{
  tasks: Array<{
    _id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    taskType: string;
    targetValue: number;
    targetSubject?: string;
    expReward: number;
    goldReward: number;
    difficulty: string;
    progress: number;
    isCompleted: boolean;
    isClaimed: boolean;
  }>;
  stats: {
    total: number;
    completed: number;
    claimed: number;
  };
}> {
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // Initialize tasks first
  await initializeDailyTasks(playerId);

  // Get all daily tasks with player progress
  const dailyTasks = await DailyTask.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  const playerTasks = await PlayerDailyTask.find({
    playerId: playerObjectId,
    date: today,
  }).lean();

  const playerTaskMap = new Map(
    playerTasks.map((pt) => [pt.taskId.toString(), pt])
  );

  // Calculate real progress for each task
  const progressMap = await calculateTaskProgress(playerId);

  const tasks = dailyTasks.map((task) => {
    const playerTask = playerTaskMap.get(task._id.toString());
    const currentProgress = progressMap.get(task.taskType) || 0;
    const progress = Math.min(currentProgress, task.targetValue);
    const isCompleted = progress >= task.targetValue;

    return {
      _id: task._id.toString(),
      code: task.code,
      name: task.name,
      description: task.description,
      icon: task.icon,
      taskType: task.taskType,
      targetValue: task.targetValue,
      targetSubject: task.targetSubject,
      expReward: task.expReward,
      goldReward: task.goldReward,
      difficulty: task.difficulty,
      progress,
      isCompleted,
      isClaimed: playerTask?.isClaimed || false,
    };
  });

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const claimedCount = tasks.filter((t) => t.isClaimed).length;

  return {
    tasks,
    stats: {
      total: tasks.length,
      completed: completedCount,
      claimed: claimedCount,
    },
  };
}

// Calculate current progress for all task types
async function calculateTaskProgress(playerId: string): Promise<Map<string, number>> {
  const progress = new Map<string, number>();
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // Questions answered today
  const questionsToday = await QuestionAttempt.countDocuments({
    studentId: playerObjectId,
    createdAt: { $gte: today },
  });
  progress.set('questions_answered', questionsToday);

  // Correct answers today
  const correctToday = await QuestionAttempt.countDocuments({
    studentId: playerObjectId,
    createdAt: { $gte: today },
    isCorrect: true,
  });
  progress.set('correct_answers', correctToday);

  // Current correct streak (today only)
  const todayAttempts = await QuestionAttempt.find({
    studentId: playerObjectId,
    createdAt: { $gte: today },
  })
    .sort({ createdAt: -1 })
    .select('isCorrect')
    .lean();

  let streak = 0;
  for (const attempt of todayAttempts) {
    if (attempt.isCorrect) {
      streak++;
    } else {
      break;
    }
  }
  progress.set('correct_streak', streak);

  // Perfect answers (100% correct in a session - simplified as all correct today)
  const perfectCount = correctToday === questionsToday && questionsToday > 0 ? 1 : 0;
  progress.set('perfect_answers', perfectCount);

  return progress;
}

// Update task progress after answering a question
export async function updateTaskProgress(
  playerId: string,
  isCorrect: boolean
): Promise<Array<{
  taskId: string;
  name: string;
  icon: string;
  expReward: number;
  goldReward: number;
}>> {
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const completedTasks: Array<{
    taskId: string;
    name: string;
    icon: string;
    expReward: number;
    goldReward: number;
  }> = [];

  // Initialize tasks if needed
  await initializeDailyTasks(playerId);

  // Get all active daily tasks
  const dailyTasks = await DailyTask.find({ isActive: true }).lean();

  // Calculate current progress
  const progressMap = await calculateTaskProgress(playerId);

  // Check each task
  for (const task of dailyTasks) {
    const currentProgress = progressMap.get(task.taskType) || 0;

    // Check if task is newly completed
    if (currentProgress >= task.targetValue) {
      // Update player task if not already completed
      const result = await PlayerDailyTask.findOneAndUpdate(
        {
          playerId: playerObjectId,
          taskId: task._id,
          date: today,
          isCompleted: false,
        },
        {
          progress: task.targetValue,
          isCompleted: true,
          completedAt: new Date(),
        },
        { new: true }
      );

      if (result) {
        completedTasks.push({
          taskId: task._id.toString(),
          name: task.name,
          icon: task.icon,
          expReward: task.expReward,
          goldReward: task.goldReward,
        });
      }
    } else {
      // Just update progress
      await PlayerDailyTask.findOneAndUpdate(
        {
          playerId: playerObjectId,
          taskId: task._id,
          date: today,
        },
        {
          progress: currentProgress,
        }
      );
    }
  }

  return completedTasks;
}

// Claim task reward
export async function claimTaskReward(
  playerId: string,
  taskId: string
): Promise<{ expReward: number; goldReward: number } | null> {
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);
  const taskObjectId = new mongoose.Types.ObjectId(taskId);

  // Find completed but unclaimed task
  const playerTask = await PlayerDailyTask.findOne({
    playerId: playerObjectId,
    taskId: taskObjectId,
    date: today,
    isCompleted: true,
    isClaimed: false,
  });

  if (!playerTask) {
    return null;
  }

  // Get task details
  const task = await DailyTask.findById(taskId);
  if (!task) {
    return null;
  }

  // Mark as claimed
  playerTask.isClaimed = true;
  playerTask.claimedAt = new Date();
  await playerTask.save();

  // Award rewards
  await User.findByIdAndUpdate(playerId, {
    $inc: {
      'studentProfile.exp': task.expReward,
      'studentProfile.gold': task.goldReward,
    },
  });

  return {
    expReward: task.expReward,
    goldReward: task.goldReward,
  };
}

// Claim all completed task rewards
export async function claimAllTaskRewards(
  playerId: string
): Promise<{ totalExp: number; totalGold: number; count: number }> {
  const today = getToday();
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // Find all completed but unclaimed tasks
  const playerTasks = await PlayerDailyTask.find({
    playerId: playerObjectId,
    date: today,
    isCompleted: true,
    isClaimed: false,
  }).populate('taskId');

  if (playerTasks.length === 0) {
    return { totalExp: 0, totalGold: 0, count: 0 };
  }

  let totalExp = 0;
  let totalGold = 0;

  // Calculate total rewards
  for (const pt of playerTasks) {
    const task = pt.taskId as any;
    if (task) {
      totalExp += task.expReward || 0;
      totalGold += task.goldReward || 0;
    }
  }

  // Mark all as claimed
  await PlayerDailyTask.updateMany(
    {
      playerId: playerObjectId,
      date: today,
      isCompleted: true,
      isClaimed: false,
    },
    {
      isClaimed: true,
      claimedAt: new Date(),
    }
  );

  // Award rewards
  await User.findByIdAndUpdate(playerId, {
    $inc: {
      'studentProfile.exp': totalExp,
      'studentProfile.gold': totalGold,
    },
  });

  return {
    totalExp,
    totalGold,
    count: playerTasks.length,
  };
}
