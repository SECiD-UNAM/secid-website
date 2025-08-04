import { 
import { 
import { db, storage} from './firebase';

  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import type { 
  DataExportRequest, 
  DataExportSettings, 
  ExportableData,
  User,
  JobApplicationForm,
  EventRegistration,
  ForumTopic,
  ForumPost,
  ForumVote,
  UserReputation,
  CourseEnrollment,
  CourseProgress,
  Certificate,
  QuizAttempt,
  Conversation,
  Message,
  Notification
} from '../types';

// Collection references
const exportRequestsRef = collection(db, 'dataExportRequests');
const exportSettingsRef = collection(db, 'dataExportSettings');

// Export request functions
export const createExportRequest = async (
  userId: string,
  type: DataExportRequest['type'],
  format: DataExportRequest['format'],
  filters?: Record<string, any>
): Promise<DataExportRequest> => {
  try {
    const requestData = {
      userId,
      type,
      format,
      filters: filters || {},
      status: 'pending' as const,
      progress: 0,
      requestedAt: serverTimestamp()
    };

    const docRef = await addDoc(exportRequestsRef, requestData);

    // Start export processing in background
    processExportRequest(docRef['id'], requestData);

    return {
      id: docRef['id'],
      ...requestData,
      requestedAt: new Date()
    } as DataExportRequest;
  } catch (error) {
    console.error('Error creating export request:', error);
    throw new Error('Failed to create export request');
  }
};

export const getExportRequests = async (userId: string): Promise<DataExportRequest[]> => {
  try {
    const requestsQuery = query(
      exportRequestsRef,
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );

    const snapshot = await getDocs(requestsQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      requestedAt: doc['data']().requestedAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
      expiresAt: doc['data']().expiresAt?.toDate()
    })) as DataExportRequest[];
  } catch (error) {
    console.error('Error getting export requests:', error);
    throw new Error('Failed to get export requests');
  }
};

export const getExportRequest = async (requestId: string): Promise<DataExportRequest | null> => {
  try {
    const requestDoc = await getDoc(doc(exportRequestsRef, requestId));
    
    if (!requestDoc.exists()) {
      return null;
    }

    return {
      id: requestDoc['id'],
      ...requestDoc.data(),
      requestedAt: requestDoc['data']().requestedAt?.toDate() || new Date(),
      completedAt: requestDoc.data().completedAt?.toDate(),
      expiresAt: requestDoc['data']().expiresAt?.toDate()
    } as DataExportRequest;
  } catch (error) {
    console.error('Error getting export request:', error);
    throw new Error('Failed to get export request');
  }
};

