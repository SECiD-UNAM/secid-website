import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  MessageSquare,
  Briefcase,
  Calendar,
  User,
  Clock,
  Search,
  Ban
} from 'lucide-react';

interface ModerationItem {
  id: string;
  type: 'job' | 'event' | 'forum_post' | 'forum_reply' | 'user_report';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  title: string;
  content: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  createdAt: Date;
  submittedAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
  moderatorId?: string;
  reason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportCount?: number;
  reportReasons?: string[];
  metadata?: any;
}

interface Report {
  id: string;
  reportedItemId: string;
  reportedItemType: 'job' | 'event' | 'forum_post' | 'forum_reply' | 'user';
  reporterId: string;
  reporterEmail: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  action?: string;
}

interface ContentStats {
  pendingItems: number;
  approvedToday: number;
  rejectedToday: number;
  pendingReports: number;
  flaggedUsers: number;
  averageReviewTime: number;
}

export const ContentModeration: React.FC = () => {
  const { userProfile, isAdmin, isModerator } = useAuth();
  const { language } = useTranslations();
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    pendingItems: 0,
    approvedToday: 0,
    rejectedToday: 0,
    pendingReports: 0,
    flaggedUsers: 0,
    averageReviewTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'reports'>('content');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'pending',
    priority: 'all',
    search: ''
  });

  const canModerate = isAdmin || isModerator;

  useEffect(() => {
    if (!canModerate) {
      setError('Unauthorized access. Moderator privileges required.');
      setLoading(false);
      return;
    }

    // Subscribe to moderation queue
    const moderationQuery = query(
      collection(db, 'moderation_queue'),
      where('status', '==', filters['status'] === 'all' ? 'pending' : filters['status']),
      orderBy('priority', 'desc'),
      orderBy('submittedAt', 'asc'),
      limit(50)
    );

    const unsubscribeModerationItems = onSnapshot(moderationQuery, (snapshot) => {
      const items: ModerationItem[] = [];
      snapshot['forEach']((doc) => {
        const data = doc['data']();
        items.push({
          id: doc['id'],
          type: data['type'],
          status: data['status'],
          title: data['title'],
          content: data['content'],
          authorId: data['authorId'],
          authorEmail: data['authorEmail'],
          authorName: data['authorName'],
          createdAt: data['createdAt']?.toDate() || new Date(),
          submittedAt: data['submittedAt']?.toDate() || new Date(),
          moderatedAt: data?.['moderatedAt']?.toDate(),
          moderatedBy: data['moderatedBy'],
          moderatorId: data['moderatorId'],
          reason: data['reason'],
          priority: data['priority'],
          reportCount: data['reportCount'] || 0,
          reportReasons: data['reportReasons'] || [],
          metadata: data['metadata']
        });
      });
      setModerationItems(items);
    });

    // Subscribe to reports
    const reportsQuery = query(
      collection(db, 'reports'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsList: Report[] = [];
      snapshot['forEach']((doc) => {
        const data = doc['data']();
        reportsList.push({
          id: doc['id'],
          reportedItemId: data['reportedItemId'],
          reportedItemType: data['reportedItemType'],
          reporterId: data['reporterId'],
          reporterEmail: data['reporterEmail'],
          reason: data['reason'],
          description: data['description'],
          status: data['status'],
          createdAt: data['createdAt']?.toDate() || new Date(),
          reviewedAt: data['reviewedAt']?.toDate(),
          reviewedBy: data['reviewedBy'],
          action: data['action']
        });
      });
      setReports(reportsList);
    });

    // Load stats
    loadStats();
    setLoading(false);

    return () => {
      unsubscribeModerationItems();
      unsubscribeReports();
    };
  }, [canModerate, filters]);

  const loadStats = async () => {
    try {
      // Calculate today's start
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats: ContentStats = {
        pendingItems: moderationItems.filter(item => item['status'] === 'pending').length,
        approvedToday: moderationItems.filter(item => 
          item['status'] === 'approved' && 
          item.moderatedAt && 
          item.moderatedAt >= today
        ).length,
        rejectedToday: moderationItems.filter(item => 
          item['status'] === 'rejected' && 
          item.moderatedAt && 
          item.moderatedAt >= today
        ).length,
        pendingReports: reports.filter(report => report['status'] === 'pending').length,
        flaggedUsers: 0, // This would require additional query
        averageReviewTime: 2.5 // Mock data - calculate from actual review times
      };

      setStats(stats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleModerationAction = async (action: 'approve' | 'reject' | 'flag', itemId: string, reason?: string) => {
    try {
      const moderationRef = doc(db, 'moderation_queue', itemId);
      const item = moderationItems.find(item => item['id'] === itemId);
      
      if (!item) return;

      // Update moderation item
      await updateDoc(moderationRef, {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
        moderatedAt: Timestamp.now(),
        moderatedBy: userProfile?.email,
        moderatorId: userProfile?.uid,
        reason: reason || ''
      });

      // Apply action to original content
      if (action === 'approve') {
        await approveContent(item);
      } else if (action === 'reject') {
        await rejectContent(item, reason);
      } else if (action === 'flag') {
        await flagContent(item, reason);
      }

      // Log moderation action
      await addDoc(collection(db, 'moderation_logs'), {
        itemId,
        itemType: item['type'],
        action,
        moderatorId: userProfile?.uid,
        moderatorEmail: userProfile?.email,
        reason: reason || '',
        timestamp: Timestamp.now(),
        originalAuthor: item.authorEmail
      });

    } catch (err) {
      console.error('Error performing moderation action:', err);
      setError(language === 'es' ? 'Error al realizar la acción' : 'Error performing action');
    }
  };

  const approveContent = async (item: ModerationItem) => {
    try {
      let targetCollection = '';
      let updateData: any = {
        status: 'active',
        moderatedAt: Timestamp.now(),
        moderatedBy: userProfile?.uid
      };

      switch (item['type']) {
        case 'job':
          targetCollection = 'jobs';
          updateData['status'] = 'active';
          break;
        case 'event':
          targetCollection = 'events';
          updateData['status'] = 'published';
          break;
        case 'forum_post':
          targetCollection = 'forum_posts';
          updateData.isVisible = true;
          break;
        case 'forum_reply':
          targetCollection = 'forum_replies';
          updateData.isVisible = true;
          break;
      }

      if(targetCollection) {
        const originalRef = doc(db, targetCollection, item?.metadata?.originalId);
        await updateDoc(originalRef, updateData);
      }
    } catch (err) {
      console.error('Error approving content:', err);
    }
  };

  const rejectContent = async (item: ModerationItem, reason?: string) => {
    try {
      let targetCollection = '';

      switch (item['type']) {
        case 'job':
          targetCollection = 'jobs';
          break;
        case 'event':
          targetCollection = 'events';
          break;
        case 'forum_post':
          targetCollection = 'forum_posts';
          break;
        case 'forum_reply':
          targetCollection = 'forum_replies';
          break;
      }

      if(targetCollection) {
        const originalRef = doc(db, targetCollection, item['metadata']?.originalId);
        await updateDoc(originalRef, {
          status: 'rejected',
          rejectionReason: reason,
          moderatedAt: Timestamp.now(),
          moderatedBy: userProfile?.uid
        });
      }

      // Send notification to author (implement notification system)
      // await sendRejectionNotification(item.authorId, item['type'], reason);
    } catch (err) {
      console.error('Error rejecting content:', err);
    }
  };

  const flagContent = async (item: ModerationItem, reason?: string) => {
    try {
      // Mark content as flagged
      let targetCollection = '';

      switch (item['type']) {
        case 'job':
          targetCollection = 'jobs';
          break;
        case 'event':
          targetCollection = 'events';
          break;
        case 'forum_post':
          targetCollection = 'forum_posts';
          break;
        case 'forum_reply':
          targetCollection = 'forum_replies';
          break;
      }

      if(targetCollection) {
        const originalRef = doc(db, targetCollection, item['metadata']?.originalId);
        await updateDoc(originalRef, {
          isFlagged: true,
          flagReason: reason,
          flaggedAt: Timestamp.now(),
          flaggedBy: userProfile?.uid
        });
      }

      // Create escalation for admin review if needed
      if (item.priority === 'urgent' || (item.reportCount ?? 0) > 5) {
        await addDoc(collection(db, 'admin_escalations'), {
          itemId: item['id'],
          itemType: item['type'],
          reason: 'High priority content flagged',
          escalatedAt: Timestamp.now(),
          escalatedBy: userProfile?.uid
        });
      }
    } catch (err) {
      console.error('Error flagging content:', err);
    }
  };

  const handleReportAction = async (action: 'resolve' | 'dismiss', reportId: string, actionDescription?: string) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        reviewedAt: Timestamp.now(),
        reviewedBy: userProfile?.email,
        action: actionDescription || action
      });

      // Log report action
      await addDoc(collection(db, 'report_actions'), {
        reportId,
        action,
        actionDescription,
        reviewerId: userProfile?.uid,
        reviewerEmail: userProfile?.email,
        timestamp: Timestamp.now()
      });

    } catch (err) {
      console.error('Error handling report:', err);
      setError(language === 'es' ? 'Error al manejar el reporte' : 'Error handling report');
    }
  };

  const bulkModerationAction = async (action: 'approve' | 'reject', reason?: string) => {
    try {
      const promises = Array.from(selectedItems).map(itemId => 
        handleModerationAction(action, itemId, reason)
      );
      
      await Promise.all(promises);
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(language === 'es' ? 'Error en acción masiva' : 'Error in bulk action');
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'job': return <Briefcase className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'forum_post': case 'forum_reply': return <MessageSquare className="w-4 h-4" />;
      case 'user_report': return <User className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!canModerate) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Se requieren privilegios de moderador para acceder a esta página.'
              : 'Moderator privileges are required to access this page.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Moderación de Contenido' : 'Content Moderation'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {language === 'es' 
              ? 'Revisar y aprobar contenido de la plataforma'
              : 'Review and approve platform content'
            }
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Pendientes' : 'Pending'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Aprobados Hoy' : 'Approved Today'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.approvedToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Rechazados Hoy' : 'Rejected Today'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.rejectedToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Flag className="w-5 h-5 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Reportes' : 'Reports'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingReports}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Ban className="w-5 h-5 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Usuarios Marcados' : 'Flagged Users'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.flaggedUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Tiempo Promedio' : 'Avg Review Time'}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.averageReviewTime}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {language === 'es' ? 'Cola de Moderación' : 'Moderation Queue'}
            {stats.pendingItems > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {stats.pendingItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {language === 'es' ? 'Reportes' : 'Reports'}
            {stats.pendingReports > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {stats.pendingReports}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Tipo' : 'Type'}
                </label>
                <select
                  value={filters['type']}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">{language === 'es' ? 'Todos' : 'All'}</option>
                  <option value="job">{language === 'es' ? 'Empleos' : 'Jobs'}</option>
                  <option value="event">{language === 'es' ? 'Eventos' : 'Events'}</option>
                  <option value="forum_post">{language === 'es' ? 'Posts del Foro' : 'Forum Posts'}</option>
                  <option value="forum_reply">{language === 'es' ? 'Respuestas' : 'Replies'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Estado' : 'Status'}
                </label>
                <select
                  value={filters['status']}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="pending">{language === 'es' ? 'Pendiente' : 'Pending'}</option>
                  <option value="approved">{language === 'es' ? 'Aprobado' : 'Approved'}</option>
                  <option value="rejected">{language === 'es' ? 'Rechazado' : 'Rejected'}</option>
                  <option value="flagged">{language === 'es' ? 'Marcado' : 'Flagged'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Prioridad' : 'Priority'}
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">{language === 'es' ? 'Todas' : 'All'}</option>
                  <option value="urgent">{language === 'es' ? 'Urgente' : 'Urgent'}</option>
                  <option value="high">{language === 'es' ? 'Alta' : 'High'}</option>
                  <option value="medium">{language === 'es' ? 'Media' : 'Medium'}</option>
                  <option value="low">{language === 'es' ? 'Baja' : 'Low'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {language === 'es' ? 'Buscar' : 'Search'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder={language === 'es' ? 'Buscar contenido...' : 'Search content...'}
                    className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedItems.size} {language === 'es' ? 'elementos seleccionados' : 'items selected'}
                </span>
                <div className="flex space-x-3">
                  <button
                    onClick={() => bulkModerationAction('approve')}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    {language === 'es' ? 'Aprobar Todo' : 'Approve All'}
                  </button>
                  <button
                    onClick={() => bulkModerationAction('reject', 'Bulk rejection')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  >
                    {language === 'es' ? 'Rechazar Todo' : 'Reject All'}
                  </button>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Moderation Items */}
          <div className="space-y-4">
            {moderationItems.map((item) => (
              <div key={item['id']} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item['id'])}
                      onChange={(e) => {
                        const newSelected = new Set(selectedItems);
                        if (e.target.checked) {
                          newSelected.add(item['id']);
                        } else {
                          newSelected.delete(item['id']);
                        }
                        setSelectedItems(newSelected);
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(item['type'])}
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                            {item['type'].replace('_', ' ')}
                          </span>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                        
                        {(item.reportCount ?? 0) > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {item.reportCount} {language === 'es' ? 'reportes' : 'reports'}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">{item.content}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          {language === 'es' ? 'Por:' : 'By:'} {item.authorName} ({item.authorEmail})
                        </span>
                        <span>
                          {language === 'es' ? 'Enviado:' : 'Submitted:'} {formatDate(item.submittedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleModerationAction('approve', item['id'])}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Aprobar' : 'Approve'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt(language === 'es' ? 'Razón del rechazo:' : 'Rejection reason:');
                        if (reason) handleModerationAction('reject', item['id'], reason);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Rechazar' : 'Reject'}
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt(language === 'es' ? 'Razón de la marca:' : 'Flag reason:');
                        if (reason) handleModerationAction('flag', item['id'], reason);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Marcar' : 'Flag'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {moderationItems.length === 0 && !loading && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {language === 'es' ? '¡Todo al día!' : 'All caught up!'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {language === 'es' 
                    ? 'No hay elementos pendientes de moderación.'
                    : 'No pending moderation items.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report['id']} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Flag className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                        {report.reportedItemType.replace('_', ' ')} Report
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(report['createdAt'])}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {language === 'es' ? 'Razón:' : 'Reason:'} {report.reason}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{report['description']}</p>
                    
                    <div className="text-sm text-gray-500">
                      {language === 'es' ? 'Reportado por:' : 'Reported by:'} {report.reporterEmail}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        const action = prompt(language === 'es' ? 'Descripción de la acción tomada:' : 'Action taken description:');
                        if (action) handleReportAction('resolve', report['id'], action);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      {language === 'es' ? 'Resolver' : 'Resolve'}
                    </button>
                    
                    <button
                      onClick={() => handleReportAction('dismiss', report['id'])}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      {language === 'es' ? 'Descartar' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {reports.length === 0 && !loading && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {language === 'es' ? '¡Sin reportes!' : 'No reports!'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {language === 'es' 
                    ? 'No hay reportes pendientes de revisión.'
                    : 'No pending reports to review.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentModeration;