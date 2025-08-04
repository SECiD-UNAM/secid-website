import React from 'react';
import { 
import { useTranslations} from '../../hooks/useTranslations';
import { formatDistanceToNow} from 'date-fns';
import { es, enUS} from 'date-fns/locale';

  Briefcase, 
  Calendar, 
  MessageSquare, 
  Users, 
  GraduationCap, 
  MessageCircle,
  Trophy,
  Eye,
  Mail,
  AlertTriangle,
  Settings as SettingsIcon,
  Shield,
  CreditCard,
  CheckCircle,
  Clock,
  ExternalLink,
  Trash2,
  Star
} from 'lucide-react';
import type { Notification, NotificationType, NotificationPriority } from '../../types';

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: (notification: Notification) => void;
  showSelection: boolean;
  compact?: boolean;
}

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  job_match: Briefcase,
  job_application: Briefcase,
  job_expiring: Clock,
  event_reminder: Calendar,
  event_update: Calendar,
  event_cancelled: Calendar,
  message_received: MessageSquare,
  message_reply: MessageCircle,
  connection_request: Users,
  connection_accepted: Users,
  mentorship_request: GraduationCap,
  mentorship_accepted: GraduationCap,
  mentorship_session: GraduationCap,
  forum_mention: MessageCircle,
  forum_reply: MessageCircle,
  forum_topic_update: MessageCircle,
  badge_earned: Trophy,
  achievement_unlocked: Trophy,
  profile_view: Eye,
  newsletter: Mail,
  system_announcement: SettingsIcon,
  maintenance: SettingsIcon,
  security_alert: Shield,
  payment_reminder: CreditCard,
  membership_expiring: CreditCard,
  data_export_ready: SettingsIcon
};

const priorityColors: Record<NotificationPriority, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500'
};

const priorityBgColors: Record<NotificationPriority, string> = {
  low: 'bg-gray-100',
  normal: 'bg-blue-100',
  high: 'bg-orange-100',
  urgent: 'bg-red-100'
};

export default function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onClick,
  showSelection,
  compact = false
}: NotificationItemProps) {
  const { t, language } = useTranslations();
  
  const IconComponent = typeIcons[notification['type']];
  const priorityColor = priorityColors[notification.priority];
  const priorityBgColor = priorityBgColors[notification.priority];
  
  const locale = language === 'es' ? es : enUS;
  const timeAgo = formatDistanceToNow(new Date(notification['createdAt']), {
    addSuffix: true,
    locale
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (showSelection && e.shiftKey) {
      onSelect(notification.id);
    } else {
      onClick(notification);
    }
  };

  const handleSelectChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This would typically call a delete function
    // For now, we'll just prevent the event from bubbling
  };

  return (
    <div
      className={`relative p-3 hover:bg-gray-50 transition-colors cursor-pointer group ${
        !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      } ${compact ? 'py-2' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as any);
        }
      }}
    >
      <div className="flex items-start space-x-3">
        {/* Selection Checkbox */}
        {showSelection && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${priorityBgColor}`}>
          <IconComponent className={`w-5 h-5 ${priorityColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Title and Priority */}
              <div className="flex items-center space-x-2">
                <p className={`text-sm font-medium text-gray-900 truncate ${
                  !notification.isRead ? 'font-semibold' : ''
                }`}>
                  {notification.title}
                </p>
                
                {notification.priority === 'urgent' && (
                  <span className="flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </span>
                )}
                
                {notification.priority === 'high' && (
                  <span className="flex-shrink-0">
                    <Star className="w-4 h-4 text-orange-500" />
                  </span>
                )}
              </div>

              {/* Message */}
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification['message']}
              </p>

              {/* Tags and Metadata */}
              {!compact && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <span className={`w-2 h-2 rounded-full ${
                      notification.category === 'jobs' ? 'bg-green-500' :
                      notification.category === 'events' ? 'bg-blue-500' :
                      notification.category === 'messages' ? 'bg-purple-500' :
                      notification.category === 'connections' ? 'bg-pink-500' :
                      notification.category === 'mentorship' ? 'bg-indigo-500' :
                      notification.category === 'forum' ? 'bg-yellow-500' :
                      notification.category === 'achievements' ? 'bg-orange-500' :
                      notification.category === 'system' ? 'bg-gray-500' :
                      notification.category === 'security' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                    <span>{t(`notifications.category.${notification.category}`)}</span>
                  </span>
                  
                  <span>{timeAgo}</span>
                  
                  {notification.expiresAt && (
                    <span className="text-orange-600">
                      {t('notifications.expires')} {formatDistanceToNow(new Date(notification.expiresAt), { locale })}
                    </span>
                  )}
                </div>
              )}

              {/* Action Button */}
              {notification.actionText && notification.actionUrl && (
                <div className="mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = notification.actionUrl!;
                    }}
                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <span>{notification.actionText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Time and Actions */}
            <div className="flex items-center space-x-2 ml-2">
              {compact && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {timeAgo}
                </span>
              )}

              {/* Unread Indicator */}
              {!notification.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}

              {/* Quick Actions (shown on hover) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick(notification);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                    title={t('notifications.markAsRead')}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                  title={t('notifications.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {notification.imageUrl && !compact && (
            <div className="mt-2">
              <img
                src={notification.imageUrl}
                alt=""
                className="w-full h-32 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}

          {/* Delivery Status */}
          {notification.deliveryMethods.length > 1 && !compact && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs text-gray-500">{t('notifications.sentVia')}:</span>
              <div className="flex items-center space-x-1">
                {notification.deliveryMethods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                  >
                    {method === 'email' && <Mail className="w-3 h-3 mr-1" />}
                    {method === 'push' && <Settings className="w-3 h-3 mr-1" />}
                    {method === 'app' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {method === 'sms' && <MessageSquare className="w-3 h-3 mr-1" />}
                    {t(`notifications.delivery.${method}`)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group Indicator */}
      {notification.groupId && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
      )}

      {/* Scheduled Indicator */}
      {notification.scheduledFor && new Date(notification.scheduledFor) > new Date() && (
        <div className="absolute top-2 right-2">
          <Clock className="w-4 h-4 text-orange-500" />
        </div>
      )}
    </div>
  );
}