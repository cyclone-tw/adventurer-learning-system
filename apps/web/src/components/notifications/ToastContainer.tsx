import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore, ToastNotification } from '../../stores/notificationStore';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLES = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-500',
    title: 'text-green-800',
    message: 'text-green-600',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    title: 'text-red-800',
    message: 'text-red-600',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
    title: 'text-yellow-800',
    message: 'text-yellow-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    title: 'text-blue-800',
    message: 'text-blue-600',
  },
};

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: () => void;
}

const ToastItem = ({ toast, onDismiss }: ToastItemProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = TOAST_ICONS[toast.type];
  const styles = TOAST_STYLES[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ${
        styles.bg
      } ${styles.border} ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
      <div className="flex-1 min-w-0">
        <h4 className={`font-medium ${styles.title}`}>{toast.title}</h4>
        {toast.message && (
          <p className={`text-sm mt-1 ${styles.message}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { notifications, removeNotification } = useNotificationStore();

  // Filter to only show toast notifications (not achievements)
  const toasts = notifications.filter(
    (n): n is ToastNotification => n.type !== 'achievement'
  );

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2 max-w-sm w-full">
      {toasts.slice(0, 5).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeNotification(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
