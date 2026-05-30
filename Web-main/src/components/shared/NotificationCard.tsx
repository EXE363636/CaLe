import {
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  DollarSign,
  AlertTriangle,
  Star,
  Bell,
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';
import { cn } from '../../utils/helpers';
import type { Notification, NotificationType } from '../../types';

interface NotificationCardProps {
  notification: Notification;
  onMarkRead?: () => void;
  onClick?: () => void;
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  new_application: <Briefcase className="w-5 h-5 text-info-500" />,
  application_approved: <CheckCircle className="w-5 h-5 text-success-500" />,
  application_rejected: <XCircle className="w-5 h-5 text-danger-500" />,
  shift_starting_soon: <Clock className="w-5 h-5 text-warning-500" />,
  shift_started: <Clock className="w-5 h-5 text-primary-500" />,
  shift_ended: <Clock className="w-5 h-5 text-gray-500" />,
  worker_checked_in: <CheckCircle className="w-5 h-5 text-success-500" />,
  worker_checked_out: <CheckCircle className="w-5 h-5 text-success-500" />,
  employer_confirmed: <CheckCircle className="w-5 h-5 text-success-500" />,
  deposit_success: <DollarSign className="w-5 h-5 text-success-500" />,
  deposit_refund: <DollarSign className="w-5 h-5 text-primary-500" />,
  wallet_topup: <DollarSign className="w-5 h-5 text-success-500" />,
  wallet_withdraw: <DollarSign className="w-5 h-5 text-info-500" />,
  new_dispute: <AlertTriangle className="w-5 h-5 text-danger-500" />,
  new_review: <Star className="w-5 h-5 text-warning-500" />,
  shift_reminder: <Bell className="w-5 h-5 text-primary-500" />,
};

export function NotificationCard({ notification, onMarkRead, onClick }: NotificationCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors',
        notification.read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-primary-50 hover:bg-primary-100'
      )}
    >
      <div className="p-2 rounded-lg bg-white shadow-sm">
        {notificationIcons[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'font-medium',
            notification.read ? 'text-gray-900' : 'text-gray-900'
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.body}</p>
        <p className="text-xs text-gray-400 mt-1">{notification.timestamp.split('.')[0]}</p>
      </div>
    </div>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

export function NotificationList({ notifications, onMarkRead, onClick }: NotificationListProps) {
  return (
    <div className="space-y-2">
      {notifications.map(notif => (
        <NotificationCard
          key={notif.id}
          notification={notif}
          onMarkRead={() => onMarkRead?.(notif.id)}
          onClick={() => onClick?.(notif)}
        />
      ))}
    </div>
  );
}
