import type { DataAdapter } from './types';
import type { FetchParams, FetchResult, SortConfig } from '../types';

export interface ClientSideAdapterConfig<T> {
  fetchAll?: () => Promise<T[]>;
  initialData?: T[];
  searchFields: string[];
  getId: (item: T) => string;
  toSearchable?: (item: T) => string;
}

export class ClientSideAdapter<T extends object> implements DataAdapter<T> {
  private config: ClientSideAdapterConfig<T>;
  private cache: T[] | null = null;

  constructor(config: ClientSideAdapterConfig<T>) {
    if (!config.fetchAll && !config.initialData) {
      throw new Error('ClientSideAdapter requires either fetchAll or initialData');
    }
    this.config = config;
    if (config.initialData) {
      this.cache = [...config.initialData];
    }
  }

  async fetch(params: FetchParams): Promise<FetchResult<T>> {
    const allItems = await this.loadData();
    let filtered = [...allItems];

    if (params.query?.trim()) {
      filtered = this.applySearch(filtered, params.query.trim());
    }

    if (params.filters) {
      filtered = this.applyFilters(filtered, params.filters);
    }

    if (params.sort) {
      filtered = this.applySort(filtered, params.sort);
    }

    const totalCount = filtered.length;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = filtered.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    return { items, totalCount, hasMore };
  }

  invalidate(): void {
    if (this.config.fetchAll) {
      this.cache = null;
    }
  }

  private async loadData(): Promise<T[]> {
    if (this.cache) return this.cache;
    if (!this.config.fetchAll) return [];
    this.cache = await this.config.fetchAll();
    return this.cache;
  }

  private applySearch(items: T[], query: string): T[] {
    const lowerQuery = query.toLowerCase();
    return items.filter((item) => {
      if (this.config.toSearchable) {
        return this.config.toSearchable(item).toLowerCase().includes(lowerQuery);
      }
      const record = item as Record<string, unknown>;
      return this.config.searchFields.some((field) => {
        const value = record[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery);
        }
        return false;
      });
    });
  }

  private applyFilters(items: T[], filters: Record<string, unknown>): T[] {
    return items.filter((item) => {
      const record = item as Record<string, unknown>;
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true;
        const itemValue = record[key];
        if (Array.isArray(value)) {
          if (value.length === 0) return true;
          if (Array.isArray(itemValue)) {
            return value.some((v) => itemValue.includes(v));
          }
          return value.includes(itemValue);
        }
        return itemValue === value;
      });
    });
  }

  private applySort(items: T[], sort: SortConfig): T[] {
    return [...items].sort((a, b) => {
      const aRec = a as Record<string, unknown>;
      const bRec = b as Record<string, unknown>;
      const aVal = aRec[sort.field];
      const bVal = bRec[sort.field];
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }
      return sort.direction === 'desc' ? -comparison : comparison;
    });
  }
}
