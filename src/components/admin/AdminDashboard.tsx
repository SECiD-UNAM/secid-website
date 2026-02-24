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
  Timestamp
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
  Activity
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
  type: 'user_registration' | 'job_posted' | 'event_created' | 'forum_report' | 'payment_received';
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
    systemHealth: 'good'
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
      try {
        // Load users stats
        const usersRef = collection(db, 'users');
        const totalUsersSnapshot = await getDocs(usersRef);
        const newUsersQuery = query(
          usersRef,
          where('createdAt', '>=', Timestamp.fromDate(startOfMonth))
        );
        const newUsersSnapshot = await getDocs(newUsersQuery);

        // Load jobs stats
        const jobsRef = collection(db, 'jobs');
        const totalJobsSnapshot = await getDocs(jobsRef);
        const activeJobsQuery = query(
          jobsRef,
          where('status', '==', 'active')
        );
        const activeJobsSnapshot = await getDocs(activeJobsQuery);
        const pendingJobsQuery = query(
          jobsRef,
          where('status', '==', 'pending')
        );
        const pendingJobsSnapshot = await getDocs(pendingJobsQuery);

        // Load events stats
        const eventsRef = collection(db, 'events');
        const totalEventsSnapshot = await getDocs(eventsRef);
        const upcomingEventsQuery = query(
          eventsRef,
          where('date', '>=', Timestamp.fromDate(now)),
          where('status', '==', 'published')
        );
        const upcomingEventsSnapshot = await getDocs(upcomingEventsQuery);

        // Load forum stats
        const forumPostsRef = collection(db, 'forum_posts');
        const totalForumPostsSnapshot = await getDocs(forumPostsRef);
        const pendingReportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', 'pending')
        );
        const pendingReportsSnapshot = await getDocs(pendingReportsQuery);

        // Load revenue stats (mock data for now)
        const monthlyRevenue = 15000; // This would come from payment provider
        const membershipRevenue = 8500;

        // Determine system health
        const pendingCount = pendingJobsSnapshot.size + pendingReportsSnapshot.size;
        const systemHealth: 'good' | 'warning' | 'critical' = 
          pendingCount > 50 ? 'critical' : 
          pendingCount > 20 ? 'warning' : 'good';

        setStats({
          totalUsers: totalUsersSnapshot.size,
          newUsersThisMonth: newUsersSnapshot.size,
          totalJobs: totalJobsSnapshot.size,
          activeJobs: activeJobsSnapshot.size,
          pendingJobs: pendingJobsSnapshot.size,
          totalEvents: totalEventsSnapshot.size,
          upcomingEvents: upcomingEventsSnapshot.size,
          totalForumPosts: totalForumPostsSnapshot.size,
          pendingReports: pendingReportsSnapshot.size,
          monthlyRevenue,
          membershipRevenue,
          systemHealth
        });

        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
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
            metadata: data['metadata']
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
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSystemHealthColor = (health: string) => {
    switch(health) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'user_registration': return <Users className="w-4 h-4" />;
      case 'job_posted': return <Briefcase className="w-4 h-4" />;
      case 'event_created': return <Calendar className="w-4 h-4" />;
      case 'forum_report': return <MessageSquare className="w-4 h-4" />;
      case 'payment_received': return <DollarSign className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {language === 'es' 
              ? 'Se requieren privilegios de administrador para acceder a esta página.'
              : 'Administrator privileges are required to access this page.'
            }
          </p>
        </div>
      </div>
    );
  }

  if(loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {language === 'es' ? 'Cargando panel de administración...' : 'Loading admin dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if(error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'es' ? 'Error' : 'Error'}
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'es' ? 'Panel de Administración' : 'Admin Dashboard'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'es' 
              ? 'Bienvenido de vuelta, ' + userProfile?.firstName
              : 'Welcome back, ' + userProfile?.firstName
            }
          </p>
        </div>
        <div className={`mt-4 sm:mt-0 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSystemHealthColor(stats.systemHealth)}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            stats.systemHealth === 'good' ? 'bg-green-400' :
            stats.systemHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
          }`}></div>
          {language === 'es' ? 'Estado del Sistema: ' : 'System Health: '}
          {stats.systemHealth === 'good' && (language === 'es' ? 'Bueno' : 'Good')}
          {stats.systemHealth === 'warning' && (language === 'es' ? 'Advertencia' : 'Warning')}
          {stats.systemHealth === 'critical' && (language === 'es' ? 'Crítico' : 'Critical')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'es' ? 'Usuarios Totales' : 'Total Users'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-green-600">
                +{stats.newUsersThisMonth} {language === 'es' ? 'este mes' : 'this month'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Jobs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'es' ? 'Empleos Activos' : 'Active Jobs'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeJobs}</p>
              <p className="text-sm text-yellow-600">
                {stats.pendingJobs} {language === 'es' ? 'pendientes' : 'pending'}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'es' ? 'Próximos Eventos' : 'Upcoming Events'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{stats.upcomingEvents}</p>
              <p className="text-sm text-gray-500">
                {stats.totalEvents} {language === 'es' ? 'total' : 'total'}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {language === 'es' ? 'Ingresos Mensuales' : 'Monthly Revenue'}
              </p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-sm text-green-600">
                {formatCurrency(stats.membershipRevenue)} {language === 'es' ? 'membresías' : 'memberships'}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">
                {language === 'es' ? 'Aprobar Empleos' : 'Approve Jobs'}
              </p>
              <p className="text-sm text-gray-500">{stats.pendingJobs} {language === 'es' ? 'pendientes' : 'pending'}</p>
            </div>
          </button>
          
          <button className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">
                {language === 'es' ? 'Revisar Reportes' : 'Review Reports'}
              </p>
              <p className="text-sm text-gray-500">{stats.pendingReports} {language === 'es' ? 'pendientes' : 'pending'}</p>
            </div>
          </button>
          
          <button className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">
                {language === 'es' ? 'Ver Analytics' : 'View Analytics'}
              </p>
              <p className="text-sm text-gray-500">{language === 'es' ? 'Reportes detallados' : 'Detailed reports'}</p>
            </div>
          </button>
          
          <button className="flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Clock className="w-5 h-5 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">
                {language === 'es' ? 'Logs del Sistema' : 'System Logs'}
              </p>
              <p className="text-sm text-gray-500">{language === 'es' ? 'Actividad reciente' : 'Recent activity'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {language === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div key={activity['id']} className="p-6 flex items-start space-x-3">
                <div className="p-1 bg-gray-100 rounded-full">
                  {getActivityIcon(activity['type'])}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity['description']}</p>
                  <p className="text-xs text-gray-500">{formatDate(activity['timestamp'])}</p>
                  {activity['userEmail'] && (
                    <p className="text-xs text-blue-600">{activity['userEmail']}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              {language === 'es' ? 'No hay actividad reciente' : 'No recent activity'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;