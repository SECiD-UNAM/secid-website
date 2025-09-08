import React, { useState, useEffect } from 'react';
import {
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  Tag, 
  FileText, 
  MessageCircle, 
  Eye, 
  ThumbsUp, 
  Clock,
  Pin,
  CheckCircle,
  Lock
} from 'lucide-react';
import { useTranslations} from '../../hooks/useTranslations';
import { forumSearch, forumCategories} from '../../lib/forum';
import type { ForumSearchFilters, ForumSearchResult, ForumCategory, Language } from '../../types';

interface ForumSearchProps {
  language: Language;
  initialQuery?: string;
  initialFilters?: Partial<ForumSearchFilters>;
}

const ForumSearch: React.FC<ForumSearchProps> = ({ language, initialQuery = '', initialFilters = {} }) => {
  const t = useTranslations(language);
  
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<ForumSearchFilters>({
    query: initialQuery,
    sortBy: 'relevance',
    sortOrder: 'desc',
    topicType: 'all',
    hasAttachments: false,
    ...initialFilters
  });
  
  // Results state
  const [results, setResults] = useState<{ topics: ForumSearchResult[]; posts: ForumSearchResult[] }>({
    topics: [],
    posts: []
  });
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'topics' | 'posts'>('all');
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  
  // Filter state
  const [tempFilters, setTempFilters] = useState<ForumSearchFilters>(filters);

  useEffect(() => {
    loadCategories();
    if(initialQuery) {
      performSearch();
    }
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await forumCategories.getAll();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setSearchPerformed(true);
      
      const searchFilters: ForumSearchFilters = {
        ...filters,
        query: query.trim()
      };

      const searchResults = await forumSearch.search(searchFilters);
      setResults(searchResults);
      setTotalResults(searchResults.topics.length + searchResults.posts.length);
      
      // Update URL with search params
      const params = new URLSearchParams();
      params['set']('q', query);
      if (filters?.categoryIds?.length) params['set']('categories', filters.categoryIds.join(','));
      if (filters?.tags?.length) params['set']('tags', filters.tags.join(','));
      if (filters.authorId) params['set']('author', filters.authorId);
      if (filters.sortBy !== 'relevance') params['set']('sort', filters.sortBy);
      if (filters.topicType !== 'all') params['set']('type', filters.topicType);
      if (filters.hasAttachments) params['set']('attachments', 'true');
      
      window.history.replaceState(null, '', `?${params['toString']()}`);
      
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    performSearch();
  };

  const clearFilters = () => {
    const resetFilters: ForumSearchFilters = {
      query,
      sortBy: 'relevance',
      sortOrder: 'desc',
      topicType: 'all',
      hasAttachments: false
    };
    setFilters(resetFilters);
    setTempFilters(resetFilters);
    setShowFilters(false);
  };

  const addTagFilter = (tag: string) => {
    if (!filters?.tags?.includes(tag)) {
      const newTags = [...(filters.tags || []), tag];
      setFilters(prev => ({ ...prev, tags: newTags }));
      setTempFilters(prev => ({ ...prev, tags: newTags }));
      performSearch();
    }
  };

  const removeTagFilter = (tag: string) => {
    const newTags = filters?.tags?.filter(t => t !== tag) || [];
    setFilters(prev => ({ ...prev, tags: newTags.length ? newTags : undefined }));
    setTempFilters(prev => ({ ...prev, tags: newTags.length ? newTags : undefined }));
    performSearch();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const highlightText = (text: string, highlights: string[]): string => {
    if (!highlights.length) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      const regex = new RegExp(`(${highlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  };

  const getFilteredResults = () => {
    switch(activeTab) {
      case 'topics':
        return { topics: results.topics, posts: [] };
      case 'posts':
        return { topics: [], posts: results.posts };
      default:
        return results;
    }
  };

  const filteredResults = getFilteredResults();
  const hasActiveFilters = filters?.categoryIds?.length || filters?.tags?.length || 
                          filters.authorId || filters.topicType !== 'all' || 
                          filters.hasAttachments;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{t.forum.search}</h1>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.forum.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Searching...' : t.forum.search}
              </button>
            </div>
          </form>

          {/* Quick Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              {t.forum.filters}
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="relevance">{t.forum.sortByRelevance}</option>
              <option value="date">{t.forum.sortByDate}</option>
              <option value="votes">{t.forum.sortByVotes}</option>
              <option value="replies">{t.forum.sortByReplies}</option>
            </select>

            {/* Active Filters */}
            {filters?.tags?.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
              >
                #{tag}
                <button
                  onClick={() => removeTagFilter(tag)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t.forum.clearFilters}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.filterByCategory}
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tempFilters?.categoryIds?.includes(category.id) || false}
                        onChange={(e) => {
                          const categoryIds = tempFilters.categoryIds || [];
                          if (e.target.checked) {
                            setTempFilters(prev => ({
                              ...prev,
                              categoryIds: [...categoryIds, category.id]
                            }));
                          } else {
                            setTempFilters(prev => ({
                              ...prev,
                              categoryIds: categoryIds.filter(id => id !== category.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{category['name']}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.forum.filterByDate}
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={tempFilters?.dateRange?.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setTempFilters(prev => ({
                        ...prev,
                        dateRange: {
                          start: date,
                          end: prev?.dateRange?.end || new Date()
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="From date"
                  />
                  <input
                    type="date"
                    value={tempFilters?.dateRange?.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : undefined;
                      setTempFilters(prev => ({
                        ...prev,
                        dateRange: {
                          start: prev?.dateRange?.start || new Date('2020-01-01'),
                          end: date
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="To date"
                  />
                </div>
              </div>

              {/* Topic Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic Type
                </label>
                <select
                  value={tempFilters.topicType}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, topicType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Topics</option>
                  <option value="solved">{t.forum.topic.solved}</option>
                  <option value="unsolved">Unsolved</option>
                  <option value="pinned">{t.forum.topic.pinned}</option>
                </select>
              </div>

              {/* Other Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={tempFilters.hasAttachments || false}
                      onChange={(e) => setTempFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Has attachments</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {totalResults > 0 
                  ? `${totalResults} ${t.forum.searchResults}`
                  : t.forum.noResults
                }
                {query && ` for "${query}"`}
              </h2>

              {/* Result Type Tabs */}
              {totalResults > 0 && (
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    All ({totalResults})
                  </button>
                  <button
                    onClick={() => setActiveTab('topics')}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      activeTab === 'topics'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Topics ({results.topics.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('posts')}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                      activeTab === 'posts'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Posts ({results.posts.length})
                  </button>
                </div>
              )}
            </div>

            {totalResults === 0 && searchPerformed && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t.forum.noResults}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t.forum.noResultsDescription}
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
              <div key={`topic-${result.id}`} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                        Topic
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        in {result.categoryName}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      <a 
                        href={`/${language}/forum/topic/${result.id}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightText(result.title, result.highlights) 
                        }}
                      />
                    </h3>
                    
                    <div 
                      className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(result.excerpt, result.highlights) 
                      }}
                    />
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {result.authorName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
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
              <div key={`post-${result.id}`} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                        Post
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        in topic:{' '}
                        <a 
                          href={`/${language}/forum/topic/${result.topicId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {result.title || 'View Topic'}
                        </a>
                      </span>
                    </div>
                    
                    <div 
                      className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-3"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(result.excerpt, result.highlights) 
                      }}
                    />
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {result.authorName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
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
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Searching...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumSearch;