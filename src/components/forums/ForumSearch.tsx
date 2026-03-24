import React, { useState, useEffect, useMemo, useRef } from 'react';
import { sanitizeHtml } from '@/lib/validation/sanitization';
import {
  Search,
  Filter,
  X,
  User,
  FileText,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { forumSearch, forumCategories } from '../../lib/forum';
import { useUniversalListing } from '../../hooks/useUniversalListing';
import type { DataAdapter } from '@lib/listing/adapters/types';
import type { FetchParams, FetchResult } from '@lib/listing/types';
import type {
  ForumSearchFilters,
  ForumSearchResult,
  ForumCategory,
  Language,
} from '../../types';

interface ForumSearchProps {
  language: Language;
  initialQuery?: string;
  initialFilters?: Partial<ForumSearchFilters>;
}

/**
 * Adapter that wraps forumSearch.search() to fit the DataAdapter contract.
 * Maps FetchParams (query + activeFilters + sort) → ForumSearchFilters.
 * Returns a flat array of ForumSearchResult (topics first, then posts).
 */
function buildForumAdapter(): DataAdapter<ForumSearchResult> {
  return {
    async fetch(params: FetchParams): Promise<FetchResult<ForumSearchResult>> {
      const queryTerm = params.query?.trim() ?? '';

      if (!queryTerm) {
        return { items: [], totalCount: 0, hasMore: false };
      }

      const filters = params.filters ?? {};
      const sort = params.sort;

      const searchFilters: ForumSearchFilters = {
        query: queryTerm,
        sortBy: (sort?.field as ForumSearchFilters['sortBy']) ?? 'relevance',
        sortOrder: (sort?.direction as ForumSearchFilters['sortOrder']) ?? 'desc',
        topicType: (filters['topicType'] as ForumSearchFilters['topicType']) ?? 'all',
        hasAttachments: (filters['hasAttachments'] as boolean) ?? false,
        categoryIds: filters['categoryIds'] as string[] | undefined,
        tags: filters['tags'] as string[] | undefined,
        authorId: filters['authorId'] as string | undefined,
        dateFrom: filters['dateFrom'] as Date | undefined,
        dateTo: filters['dateTo'] as Date | undefined,
      };

      const results = await forumSearch.search(searchFilters);
      const flat: ForumSearchResult[] = [...results.topics, ...results.posts];

      return { items: flat, totalCount: flat.length, hasMore: false };
    },
  };
}

const ForumSearch: React.FC<ForumSearchProps> = ({
  language,
  initialQuery = '',
  initialFilters = {},
}) => {
  const t = useTranslations(language);

  // Stable adapter instance
  const adapter = useMemo(() => buildForumAdapter(), []);

  // Map initialFilters to the hook's activeFilters shape
  const initialActiveFilters: Record<string, unknown> = {};
  if (initialFilters.topicType) initialActiveFilters['topicType'] = initialFilters.topicType;
  if (initialFilters.hasAttachments != null) initialActiveFilters['hasAttachments'] = initialFilters.hasAttachments;
  if (initialFilters.categoryIds?.length) initialActiveFilters['categoryIds'] = initialFilters.categoryIds;
  if (initialFilters.tags?.length) initialActiveFilters['tags'] = initialFilters.tags;
  if (initialFilters.authorId) initialActiveFilters['authorId'] = initialFilters.authorId;
  if (initialFilters.dateFrom) initialActiveFilters['dateFrom'] = initialFilters.dateFrom;
  if (initialFilters.dateTo) initialActiveFilters['dateTo'] = initialFilters.dateTo;

  const listing = useUniversalListing<ForumSearchResult>({
    adapter,
    defaultPageSize: 50,
    defaultSort: { field: 'relevance', direction: 'desc' },
    debounceMs: 0, // Search is button-triggered, not auto-search on keypress
  });

  // Local search input — user types here, press Search to commit to hook
  const [localQuery, setLocalQuery] = useState(initialQuery);

  // Track whether a search has been performed
  const searchPerformed = listing.totalCount > 0 || (listing.query !== '' && !listing.loading);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'topics' | 'posts'>('all');
  const [categories, setCategories] = useState<ForumCategory[]>([]);

  // Temp filters for the advanced filter panel (applied on "Apply Filters" click)
  const [tempFilters, setTempFilters] = useState<Record<string, unknown>>({
    topicType: initialFilters.topicType ?? 'all',
    hasAttachments: initialFilters.hasAttachments ?? false,
    categoryIds: initialFilters.categoryIds ?? [],
    tags: initialFilters.tags ?? [],
    authorId: initialFilters.authorId,
    dateFrom: initialFilters.dateFrom,
    dateTo: initialFilters.dateTo,
  });

  // Apply initial filters to hook on first mount
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Apply initial filters to hook
    Object.entries(initialActiveFilters).forEach(([key, val]) => {
      listing.setFilter(key, val);
    });

    loadCategories();

    if (initialQuery) {
      listing.setQuery(initialQuery);
      updateUrlParams(initialQuery, initialActiveFilters);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = async () => {
    try {
      const categoriesData = await forumCategories.getAll();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const updateUrlParams = (query: string, filters: Record<string, unknown>) => {
    const params = new URLSearchParams();
    params['set']('q', query);
    const categoryIds = filters['categoryIds'] as string[] | undefined;
    const tags = filters['tags'] as string[] | undefined;
    if (categoryIds?.length) params['set']('categories', categoryIds.join(','));
    if (tags?.length) params['set']('tags', tags.join(','));
    if (filters['authorId']) params['set']('author', filters['authorId'] as string);
    const sortBy = filters['sortBy'] ?? listing.sort.field;
    if (sortBy && sortBy !== 'relevance') params['set']('sort', sortBy as string);
    const topicType = filters['topicType'] ?? 'all';
    if (topicType !== 'all') params['set']('type', topicType as string);
    if (filters['hasAttachments']) params['set']('attachments', 'true');
    window.history.replaceState(null, '', `?${params['toString']()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuery.trim()) return;
    listing.setQuery(localQuery.trim());
    updateUrlParams(localQuery.trim(), listing.activeFilters);
  };

  const applyFilters = () => {
    Object.entries(tempFilters).forEach(([key, val]) => {
      listing.setFilter(key, val);
    });
    setShowFilters(false);
    // Re-trigger search with current query and new filters
    if (localQuery.trim()) {
      listing.setQuery(localQuery.trim());
    }
  };

  const clearFilters = () => {
    const resetFilters: Record<string, unknown> = {
      topicType: 'all',
      hasAttachments: false,
    };
    listing.clearFilters();
    setTempFilters({
      topicType: 'all',
      hasAttachments: false,
      categoryIds: [],
      tags: [],
    });
    setShowFilters(false);
  };

  const addTagFilter = (tag: string) => {
    const currentTags = (listing.activeFilters['tags'] as string[]) ?? [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      listing.setFilter('tags', newTags);
      setTempFilters((prev) => ({ ...prev, tags: newTags }));
    }
  };

  const removeTagFilter = (tag: string) => {
    const currentTags = (listing.activeFilters['tags'] as string[]) ?? [];
    const newTags = currentTags.filter((t) => t !== tag);
    listing.setFilter('tags', newTags.length ? newTags : undefined);
    setTempFilters((prev) => ({ ...prev, tags: newTags }));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const highlightText = (text: string, highlights: string[]): string => {
    if (!highlights.length) return text;

    let highlightedText = text;
    highlights.forEach((highlight) => {
      const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escaped) return;
      const regex = new RegExp(`(${escaped})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  };

  // Split flat items back into topics and posts
  const allTopics = listing.items.filter((item) => item.type === 'topic');
  const allPosts = listing.items.filter((item) => item.type === 'post');

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'topics':
        return { topics: allTopics, posts: [] };
      case 'posts':
        return { topics: [], posts: allPosts };
      default:
        return { topics: allTopics, posts: allPosts };
    }
  };

  const filteredResults = getFilteredResults();
  const totalResults = listing.totalCount;

  const activeTags = (listing.activeFilters['tags'] as string[]) ?? [];
  const activeCategoryIds = (listing.activeFilters['categoryIds'] as string[]) ?? [];
  const activeTopicType = (listing.activeFilters['topicType'] as string) ?? 'all';
  const activeHasAttachments = (listing.activeFilters['hasAttachments'] as boolean) ?? false;
  const activeAuthorId = listing.activeFilters['authorId'] as string | undefined;

  const hasActiveFilters =
    activeCategoryIds.length > 0 ||
    activeTags.length > 0 ||
    activeAuthorId ||
    activeTopicType !== 'all' ||
    activeHasAttachments;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-6">
          <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
            {t.forum.search}
          </h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder={t.forum.searchPlaceholder}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={listing.loading}
                className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
              >
                {listing.loading ? 'Searching...' : t.forum.search}
              </button>
            </div>
          </form>

          {/* Quick Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 transition-colors dark:border-gray-600 ${
                showFilters || hasActiveFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-900 dark:text-blue-400'
                  : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t.forum.filters}
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            <select
              value={listing.sort.field}
              onChange={(e) =>
                listing.setSort({ field: e.target.value, direction: 'desc' })
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="relevance">{t.forum.sortByRelevance}</option>
              <option value="date">{t.forum.sortByDate}</option>
              <option value="votes">{t.forum.sortByVotes}</option>
              <option value="replies">{t.forum.sortByReplies}</option>
            </select>

            {/* Active Tag Filters */}
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                #{tag}
                <button
                  onClick={() => removeTagFilter(tag)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                {t.forum.clearFilters}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Categories */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.forum.filterByCategory}
                </label>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={
                          ((tempFilters['categoryIds'] as string[]) ?? []).includes(category.id)
                        }
                        onChange={(e) => {
                          const categoryIds = (tempFilters['categoryIds'] as string[]) ?? [];
                          if (e.target.checked) {
                            setTempFilters((prev) => ({
                              ...prev,
                              categoryIds: [...categoryIds, category.id],
                            }));
                          } else {
                            setTempFilters((prev) => ({
                              ...prev,
                              categoryIds: categoryIds.filter(
                                (id) => id !== category.id
                              ),
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {category['name']}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.forum.filterByDate}
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={
                      (tempFilters['dateFrom'] as Date | undefined)
                        ?.toISOString()
                        .split('T')[0] || ''
                    }
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value)
                        : undefined;
                      setTempFilters((prev) => ({ ...prev, dateFrom: date }));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="From date"
                  />
                  <input
                    type="date"
                    value={
                      (tempFilters['dateTo'] as Date | undefined)
                        ?.toISOString()
                        .split('T')[0] || ''
                    }
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value)
                        : undefined;
                      setTempFilters((prev) => ({ ...prev, dateTo: date }));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="To date"
                  />
                </div>
              </div>

              {/* Topic Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Topic Type
                </label>
                <select
                  value={(tempFilters['topicType'] as string) ?? 'all'}
                  onChange={(e) =>
                    setTempFilters((prev) => ({
                      ...prev,
                      topicType: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Topics</option>
                  <option value="solved">{t.forum.topic.solved}</option>
                  <option value="unsolved">Unsolved</option>
                  <option value="pinned">{t.forum.topic.pinned}</option>
                </select>
              </div>

              {/* Other Options */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(tempFilters['hasAttachments'] as boolean) || false}
                      onChange={(e) =>
                        setTempFilters((prev) => ({
                          ...prev,
                          hasAttachments: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Has attachments
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
              <button
                onClick={applyFilters}
                className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                Apply Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Results Summary */}
        {searchPerformed && (
          <div className="mb-6">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {totalResults > 0
                  ? `${totalResults} ${t.forum.searchResults}`
                  : t.forum.noResults}
                {listing.query && ` for "${listing.query}"`}
              </h2>

              {/* Result Type Tabs */}
              {totalResults > 0 && (
                <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`rounded-md px-4 py-2 text-sm transition-colors ${
                      activeTab === 'all'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    All ({totalResults})
                  </button>
                  <button
                    onClick={() => setActiveTab('topics')}
                    className={`rounded-md px-4 py-2 text-sm transition-colors ${
                      activeTab === 'topics'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Topics ({allTopics.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={`rounded-md px-4 py-2 text-sm transition-colors ${
                      activeTab === 'posts'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    Posts ({allPosts.length})
                  </button>
                </div>
              )}
            </div>

            {totalResults === 0 && searchPerformed && (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  {t.forum.noResults}
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                  {t.forum.noResultsDescription}
                </p>
                <button
                  onClick={clearFilters}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                >
                  {t.forum.clearFilters}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results List */}
        {totalResults > 0 && (
          <div className="space-y-4">
            {/* Topic Results */}
            {filteredResults.topics.map((result) => (
              <div
                key={`topic-${result.id}`}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Topic
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        in {result.categoryName}
                      </span>
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                      <a
                        href={`/${language}/forum/topic/${result.id}`}
                        className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(highlightText(
                            result.title,
                            result.highlights
                          )),
                        }}
                      />
                    </h3>

                    <div
                      className="mb-3 line-clamp-2 text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(highlightText(
                          result.excerpt,
                          result.highlights
                        )),
                      }}
                    />

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {result.authorName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(result['createdAt'])}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Score: {result.score}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Post Results */}
            {filteredResults.posts.map((result) => (
              <div
                key={`post-${result.id}`}
                className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                        Post
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        in topic:{' '}
                        <a
                          href={`/${language}/forum/topic/${result.topicId}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {result.title || 'View Topic'}
                        </a>
                      </span>
                    </div>

                    <div
                      className="mb-3 line-clamp-3 text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(highlightText(
                          result.excerpt,
                          result.highlights
                        )),
                      }}
                    />

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {result.authorName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(result['createdAt'])}
                      </div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Score: {result.score}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {listing.loading && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 dark:text-gray-400">Searching...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumSearch;
