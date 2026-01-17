import { useEffect, useState } from 'react';
import { X, Star, Coins, CheckCircle } from 'lucide-react';
import { useNotificationStore, TaskNotification } from '../../stores/notificationStore';

interface TaskPopupProps {
  task: TaskNotification['task'];
  onClose: () => void;
}

const TaskPopupContent = ({ task, onClose }: TaskPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto close after 3 seconds (shorter than achievement)
    const timer = setTimeout(() => {
      handleClose();
    }, 3000);

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
      className={`fixed top-20 right-4 z-50 transition-all duration-300 ${
        isVisible && !isClosing
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
      }`}
    >
      {/* Main popup */}
      <div className="bg-white rounded-xl shadow-xl border border-amber-200 max-w-xs w-72 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-bold">任務完成！</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-2xl">
              {task.icon}
            </div>
            {/* Name */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{task.name}</h3>
              <p className="text-xs text-gray-500">獎勵已可領取</p>
            </div>
          </div>

          {/* Rewards */}
          {(task.expReward > 0 || task.goldReward > 0) && (
            <div className="flex items-center justify-center gap-4 py-2 px-3 bg-gray-50 rounded-lg">
              {task.expReward > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-purple-600">+{task.expReward}</span>
                </div>
              )}
              {task.goldReward > 0 && (
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-600">+{task.goldReward}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Global task notification component
const TaskPopup = () => {
  const { currentTask, isShowingTask, dismissCurrentTask } = useNotificationStore();

  if (!isShowingTask || !currentTask) {
    return null;
  }

  return <TaskPopupContent task={currentTask.task} onClose={dismissCurrentTask} />;
};

export default TaskPopup;
