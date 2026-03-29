// src/hooks/useUniversalListing.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DataAdapter } from '@lib/listing/adapters/types';
import type { ViewMode, SortConfig, FilterDefinition, FetchResult } from '@lib/listing/types';

export interface UseUniversalListingConfig<T> {
  adapter: DataAdapter<T>;
  defaultViewMode?: ViewMode;
  defaultPageSize?: number;
  defaultSort?: SortConfig;
  filterDefinitions?: FilterDefinition[];
  paginationMode?: 'offset' | 'cursor';
  debounceMs?: number;
  lang?: 'es' | 'en';
}

export interface UseUniversalListingReturn<T> {
  items: T[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
  query: string;
  setQuery: (q: string) => void;
  activeFilters: Record<string, unknown>;
  setFilter: (key: string, value: unknown) => void;
  clearFilters: () => void;
  sort: SortConfig;
  setSort: (sort: SortConfig) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  goToPage: (n: number) => void;
  loadMore: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function useUniversalListing<T>(
  config: UseUniversalListingConfig<T>
): UseUniversalListingReturn<T> {
  const {
    adapter,
    defaultViewMode = 'grid',
    defaultPageSize = 20,
    defaultSort = { field: 'createdAt', direction: 'desc' as const },
    paginationMode = 'offset',
    debounceMs = 300,
  } = config;

  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryRaw] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});
  const [sort, setSort] = useState<SortConfig>(defaultSort);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [retryCount, setRetryCount] = useState(0);

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const cursorRef = useRef<unknown>(undefined);
  const allCursorItemsRef = useRef<T[]>([]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Reset page when query or filters change
  useEffect(() => {
    setPage(1);
    cursorRef.current = undefined;
    allCursorItemsRef.current = [];
  }, [debouncedQuery, activeFilters]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const result: FetchResult<T> = await adapterRef.current.fetch({
          query: debouncedQuery || undefined,
          filters: activeFilters,
          sort,
          page: paginationMode === 'offset' ? page : undefined,
          pageSize: defaultPageSize,
          cursor: paginationMode === 'cursor' && page > 1 ? cursorRef.current : undefined,
        });

        if (cancelled) return;

        if (paginationMode === 'cursor' && page > 1) {
          const combined = [...allCursorItemsRef.current, ...result.items];
          allCursorItemsRef.current = combined;
          setItems(combined);
        } else {
          allCursorItemsRef.current = result.items;
          setItems(result.items);
        }

        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        if (result.nextCursor) {
          cursorRef.current = result.nextCursor;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [debouncedQuery, activeFilters, sort, page, defaultPageSize, paginationMode, retryCount]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / defaultPageSize)),
    [totalCount, defaultPageSize]
  );

  const setQuery = useCallback((q: string) => setQueryRaw(q), []);
  const setFilter = useCallback((key: string, value: unknown) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }, []);
  const clearFilters = useCallback(() => { setActiveFilters({}); }, []);
  const goToPage = useCallback((n: number) => { setPage(n); }, []);
  const loadMore = useCallback(() => { if (hasMore) setPage((p) => p + 1); }, [hasMore]);
  const retry = useCallback(() => { setRetryCount((c) => c + 1); }, []);

  return {
    items, totalCount, loading, error, retry,
    query, setQuery,
    activeFilters, setFilter, clearFilters,
    sort, setSort,
    page, pageSize: defaultPageSize, totalPages, hasMore, goToPage, loadMore,
    viewMode, setViewMode,
  };
}
