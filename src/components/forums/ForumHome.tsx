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
  Flame,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { forumCategories, forumTopics } from '../../lib/forum';
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
    onlineUsers: 0,
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
      updatedAt: new Date(),
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
      updatedAt: new Date(),
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
      updatedAt: new Date(),
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
      updatedAt: new Date(),
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
      updatedAt: new Date(),
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
      updatedAt: new Date(),
    },
  ];

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setLoading(true);

      // Load categories (use default if none exist)
      let categoriesData: ForumCategory[] = [];
      try {
        categoriesData = await forumCategories.getAll();
      } catch (err) {
        console.warn('Error loading forum categories, using defaults:', err);
      }
      setCategories(
        categoriesData.length > 0 ? categoriesData : defaultCategories
      );

      // Load trending topics
      try {
        const trending = await forumTopics.getTrending(5);
        setTrendingTopics(trending);
      } catch (err) {
        console.warn('Error loading trending topics:', err);
        setTrendingTopics([]);
      }

      // Load recent topics from all categories
      const recent: ForumTopic[] = [];
      const activeCategories =
        categoriesData.length > 0 ? categoriesData : defaultCategories;
      for (const category of activeCategories) {
        try {
          const { topics } = await forumTopics.getByCategory(
            category.id,
            undefined,
            2
          );
          recent.push(...topics);
        } catch (err) {
          console.warn(
            `Error loading topics for category ${category.id}:`,
            err
          );
        }
      }
      setRecentTopics(
        recent
          .sort((a, b) => b.createdAt.getTime() - a['createdAt'].getTime())
          .slice(0, 5)
      );

      // Compute stats from loaded data
      setStats({
        totalTopics: recent.length,
        totalPosts: recent.reduce((sum, topic) => sum + topic.postCount, 0),
        totalUsers: 0,
        onlineUsers: 0,
      });
    } catch (err) {
      console.error('Error loading forum data:', err);
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

  if (loading) {
    return (
      <div className="py-8">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/4 rounded bg-gray-300 dark:bg-gray-700"></div>
          <div className="mb-8 h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-gray-300 dark:bg-gray-700"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-xl text-red-500">{error}</div>
          <button
            onClick={loadForumData}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Actions Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.forum.searchPlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </form>

        {currentUser && (
          <a
            href={`/${language}/forum/new-topic`}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            <Plus className="h-5 w-5" />
            {t.forum.createTopic}
          </a>
        )}
      </div>

      <div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Cards */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-4 text-center dark:bg-gray-800">
                <div className="text-2xl font-bold text-blue-500">
                  {formatNumber(stats.totalTopics)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t.forum.topics}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 text-center dark:bg-gray-800">
                <div className="text-2xl font-bold text-green-500">
                  {formatNumber(stats.totalPosts)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t.forum.posts}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 text-center dark:bg-gray-800">
                <div className="text-2xl font-bold text-purple-500">
                  {formatNumber(stats.totalUsers)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t.forum.members}
                </div>
              </div>
              <div className="rounded-lg bg-white p-4 text-center dark:bg-gray-800">
                <div className="text-2xl font-bold text-orange-500">
                  {stats.onlineUsers}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Online
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-8">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                {t.forum.categories}
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {categories.map((category) => (
                  <a
                    key={category.id}
                    href={`/${language}/forum/category/${category.slug}`}
                    className="block rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-12 w-12 rounded-lg ${category.color} flex items-center justify-center text-xl text-white`}
                      >
                        {category.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {category['name']}
                        </h3>
                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                          {category['description']}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {category.topicCount} {t.forum.topics}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {category.postCount} {t.forum.posts}
                          </div>
                        </div>
                      </div>
                    </div>

                    {category.lastActivity && (
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
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
              <div className="mb-6 rounded-lg bg-white p-6 dark:bg-gray-800">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Trending
                </h3>
                <div className="space-y-3">
                  {trendingTopics.map((topic) => (
                    <a
                      key={topic.id}
                      href={`/${language}/forum/topic/${topic.slug}`}
                      className="block rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                        {topic.isPinned && (
                          <Pin className="mr-1 inline h-3 w-3 text-yellow-500" />
                        )}
                        {topic.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {topic.upvotes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {topic.postCount}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
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
              <div className="rounded-lg bg-white p-6 dark:bg-gray-800">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <Clock className="h-5 w-5 text-blue-500" />
                  {t.forum.latestActivity}
                </h3>
                <div className="space-y-3">
                  {recentTopics.map((topic) => (
                    <a
                      key={topic.id}
                      href={`/${language}/forum/topic/${topic.slug}`}
                      className="block rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="mb-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                        {topic.isPinned && (
                          <Pin className="mr-1 inline h-3 w-3 text-yellow-500" />
                        )}
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
            <div className="mt-6 rounded-lg bg-white p-6 dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                <Award className="h-5 w-5 text-yellow-500" />
                Top Contributors
              </h3>
              <div className="space-y-3">
                <p className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  {language === 'es'
                    ? 'Sin datos disponibles'
                    : 'No data available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumHome;
