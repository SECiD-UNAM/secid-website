import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  Eye,
  ThumbsUp,
  Pin,
  Lock,
  CheckCircle,
  User,
  Clock,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { forumCategories, forumTopics } from '../../lib/forum';
import type { ForumCategory, ForumTopic, Language } from '../../types';

interface ForumCategoryProps {
  categorySlug: string;
  language: Language;
  currentUser?: {
    id: string;
    name: string;
    email: string;
  };
}

type SortOption =
  | 'latest'
  | 'oldest'
  | 'mostReplies'
  | 'mostVotes'
  | 'mostViews';

const ForumCategory: React.FC<ForumCategoryProps> = ({
  categorySlug,
  language,
  currentUser,
}) => {
  const t = useTranslations(language);
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSolved, setFilterSolved] = useState<
    'all' | 'solved' | 'unsolved'
  >('all');
  const [filterPinned, setFilterPinned] = useState<boolean>(false);

  useEffect(() => {
    loadCategory();
  }, [categorySlug]);

  useEffect(() => {
    if (category) {
      loadTopics(true);
    }
  }, [category, sortBy, filterSolved, filterPinned]);

  const loadCategory = async () => {
    try {
      setLoading(true);
      const categoryData = await forumCategories.getBySlug(categorySlug);
      if (!categoryData) {
        setError(t.forum.errors.notFound);
        return;
      }
      setCategory(categoryData);
    } catch (err) {
      console.error('Error loading category:', err);
      setError(t.forum.errors.loadingFailed);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (reset: boolean = false) => {
    if (!category) return;

    try {
      if (reset) {
        setLoading(true);
        setTopics([]);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      const { topics: newTopics, lastDoc: newLastDoc } =
        await forumTopics.getByCategory(
          category.id,
          reset ? undefined : lastDoc,
          20
        );

      let filteredTopics = newTopics;

      // Apply filters
      if (filterSolved !== 'all') {
        filteredTopics = filteredTopics.filter((topic) =>
          filterSolved === 'solved' ? topic.isSolved : !topic.isSolved
        );
      }

      if (filterPinned) {
        filteredTopics = filteredTopics.filter((topic) => topic.isPinned);
      }

      if (searchQuery.trim()) {
        filteredTopics = filteredTopics.filter(
          (topic) =>
            topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            topic.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            topic.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
      }

      // Apply sorting
      filteredTopics.sort((a, b) => {
        // Always show pinned topics first
        if (a.isPinned !== b.isPinned) {
          return b.isPinned ? 1 : -1;
        }

        switch (sortBy) {
          case 'oldest':
            return a['createdAt'].getTime() - b['createdAt'].getTime();
          case 'mostReplies':
            return b.postCount - a.postCount;
          case 'mostVotes':
            return b.upvotes - b.downvotes - (a.upvotes - a.downvotes);
          case 'mostViews':
            return b.views - a.views;
          case 'latest':
          default:
            return (
              b.lastActivity.timestamp.getTime() -
              a.lastActivity['timestamp'].getTime()
            );
        }
      });

      if (reset) {
        setTopics(filteredTopics);
      } else {
        setTopics((prev) => [...prev, ...filteredTopics]);
      }

      setLastDoc(newLastDoc);
      setHasMore(newTopics.length === 20 && !!newLastDoc);
    } catch (err) {
      console.error('Error loading topics:', err);
      setError(t.forum.errors.loadingFailed);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTopics(true);
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

  if (loading && !category) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="mb-4 h-8 w-1/4 rounded bg-gray-300 dark:bg-gray-700"></div>
            <div className="mb-8 h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-700"></div>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="mb-4 h-20 rounded-lg bg-gray-300 dark:bg-gray-700"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">{error}</div>
            <button
              onClick={loadCategory}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              {t.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <a
              href={`/${language}/forum`}
              className="flex items-center gap-1 transition-colors hover:text-blue-500"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.forum.title}
            </a>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">
              {category['name']}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="mb-2 flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-lg ${category.color} flex items-center justify-center text-xl text-white`}
                >
                  {category.icon}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {category['name']}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {category['description']}
                  </p>
                </div>
              </div>

              {/* Category Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {category.topicCount} {t.forum.topics}
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  {category.postCount} {t.forum.posts}
                </div>
              </div>
            </div>

            {currentUser && (
              <a
                href={`/${language}/forum/new-topic?category=${category.slug}`}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                <Plus className="h-5 w-5" />
                {t.forum.createTopic}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-md flex-1">
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

            {/* Sort and Filter Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="latest">{t.forum.sortByDate}</option>
                <option value="oldest">Oldest</option>
                <option value="mostReplies">{t.forum.sortByReplies}</option>
                <option value="mostVotes">{t.forum.sortByVotes}</option>
                <option value="mostViews">Most Views</option>
              </select>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 transition-colors dark:border-gray-600 ${
                  showFilters
                    ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                {t.forum.filters}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status:
                  </label>
                  <select
                    value={filterSolved}
                    onChange={(e) =>
                      setFilterSolved(
                        e.target.value as 'all' | 'solved' | 'unsolved'
                      )
                    }
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="solved">{t.forum.topic.solved}</option>
                    <option value="unsolved">Unsolved</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filterPinned}
                    onChange={(e) => setFilterPinned(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t.forum.topic.pinned} only
                  </span>
                </label>

                <button
                  onClick={() => {
                    setFilterSolved('all');
                    setFilterPinned(false);
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t.forum.clearFilters}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Topics List */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded bg-gray-300 dark:bg-gray-700"
                  ></div>
                ))}
              </div>
            </div>
          ) : topics.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                No topics found
              </h3>
              <p className="mb-4 text-gray-600 dark:text-gray-400">
                {searchQuery || filterSolved !== 'all' || filterPinned
                  ? 'No topics match your current filters. Try adjusting your search criteria.'
                  : 'Be the first to start a discussion in this category!'}
              </p>
              {currentUser && (
                <a
                  href={`/${language}/forum/new-topic?category=${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  <Plus className="h-5 w-5" />
                  {t.forum.createTopic}
                </a>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                      {topic.authorAvatar ? (
                        <img
                          src={topic.authorAvatar}
                          alt={topic.authorName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Title and Status Icons */}
                          <div className="mb-1 flex items-center gap-2">
                            {topic.isPinned && (
                              <Pin className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                            )}
                            {topic.isLocked && (
                              <Lock className="h-4 w-4 flex-shrink-0 text-red-500" />
                            )}
                            {topic.isSolved && (
                              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                            )}

                            <a
                              href={`/${language}/forum/topic/${topic.slug}`}
                              className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                            >
                              {topic.title}
                            </a>
                          </div>

                          {/* Meta Info */}
                          <div className="mb-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{topic.authorName}</span>
                            <span>•</span>
                            <span>{formatDate(topic.createdAt)}</span>
                            {topic.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex gap-1">
                                  {topic.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-600"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {topic.tags.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{topic.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" />
                              {topic.postCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4" />
                              {topic.upvotes - topic.downvotes}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {formatNumber(topic.views)}
                            </div>
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div className="ml-4 flex-shrink-0 text-right text-sm text-gray-500 dark:text-gray-400">
                          <div className="mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(topic.lastActivity.timestamp)}
                          </div>
                          <div className="text-xs">
                            {topic.lastActivity.userName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && topics.length > 0 && (
            <div className="border-t border-gray-200 p-6 dark:border-gray-700">
              <button
                onClick={() => loadTopics(false)}
                disabled={loadingMore}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {loadingMore ? t.common.loading : 'Load More Topics'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumCategory;
