import { 
import { db} from '@/lib/firebase-config';
import { UserProfile} from '@/contexts/AuthContext';

/**
 * Admin Utilities
 * Shared utilities for admin dashboard components
 */

  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';

// Types
export interface AdminAction {
  id?: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'job' | 'event' | 'forum_post' | 'settings' | 'system';
  targetId?: string;
  description: string;
  metadata?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    email: boolean;
    storage: boolean;
    analytics: boolean;
    payments: boolean;
  };
  lastChecked: Date;
  uptime: number;
  responseTime: number;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalJobs: number;
  activeJobs: number;
  totalEvents: number;
  upcomingEvents: number;
  forumPosts: number;
  pendingReports: number;
  monthlyRevenue: number;
  systemHealth: SystemHealth;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

// Admin Permission Checks
export const AdminPermissions = {
  // User management permissions
  canViewUsers: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin' || userProfile?.role === 'moderator';
  },

  canEditUsers: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  canDeleteUsers: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  // Content moderation permissions
  canModerateContent: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin' || userProfile?.role === 'moderator';
  },

  canApproveJobs: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin' || userProfile?.role === 'moderator';
  },

  canApproveEvents: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin' || userProfile?.role === 'moderator';
  },

  // System administration permissions
  canViewAnalytics: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  canManageSettings: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  canManageBackups: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  canAssignRoles: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  // Financial permissions
  canViewRevenue: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  },

  canManagePayments: (userProfile: UserProfile | null): boolean => {
    return userProfile?.role === 'admin';
  }
};

// Activity Logging
export const ActivityLogger = {
  async logAction(action: Omit<AdminAction, 'id' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, 'admin_activity_log'), {
        ...action,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  },

  async logUserAction(
    adminProfile: UserProfile,
    action: string,
    targetUserId: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    await this.logAction({
      adminId: adminProfile.uid,
      adminEmail: adminProfile['email'],
      action,
      targetType: 'user',
      targetId: targetUserId,
      description,
      metadata
    });
  },

  async logSystemAction(
    adminProfile: UserProfile,
    action: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    await this.logAction({
      adminId: adminProfile.uid,
      adminEmail: adminProfile['email'],
      action,
      targetType: 'system',
      description,
      metadata
    });
  },

  async getRecentActivity(limit: number = 50): Promise<AdminAction[]> {
    try {
      const q = query(
        collection(db, 'admin_activity_log'),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot['docs'].map(doc => ({
        id: doc['id'],
        ...doc.data(),
        timestamp: doc['data']().timestamp.toDate()
      })) as AdminAction[];
    } catch (error) {
      console.error('Failed to fetch admin activity:', error);
      return [];
    }
  }
};

// Data Export Utilities
export const DataExporter = {
  convertToCSV(data: any[], headers?: string[]): string {
    if (data['length'] === 0) return '';
    
    const csvHeaders = headers || Object.keys(data?.[0]);
    const csvRows = data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Handle dates, objects, and null values
        if (value instanceof Date) {
          return value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        } else if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [csvHeaders.join(','), ...csvRows].join('\n');
  },

  downloadCSV(data: any[], filename: string, headers?: string[]): void {
    const csv = this.convertToCSV(data, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document['createElement']('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document['body'].appendChild(link);
      link.click();
      document['body'].removeChild(link);
    }
  },

  downloadJSON(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document['createElement']('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document['body'].appendChild(link);
      link.click();
      document['body'].removeChild(link);
    }
  }
};

// System Health Monitoring
export const SystemHealthChecker = {
  async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple read test
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },

  async checkSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    const checks = {
      database: await this.checkDatabaseHealth(),
      email: true, // Would implement actual email service check
      storage: true, // Would implement actual storage check
      analytics: true, // Would implement analytics service check
      payments: true // Would implement payment service check
    };

    const responseTime = Date.now() - startTime;
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'warning' | 'critical';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.8) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      checks,
      lastChecked: new Date(),
      uptime: 99.9, // Would calculate actual uptime
      responseTime
    };
  }
};

// Bulk Operations
export const BulkOperations = {
  async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<UserProfile>,
    adminProfile: UserProfile
  ): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: Timestamp.now()
        });

        // Log the action
        await ActivityLogger.logUserAction(
          adminProfile,
          'bulk_update',
          userId,
          `Bulk updated user: ${Object.keys(updates).join(', ')}`
        );

        success++;
      } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        errors++;
      }
    }

    return { success, errors };
  },

  async bulkDeleteUsers(
    userIds: string[],
    adminProfile: UserProfile
  ): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const userId of userIds) {
      try {
        await deleteDoc(doc(db, 'users', userId));

        // Log the action
        await ActivityLogger.logUserAction(
          adminProfile,
          'bulk_delete',
          userId,
          'User deleted via bulk operation'
        );

        success++;
      } catch (error) {
        console.error(`Failed to delete user ${userId}:`, error);
        errors++;
      }
    }

    return { success, errors };
  }
};

