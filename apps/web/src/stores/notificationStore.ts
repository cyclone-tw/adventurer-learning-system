import { create } from 'zustand';

// Achievement notification type
export interface AchievementNotification {
  id: string;
  type: 'achievement';
  achievement: {
    _id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    expReward: number;
    goldReward: number;
  };
  timestamp: number;
}

// Task completion notification type
export interface TaskNotification {
  id: string;
  type: 'task';
  task: {
    taskId: string;
    name: string;
    icon: string;
    expReward: number;
    goldReward: number;
  };
  timestamp: number;
}

// Generic toast notification type
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

export type Notification = AchievementNotification | TaskNotification | ToastNotification;

interface NotificationState {
  notifications: Notification[];
  achievementQueue: AchievementNotification[];
  currentAchievement: AchievementNotification | null;
  isShowingAchievement: boolean;
  taskQueue: TaskNotification[];
  currentTask: TaskNotification | null;
  isShowingTask: boolean;

  // Actions
  addAchievementNotification: (achievement: AchievementNotification['achievement']) => void;
  addTaskNotification: (task: TaskNotification['task']) => void;
  addToast: (toast: Omit<ToastNotification, 'id' | 'type' | 'timestamp'> & { type: ToastNotification['type'] }) => void;
  removeNotification: (id: string) => void;
  showNextAchievement: () => void;
  dismissCurrentAchievement: () => void;
  showNextTask: () => void;
  dismissCurrentTask: () => void;
  clearAllNotifications: () => void;
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  achievementQueue: [],
  currentAchievement: null,
  isShowingAchievement: false,
  taskQueue: [],
  currentTask: null,
  isShowingTask: false,

  addAchievementNotification: (achievement) => {
    const notification: AchievementNotification = {
      id: generateId(),
      type: 'achievement',
      achievement,
      timestamp: Date.now(),
    };

    set((state) => {
      // If not showing achievement, show immediately
      if (!state.isShowingAchievement) {
        return {
          currentAchievement: notification,
          isShowingAchievement: true,
          notifications: [...state.notifications, notification],
        };
      }
      // Otherwise, add to queue
      return {
        achievementQueue: [...state.achievementQueue, notification],
        notifications: [...state.notifications, notification],
      };
    });
  },

  addTaskNotification: (task) => {
    const notification: TaskNotification = {
      id: generateId(),
      type: 'task',
      task,
      timestamp: Date.now(),
    };

    set((state) => {
      // If not showing task, show immediately
      if (!state.isShowingTask) {
        return {
          currentTask: notification,
          isShowingTask: true,
          notifications: [...state.notifications, notification],
        };
      }
      // Otherwise, add to queue
      return {
        taskQueue: [...state.taskQueue, notification],
        notifications: [...state.notifications, notification],
      };
    });
  },

  addToast: (toast) => {
    const notification: ToastNotification = {
      id: generateId(),
      ...toast,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    // Auto-remove toast after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      get().removeNotification(notification.id);
    }, duration);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  showNextAchievement: () => {
    const { achievementQueue } = get();
    if (achievementQueue.length > 0) {
      const [next, ...rest] = achievementQueue;
      set({
        currentAchievement: next,
        achievementQueue: rest,
        isShowingAchievement: true,
      });
    } else {
      set({
        currentAchievement: null,
        isShowingAchievement: false,
      });
    }
  },

  dismissCurrentAchievement: () => {
    // Show next achievement after a short delay
    setTimeout(() => {
      get().showNextAchievement();
    }, 300);
  },

  showNextTask: () => {
    const { taskQueue } = get();
    if (taskQueue.length > 0) {
      const [next, ...rest] = taskQueue;
      set({
        currentTask: next,
        taskQueue: rest,
        isShowingTask: true,
      });
    } else {
      set({
        currentTask: null,
        isShowingTask: false,
      });
    }
  },

  dismissCurrentTask: () => {
    // Show next task after a short delay
    setTimeout(() => {
      get().showNextTask();
    }, 300);
  },

  clearAllNotifications: () => {
    set({
      notifications: [],
      achievementQueue: [],
      currentAchievement: null,
      isShowingAchievement: false,
      taskQueue: [],
      currentTask: null,
      isShowingTask: false,
    });
  },
}));
