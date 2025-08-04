/**
 * Advanced Search Engine Implementation for SECiD Platform
 * Features: Fuzzy matching, typo tolerance, relevance scoring, and bilingual support
 */

import type {
  SearchQuery,
  SearchResponse,
  SearchResultItem,
  SearchSuggestion,
  SearchFilters,
  IndexedContent,
  SearchIndexConfig,
  SearchSyntax,
  SearchContentType,
  SearchHighlight,
  SearchFacets,
  SearchAnalyticsEvent,
} from '@/types/search';

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix?.[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Text normalization and cleaning
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokenization with stemming support
function tokenize(text: string, language: 'es' | 'en' = 'es'): string[] {
  const normalized = normalizeText(text);
  const tokens = normalized.split(' ').filter((token) => token.length > 1);

  // Apply basic stemming rules
  return tokens.map((token) => applyStemming(token, language));
}

// Basic stemming implementation
function applyStemming(word: string, language: 'es' | 'en'): string {
  if (word.length < 4) return word;

  const spanishSuffixes = [
    'ando',
    'endo',
    'idos',
    'adas',
    'cion',
    'sion',
    'mente',
  ];
  const englishSuffixes = ['ing', 'ed', 'er', 'est', 'ly', 'tion', 'sion'];

  const suffixes = language === 'es' ? spanishSuffixes : englishSuffixes;

  for (const suffix of suffixes) {
    if (word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

// Stop words for different languages
const STOP_WORDS = {
  es: [
    'el',
    'la',
    'de',
    'que',
    'y',
    'a',
    'en',
    'un',
    'es',
    'se',
    'no',
    'te',
    'lo',
    'le',
    'da',
    'su',
    'por',
    'son',
    'con',
    'para',
    'al',
    'del',
    'los',
    'las',
    'una',
    'como',
    'pero',
    'sus',
    'le',
    'ya',
    'o',
    'porque',
    'cuando',
    'muy',
    'sin',
    'sobre',
    'ser',
    'tiene',
    'hasta',
    'hay',
    'donde',
    'han',
    'quien',
    'están',
    'estado',
    'desde',
    'todo',
    'nos',
    'durante',
    'todos',
    'uno',
    'puede',
    'hace',
    'cada',
    'gran',
    'año',
    'años',
    'tiempo',
    'día',
    'días',
  ],
  en: [
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'i',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'time',
    'no',
    'just',
    'him',
    'know',
    'take',
    'people',
    'into',
    'year',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
    'back',
    'after',
    'use',
    'two',
    'how',
    'our',
    'work',
    'first',
    'well',
    'way',
    'even',
    'new',
    'want',
    'because',
    'any',
    'these',
    'give',
    'day',
    'most',
    'us',
  ],
};

// Advanced search syntax parser
function parseSearchSyntax(query: string): SearchSyntax {
  const syntax: SearchSyntax = {
    phrases: [],
    required: [],
    excluded: [],
    fields: {},
    operators: [],
    wildcards: [],
    proximity: [],
  };

  // Extract phrases (quoted text)
  const phraseRegex = /"([^"]*)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    syntax.phrases.push(match?.[1]);
    query = query.replace(match?.[0], '');
  }

  // Extract field queries (field:value)
  const fieldRegex = /(\w+):(\w+)/g;
  while ((match = fieldRegex.exec(query)) !== null) {
    syntax.fields[match?.[1]] = match?.[2];
    query = query.replace(match?.[0], '');
  }

  // Extract required terms (+term)
  const requiredRegex = /\+(\w+)/g;
  while ((match = requiredRegex.exec(query)) !== null) {
    syntax.required.push(match?.[1]);
    query = query.replace(match?.[0], '');
  }

  // Extract excluded terms (-term)
  const excludedRegex = /-(\w+)/g;
  while ((match = excludedRegex.exec(query)) !== null) {
    syntax.excluded.push(match?.[1]);
    query = query.replace(match?.[0], '');
  }

  // Extract wildcards (term*)
  const wildcardRegex = /(\w+)\*/g;
  while ((match = wildcardRegex.exec(query)) !== null) {
    syntax.wildcards.push(match?.[1]);
    query = query.replace(match?.[0], '');
  }

  // Extract proximity searches ("term1 term2"~5)
  const proximityRegex = /"([^"]*)"\~(\d+)/g;
  while ((match = proximityRegex.exec(query)) !== null) {
    syntax.proximity.push({
      terms: match?.[1].split(' '),
      distance: parseInt(match?.[2]),
    });
    query = query.replace(match?.[0], '');
  }

  return syntax;
}