// Export settings functions
export const getExportSettings = async (userId: string): Promise<DataExportSettings | null> => {
  try {
    const settingsQuery = query(
      exportSettingsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(settingsQuery);
    
    if (snapshot['empty']) {
      return await createDefaultExportSettings(userId);
    }

    const doc = snapshot['docs'][0];
    return {
      userId,
      ...doc.data(),
      autoExport: {
        ...doc['data']().autoExport,
        lastExport: doc.data().autoExport?.lastExport?.toDate(),
        nextExport: doc['data']().autoExport?.nextExport?.toDate()
      },
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as DataExportSettings;
  } catch (error) {
    console.error('Error getting export settings:', error);
    throw new Error('Failed to get export settings');
  }
};

export const updateExportSettings = async (
  userId: string,
  updates: Partial<DataExportSettings>
): Promise<DataExportSettings> => {
  try {
    const settingsQuery = query(
      exportSettingsRef,
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(settingsQuery);
    
    if (snapshot['empty']) {
      throw new Error('Export settings not found');
    }

    const settingsDoc = snapshot['docs'][0];
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // Convert dates to Timestamps for Firebase
    if (updates.autoExport) {
      updateData.autoExport = {
        ...updates.autoExport,
        lastExport: updates.autoExport.lastExport ? serverTimestamp() : null,
        nextExport: updates.autoExport.nextExport ? serverTimestamp() : null
      };
    }

    await updateDoc(settingsDoc.ref, updateData);

    return {
      userId,
      ...settingsDoc['data'](),
      ...updates,
      updatedAt: new Date()
    } as DataExportSettings;
  } catch (error) {
    console.error('Error updating export settings:', error);
    throw new Error('Failed to update export settings');
  }
};

// Data collection functions
const collectUserData = async (userId: string): Promise<ExportableData['userData']> => {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    const profile = userDoc.exists() ? userDoc.data() as User : null;

    // Get user preferences
    const preferencesDoc = await getDoc(doc(db, 'userPreferences', userId));
    const preferences = preferencesDoc.exists() ? preferencesDoc.data() : {};

    // Get subscriptions
    const subscriptionsQuery = query(
      collection(db, 'userSubscriptions'),
      where('userId', '==', userId)
    );
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    const subscriptions = subscriptionsSnapshot.docs.map(doc => doc.data());

    // Get payment methods
    const paymentMethodsQuery = query(
      collection(db, 'paymentMethods'),
      where('userId', '==', userId)
    );
    const paymentMethodsSnapshot = await getDocs(paymentMethodsQuery);
    const paymentMethods = paymentMethodsSnapshot.docs.map(doc => doc.data());

    return {
      profile: profile!,
      preferences,
      subscriptions: subscriptions as any[],
      paymentMethods: paymentMethods as any[]
    };
  } catch (error) {
    console.error('Error collecting user data:', error);
    throw error;
  }
};

const collectJobApplications = async (userId: string): Promise<JobApplicationForm[]> => {
  try {
    const applicationsQuery = query(
      collection(db, 'jobApplications'),
      where('applicantUserId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(applicationsQuery);
    return snapshot['docs'].map(doc => ({
      ...doc['data'](),
      timestamp: doc['data']().timestamp?.toDate() || new Date()
    })) as JobApplicationForm[];
  } catch (error) {
    console.error('Error collecting job applications:', error);
    throw error;
  }
};

const collectEventRegistrations = async (userId: string): Promise<EventRegistration[]> => {
  try {
    const registrationsQuery = query(
      collection(db, 'eventRegistrations'),
      where('userId', '==', userId),
      orderBy('registeredAt', 'desc')
    );

    const snapshot = await getDocs(registrationsQuery);
    return snapshot['docs'].map(doc => ({
      ...doc['data'](),
      eventDate: doc['data']().eventDate?.toDate() || new Date(),
      registeredAt: doc['data']().registeredAt?.toDate() || new Date()
    })) as EventRegistration[];
  } catch (error) {
    console.error('Error collecting event registrations:', error);
    throw error;
  }
};

const collectForumActivity = async (userId: string): Promise<ExportableData['forumActivity']> => {
  try {
    // Get user's forum topics
    const topicsQuery = query(
      collection(db, 'forumTopics'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const topicsSnapshot = await getDocs(topicsQuery);
    const topics = topicsSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as ForumTopic[];

    // Get user's forum posts
    const postsQuery = query(
      collection(db, 'forumPosts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const postsSnapshot = await getDocs(postsQuery);
    const posts = postsSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as ForumPost[];

    // Get user's votes
    const votesQuery = query(
      collection(db, 'forumVotes'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const votesSnapshot = await getDocs(votesQuery);
    const votes = votesSnapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date()
    })) as ForumVote[];

    // Get user reputation
    const reputationDoc = await getDoc(doc(db, 'userReputation', userId));
    const reputation = reputationDoc.exists() ? {
      ...reputationDoc.data(),
      updatedAt: reputationDoc['data']().updatedAt?.toDate() || new Date()
    } as UserReputation : null;

    return {
      topics,
      posts,
      votes,
      reputation: reputation!
    };
  } catch (error) {
    console.error('Error collecting forum activity:', error);
    throw error;
  }
};

const collectLearningActivity = async (userId: string): Promise<ExportableData['learningActivity']> => {
  try {
    // Get course enrollments
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', userId),
      orderBy('enrolledAt', 'desc')
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    const enrollments = enrollmentsSnapshot.docs.map(doc => ({
      ...doc.data(),
      enrolledAt: doc['data']().enrolledAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
      lastAccessedAt: doc['data']().lastAccessedAt?.toDate() || new Date()
    })) as CourseEnrollment[];

    // Get course progress
    const progress = enrollments.map(enrollment => enrollment.progress);

    // Get certificates
    const certificatesQuery = query(
      collection(db, 'certificates'),
      where('userId', '==', userId),
      orderBy('issuedAt', 'desc')
    );
    const certificatesSnapshot = await getDocs(certificatesQuery);
    const certificates = certificatesSnapshot.docs.map(doc => ({
      ...doc.data(),
      issuedAt: doc['data']().issuedAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as Certificate[];

    // Get quiz attempts
    const quizAttemptsQuery = query(
      collection(db, 'quizAttempts'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );
    const quizAttemptsSnapshot = await getDocs(quizAttemptsQuery);
    const quizAttempts = quizAttemptsSnapshot.docs.map(doc => ({
      ...doc.data(),
      completedAt: doc['data']().completedAt?.toDate() || new Date()
    })) as QuizAttempt[];

    return {
      enrollments,
      progress,
      certificates,
      quizAttempts
    };
  } catch (error) {
    console.error('Error collecting learning activity:', error);
    throw error;
  }
};

const collectMessages = async (userId: string): Promise<ExportableData['messages']> => {
  try {
    // Get user's conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastActivity', 'desc')
    );
    const conversationsSnapshot = await getDocs(conversationsQuery);
    const conversations = conversationsSnapshot.docs.map(doc => ({
      ...doc.data(),
      lastActivity: doc['data']().lastActivity?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc['data']().updatedAt?.toDate() || new Date()
    })) as Conversation[];

    // Get all messages from user's conversations
    const conversationIds = conversations.map(conv => conv['id']);
    const allMessages: Message[] = [];

    for (const conversationId of conversationIds) {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc['data']().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Message[];
      
      allMessages.push(...messages);
    }

    return {
      conversations,
      messages: allMessages
    };
  } catch (error) {
    console.error('Error collecting messages:', error);
    throw error;
  }
};

const collectNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot['docs'].map(doc => ({
      ...doc['data'](),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      readAt: doc['data']().readAt?.toDate(),
      clickedAt: doc.data().clickedAt?.toDate(),
      expiresAt: doc['data']().expiresAt?.toDate()
    })) as Notification[];
  } catch (error) {
    console.error('Error collecting notifications:', error);
    throw error;
  }
};

// Export processing function
const processExportRequest = async (requestId: string, requestData: any): Promise<void> => {
  try {
    const requestDocRef = doc(exportRequestsRef, requestId);
    
    // Update status to processing
    await updateDoc(requestDocRef, {
      status: 'processing',
      progress: 10,
      updatedAt: serverTimestamp()
    });

    let exportData: any;

    // Collect data based on export type
    switch (requestData['type']) {
      case 'user_data':
        exportData = await collectUserData(requestData['userId']);
        break;
      case 'job_applications':
        exportData = await collectJobApplications(requestData['userId']);
        break;
      case 'event_registrations':
        exportData = await collectEventRegistrations(requestData['userId']);
        break;
      case 'forum_posts':
        exportData = await collectForumActivity(requestData['userId']);
        break;
      case 'certificates':
        const learningData = await collectLearningActivity(requestData['userId']);
        exportData = learningData.certificates;
        break;
      case 'learning_progress':
        exportData = await collectLearningActivity(requestData['userId']);
        break;
      default:
        // Full export
        exportData = await collectAllUserData(requestData['userId']);
    }

    // Update progress
    await updateDoc(requestDocRef, {
      progress: 50,
      updatedAt: serverTimestamp()
    });

    // Generate file based on format
    let fileContent: string | Blob;
    let fileName: string;
    let contentType: string;

    switch (requestData.format) {
      case 'json':
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `secid-export-${requestData['type']}-${Date.now()}.json`;
        contentType = 'application/json';
        break;
      case 'csv':
        fileContent = convertToCSV(exportData, requestData['type']);
        fileName = `secid-export-${requestData['type']}-${Date.now()}.csv`;
        contentType = 'text/csv';
        break;
      case 'pdf':
        fileContent = await generatePDF(exportData, requestData['type']);
        fileName = `secid-export-${requestData['type']}-${Date.now()}.pdf`;
        contentType = 'application/pdf';
        break;
      default:
        throw new Error('Unsupported format');
    }

    // Update progress
    await updateDoc(requestDocRef, {
      progress: 80,
      updatedAt: serverTimestamp()
    });

    // Upload file to storage
    const fileRef = ref(storage, `data-exports/${requestData['userId']}/${fileName}`);
    const fileBlob = typeof fileContent === 'string' 
      ? new Blob([fileContent], { type: contentType })
      : fileContent;
    
    await uploadBytes(fileRef, fileBlob);
    const downloadUrl = await getDownloadURL(fileRef);

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update request as completed
    await updateDoc(requestDocRef, {
      status: 'completed',
      progress: 100,
      downloadUrl,
      fileSize: fileBlob.size,
      expiresAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

  } catch (error) {
    console.error('Error processing export request:', error);
    
    // Update request as failed
    await updateDoc(doc(exportRequestsRef, requestId), {
      status: 'failed',
      errorMessage: error instanceof Error ? error['message'] : 'Unknown error',
      updatedAt: serverTimestamp()
    });
  }
};

const collectAllUserData = async (userId: string): Promise<ExportableData> => {
  try {
    const [
      userData,
      jobApplications,
      eventRegistrations,
      forumActivity,
      learningActivity,
      messages,
      notifications
    ] = await Promise.all([
      collectUserData(userId),
      collectJobApplications(userId),
      collectEventRegistrations(userId),
      collectForumActivity(userId),
      collectLearningActivity(userId),
      collectMessages(userId),
      collectNotifications(userId)
    ]);

    return {
      userData,
      jobApplications,
      eventRegistrations,
      forumActivity,
      learningActivity,
      messages,
      notifications,
      analyticsData: {
        sessionData: [], // Would be collected from analytics service
        interactionEvents: []
      }
    };
  } catch (error) {
    console.error('Error collecting all user data:', error);
    throw error;
  }
};

// Utility functions
const convertToCSV = (data: any, type: string): string => {
  try {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return 'No data available';
    }

    // Handle different data types
    if (!Array.isArray(data)) {
      // Convert object to array
      if (type === 'user_data') {
        const flatData = flattenObject(data);
        const headers = Object.keys(flatData);
        const values = Object.values(flatData);
        return [headers['join'](','), values.join(',')].join('\n');
      }
      data = [data];
    }

    // Get headers from first object
    const headers = Object.keys(flattenObject(data?.[0]));
    
    // Create CSV content
    const csvContent = [
      headers['join'](','),
      ...data.map(item => {
        const flatItem = flattenObject(item);
        return headers['map'](header => {
          const value = flatItem[header];
          // Escape commas and quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',');
      })
    ].join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error converting to CSV:', error);
    return 'Error converting data to CSV';
  }
};

const flattenObject = (obj: any, prefix: string = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] === null || obj[key] === undefined) {
        flattened[newKey] = '';
      } else if (obj[key] instanceof Date) {
        flattened[newKey] = obj[key].toISOString();
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else if (Array.isArray(obj[key])) {
        flattened[newKey] = obj[key].join('; ');
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
};

const generatePDF = async (data: any, type: string): Promise<Blob> => {
  // This would use a PDF generation library like jsPDF or PDFKit
  // For now, return a simple text-based PDF
  try {
    const content = JSON.stringify(data, null, 2);
    return new Blob([content], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

const createDefaultExportSettings = async (userId: string): Promise<DataExportSettings> => {
  try {
    const defaultSettings: Omit<DataExportSettings, 'userId'> = {
      autoExport: {
        enabled: false,
        frequency: 'monthly',
        types: [],
        format: 'json',
        lastExport: undefined,
        nextExport: undefined
      },
      retentionDays: 30,
      encryptionEnabled: true,
      notificationEmail: '',
      updatedAt: new Date()
    };

    const settingsData = {
      userId,
      ...defaultSettings,
      updatedAt: serverTimestamp()
    };

    await addDoc(exportSettingsRef, settingsData);

    return {
      userId,
      ...defaultSettings
    };
  } catch (error) {
    console.error('Error creating default export settings:', error);
    throw new Error('Failed to create default export settings');
  }
};

// Bulk export function
export const createBulkExport = async (
  userId: string,
  types: DataExportRequest['type'][],
  format: DataExportRequest['format']
): Promise<DataExportRequest[]> => {
  try {
    const requests = await Promise.all(
      types.map(type => createExportRequest(userId, type, format))
    );
    
    return requests;
  } catch (error) {
    console.error('Error creating bulk export:', error);
    throw new Error('Failed to create bulk export');
  }
};

// Scheduled export function (would be called by a cron job)
export const processScheduledExports = async (): Promise<void> => {
  try {
    const now = new Date();
    
    // Get all users with auto-export enabled
    const settingsQuery = query(
      exportSettingsRef,
      where('autoExport.enabled', '==', true),
      where('autoExport.nextExport', '<=', now)
    );

    const snapshot = await getDocs(settingsQuery);
    
    for (const settingsDoc of snapshot['docs']) {
      const settings = settingsDoc['data']() as DataExportSettings;
      
      try {
        // Create export requests for each enabled type
        for (const type of settings?.autoExport?.types) {
          await createExportRequest(
            settings['userId'],
            type as DataExportRequest['type'],
            settings?.autoExport?.format
          );
        }

        // Update next export date
        const nextExport = new Date();
        switch (settings?.autoExport?.frequency) {
          case 'weekly':
            nextExport.setDate(nextExport.getDate() + 7);
            break;
          case 'monthly':
            nextExport.setMonth(nextExport.getMonth() + 1);
            break;
          case 'quarterly':
            nextExport.setMonth(nextExport.getMonth() + 3);
            break;
        }

        await updateDoc(settingsDoc.ref, {
          'autoExport.lastExport': serverTimestamp(),
          'autoExport.nextExport': nextExport,
          updatedAt: serverTimestamp()
        });

      } catch (error) {
        console.error(`Error processing scheduled export for user ${settings['userId']}:`, error);
      }
    }
  } catch (error) {
    console.error('Error processing scheduled exports:', error);
  }
};

// Cleanup expired exports (would be called by a cron job)
export const cleanupExpiredExports = async (): Promise<void> => {
  try {
    const now = new Date();
    
    const expiredQuery = query(
      exportRequestsRef,
      where('status', '==', 'completed'),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(expiredQuery);
    
    for (const requestDoc of snapshot['docs']) {
      const requestData = requestDoc['data']();
      
      try {
        // Delete file from storage
        if (requestData.downloadUrl) {
          const fileRef = ref(storage, requestData.downloadUrl);
          // Note: deleteObject would be called here in real implementation
        }

        // Update request status
        await updateDoc(requestDoc.ref, {
          status: 'expired',
          downloadUrl: null,
          updatedAt: serverTimestamp()
        });

      } catch (error) {
        console.error(`Error cleaning up expired export ${requestDoc['id']}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired exports:', error);
  }
};