import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Download,
  RefreshCw,
  ChevronDown,
  Eye,
  Activity,
} from 'lucide-react';

interface AnalyticsData {
  userGrowth: Array<{ date: string; users: number; activeUsers: number }>;
  jobMetrics: Array<{
    date: string;
    posted: number;
    applied: number;
    filled: number;
  }>;
  eventMetrics: Array<{ date: string; created: number; attendees: number }>;
  forumActivity: Array<{
    date: string;
    posts: number;
    replies: number;
    views: number;
  }>;
  membershipDistribution: Array<{ name: string; value: number; color: string }>;
  topSkills: Array<{ skill: string; count: number }>;
  topCompanies: Array<{ company: string; users: number; jobs: number }>;
  geographicDistribution: Array<{ location: string; users: number }>;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionTime: number;
    bounceRate: number;
    pageViews: number;
  };
  revenueMetrics: {
    monthlyRevenue: number;
    yearlyRevenue: number;
    membershipRevenue: number;
    eventRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
  };
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

export const Analytics: React.FC = () => {
  const {
    userProfile: _userProfile,
    isAdmin,
    loading: authLoading,
  } = useAuth();
  const { t: _t, language } = useTranslations();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: language === 'es' ? 'Últimos 30 días' : 'Last 30 days',
    value: '30d',
    days: 30,
  });
  const [refreshing, setRefreshing] = useState(false);

  const timeRanges: TimeRange[] = [
    {
      label: language === 'es' ? 'Últimos 7 días' : 'Last 7 days',
      value: '7d',
      days: 7,
    },
    {
      label: language === 'es' ? 'Últimos 30 días' : 'Last 30 days',
      value: '30d',
      days: 30,
    },
    {
      label: language === 'es' ? 'Últimos 90 días' : 'Last 90 days',
      value: '90d',
      days: 90,
    },
    {
      label: language === 'es' ? 'Último año' : 'Last year',
      value: '1y',
      days: 365,
    },
  ];

  const COLORS = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setError('Unauthorized access. Admin privileges required.');
      setLoading(false);
      return;
    }

    loadAnalyticsData();
  }, [authLoading, isAdmin, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with real Firestore queries when analytics tracking is implemented
      const analyticsData: AnalyticsData = {
        userGrowth: [],
        jobMetrics: [],
        eventMetrics: [],
        forumActivity: [],
        membershipDistribution: [],
        topSkills: [],
        topCompanies: [],
        geographicDistribution: [],

        engagementMetrics: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
          averageSessionTime: 0,
          bounceRate: 0,
          pageViews: 0,
        },

        revenueMetrics: {
          monthlyRevenue: 0,
          yearlyRevenue: 0,
          membershipRevenue: 0,
          eventRevenue: 0,
          averageRevenuePerUser: 0,
          churnRate: 0,
        },
      };

      setData(analyticsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError(
        language === 'es'
          ? 'Error al cargar datos de analytics'
          : 'Error loading analytics data'
      );
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const exportData = () => {
    if (!data) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange: selectedTimeRange.label,
      userGrowth: data.userGrowth,
      jobMetrics: data['jobMetrics'],
      eventMetrics: data['eventMetrics'],
      forumActivity: data['forumActivity'],
      engagementMetrics: data['engagementMetrics'],
      revenueMetrics: data['revenueMetrics'],
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `analytics-${selectedTimeRange.value}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US').format(
      num
    );
  };

  const formatPercentage = (num: number) => {
    return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
    }).format(num / 100);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Se requieren privilegios de administrador para ver analytics.'
              : 'Administrator privileges are required to view analytics.'}
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
              ? 'Cargando analytics...'
              : 'Loading analytics...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {language === 'es' ? 'Error' : 'Error'}
          </h1>
          <p className="mb-4 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={loadAnalyticsData}
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
            {language === 'es' ? 'Analytics' : 'Analytics'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {language === 'es'
              ? 'Métricas y reportes de la plataforma'
              : 'Platform metrics and reports'}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <div className="relative">
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find(
                  (r) => r.value === e.target.value
                );
                if (range) setSelectedTimeRange(range);
              }}
              className="appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          </div>

          <button
            onClick={refreshData}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </button>

          <button
            onClick={exportData}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Download className="mr-2 h-4 w-4" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Usuarios Activos Diarios'
                  : 'Daily Active Users'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(data['engagementMetrics'].dailyActiveUsers)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Ingresos Mensuales' : 'Monthly Revenue'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(data['revenueMetrics'].monthlyRevenue)}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Vistas de Página' : 'Page Views'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(data['engagementMetrics'].pageViews)}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Tasa de Rebote' : 'Bounce Rate'}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(data['engagementMetrics'].bounceRate)}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Crecimiento de Usuarios' : 'User Growth'}
          </h3>
          {data['userGrowth'].length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data['userGrowth']}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name={language === 'es' ? 'Nuevos Usuarios' : 'New Users'}
                />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name={language === 'es' ? 'Usuarios Activos' : 'Active Users'}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'Sin datos disponibles'
                : 'No data available'}
            </div>
          )}
        </div>

        {/* Job Metrics Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Métricas de Empleos' : 'Job Metrics'}
          </h3>
          {data['jobMetrics'].length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data['jobMetrics']}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="posted"
                  fill="#3B82F6"
                  name={language === 'es' ? 'Publicados' : 'Posted'}
                />
                <Bar
                  dataKey="applied"
                  fill="#10B981"
                  name={language === 'es' ? 'Aplicaciones' : 'Applied'}
                />
                <Bar
                  dataKey="filled"
                  fill="#F59E0B"
                  name={language === 'es' ? 'Llenados' : 'Filled'}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'Sin datos disponibles'
                : 'No data available'}
            </div>
          )}
        </div>

        {/* Forum Activity Chart */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Actividad del Foro' : 'Forum Activity'}
          </h3>
          {data['forumActivity'].length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data['forumActivity']}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="posts"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name={language === 'es' ? 'Posts' : 'Posts'}
                />
                <Line
                  type="monotone"
                  dataKey="replies"
                  stroke="#10B981"
                  strokeWidth={2}
                  name={language === 'es' ? 'Respuestas' : 'Replies'}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name={language === 'es' ? 'Vistas' : 'Views'}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'Sin datos disponibles'
                : 'No data available'}
            </div>
          )}
        </div>

        {/* Membership Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es'
              ? 'Distribución de Membresías'
              : 'Membership Distribution'}
          </h3>
          {data['membershipDistribution'].length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data['membershipDistribution']}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {data['membershipDistribution'].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
              {language === 'es'
                ? 'Sin datos disponibles'
                : 'No data available'}
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Skills */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Habilidades Más Populares' : 'Top Skills'}
          </h3>
          <div className="space-y-3">
            {data['topSkills'].length > 0 ? (
              data['topSkills'].slice(0, 6).map((skill, index) => (
                <div
                  key={skill.skill}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {skill.skill}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {skill.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {language === 'es'
                  ? 'Sin datos disponibles'
                  : 'No data available'}
              </p>
            )}
          </div>
        </div>

        {/* Top Companies */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Empresas Principales' : 'Top Companies'}
          </h3>
          <div className="space-y-3">
            {data['topCompanies'].length > 0 ? (
              data['topCompanies'].map((company, index) => (
                <div
                  key={company.company}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {company.company}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {company.users} users
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {company.jobs} jobs
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {language === 'es'
                  ? 'Sin datos disponibles'
                  : 'No data available'}
              </p>
            )}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es'
              ? 'Distribución Geográfica'
              : 'Geographic Distribution'}
          </h3>
          <div className="space-y-3">
            {data['geographicDistribution'].length > 0 ? (
              data['geographicDistribution'].map((location, index) => (
                <div
                  key={location.location}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {location.location}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {location.users}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {language === 'es'
                  ? 'Sin datos disponibles'
                  : 'No data available'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Engagement Metrics */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es'
              ? 'Métricas de Engagement'
              : 'Engagement Metrics'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(data['engagementMetrics'].weeklyActiveUsers)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Usuarios Activos Semanales'
                  : 'Weekly Active Users'}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(data['engagementMetrics'].monthlyActiveUsers)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Usuarios Activos Mensuales'
                  : 'Monthly Active Users'}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-900/20">
              <p className="text-2xl font-bold text-yellow-600">
                {data['engagementMetrics'].averageSessionTime}m
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Tiempo Promedio de Sesión'
                  : 'Avg Session Time'}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600">
                {formatPercentage(data['engagementMetrics'].bounceRate)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Tasa de Rebote' : 'Bounce Rate'}
              </p>
            </div>
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'es' ? 'Métricas de Ingresos' : 'Revenue Metrics'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data['revenueMetrics'].yearlyRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Ingresos Anuales' : 'Yearly Revenue'}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data['revenueMetrics'].membershipRevenue)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Ingresos por Membresías'
                  : 'Membership Revenue'}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(data['revenueMetrics'].averageRevenuePerUser)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es'
                  ? 'Ingreso Promedio por Usuario'
                  : 'Avg Revenue per User'}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-2xl font-bold text-red-600">
                {formatPercentage(data['revenueMetrics'].churnRate)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'es' ? 'Tasa de Abandono' : 'Churn Rate'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
