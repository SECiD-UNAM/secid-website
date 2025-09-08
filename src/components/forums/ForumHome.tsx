import React, { useState, useEffect } from 'react';
import {
  MessageCircle, 
  Users, 
  TrendingUp, 
  Search, 
  Plus,
  Pin,
  MessageSquare,
  Eye,
  Clock,
  Award,
  Flame
} from 'lucide-react';
import { useTranslations} from '../../hooks/useTranslations';
import { forumCategories, forumTopics} from '../../lib/forum';
import type { ForumCategory, ForumTopic, Language } from '../../types';

interface ForumHomeProps {
  language: Language;
  currentUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ForumStats {
  totalTopics: number;
  totalPosts: number;
  totalUsers: number;
  onlineUsers: number;
}

const ForumHome: React.FC<ForumHomeProps> = ({ language, currentUser }) => {
  const t = useTranslations(language);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<ForumTopic[]>([]);
  const [recentTopics, setRecentTopics] = useState<ForumTopic[]>([]);
  const [stats, setStats] = useState<ForumStats>({
    totalTopics: 0,
    totalPosts: 0,
    totalUsers: 0,
    onlineUsers: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default categories if none exist in database
  const defaultCategories = [
    {
      id: 'career-advice',
      name: t.forum.categoryList.careerAdvice.name,
      description: t.forum.categoryList.careerAdvice['description'],
      slug: 'career-advice',
      icon: '💼',
      color: 'bg-blue-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'technical-discussion',
      name: t.forum.categoryList.technicalDiscussion.name,
      description: t.forum.categoryList.technicalDiscussion['description'],
      slug: 'technical-discussion',
      icon: '🔧',
      color: 'bg-green-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'industry-news',
      name: t.forum.categoryList.industryNews.name,
      description: t.forum.categoryList.industryNews['description'],
      slug: 'industry-news',
      icon: '📰',
      color: 'bg-purple-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'job-opportunities',
      name: t.forum.categoryList.jobOpportunities.name,
      description: t.forum.categoryList.jobOpportunities['description'],
      slug: 'job-opportunities',
      icon: '💼',
      color: 'bg-yellow-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'networking',
      name: t.forum.categoryList.networking.name,
      description: t.forum.categoryList.networking['description'],
      slug: 'networking',
      icon: '🤝',
      color: 'bg-pink-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'general-discussion',
      name: t.forum.categoryList.generalDiscussion.name,
      description: t.forum.categoryList.generalDiscussion['description'],
      slug: 'general-discussion',
      icon: '💬',
      color: 'bg-gray-500',
      moderatorIds: [],
      isActive: true,
      topicCount: 0,
      postCount: 0,
      displayOrder: 6,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setLoading(true);
      
      // Load categories (use default if none exist)
      const categoriesData = await forumCategories.getAll();
      setCategories(categoriesData.length > 0 ? categoriesData : defaultCategories);
      
      // Load trending topics
      const trending = await forumTopics.getTrending(5);
      setTrendingTopics(trending);
      
      // Load recent topics from all categories
      const recent: ForumTopic[] = [];
      for (const category of (categoriesData.length > 0 ? categoriesData : defaultCategories)) {
        const { topics } = await forumTopics.getByCategory(category.id, undefined, 2);
        recent.push(...topics);
      }
      setRecentTopics(recent.sort((a, b) => b.createdAt.getTime() - a['createdAt'].getTime()).slice(0, 5));
      
      // Mock stats for now
      setStats({
        totalTopics: recent.length,
        totalPosts: recent.reduce((sum, topic) => sum + topic.postCount, 0),
        totalUsers: 150,
        onlineUsers: 23
      });
      
    } catch (err) {
      console.error('Error loading forum data:', err);
      setError(t.forum.errors.loadingFailed);
      // Use default data on error
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results
      window.location.href = `/${language}/forum/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m`;
      }
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}d`;
    } else {
      return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
    }
  };

  if(loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if(error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">{error}</div>
            <button 
              onClick={loadForumData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.forum.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t.forum.description}</p>
            </div>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.forum.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </form>
              
              {currentUser && (
                <a
                  href={`/${language}/forum/new-topic`}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  {t.forum.createTopic}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{formatNumber(stats.totalTopics)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t.forum.topics}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{formatNumber(stats.totalPosts)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t.forum.posts}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">{formatNumber(stats.totalUsers)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t.forum.members}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.onlineUsers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Online</div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.forum.categories}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={`/${language}/forum/category/${category.slug}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center text-white text-xl`}>
                        {category.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {category['name']}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {category['description']}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {category.topicCount} {t.forum.topics}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {category.postCount} {t.forum.posts}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {category.lastActivity && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-gray-600 dark:text-gray-400">
                            {t.forum.latestActivity}:{' '}
                            <span className="text-blue-500 hover:underline">
                              {category.lastActivity.topicTitle}
                            </span>
                          </div>
                          <div className="text-gray-500 dark:text-gray-500">
                            {formatDate(category.lastActivity.timestamp)}
                          </div>
                        </div>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Trending Topics */}
            {trendingTopics.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Trending
                </h3>
                <div className="space-y-3">
                  {trendingTopics.map((topic) => (
                    <a
                      key={topic.id}
                      href={`/${language}/forum/topic/${topic.slug}`}
                      className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                        {topic.isPinned && <Pin className="inline w-3 h-3 mr-1 text-yellow-500" />}
                        {topic.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {topic.upvotes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {topic.postCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {topic.views}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentTopics.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  {t.forum.latestActivity}
                </h3>
                <div className="space-y-3">
                  {recentTopics.map((topic) => (
                    <a
                      key={topic.id}
                      href={`/${language}/forum/topic/${topic.slug}`}
                      className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                        {topic.isPinned && <Pin className="inline w-3 h-3 mr-1 text-yellow-500" />}
                        {topic.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{topic.authorName}</span>
                        <span>{formatDate(topic.createdAt)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* User Recognition */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Top Contributors
              </h3>
              <div className="space-y-3">
                {/* Mock data - replace with real contributor data */}
                {[
                  { name: 'Ana García', points: 1250, badge: '🏆' },
                  { name: 'Carlos López', points: 980, badge: '🥈' },
                  { name: 'María Rodríguez', points: 750, badge: '🥉' }
                ].map((user, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-lg">{user.badge}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{user['name']}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.points} {t.forum.user.points}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumHome;