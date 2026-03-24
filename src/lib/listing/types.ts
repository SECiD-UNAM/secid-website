import type { ReactNode } from 'react';

export type ViewMode = 'grid' | 'list' | 'compact' | 'table';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'toggle';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ColumnDefinition<T> {
  key: string;
  label: string;
  accessor: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface FetchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: SortConfig;
  page?: number;
  pageSize?: number;
  cursor?: unknown;
}

export interface FetchResult<T> {
  items: T[];
  totalCount: number;
  nextCursor?: unknown;
  hasMore: boolean;
}

export interface CountParams {
  filters?: Record<string, unknown>;
  query?: string;
}

export function isViewMode(value: string): value is ViewMode {
  return ['grid', 'list', 'compact', 'table'].includes(value);
}
