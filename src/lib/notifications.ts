import { 
import { getFunctions, httpsCallable} from 'firebase/functions';
import { getMessaging, getToken, onMessage} from 'firebase/messaging';
import { db} from './firebase';

  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  writeBatch,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import type { 
  Notification, 
  NotificationSettings, 
  NotificationHistory, 
  NotificationGroup,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationDeliveryMethod,
  PushSubscription,
  NotificationQueue
} from '../types';

// Firebase Cloud Functions
const functions = getFunctions();
const sendNotificationFn = httpsCallable(functions, 'sendNotification');
const sendBulkNotificationsFn = httpsCallable(functions, 'sendBulkNotifications');
const scheduleNotificationFn = httpsCallable(functions, 'scheduleNotification');

// Firebase Cloud Messaging
let messaging: any = null;
try {
  messaging = getMessaging();
} catch (error) {
  console.warn('Firebase messaging not available:', error);
}

// Collections
const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_SETTINGS_COLLECTION = 'notificationSettings';
const PUSH_SUBSCRIPTIONS_COLLECTION = 'pushSubscriptions';
const NOTIFICATION_QUEUE_COLLECTION = 'notificationQueue';

// Default notification settings
const getDefaultNotificationSettings = (userId: string): NotificationSettings => ({
  id: '',
  userId,
  preferences: {
    job_match: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    job_application: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    job_expiring: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'daily'
    },
    event_reminder: {
      enabled: true,
      deliveryMethods: ['app', 'email', 'push'],
      frequency: 'immediate'
    },
    event_update: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    event_cancelled: {
      enabled: true,
      deliveryMethods: ['app', 'email', 'push'],
      frequency: 'immediate'
    },
    message_received: {
      enabled: true,
      deliveryMethods: ['app', 'push'],
      frequency: 'immediate'
    },
    message_reply: {
      enabled: true,
      deliveryMethods: ['app', 'push'],
      frequency: 'immediate'
    },
    connection_request: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    connection_accepted: {
      enabled: true,
      deliveryMethods: ['app'],
      frequency: 'immediate'
    },
    mentorship_request: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    mentorship_accepted: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    mentorship_session: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    forum_mention: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    forum_reply: {
      enabled: true,
      deliveryMethods: ['app'],
      frequency: 'immediate'
    },
    forum_topic_update: {
      enabled: false,
      deliveryMethods: ['app'],
      frequency: 'daily'
    },
    badge_earned: {
      enabled: true,
      deliveryMethods: ['app'],
      frequency: 'immediate'
    },
    achievement_unlocked: {
      enabled: true,
      deliveryMethods: ['app'],
      frequency: 'immediate'
    },
    profile_view: {
      enabled: false,
      deliveryMethods: ['app'],
      frequency: 'daily'
    },
    newsletter: {
      enabled: true,
      deliveryMethods: ['email'],
      frequency: 'weekly'
    },
    system_announcement: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    maintenance: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    security_alert: {
      enabled: true,
      deliveryMethods: ['app', 'email', 'push'],
      frequency: 'immediate'
    },
    payment_reminder: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    },
    membership_expiring: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'weekly'
    },
    data_export_ready: {
      enabled: true,
      deliveryMethods: ['app', 'email'],
      frequency: 'immediate'
    }
  },
  globalSettings: {
    doNotDisturb: false,
    soundEnabled: true,
    vibrationEnabled: true,
    showPreview: true,
    groupSimilar: true,
    maxDailyNotifications: 50
  },
  emailSettings: {
    digestEnabled: false,
    digestFrequency: 'daily',
    digestTime: '09:00',
    unsubscribeToken: generateUnsubscribeToken()
  },
  pushSettings: {
    browserEnabled: false,
    deviceTokens: []
  },
  updatedAt: new Date()
});

// Helper Functions
function generateUnsubscribeToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function convertFirestoreTimestamp(data: DocumentData): any {
  if (!data) return data;
  
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    } else if (converted[key] && typeof converted[key] === 'object') {
      converted[key] = convertFirestoreTimestamp(converted[key]);
    }
  });
  
  return converted;
}