// Highlight generator for search results
function generateHighlights(
  content: string,
  queryTerms: string[],
  maxSnippets: number = 3
): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];
  const normalizedContent = normalizeText(content);

  for (const term of queryTerms) {
    const normalizedTerm = normalizeText(term);
    const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'gi');
    const matches = [];
    let match;

    while (
      (match = regex.exec(normalizedContent)) !== null &&
      matches.length < maxSnippets
    ) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(
        normalizedContent.length,
        match.index + term.length + 50
      );
      const snippet = normalizedContent.slice(start, end);

      matches.push({
        start: match.index,
        end: match.index + term.length,
        text: term,
      });

      highlights.push({
        field: 'content',
        snippet: snippet,
        matches: [matches[matches.length - 1]],
      });
    }
  }

  return highlights;
}

// TF-IDF scoring implementation
class TFIDFScorer {
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;

  updateIndex(documents: IndexedContent[]): void {
    this.totalDocuments = documents.length;
    this.documentFrequency.clear();

    for (const doc of documents) {
      const tokens = new Set(tokenize(doc.searchableText, doc['language']));
      for (const token of tokens) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) || 0) + 1
        );
      }
    }
  }

  calculateScore(queryTerms: string[], document: IndexedContent): number {
    const docTokens = tokenize(document.searchableText, document['language']);
    const termFreq: Map<string, number> = new Map();

    // Calculate term frequency
    for (const token of docTokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTerms) {
      const tf = termFreq.get(term) || 0;
      const df = this.documentFrequency.get(term) || 1;
      const idf = Math.log(this.totalDocuments / df);

      score += tf * idf;
    }

    return score * document.boost;
  }
}

// Main Search Engine class
export class SearchEngine {
  private index: IndexedContent[] = [];
  private config: SearchIndexConfig;
  private tfidfScorer: TFIDFScorer;
  private lastUpdate: Date = new Date();

  constructor(config?: Partial<SearchIndexConfig>) {
    this.config = {
      fields: {
        title: { weight: 3, boost: 2 },
        content: { weight: 1, boost: 1 },
        description: { weight: 2, boost: 1.5 },
        tags: { weight: 2.5, boost: 1.8 },
        keywords: { weight: 3, boost: 2.2 },
      },
      fuzzy: {
        enabled: true,
        maxDistance: 2,
        prefixLength: 2,
      },
      stemming: {
        enabled: true,
        languages: ['es', 'en'],
      },
      stopWords: STOP_WORDS,
      ...config,
    };

    this.tfidfScorer = new TFIDFScorer();
  }

  // Update search index
  updateIndex(content: IndexedContent[]): void {
    this.index = content.filter((item) => item.isActive);
    this.tfidfScorer.updateIndex(this.index);
    this.lastUpdate = new Date();
  }

  // Main search method
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();

    if (!query.query.trim()) {
      return this.getEmptyResponse(query);
    }

    const syntax = parseSearchSyntax(query.query);
    const queryTerms = this.extractQueryTerms(query.query, syntax);

    // Filter content by type and other filters
    let filteredContent = this.applyFilters(this.index, query.filters);

    // Search and score results
    let results = this.scoreAndRankResults(
      filteredContent,
      queryTerms,
      syntax,
      query
    );

    // Apply sorting
    results = this.applySorting(results, query.sort);

    // Generate facets
    const facets = this.generateFacets(filteredContent, queryTerms);

    // Paginate results
    const total = results.length;
    const startIndex = query.pagination.page * query.pagination.limit;
    const paginatedResults = results.slice(
      startIndex,
      startIndex + query.pagination.limit
    );

    // Generate suggestions
    const suggestions = await this.generateSuggestions(query.query, queryTerms);

