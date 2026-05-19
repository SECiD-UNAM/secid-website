// Notification types for SECiD platform

export type NotificationType =
  | 'message'
  | 'job_match'
  | 'event_reminder'
  | 'forum_reply'
  | 'mentorship_request'
  | 'mentorship_session'
  | 'system'
  | 'achievement'
  | 'connection_request';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationCategory =
  | 'social'
  | 'jobs'
  | 'events'
  | 'forum'
  | 'mentorship'
  | 'system'
  | 'marketing';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationGroup {
  id: string;
  type: NotificationType;
  count: number;
  notifications: Notification[];
  lastNotificationAt: Date;
}

export interface NotificationHistory {
  userId: string;
  notifications: Notification[];
  unreadCount: number;
  lastCheckedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    frequency: 'instant' | 'daily' | 'weekly';
    categories: NotificationCategory[];
  };
  push: {
    enabled: boolean;
    categories: NotificationCategory[];
  };
  inApp: {
    enabled: boolean;
    categories: NotificationCategory[];
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
    timezone: string;
  };
}
