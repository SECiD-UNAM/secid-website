import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  Users,
  Briefcase,
  Calendar,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalJobs: number;
  activeJobs: number;
  pendingJobs: number;
  totalEvents: number;
  upcomingEvents: number;
  totalForumPosts: number;
  pendingReports: number;
  monthlyRevenue: number;
  membershipRevenue: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

interface RecentActivity {
  id: string;
  type:
    | 'user_registration'
    | 'job_posted'
    | 'event_created'
    | 'forum_report'
    | 'payment_received';
  description: string;
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  metadata?: any;
}

export const AdminDashboard: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { t: _t, language } = useTranslations();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalJobs: 0,
    activeJobs: 0,
    pendingJobs: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    totalForumPosts: 0,
    pendingReports: 0,
    monthlyRevenue: 0,
    membershipRevenue: 0,
    systemHealth: 'good',
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date ranges
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized access. Admin privileges required.');
      setLoading(false);
      return;
    }

    const loadDashboardData = async () => {
      let totalUsers = 0;
      let newUsersThisMonth = 0;
      let totalJobs = 0;
      let activeJobs = 0;
      let pendingJobs = 0;
      let totalEvents = 0;
      let upcomingEvents = 0;
      let totalForumPosts = 0;
      let pendingReports = 0;

      // Load users stats
      try {
        const usersRef = collection(db, 'users');
        const totalUsersSnapshot = await getDocs(usersRef);
        totalUsers = totalUsersSnapshot.size;
        const newUsersQuery = query(
          usersRef,
          where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );
        const newUsersSnapshot = await getDocs(newUsersQuery);
        newUsersThisMonth = newUsersSnapshot.size;
      } catch (err) {
        console.warn('Error loading users stats:', err);
      }

      // Load jobs stats
      try {
        const jobsRef = collection(db, 'jobs');
        const totalJobsSnapshot = await getDocs(jobsRef);
        totalJobs = totalJobsSnapshot.size;
        const activeJobsQuery = query(jobsRef, where('status', '==', 'active'));
        const activeJobsSnapshot = await getDocs(activeJobsQuery);
        activeJobs = activeJobsSnapshot.size;
        const pendingJobsQuery = query(
          jobsRef,
          where('status', '==', 'pending')
        );
        const pendingJobsSnapshot = await getDocs(pendingJobsQuery);
        pendingJobs = pendingJobsSnapshot.size;
      } catch (err) {
        console.warn('Error loading jobs stats:', err);
      }

      // Load events stats
      try {
        const eventsRef = collection(db, 'events');
        const totalEventsSnapshot = await getDocs(eventsRef);
        totalEvents = totalEventsSnapshot.size;
        // Count upcoming events client-side to avoid composite index requirement
        totalEventsSnapshot.forEach((doc) => {
          const data = doc.data();
          const eventDate = data.date?.toDate?.() || new Date(0);
          if (eventDate >= now && data.status === 'published') {
            upcomingEvents++;
          }
        });
      } catch (err) {
        console.warn('Error loading events stats:', err);
      }

      // Load forum stats
      try {
        const forumsRef = collection(db, 'forums');
        const forumsSnapshot = await getDocs(forumsRef);
        // Count posts across all forum subcollections
        for (const forumDoc of forumsSnapshot.docs) {
          const postsRef = collection(db, 'forums', forumDoc.id, 'posts');
          const postsSnapshot = await getDocs(postsRef);
          totalForumPosts += postsSnapshot.size;
        }
      } catch (err) {
        console.warn('Error loading forum stats:', err);
      }

      // Load reports stats
      try {
        const pendingReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', 'pending')
        );
        const pendingReportsSnapshot = await getDocs(pendingReportsQuery);
        pendingReports = pendingReportsSnapshot.size;
      } catch (err) {
        console.warn('Error loading reports stats:', err);
      }

      // Determine system health
      const pendingCount = pendingJobs + pendingReports;
      const systemHealth: 'good' | 'warning' | 'critical' =
        pendingCount > 50 ? 'critical' : pendingCount > 20 ? 'warning' : 'good';

      setStats({
        totalUsers,
        newUsersThisMonth,
        totalJobs,
        activeJobs,
        pendingJobs,
        totalEvents,
        upcomingEvents,
        totalForumPosts,
        pendingReports,
        monthlyRevenue: 0,
        membershipRevenue: 0,
        systemHealth,
      });

      setLoading(false);
    };

    // Load recent activity
    const loadRecentActivity = () => {
      const activityRef = collection(db, 'admin_activity_log');
      const activityQuery = query(
        activityRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      );

      return onSnapshot(activityQuery, (snapshot) => {
        const activities: RecentActivity[] = [];
        snapshot['forEach']((doc) => {
          const data = doc['data']();
          activities.push({
            id: doc['id'],
            type: data['type'],
            description: data['description'],
            timestamp: data['timestamp'].toDate(),
            userId: data['userId'],
            userEmail: data['userEmail'],
            metadata: data['metadata'],
          });
        });
        setRecentActivity(activities);
      });
    };

    loadDashboardData();
    const unsubscribeActivity = loadRecentActivity();

    return () => {
      unsubscribeActivity();
    };
  }, [isAdmin, startOfMonth, now]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'good':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4" />;
      case 'job_posted':
        return <Briefcase className="h-4 w-4" />;
      case 'event_created':
        return <Calendar className="h-4 w-4" />;
      case 'forum_report':
        return <MessageSquare className="h-4 w-4" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Se requieren privilegios de administrador para acceder a esta página.'
              : 'Administrator privileges are required to access this page.'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Cargando panel de administración...'
              : 'Loading admin dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Error' : 'Error'}
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </button>
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
            {language === 'es' ? 'Panel de Administración' : 'Admin Dashboard'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Bienvenido de vuelta, ' + userProfile?.firstName
              : 'Welcome back, ' + userProfile?.firstName}
          </p>
        </div>
        <div
          className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium sm:mt-0 ${getSystemHealthColor(stats.systemHealth)}`}
        >
          <div
            className={`mr-2 h-2 w-2 rounded-full ${
              stats.systemHealth === 'good'
                ? 'bg-green-400'
                : stats.systemHealth === 'warning'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
            }`}
          ></div>
          {language === 'es' ? 'Estado del Sistema: ' : 'System Health: '}
          {stats.systemHealth === 'good' &&
            (language === 'es' ? 'Bueno' : 'Good')}
          {stats.systemHealth === 'warning' &&
            (language === 'es' ? 'Advertencia' : 'Warning')}
          {stats.systemHealth === 'critical' &&
            (language === 'es' ? 'Crítico' : 'Critical')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Users */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Usuarios Totales' : 'Total Users'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalUsers.toLocaleString()}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                +{stats.newUsersThisMonth}{' '}
                {language === 'es' ? 'este mes' : 'this month'}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Empleos Activos' : 'Active Jobs'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activeJobs}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {stats.pendingJobs}{' '}
                {language === 'es' ? 'pendientes' : 'pending'}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Próximos Eventos' : 'Upcoming Events'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.upcomingEvents}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.totalEvents} {language === 'es' ? 'total' : 'total'}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Pending Reports */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Reportes Pendientes' : 'Pending Reports'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.pendingReports}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.totalForumPosts}{' '}
                {language === 'es' ? 'posts del foro' : 'forum posts'}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button className="flex items-center rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
            <CheckCircle className="mr-3 h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {language === 'es' ? 'Aprobar Empleos' : 'Approve Jobs'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.pendingJobs}{' '}
                {language === 'es' ? 'pendientes' : 'pending'}
              </p>
            </div>
          </button>

          <button className="flex items-center rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
            <AlertTriangle className="mr-3 h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {language === 'es' ? 'Revisar Reportes' : 'Review Reports'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.pendingReports}{' '}
                {language === 'es' ? 'pendientes' : 'pending'}
              </p>
            </div>
          </button>

          <button className="flex items-center rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
            <TrendingUp className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {language === 'es' ? 'Ver Analytics' : 'View Analytics'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Reportes detallados' : 'Detailed reports'}
              </p>
            </div>
          </button>

          <button className="flex items-center rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
            <Clock className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {language === 'es' ? 'Logs del Sistema' : 'System Logs'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'es' ? 'Actividad reciente' : 'Recent activity'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div
                key={activity['id']}
                className="flex items-start space-x-3 p-6"
              >
                <div className="rounded-full bg-gray-100 p-1 dark:bg-gray-700">
                  {getActivityIcon(activity['type'])}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity['description']}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(activity['timestamp'])}
                  </p>
                  {activity['userEmail'] && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {activity['userEmail']}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'No hay actividad reciente'
                : 'No recent activity'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