    const searchTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      total,
      page: query.pagination.page,
      totalPages: Math.ceil(total / query.pagination.limit),
      facets,
      suggestions,
      query: query.query,
      searchTime,
      hasMore: startIndex + query.pagination.limit < total,
    };
  }

  private extractQueryTerms(query: string, syntax: SearchSyntax): string[] {
    let cleanQuery = query;

    // Remove syntax elements
    cleanQuery = cleanQuery.replace(/"[^"]*"/g, ''); // Remove phrases
    cleanQuery = cleanQuery.replace(/\w+:\w+/g, ''); // Remove field queries
    cleanQuery = cleanQuery.replace(/[+\-]/g, ''); // Remove operators
    cleanQuery = cleanQuery.replace(/\*/g, ''); // Remove wildcards

    const terms = tokenize(cleanQuery);
    const allTerms = [...terms, ...syntax.phrases, ...syntax.required];

    return [...new Set(allTerms)].filter(
      (term) =>
        !this.config.stopWords.es.includes(term) &&
        !this.config.stopWords.en.includes(term) &&
        term.length > 1
    );
  }

  private applyFilters(
    content: IndexedContent[],
    filters: SearchFilters
  ): IndexedContent[] {
    return content.filter((item) => {
      // Content type filter
      if (
        filters.contentTypes.length > 0 &&
        !filters.contentTypes.includes('all') &&
        !filters.contentTypes.includes(item.type)
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const itemDate = item['createdAt'];
        if (
          itemDate < filters.dateRange.start ||
          itemDate > filters.dateRange.end
        ) {
          return false;
        }
      }

      // Language filter
      if (
        filters.language &&
        filters.language !== 'all' &&
        item.language !== filters.language
      ) {
        return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) =>
          item.tags.some((itemTag) =>
            normalizeText(itemTag).includes(normalizeText(tag))
          )
        );
        if (!hasMatchingTag) return false;
      }

      // Category filter
      if (filters.category && filters.category.length > 0) {
        const itemCategory = item.metadata.category;
        if (!itemCategory || !filters.category.includes(itemCategory)) {
          return false;
        }
      }

      return true;
    });
  }

  private scoreAndRankResults(
    content: IndexedContent[],
    queryTerms: string[],
    syntax: SearchSyntax,
    query: SearchQuery
  ): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    for (const item of content) {
      const score = this.calculateRelevanceScore(
        item,
        queryTerms,
        syntax,
        query.options
      );

      if (score >= query.options.minScore) {
        const highlights = query.options.highlightResults
          ? generateHighlights(item.searchableText, queryTerms)
          : [];

        results.push({
          id: item.id,
          type: item['type'],
          title: item.title,
          description: item.description,
          content: query.options.includeContent ? item.content : '',
          url: item.url,
          tags: item.tags,
          author: item.metadata.author
            ? {
                id: item['metadata'].author.id,
                name: item.metadata.author['name'],
                avatar: item['metadata'].author.avatar,
              }
            : undefined,
          metadata: {
            createdAt: item['createdAt'],
            updatedAt: item['updatedAt'],
            category: item['metadata'].category,
            location: item.metadata.location,
            company: item['metadata'].company,
            level: item.metadata.level,
            status: item['metadata'].status,
          },
          score,
          highlights,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private calculateRelevanceScore(
    item: IndexedContent,
    queryTerms: string[],
    syntax: SearchSyntax,
    options: any
  ): number {
    let score = 0;
    const itemTokens = tokenize(item.searchableText, item.language);

    // Base TF-IDF score
    score += this.tfidfScorer.calculateScore(queryTerms, item);

    // Field-specific scoring
    const titleTokens = tokenize(item.title, item.language);
    const descTokens = tokenize(item.description, item.language);
    const tagTokens = item.tags.flatMap((tag) => tokenize(tag, item.language));

    for (const term of queryTerms) {
      // Title matches (highest weight)
      if (titleTokens.includes(term)) {
        score +=
          this.config.fields['title'].weight *
          this.config.fields['title'].boost;
      }

      // Description matches
      if (descTokens.includes(term)) {
        score +=
          this.config.fields['description'].weight *
          this.config.fields['description'].boost;
      }

      // Tag matches
      if (tagTokens.includes(term)) {
        score +=
          this.config.fields['tags'].weight * this.config.fields['tags'].boost;
      }

      // Exact phrase matches (bonus)
      if (item.searchableText.toLowerCase().includes(term.toLowerCase())) {
        score += 2;
      }
    }

    // Fuzzy matching bonus
    if (options.fuzzyMatching && this.config.fuzzy.enabled) {
      for (const term of queryTerms) {
        for (const token of itemTokens) {
          const distance = levenshteinDistance(term, token);
          if (
            distance <= this.config.fuzzy.maxDistance &&
            token.length >= this.config.fuzzy.prefixLength
          ) {
            score += Math.max(0, 1 - distance / term.length);
          }
        }
      }
    }

    // Required terms check
    for (const required of syntax.required) {
      if (!itemTokens.includes(required)) {
        return 0; // Exclude if required term is missing
      }
    }

    // Excluded terms check
    for (const excluded of syntax.excluded) {
      if (itemTokens.includes(excluded)) {
        return 0; // Exclude if excluded term is found
      }
    }

    // Recency boost (newer content gets slight boost)
    const daysSinceCreation =
      (Date.now() - item['createdAt'].getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - daysSinceCreation / 365) * 0.1;
    score += recencyBoost;

    return score * item.boost;
  }

  private applySorting(
    results: SearchResultItem[],
    sort: any
  ): SearchResultItem[] {
    switch (sort.field) {
      case 'date':
        return results.sort((a, b) => {
          const aDate = a.metadata.createdAt.getTime();
          const bDate = b['metadata'].createdAt.getTime();
          return sort.direction === 'asc' ? aDate - bDate : bDate - aDate;
        });

      case 'title':
        return results.sort((a, b) => {
          const comparison = a.title.localeCompare(b.title);
          return sort.direction === 'asc' ? comparison : -comparison;
        });

      case 'relevance':
      default:
        return results; // Already sorted by score
    }
  }

  private generateFacets(
    content: IndexedContent[],
    queryTerms: string[]
  ): SearchFacets {
    const typeCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    for (const item of content) {
      // Content type counts
      typeCounts[item['type']] = (typeCounts[item['type']] || 0) + 1;

      // Category counts
      if (item['metadata'].category) {
        categoryCounts[item['metadata'].category] =
          (categoryCounts[item.metadata.category] || 0) + 1;
      }

      // Tag counts
      for (const tag of item.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return {
      contentTypes: Object.entries(typeCounts).map(([type, count]) => ({
        type: type as SearchContentType,
        count,
        label: this.getContentTypeLabel(type as SearchContentType),
      })),
      categories: Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, count]) => ({ category, count })),
      authors: [], // Would need author data from metadata
      tags: Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count })),
      dateRanges: [
        { range: 'last_day', label: 'Last 24 hours', count: 0 },
        { range: 'last_week', label: 'Last week', count: 0 },
        { range: 'last_month', label: 'Last month', count: 0 },
        { range: 'last_year', label: 'Last year', count: 0 },
      ],
    };
  }

  private getContentTypeLabel(type: SearchContentType): string {
    const labels: Record<SearchContentType, string> = {
      jobs: 'Jobs',
      events: 'Events',
      forums: 'Forums',
      members: 'Members',
      resources: 'Resources',
      mentors: 'Mentors',
      news: 'News',
      all: 'All',
    };
    return labels[type] || type;
  }

  private async generateSuggestions(
    query: string,
    queryTerms: string[]
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Query completion suggestions
    if (query.length >= 2) {
      const partialMatches = this.index
        .filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
        .map((item) => ({
          text: item.title,
          type: 'query' as const,
          score: 1,
          category: item['type'],
        }));

      suggestions.push(...partialMatches);
    }

    // Tag suggestions
    const popularTags = this.getPopularTags()
      .filter((tag) => tag.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map((tag) => ({
        text: tag,
        type: 'filter' as const,
        score: 0.8,
      }));

    suggestions.push(...popularTags);

    return suggestions.sort((a, b) => b.score - a.score);
  }

  private getPopularTags(): string[] {
    const tagCounts: Record<string, number> = {};

    for (const item of this.index) {
      for (const tag of item.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag]) => tag);
  }

  private getEmptyResponse(query: SearchQuery): SearchResponse {
    return {
      results: [],
      total: 0,
      page: 0,
      totalPages: 0,
      facets: {
        contentTypes: [],
        categories: [],
        authors: [],
        tags: [],
        dateRanges: [],
      },
      suggestions: [],
      query: query.query,
      searchTime: 0,
      hasMore: false,
    };
  }

  // Public utility methods
  getIndexStatus() {
    return {
      isReady: this.index.length > 0,
      indexSize: this.index.length,
      lastIndexUpdate: this.lastUpdate,
      indexedContentCounts: this.getContentTypeCounts(),
      searchCount: 0, // Would track in analytics
      avgSearchTime: 0, // Would track in analytics
      errors: [],
    };
  }

  private getContentTypeCounts(): Record<SearchContentType, number> {
    const counts: Record<SearchContentType, number> = {
      jobs: 0,
      events: 0,
      forums: 0,
      members: 0,
      resources: 0,
      mentors: 0,
      news: 0,
      all: 0,
    };

    for (const item of this.index) {
      counts[item['type']]++;
      counts.all++;
    }

    return counts;
  }
}

// Export utility functions
export {
  normalizeText,
  tokenize,
  levenshteinDistance,
  parseSearchSyntax,
  generateHighlights,
};

// Export default instance
export const searchEngine = new SearchEngine();