// Notification CRUD Operations
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options: Partial<Notification> = {}
): Promise<string> {
  try {
    const notification: Omit<Notification, 'id'> = {
      userId,
      type,
      title,
      message,
      priority: options.priority || 'normal',
      category: options.category || getCategoryFromType(type),
      isRead: false,
      isClicked: false,
      deliveryMethods: options.deliveryMethods || ['app'],
      createdAt: new Date(),
      ...options
    };

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      createdAt: serverTimestamp()
    });

    // Trigger delivery through cloud function
    await sendNotificationFn({
      notificationId: docRef['id'],
      userId,
      notification
    });

    return docRef['id'];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    startAfter?: QueryDocumentSnapshot<DocumentData>;
    unreadOnly?: boolean;
    category?: NotificationCategory;
    priority?: NotificationPriority;
  } = {}
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  try {
    let q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (options.unreadOnly) {
      q = query(q, where('isRead', '==', false));
    }

    if (options.category) {
      q = query(q, where('category', '==', options.category));
    }

    if (options.priority) {
      q = query(q, where('priority', '==', options.priority));
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    if (options.startAfter) {
      q = query(q, startAfter(options.startAfter));
    }

    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc['id'],
      ...convertFirestoreTimestamp(doc['data']())
    })) as Notification[];

    // Get unread count
    const unreadQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    const unreadCount = unreadSnapshot.size;

    return { notifications, unreadCount };
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
}

export async function getNotificationHistory(
  userId: string,
  options: { page?: number; limit?: number } = {}
): Promise<NotificationHistory> {
  try {
    const pageSize = options.limit || 50;
    const pageNumber = options.page || 1;
    const offset = (pageNumber - 1) * pageSize;

    let q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // For pagination, we'd need to implement cursor-based pagination
    // This is a simplified version
    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc['id'],
      ...convertFirestoreTimestamp(doc['data']())
    })) as Notification[];

    // Get total count
    const totalQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const totalSnapshot = await getDocs(totalQuery);
    const totalCount = totalSnapshot.size;

    // Get unread count
    const unreadQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const unreadSnapshot = await getDocs(unreadQuery);
    const unreadCount = unreadSnapshot.size;

    return {
      id: `${userId}-history-${pageNumber}`,
      userId,
      notifications,
      totalCount,
      unreadCount,
      page: pageNumber,
      limit: pageSize,
      hasMore: notifications.length === pageSize && (pageNumber * pageSize) < totalCount,
      lastFetched: new Date()
    };
  } catch (error) {
    console.error('Error getting notification history:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: serverTimestamp()
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Notification Settings
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const settingsRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, userId);
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      return {
        id: settingsSnap['id'],
        ...convertFirestoreTimestamp(settingsSnap.data())
      } as NotificationSettings;
    } else {
      // Create default settings
      const defaultSettings = getDefaultNotificationSettings(userId);
      await updateDoc(settingsRef, {
        ...defaultSettings,
        updatedAt: serverTimestamp()
      });
      return { ...defaultSettings, id: userId };
    }
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
}

export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const settingsRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, userId);
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

// Push Notifications
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!messaging || !('Notification' in window)) {
    throw new Error('Push notifications not supported');
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.FIREBASE_VAPID_KEY as string
      });
      
      // Store token in Firestore
      if(token) {
        await storePushToken(token);
      }
    }
    
    return permission;
  } catch (error) {
    console.error('Error requesting push permission:', error);
    throw error;
  }
}

export async function storePushToken(token: string, userId?: string): Promise<void> {
  if (!userId) {
    // Get from auth context or current user
    return;
  }

  try {
    const subscription: Omit<PushSubscription, 'id'> = {
      userId,
      endpoint: token,
      keys: {
        p256dh: '',
        auth: ''
      },
      userAgent: navigator.userAgent,
      isActive: true,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    await addDoc(collection(db, PUSH_SUBSCRIPTIONS_COLLECTION), {
      ...subscription,
      createdAt: serverTimestamp(),
      lastUsed: serverTimestamp()
    });
  } catch (error) {
    console.error('Error storing push token:', error);
    throw error;
  }
}

export function setupPushListener(onNotification: (notification: any) => void): () => void {
  if (!messaging) {
    return () => {};
  }

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      onNotification(payload);
      
      // Show browser notification if page is not focused
      if (document['hidden'] && payload.notification) {
        new Notification(payload.notification.title || '', {
          body: payload.notification.body,
          icon: payload.notification.icon || '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: payload['data']?.notificationId || 'secid-notification',
          requireInteraction: payload['data']?.priority === 'urgent',
          silent: payload['data']?.silent === 'true'
        });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up push listener:', error);
    return () => {};
  }
}

// Real-time Notifications
export function subscribeToNotifications(
  userId: string,
  onNotification: (notifications: Notification[]) => void,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Unsubscribe {
  try {
    let q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    if (options.unreadOnly) {
      q = query(q, where('isRead', '==', false));
    }

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc['id'],
        ...convertFirestoreTimestamp(doc['data']())
      })) as Notification[];

      onNotification(notifications);
    }, (error) => {
      console.error('Error in notification subscription:', error);
    });
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return () => {};
  }
}

// Bulk Operations
export async function sendBulkNotifications(
  notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }>
): Promise<void> {
  try {
    await sendBulkNotificationsFn({ notifications });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    throw error;
  }
}

// Scheduled Notifications
export async function scheduleNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  scheduledFor: Date,
  options: Partial<Notification> = {}
): Promise<string> {
  try {
    const result = await scheduleNotificationFn({
      userId,
      type,
      title,
      message,
      scheduledFor: scheduledFor.toISOString(),
      options
    });

    return result?.data?.notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

// Utility Functions
function getCategoryFromType(type: NotificationType): NotificationCategory {
  const categoryMap: Record<string, NotificationCategory> = {
    job_: 'jobs',
    event_: 'events',
    message_: 'messages',
    connection_: 'connections',
    mentorship_: 'mentorship',
    forum_: 'forum',
    badge_: 'achievements',
    achievement_: 'achievements',
    profile_: 'system',
    newsletter: 'system',
    system_: 'system',
    maintenance: 'system',
    security_: 'security',
    payment_: 'billing',
    membership_: 'billing',
    data_: 'system'
  };

  const prefix = Object.keys(categoryMap).find(prefix => type.startsWith(prefix));
  return prefix ? categoryMap[prefix] : 'system';
}

// Notification Templates
export function getNotificationTemplate(
  type: NotificationType,
  data: Record<string, any> = {}
): { title: string; message: string; category: NotificationCategory; priority: NotificationPriority } {
  const templates = {
    job_match: {
      title: `New job match: ${data['jobTitle'] || 'Job'}`,
      message: `A new job at ${data['company'] || 'Company'} matches your profile and preferences.`,
      category: 'jobs' as NotificationCategory,
      priority: 'normal' as NotificationPriority
    },
    event_reminder: {
      title: `Event reminder: ${data['eventTitle'] || 'Event'}`,
      message: `Your event "${data['eventTitle'] || 'Event'}" starts ${data['timeUntil'] || 'soon'}.`,
      category: 'events' as NotificationCategory,
      priority: 'high' as NotificationPriority
    },
    mentorship_request: {
      title: 'New mentorship request',
      message: `${data['menteeName'] || 'Someone'} has requested you as their mentor.`,
      category: 'mentorship' as NotificationCategory,
      priority: 'normal' as NotificationPriority
    },
    // Add more templates as needed
  };

  return templates[type] || {
    title: 'New notification',
    message: 'You have a new notification.',
    category: 'system',
    priority: 'normal'
  };
}

// Analytics
export async function trackNotificationInteraction(
  notificationId: string,
  action: 'view' | 'click' | 'dismiss'
): Promise<void> {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    
    if (action === 'click') {
      await updateDoc(notificationRef, {
        isClicked: true,
        clickedAt: serverTimestamp()
      });
    }
    
    // You could also send analytics events here
    // analytics.track('notification_interaction', { notificationId, action });
  } catch (error) {
    console.error('Error tracking notification interaction:', error);
  }
}