// Query Builders
export const QueryBuilder = {
  buildUserQuery(filters: {
    role?: string;
    isActive?: boolean;
    isVerified?: boolean;
    membershipTier?: string;
    graduationYear?: number;
    searchTerm?: string;
  }): QueryConstraint[] {
    const constraints: QueryConstraint[] = [];

    if (filters['role'] && filters['role'] !== 'all') {
      constraints.push(where('role', '==', filters['role']));
    }

    if (filters.isActive !== undefined) {
      constraints.push(where('isActive', '==', filters.isActive));
    }

    if (filters.isVerified !== undefined) {
      constraints.push(where('isVerified', '==', filters.isVerified));
    }

    if (filters.membershipTier && filters.membershipTier !== 'all') {
      constraints.push(where('membershipTier', '==', filters.membershipTier));
    }

    if (filters.graduationYear) {
      constraints.push(where('graduationYear', '==', filters.graduationYear));
    }

    // Note: Full-text search would require additional setup with Algolia or similar
    // For now, we'll rely on client-side filtering for search terms

    constraints.push(orderBy('createdAt', 'desc'));

    return constraints;
  }
};

// Validation Utilities
export const AdminValidation = {
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateSettings(settings: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate general settings
    if (!settings?.general?.siteName?.trim()) {
      errors.push('Site name is required');
    }

    if (!settings?.general?.supportEmail || !this.validateEmail(settings?.general?.supportEmail)) {
      errors.push('Valid support email is required');
    }

    // Validate email settings if enabled
    if (settings['email']?.emailEnabled) {
      if (!settings['email']?.smtpHost?.trim()) {
        errors.push('SMTP host is required when email is enabled');
      }
      if (!settings['email']?.smtpUser?.trim()) {
        errors.push('SMTP user is required when email is enabled');
      }
      if (!settings['email']?.fromEmail || !this.validateEmail(settings['email'].fromEmail)) {
        errors.push('Valid from email is required when email is enabled');
      }
    }

    // Validate payment settings if enabled
    if (settings?.payments?.paymentEnabled) {
      if (!settings?.payments?.stripePublishableKey?.trim()) {
        errors.push('Stripe publishable key is required when payments are enabled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Formatting Utilities
export const AdminFormatters = {
  formatCurrency(amount: number, currency = 'MXN', locale = 'es-MX'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  },

  formatNumber(num: number, locale = 'es-MX'): string {
    return new Intl.NumberFormat(locale).format(num);
  },

  formatPercentage(num: number, locale = 'es-MX'): string {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  },

  formatDate(date: Date, locale = 'es-MX', options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return new Intl.DateTimeFormat(locale, options || defaultOptions).format(date);
  },

  formatRelativeTime(date: Date, locale = 'es-MX'): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(diffInSeconds, 'second');
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (Math.abs(diffInMinutes) < 60) {
      return rtf.format(diffInMinutes, 'minute');
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (Math.abs(diffInHours) < 24) {
      return rtf.format(diffInHours, 'hour');
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (Math.abs(diffInDays) < 30) {
      return rtf.format(diffInDays, 'day');
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (Math.abs(diffInMonths) < 12) {
      return rtf.format(diffInMonths, 'month');
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return rtf.format(diffInYears, 'year');
  },

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100;
    
    return `${size} ${sizes[i]}`;
  }
};

// Email Templates
export const EmailTemplates = {
  generateUserSuspensionEmail(userName: string, reason: string, language: 'es' | 'en'): {
    subject: string;
    body: string;
  } {
    if (language === 'es') {
      return {
        subject: 'Cuenta Suspendida - SECiD',
        body: `
          Hola ${userName},
          
          Lamentamos informarte que tu cuenta ha sido suspendida por la siguiente razón:
          
          ${reason}
          
          Si crees que esto es un error, por favor contacta a nuestro equipo de soporte.
          
          Saludos,
          Equipo SECiD
        `
      };
    } else {
      return {
        subject: 'Account Suspended - SECiD',
        body: `
          Hello ${userName},
          
          We regret to inform you that your account has been suspended for the following reason:
          
          ${reason}
          
          If you believe this is an error, please contact our support team.
          
          Best regards,
          SECiD Team
        `
      };
    }
  },

  generateContentRejectionEmail(
    userName: string,
    contentType: string,
    title: string,
    reason: string,
    language: 'es' | 'en'
  ): { subject: string; body: string } {
    if (language === 'es') {
      return {
        subject: `Contenido Rechazado - ${contentType}`,
        body: `
          Hola ${userName},
          
          Tu ${contentType} "${title}" ha sido rechazado por la siguiente razón:
          
          ${reason}
          
          Puedes editar y volver a enviar tu contenido siguiendo nuestras pautas de la comunidad.
          
          Saludos,
          Equipo de Moderación SECiD
        `
      };
    } else {
      return {
        subject: `Content Rejected - ${contentType}`,
        body: `
          Hello ${userName},
          
          Your ${contentType} "${title}" has been rejected for the following reason:
          
          ${reason}
          
          You can edit and resubmit your content following our community guidelines.
          
          Best regards,
          SECiD Moderation Team
        `
      };
    }
  }
};

export default {
  AdminPermissions,
  ActivityLogger,
  DataExporter,
  SystemHealthChecker,
  BulkOperations,
  QueryBuilder,
  AdminValidation,
  AdminFormatters,
  EmailTemplates
};