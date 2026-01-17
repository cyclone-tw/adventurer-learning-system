import { useState, useEffect } from 'react';
import { ClipboardList, Star, Coins, CheckCircle, Gift, Clock, RefreshCw } from 'lucide-react';
import { StudentLayout } from '../../components/layout';
import { Card, ProgressBar, Button } from '../../components/ui';
import { useUserStore } from '../../stores/userStore';
import {
  dailyTaskService,
  DailyTask,
  DailyTasksResponse,
  DIFFICULTY_CONFIG,
} from '../../services/dailyTasks';

const DailyTasks = () => {
  const { refreshUser } = useUserStore();
  const [data, setData] = useState<DailyTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);

  useEffect(() => {
    loadDailyTasks();
  }, []);

  const loadDailyTasks = async () => {
    setLoading(true);
    try {
      const response = await dailyTaskService.getDailyTasks();
      setData(response);
    } catch (error) {
      console.error('Failed to load daily tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    setClaiming(taskId);
    try {
      await dailyTaskService.claimTask(taskId);
      await refreshUser();
      await loadDailyTasks();
    } catch (error) {
      console.error('Failed to claim task:', error);
    } finally {
      setClaiming(null);
    }
  };

  const handleClaimAll = async () => {
    setClaimingAll(true);
    try {
      await dailyTaskService.claimAllTasks();
      await refreshUser();
      await loadDailyTasks();
    } catch (error) {
      console.error('Failed to claim all tasks:', error);
    } finally {
      setClaimingAll(false);
    }
  };

  // Calculate time until reset
  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Count claimable tasks
  const claimableCount = data?.tasks.filter((t) => t.isCompleted && !t.isClaimed).length || 0;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto pb-20 md:pb-6 space-y-6">
        {/* Header */}
        <Card
          variant="elevated"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">每日任務</h1>
              <p className="text-white/80">完成任務獲取豐厚獎勵！</p>
            </div>
            <div className="text-right">
              {data && (
                <>
                  <div className="text-3xl font-bold">
                    {data.stats.completed}/{data.stats.total}
                  </div>
                  <div className="text-sm text-white/80">已完成</div>
                </>
              )}
            </div>
          </div>

          {/* Reset timer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 text-white/80">
              <Clock className="w-4 h-4" />
              <span className="text-sm">重置倒數</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="font-mono font-bold">{getTimeUntilReset()}</span>
            </div>
          </div>
        </Card>

        {/* Claim All Button */}
        {claimableCount > 0 && (
          <Card variant="elevated" className="bg-gradient-to-r from-green-500 to-emerald-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Gift className="w-6 h-6" />
                <span className="font-medium">
                  有 {claimableCount} 個任務獎勵可領取！
                </span>
              </div>
              <Button
                onClick={handleClaimAll}
                disabled={claimingAll}
                className="bg-white text-green-600 hover:bg-green-50"
              >
                {claimingAll ? '領取中...' : '一鍵領取'}
              </Button>
            </div>
          </Card>
        )}

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">載入任務...</p>
          </div>
        ) : !data || data.tasks.length === 0 ? (
          <Card variant="outlined" className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">目前沒有每日任務</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClaim={handleClaimTask}
                claiming={claiming === task._id}
              />
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

// Task Card Component
interface TaskCardProps {
  task: DailyTask;
  onClaim: (taskId: string) => void;
  claiming: boolean;
}

const TaskCard = ({ task, onClaim, claiming }: TaskCardProps) => {
  const config = DIFFICULTY_CONFIG[task.difficulty];
  const progressPercent = Math.min((task.progress / task.targetValue) * 100, 100);

  return (
    <Card
      variant="elevated"
      padding="md"
      className={`relative overflow-hidden transition-all ${
        task.isClaimed ? 'opacity-60' : ''
      }`}
    >
      {/* Claimed overlay */}
      {task.isClaimed && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          已領取
        </div>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
            task.isCompleted
              ? 'bg-green-100 border-2 border-green-300'
              : `${config.bgColor} border-2 ${config.borderColor}`
          }`}
        >
          {task.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate">{task.name}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}
            >
              {config.name}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3">{task.description}</p>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>進度</span>
              <span>
                {task.progress}/{task.targetValue}
              </span>
            </div>
            <ProgressBar
              value={task.progress}
              max={task.targetValue}
              size="sm"
              color={task.isCompleted ? 'green' : 'purple'}
            />
          </div>

          {/* Rewards and Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              {task.expReward > 0 && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Star className="w-3 h-3" />+{task.expReward} EXP
                </span>
              )}
              {task.goldReward > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Coins className="w-3 h-3" />+{task.goldReward}
                </span>
              )}
            </div>

            {/* Claim button */}
            {task.isCompleted && !task.isClaimed && (
              <Button
                size="sm"
                onClick={() => onClaim(task._id)}
                disabled={claiming}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {claiming ? '領取中...' : '領取獎勵'}
              </Button>
            )}

            {/* Completed indicator */}
            {task.isCompleted && task.isClaimed && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                完成
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DailyTasks;
