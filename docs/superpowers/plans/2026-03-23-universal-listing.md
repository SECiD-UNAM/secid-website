# Universal Listing System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a composable listing system (hook + adapters + UI components) that adds search/filter/sort/pagination to all SECiD listings, then migrate SpotlightList, CompanyList, and MemberDirectory as validation.

**Architecture:** Headless `useUniversalListing<T>` hook manages state and delegates to DataAdapter implementations (ClientSideAdapter for small collections, FirestoreAdapter for large). Thin UI building blocks compose on top. A convenience `<UniversalListing>` wrapper covers the 80% case.

**Tech Stack:** React 18, TypeScript, Vitest + RTL, Tailwind CSS, Firebase Firestore, existing `SearchEngine` at `src/lib/search/search-engine.ts`

**Spec:** `docs/superpowers/specs/2026-03-23-universal-listing-design.md`

---

## File Map

### New Files

| File                                                        | Responsibility                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/listing/types.ts`                                  | Shared types: ViewMode, SortConfig, FilterDefinition, ColumnDefinition, FetchParams, FetchResult |
| `src/lib/listing/adapters/types.ts`                         | DataAdapter<T> interface                                                                         |
| `src/lib/listing/adapters/ClientSideAdapter.ts`             | In-memory search/filter/sort/paginate using SearchEngine                                         |
| `src/lib/listing/adapters/FirestoreAdapter.ts`              | Firestore query builder + cursor pagination + client-side text search                            |
| `src/lib/listing/i18n.ts`                                   | ES/EN translation map for built-in UI strings                                                    |
| `src/hooks/useUniversalListing.ts`                          | Core headless hook                                                                               |
| `src/components/listing/ListingSearch.tsx`                  | Search input with debounce indicator                                                             |
| `src/components/listing/ListingFilters.tsx`                 | Filter panel (collapsible/visible/drawer)                                                        |
| `src/components/listing/ListingActiveFilters.tsx`           | Applied filter badges with clear                                                                 |
| `src/components/listing/ListingViewToggle.tsx`              | Grid/List/Compact/Table switcher                                                                 |
| `src/components/listing/ListingSort.tsx`                    | Sort dropdown                                                                                    |
| `src/components/listing/ListingGrid.tsx`                    | Grid layout via renderItem                                                                       |
| `src/components/listing/ListingList.tsx`                    | Row layout via renderItem                                                                        |
| `src/components/listing/ListingCompact.tsx`                 | Dense row layout via renderItem                                                                  |
| `src/components/listing/ListingTable.tsx`                   | Sortable column table                                                                            |
| `src/components/listing/ListingPagination.tsx`              | Offset or cursor pagination                                                                      |
| `src/components/listing/ListingEmpty.tsx`                   | Empty state                                                                                      |
| `src/components/listing/ListingLoading.tsx`                 | Skeleton loaders per view mode                                                                   |
| `src/components/listing/ListingStats.tsx`                   | "Showing X of Y" stats                                                                           |
| `src/components/listing/UniversalListing.tsx`               | Convenience wrapper composing all building blocks                                                |
| `src/components/listing/index.ts`                           | Public exports                                                                                   |
| `tests/unit/lib/listing/types.test.ts`                      | Type guard tests                                                                                 |
| `tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts` | Adapter unit tests                                                                               |
| `tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts`  | Adapter unit tests                                                                               |
| `tests/unit/hooks/useUniversalListing.test.ts`              | Hook tests with mock adapter                                                                     |
| `tests/unit/components/listing/ListingSearch.test.tsx`      | Component tests                                                                                  |
| `tests/unit/components/listing/ListingFilters.test.tsx`     | Component tests                                                                                  |
| `tests/unit/components/listing/ListingViewToggle.test.tsx`  | Component tests                                                                                  |
| `tests/unit/components/listing/ListingPagination.test.tsx`  | Component tests                                                                                  |
| `tests/unit/components/listing/ListingTable.test.tsx`       | Component tests                                                                                  |
| `tests/unit/components/listing/UniversalListing.test.tsx`   | Integration tests                                                                                |

### Modified Files

| File                                           | Change                                                         |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `src/components/spotlight/SpotlightList.tsx`   | Migrate to useUniversalListing + UniversalListing              |
| `src/components/companies/CompanyList.tsx`     | Migrate to useUniversalListing + listing building blocks       |
| `src/components/directory/MemberDirectory.tsx` | Migrate to useUniversalListing + listing building blocks       |
| `src/components/directory/MemberSearch.tsx`    | Refactor to wrap ListingFilters or adapt to FilterDefinition[] |

---

## Task 1: Shared Types & Adapter Interface

**Files:**

- Create: `src/lib/listing/types.ts`
- Create: `src/lib/listing/adapters/types.ts`
- Create: `tests/unit/lib/listing/types.test.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// src/lib/listing/types.ts
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

// Type guards
export function isViewMode(value: string): value is ViewMode {
  return ['grid', 'list', 'compact', 'table'].includes(value);
}
```

- [ ] **Step 2: Create the adapter interface**

```typescript
// src/lib/listing/adapters/types.ts
import type { FetchParams, FetchResult, CountParams } from '../types';

export interface DataAdapter<T> {
  fetch(params: FetchParams): Promise<FetchResult<T>>;
  count?(params: CountParams): Promise<number>;
}
```

- [ ] **Step 3: Write type guard tests**

```typescript
// tests/unit/lib/listing/types.test.ts
import { describe, it, expect } from 'vitest';
import { isViewMode } from '@lib/listing/types';

describe('isViewMode', () => {
  it('returns true for valid view modes', () => {
    expect(isViewMode('grid')).toBe(true);
    expect(isViewMode('list')).toBe(true);
    expect(isViewMode('compact')).toBe(true);
    expect(isViewMode('table')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isViewMode('calendar')).toBe(false);
    expect(isViewMode('landscape')).toBe(false);
    expect(isViewMode('')).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/listing/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing/types.ts src/lib/listing/adapters/types.ts tests/unit/lib/listing/types.test.ts
git commit -m "feat(listing): add shared types and DataAdapter interface"
```

---

## Task 2: i18n Translation Map

**Files:**

- Create: `src/lib/listing/i18n.ts`

- [ ] **Step 1: Create the translation map**

```typescript
// src/lib/listing/i18n.ts

export type ListingLang = 'es' | 'en';

const translations = {
  es: {
    search: {
      placeholder: 'Buscar...',
      clearLabel: 'Limpiar búsqueda',
      resultsCount: (count: number) =>
        `${count} resultado${count !== 1 ? 's' : ''}`,
    },
    filters: {
      showFilters: 'Filtros',
      hideFilters: 'Ocultar filtros',
      clearAll: 'Limpiar todo',
      apply: 'Aplicar',
      activeCount: (count: number) =>
        `${count} filtro${count !== 1 ? 's' : ''} activo${count !== 1 ? 's' : ''}`,
    },
    sort: {
      label: 'Ordenar por',
      asc: 'Ascendente',
      desc: 'Descendente',
    },
    viewMode: {
      grid: 'Cuadrícula',
      list: 'Lista',
      compact: 'Compacto',
      table: 'Tabla',
    },
    pagination: {
      previous: 'Anterior',
      next: 'Siguiente',
      loadMore: 'Cargar más',
      showing: (start: number, end: number, total: number) =>
        `Mostrando ${start}–${end} de ${total}`,
      page: (current: number, total: number) => `Página ${current} de ${total}`,
    },
    empty: {
      title: 'Sin resultados',
      description: 'No se encontraron elementos con los filtros actuales.',
      clearFilters: 'Limpiar filtros',
    },
    loading: {
      text: 'Cargando...',
    },
    error: {
      title: 'Error',
      retry: 'Reintentar',
    },
  },
  en: {
    search: {
      placeholder: 'Search...',
      clearLabel: 'Clear search',
      resultsCount: (count: number) =>
        `${count} result${count !== 1 ? 's' : ''}`,
    },
    filters: {
      showFilters: 'Filters',
      hideFilters: 'Hide filters',
      clearAll: 'Clear all',
      apply: 'Apply',
      activeCount: (count: number) =>
        `${count} active filter${count !== 1 ? 's' : ''}`,
    },
    sort: {
      label: 'Sort by',
      asc: 'Ascending',
      desc: 'Descending',
    },
    viewMode: {
      grid: 'Grid',
      list: 'List',
      compact: 'Compact',
      table: 'Table',
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      loadMore: 'Load more',
      showing: (start: number, end: number, total: number) =>
        `Showing ${start}–${end} of ${total}`,
      page: (current: number, total: number) => `Page ${current} of ${total}`,
    },
    empty: {
      title: 'No results',
      description: 'No items found matching the current filters.',
      clearFilters: 'Clear filters',
    },
    loading: {
      text: 'Loading...',
    },
    error: {
      title: 'Error',
      retry: 'Retry',
    },
  },
} as const;

export type ListingTranslations = (typeof translations)['en'];

export function getListingTranslations(lang: ListingLang): ListingTranslations {
  return translations[lang];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/listing/i18n.ts
git commit -m "feat(listing): add bilingual i18n translation map"
```

---

## Task 3: ClientSideAdapter

**Files:**

- Create: `src/lib/listing/adapters/ClientSideAdapter.ts`
- Create: `tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';

interface TestItem {
  id: string;
  name: string;
  category: string;
  score: number;
}

const testData: TestItem[] = [
  { id: '1', name: 'Alpha Project', category: 'tech', score: 90 },
  { id: '2', name: 'Beta Research', category: 'science', score: 85 },
  { id: '3', name: 'Gamma Design', category: 'tech', score: 70 },
  { id: '4', name: 'Delta Analysis', category: 'science', score: 95 },
  { id: '5', name: 'Epsilon Data', category: 'tech', score: 60 },
];

describe('ClientSideAdapter', () => {
  describe('with fetchAll', () => {
    let adapter: ClientSideAdapter<TestItem>;
    const fetchAll = vi.fn().mockResolvedValue(testData);

    beforeEach(() => {
      fetchAll.mockClear();
      adapter = new ClientSideAdapter({
        fetchAll,
        searchFields: ['name', 'category'],
        getId: (item) => item.id,
      });
    });

    it('fetches and returns paginated items', async () => {
      const result = await adapter.fetch({ pageSize: 2, page: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('returns second page correctly', async () => {
      const result = await adapter.fetch({ pageSize: 2, page: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('3');
    });

    it('returns last page with hasMore false', async () => {
      const result = await adapter.fetch({ pageSize: 2, page: 3 });
      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('caches data after first fetch', async () => {
      await adapter.fetch({ pageSize: 10 });
      await adapter.fetch({ pageSize: 10 });
      expect(fetchAll).toHaveBeenCalledTimes(1);
    });

    it('filters by single value', async () => {
      const result = await adapter.fetch({
        filters: { category: 'tech' },
        pageSize: 10,
      });
      expect(result.items).toHaveLength(3);
      expect(result.items.every((i) => i.category === 'tech')).toBe(true);
      expect(result.totalCount).toBe(3);
    });

    it('sorts ascending', async () => {
      const result = await adapter.fetch({
        sort: { field: 'score', direction: 'asc' },
        pageSize: 10,
      });
      expect(result.items[0].score).toBe(60);
      expect(result.items[4].score).toBe(95);
    });

    it('sorts descending', async () => {
      const result = await adapter.fetch({
        sort: { field: 'score', direction: 'desc' },
        pageSize: 10,
      });
      expect(result.items[0].score).toBe(95);
      expect(result.items[4].score).toBe(60);
    });

    it('searches by text query', async () => {
      const result = await adapter.fetch({
        query: 'Alpha',
        pageSize: 10,
      });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].name).toContain('Alpha');
    });

    it('combines search + filter + sort + pagination', async () => {
      const result = await adapter.fetch({
        filters: { category: 'tech' },
        sort: { field: 'score', direction: 'desc' },
        pageSize: 2,
        page: 1,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].score).toBe(90);
      expect(result.items[1].score).toBe(70);
      expect(result.totalCount).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('invalidates cache on invalidate()', async () => {
      await adapter.fetch({ pageSize: 10 });
      adapter.invalidate();
      await adapter.fetch({ pageSize: 10 });
      expect(fetchAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('with initialData', () => {
    it('uses provided data without fetching', async () => {
      const adapter = new ClientSideAdapter({
        initialData: testData,
        searchFields: ['name'],
        getId: (item) => item.id,
      });
      const result = await adapter.fetch({ pageSize: 10 });
      expect(result.items).toHaveLength(5);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ClientSideAdapter**

```typescript
// src/lib/listing/adapters/ClientSideAdapter.ts
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
      throw new Error(
        'ClientSideAdapter requires either fetchAll or initialData'
      );
    }
    this.config = config;
    if (config.initialData) {
      this.cache = [...config.initialData];
    }
  }

  async fetch(params: FetchParams): Promise<FetchResult<T>> {
    const allItems = await this.loadData();
    let filtered = [...allItems];

    // Apply text search
    if (params.query?.trim()) {
      filtered = this.applySearch(filtered, params.query.trim());
    }

    // Apply filters
    if (params.filters) {
      filtered = this.applyFilters(filtered, params.filters);
    }

    // Apply sort
    if (params.sort) {
      filtered = this.applySort(filtered, params.sort);
    }

    // Apply pagination
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
        return this.config
          .toSearchable(item)
          .toLowerCase()
          .includes(lowerQuery);
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts`
Expected: PASS (all 10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing/adapters/ClientSideAdapter.ts tests/unit/lib/listing/adapters/ClientSideAdapter.test.ts
git commit -m "feat(listing): add ClientSideAdapter with search, filter, sort, pagination"
```

---

## Task 4: FirestoreAdapter

**Files:**

- Create: `src/lib/listing/adapters/FirestoreAdapter.ts`
- Create: `tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

The FirestoreAdapter wraps Firestore queries. Tests mock the Firestore SDK since we don't need the emulator for unit tests — the adapter's job is translating FetchParams into query calls and paginating correctly.

```typescript
// tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreAdapter } from '@lib/listing/adapters/FirestoreAdapter';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  query: vi.fn((...args: unknown[]) => ({ _constraints: args.slice(1) })),
  collection: vi.fn((_db: unknown, name: string) => ({ path: name })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    type: 'where',
    field,
    op,
    value,
  })),
  orderBy: vi.fn((field: string, dir: string) => ({
    type: 'orderBy',
    field,
    dir,
  })),
  limit: vi.fn((n: number) => ({ type: 'limit', n })),
  startAfter: vi.fn((cursor: unknown) => ({ type: 'startAfter', cursor })),
  getDocs: vi.fn(),
  getCountFromServer: vi.fn(),
}));

vi.mock('@lib/firebase', () => ({
  db: {},
}));

import { getDocs, getCountFromServer } from 'firebase/firestore';

interface TestDoc {
  id: string;
  name: string;
  status: string;
  createdAt: { toDate: () => Date };
}

const mockDocs = [
  {
    id: '1',
    data: () => ({
      name: 'Alice',
      status: 'active',
      createdAt: { toDate: () => new Date('2026-01-01') },
    }),
  },
  {
    id: '2',
    data: () => ({
      name: 'Bob',
      status: 'active',
      createdAt: { toDate: () => new Date('2026-02-01') },
    }),
  },
  {
    id: '3',
    data: () => ({
      name: 'Charlie',
      status: 'inactive',
      createdAt: { toDate: () => new Date('2026-03-01') },
    }),
  },
];

describe('FirestoreAdapter', () => {
  let adapter: FirestoreAdapter<TestDoc>;

  beforeEach(() => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: mockDocs,
      size: 3,
    } as any);
    vi.mocked(getCountFromServer).mockResolvedValue({
      data: () => ({ count: 3 }),
    } as any);

    adapter = new FirestoreAdapter<TestDoc>({
      collectionName: 'users',
      mapDoc: (id, data) => ({ id, ...data }) as unknown as TestDoc,
      searchFields: ['name'],
      defaultSort: { field: 'createdAt', direction: 'desc' },
    });
  });

  it('fetches items and returns FetchResult', async () => {
    const result = await adapter.fetch({ pageSize: 10 });
    expect(result.items).toHaveLength(3);
    expect(result.totalCount).toBe(3);
    expect(getDocs).toHaveBeenCalled();
  });

  it('applies text search client-side', async () => {
    const result = await adapter.fetch({ query: 'Alice', pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Alice');
  });

  it('reports hasMore when results fill page', async () => {
    const result = await adapter.fetch({ pageSize: 2 });
    // With 3 docs and pageSize 2, after slicing we should have hasMore
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  it('supports cursor pagination', async () => {
    const cursor = { id: 'cursor-doc' };
    await adapter.fetch({ pageSize: 10, cursor });
    expect(getDocs).toHaveBeenCalled();
  });

  it('applies filter constraints', async () => {
    const result = await adapter.fetch({
      filters: { status: 'active' },
      pageSize: 10,
    });
    // Filters applied server-side via where() clause; mock returns all docs
    // but the adapter should have constructed the query with where()
    expect(getDocs).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FirestoreAdapter**

```typescript
// src/lib/listing/adapters/FirestoreAdapter.ts
import {
  query,
  collection,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { DataAdapter } from './types';
import type {
  FetchParams,
  FetchResult,
  CountParams,
  SortConfig,
} from '../types';

export interface FirestoreAdapterConfig<T> {
  collectionName: string;
  mapDoc: (id: string, data: DocumentData) => T;
  searchFields: string[];
  baseConstraints?: QueryConstraint[];
  defaultSort?: SortConfig;
  filterMap?: Record<string, (value: unknown) => QueryConstraint | null>;
}

export class FirestoreAdapter<T> implements DataAdapter<T> {
  private config: FirestoreAdapterConfig<T>;

  constructor(config: FirestoreAdapterConfig<T>) {
    this.config = config;
  }

  async fetch(params: FetchParams): Promise<FetchResult<T>> {
    const pageSize = params.pageSize ?? 20;
    // Over-fetch when searching (client-side text filter reduces results)
    const fetchSize = params.query?.trim() ? pageSize * 2 : pageSize + 1;

    const constraints = this.buildConstraints(params, fetchSize);
    const ref = collection(db, this.config.collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    let items = snapshot.docs.map((doc) =>
      this.config.mapDoc(doc.id, doc.data())
    );

    // Apply text search client-side
    if (params.query?.trim()) {
      items = this.applyClientSearch(items, params.query.trim());
    }

    // Determine hasMore before slicing
    const hasMore = items.length > pageSize;
    items = items.slice(0, pageSize);

    // Get total count
    const totalCount = await this.getTotalCount(params);

    return {
      items,
      totalCount,
      nextCursor: snapshot.docs[snapshot.docs.length - 1] ?? undefined,
      hasMore,
    };
  }

  async count(params: CountParams): Promise<number> {
    return this.getTotalCount(params);
  }

  private buildConstraints(
    params: FetchParams,
    fetchSize: number
  ): QueryConstraint[] {
    const constraints: QueryConstraint[] = [
      ...(this.config.baseConstraints ?? []),
    ];

    // Apply filters
    if (params.filters && this.config.filterMap) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value === undefined || value === null || value === '') continue;
        const mapper = this.config.filterMap[key];
        if (mapper) {
          const constraint = mapper(value);
          if (constraint) constraints.push(constraint);
        }
      }
    }

    // Apply sort
    const sort = params.sort ?? this.config.defaultSort;
    if (sort) {
      constraints.push(orderBy(sort.field, sort.direction));
    }

    // Apply cursor
    if (params.cursor) {
      constraints.push(startAfter(params.cursor));
    }

    // Apply limit
    constraints.push(limit(fetchSize));

    return constraints;
  }

  private applyClientSearch(items: T[], query: string): T[] {
    const lowerQuery = query.toLowerCase();
    return items.filter((item) =>
      this.config.searchFields.some((field) => {
        const value = (item as Record<string, unknown>)[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery);
        }
        return false;
      })
    );
  }

  private async getTotalCount(
    params: FetchParams | CountParams
  ): Promise<number> {
    const constraints: QueryConstraint[] = [
      ...(this.config.baseConstraints ?? []),
    ];

    if (params.filters && this.config.filterMap) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value === undefined || value === null || value === '') continue;
        const mapper = this.config.filterMap[key];
        if (mapper) {
          const constraint = mapper(value);
          if (constraint) constraints.push(constraint);
        }
      }
    }

    const ref = collection(db, this.config.collectionName);
    const q = query(ref, ...constraints);
    const countSnapshot = await getCountFromServer(q);
    return countSnapshot.data().count;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing/adapters/FirestoreAdapter.ts tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts
git commit -m "feat(listing): add FirestoreAdapter with query building and client-side text search"
```

---

## Task 5: `useUniversalListing` Hook

**Files:**

- Create: `src/hooks/useUniversalListing.ts`
- Create: `tests/unit/hooks/useUniversalListing.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/unit/hooks/useUniversalListing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import type { DataAdapter } from '@lib/listing/adapters/types';

interface TestItem {
  id: string;
  name: string;
}

const mockItems: TestItem[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
  { id: '3', name: 'Gamma' },
  { id: '4', name: 'Delta' },
  { id: '5', name: 'Epsilon' },
];

function createMockAdapter(): DataAdapter<TestItem> {
  return {
    fetch: vi.fn().mockResolvedValue({
      items: mockItems.slice(0, 3),
      totalCount: 5,
      hasMore: true,
    }),
  };
}

describe('useUniversalListing', () => {
  let adapter: DataAdapter<TestItem>;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('fetches data on mount', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 3 })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.totalCount).toBe(5);
    expect(adapter.fetch).toHaveBeenCalledTimes(1);
  });

  it('updates query and resets page', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 3 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setQuery('test');
    });

    // Debounced — wait for refetch
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test', page: 1 })
      );
    });
  });

  it('sets and clears filters', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 10 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter('category', 'tech');
    });

    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { category: 'tech' },
          page: 1,
        })
      );
    });

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ filters: {} })
      );
    });
  });

  it('changes sort', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 10 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSort({ field: 'name', direction: 'asc' });
    });

    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: 'name', direction: 'asc' },
        })
      );
    });
  });

  it('navigates pages with goToPage', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({
        adapter,
        defaultPageSize: 3,
        paginationMode: 'offset',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.goToPage(2);
    });

    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
    expect(result.current.page).toBe(2);
  });

  it('manages view mode', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultViewMode: 'grid' })
    );

    expect(result.current.viewMode).toBe('grid');

    act(() => {
      result.current.setViewMode('compact');
    });

    expect(result.current.viewMode).toBe('compact');
  });

  it('handles errors', async () => {
    const failingAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    const { result } = renderHook(() =>
      useUniversalListing({ adapter: failingAdapter })
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
    expect(result.current.loading).toBe(false);
  });

  it('retries on error', async () => {
    const failThenSucceed: DataAdapter<TestItem> = {
      fetch: vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          items: mockItems,
          totalCount: 5,
          hasMore: false,
        }),
    };

    const { result } = renderHook(() =>
      useUniversalListing({ adapter: failThenSucceed })
    );

    await waitFor(() => expect(result.current.error).toBe('Network error'));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(5);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/hooks/useUniversalListing.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/useUniversalListing.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { DataAdapter } from '@lib/listing/adapters/types';
import type {
  ViewMode,
  SortConfig,
  FilterDefinition,
  FetchResult,
} from '@lib/listing/types';

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

  // State
  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQueryRaw] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>(
    {}
  );
  const [sort, setSort] = useState<SortConfig>(defaultSort);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [retryCount, setRetryCount] = useState(0);

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
        const result: FetchResult<T> = await adapter.fetch({
          query: debouncedQuery || undefined,
          filters: activeFilters,
          sort,
          page: paginationMode === 'offset' ? page : undefined,
          pageSize: defaultPageSize,
          cursor:
            paginationMode === 'cursor' && page > 1
              ? cursorRef.current
              : undefined,
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
    return () => {
      cancelled = true;
    };
  }, [
    adapter,
    debouncedQuery,
    activeFilters,
    sort,
    page,
    defaultPageSize,
    paginationMode,
    retryCount,
  ]);

  // Derived
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / defaultPageSize)),
    [totalCount, defaultPageSize]
  );

  // Actions
  const setQuery = useCallback((q: string) => setQueryRaw(q), []);

  const setFilter = useCallback((key: string, value: unknown) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const goToPage = useCallback((n: number) => {
    setPage(n);
  }, []);

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    items,
    totalCount,
    loading,
    error,
    retry,
    query,
    setQuery,
    activeFilters,
    setFilter,
    clearFilters,
    sort,
    setSort,
    page,
    pageSize: defaultPageSize,
    totalPages,
    hasMore,
    goToPage,
    loadMore,
    viewMode,
    setViewMode,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/hooks/useUniversalListing.test.ts`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useUniversalListing.ts tests/unit/hooks/useUniversalListing.test.ts
git commit -m "feat(listing): add useUniversalListing headless hook"
```

---

## Task 6: Core UI Components (Search, Filters, ActiveFilters, ViewToggle, Sort)

**Files:**

- Create: `src/components/listing/ListingSearch.tsx`
- Create: `src/components/listing/ListingFilters.tsx`
- Create: `src/components/listing/ListingActiveFilters.tsx`
- Create: `src/components/listing/ListingViewToggle.tsx`
- Create: `src/components/listing/ListingSort.tsx`
- Create: `tests/unit/components/listing/ListingSearch.test.tsx`
- Create: `tests/unit/components/listing/ListingFilters.test.tsx`
- Create: `tests/unit/components/listing/ListingViewToggle.test.tsx`

- [ ] **Step 1: Write ListingSearch tests**

```typescript
// tests/unit/components/listing/ListingSearch.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingSearch } from '@components/listing/ListingSearch';

describe('ListingSearch', () => {
  it('renders search input with placeholder', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders Spanish placeholder', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="es" />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    const onChange = vi.fn();
    render(<ListingSearch query="" onQueryChange={onChange} lang="en" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('shows clear button when query has value', () => {
    render(<ListingSearch query="test" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement ListingSearch**

```tsx
// src/components/listing/ListingSearch.tsx
import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  lang?: ListingLang;
  totalCount?: number;
  className?: string;
}

export function ListingSearch({
  query,
  onQueryChange,
  lang = 'es',
  totalCount,
  className = '',
}: ListingSearchProps) {
  const t = getListingTranslations(lang);

  return (
    <div role="search" className={`relative w-full ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          role="searchbox"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t.search.placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          aria-label={t.search.placeholder}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={t.search.clearLabel}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
      {totalCount !== undefined && (
        <div className="mt-1 text-sm text-gray-500" aria-live="polite">
          {t.search.resultsCount(totalCount)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run ListingSearch tests**

Run: `npx vitest run tests/unit/components/listing/ListingSearch.test.tsx`
Expected: PASS

- [ ] **Step 4: Implement ListingFilters**

```tsx
// src/components/listing/ListingFilters.tsx
import React, { useState } from 'react';
import type { FilterDefinition } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingFiltersProps {
  definitions: FilterDefinition[];
  activeFilters: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  filterMode?: 'collapsible' | 'visible' | 'drawer';
  lang?: ListingLang;
  className?: string;
}

export function ListingFilters({
  definitions,
  activeFilters,
  onFilterChange,
  onClearAll,
  filterMode = 'collapsible',
  lang = 'es',
  className = '',
}: ListingFiltersProps) {
  const t = getListingTranslations(lang);
  const [isOpen, setIsOpen] = useState(filterMode === 'visible');

  const activeCount = Object.values(activeFilters).filter(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  ).length;

  if (definitions.length === 0) return null;

  const filterPanel = (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {definitions.map((def) => (
        <div key={def.key}>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {def.label}
          </label>
          {renderFilterInput(def, activeFilters[def.key], (val) =>
            onFilterChange(def.key, val)
          )}
        </div>
      ))}
      {activeCount > 0 && (
        <div className="flex items-end">
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            {t.filters.clearAll}
          </button>
        </div>
      )}
    </div>
  );

  if (filterMode === 'visible') {
    return <div className={className}>{filterPanel}</div>;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-expanded={isOpen}
        aria-controls="listing-filters-panel"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {isOpen ? t.filters.hideFilters : t.filters.showFilters}
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
            {activeCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div
          id="listing-filters-panel"
          className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          {filterPanel}
        </div>
      )}
    </div>
  );
}

function renderFilterInput(
  def: FilterDefinition,
  value: unknown,
  onChange: (val: unknown) => void
) {
  switch (def.type) {
    case 'select':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">{def.placeholder ?? '—'}</option>
          {def.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <div className="flex flex-wrap gap-2">
          {def.options?.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = (
                    Array.isArray(value) ? value : []
                  ) as string[];
                  onChange(
                    selected
                      ? current.filter((v) => v !== opt.value)
                      : [...current, opt.value]
                  );
                }}
                className={`rounded-full border px-2 py-1 text-xs ${
                  selected
                    ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200'
                    : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case 'toggle':
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked || undefined)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {def.label}
          </span>
        </label>
      );

    default:
      return null;
  }
}
```

- [ ] **Step 5: Write ListingFilters tests**

```typescript
// tests/unit/components/listing/ListingFilters.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingFilters } from '@components/listing/ListingFilters';

const definitions = [
  { key: 'category', label: 'Category', type: 'select' as const, options: [{ value: 'tech', label: 'Tech' }] },
  { key: 'active', label: 'Active Only', type: 'toggle' as const },
];

describe('ListingFilters', () => {
  it('renders collapsible by default (toggle button visible)', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('expands on click in collapsible mode', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders visible mode without toggle button', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        filterMode="visible"
        lang="en"
      />
    );
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('calls onFilterChange when select changes', () => {
    const onChange = vi.fn();
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={onChange}
        onClearAll={vi.fn()}
        filterMode="visible"
        lang="en"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tech' } });
    expect(onChange).toHaveBeenCalledWith('category', 'tech');
  });

  it('shows active filter count badge', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{ category: 'tech' }}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('returns null when no definitions', () => {
    const { container } = render(
      <ListingFilters
        definitions={[]}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 6: Run filter tests**

Run: `npx vitest run tests/unit/components/listing/ListingFilters.test.tsx`
Expected: PASS

- [ ] **Step 7: Implement ListingActiveFilters**

```tsx
// src/components/listing/ListingActiveFilters.tsx
import React from 'react';
import type { FilterDefinition } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingActiveFiltersProps {
  definitions: FilterDefinition[];
  activeFilters: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  lang?: ListingLang;
  className?: string;
}

export function ListingActiveFilters({
  definitions,
  activeFilters,
  onFilterChange,
  onClearAll,
  lang = 'es',
  className = '',
}: ListingActiveFiltersProps) {
  const t = getListingTranslations(lang);
  const activePairs = Object.entries(activeFilters).filter(
    ([, v]) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  if (activePairs.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {activePairs.map(([key, value]) => {
        const def = definitions.find((d) => d.key === key);
        const label = def?.label ?? key;
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : String(value);

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          >
            <span className="font-medium">{label}:</span> {displayValue}
            <button
              type="button"
              onClick={() => onFilterChange(key, undefined)}
              className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
              aria-label={`Remove ${label} filter`}
            >
              &times;
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400"
      >
        {t.filters.clearAll}
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Implement ListingViewToggle**

```tsx
// src/components/listing/ListingViewToggle.tsx
import React from 'react';
import type { ViewMode } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingViewToggleProps {
  viewMode: ViewMode;
  availableModes: ViewMode[];
  onViewModeChange: (mode: ViewMode) => void;
  lang?: ListingLang;
  className?: string;
}

const viewIcons: Record<ViewMode, React.ReactNode> = {
  grid: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
    </svg>
  ),
  list: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
      />
    </svg>
  ),
  compact: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M2.5 11.5a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"
      />
    </svg>
  ),
  table: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 001-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 001 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" />
    </svg>
  ),
};

export function ListingViewToggle({
  viewMode,
  availableModes,
  onViewModeChange,
  lang = 'es',
  className = '',
}: ListingViewToggleProps) {
  const t = getListingTranslations(lang);

  if (availableModes.length <= 1) return null;

  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className={`flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 ${className}`}
    >
      {availableModes.map((mode) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={viewMode === mode}
          aria-label={t.viewMode[mode]}
          onClick={() => onViewModeChange(mode)}
          className={`p-2 ${
            viewMode === mode
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {viewIcons[mode]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Write ListingViewToggle tests**

```typescript
// tests/unit/components/listing/ListingViewToggle.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingViewToggle } from '@components/listing/ListingViewToggle';

describe('ListingViewToggle', () => {
  it('renders buttons for available modes', () => {
    render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid', 'list', 'compact']}
        onViewModeChange={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByLabelText('Grid')).toBeInTheDocument();
    expect(screen.getByLabelText('List')).toBeInTheDocument();
    expect(screen.getByLabelText('Compact')).toBeInTheDocument();
  });

  it('marks current mode as checked', () => {
    render(
      <ListingViewToggle
        viewMode="list"
        availableModes={['grid', 'list']}
        onViewModeChange={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByLabelText('List')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Grid')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onViewModeChange on click', () => {
    const onChange = vi.fn();
    render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid', 'list']}
        onViewModeChange={onChange}
        lang="en"
      />
    );
    fireEvent.click(screen.getByLabelText('List'));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('returns null when only one mode available', () => {
    const { container } = render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid']}
        onViewModeChange={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 10: Implement ListingSort**

```tsx
// src/components/listing/ListingSort.tsx
import React from 'react';
import type { SortConfig } from '@lib/listing/types';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

export interface SortOption {
  field: string;
  label: string;
}

interface ListingSortProps {
  sort: SortConfig;
  options: SortOption[];
  onSortChange: (sort: SortConfig) => void;
  lang?: ListingLang;
  className?: string;
}

export function ListingSort({
  sort,
  options,
  onSortChange,
  lang = 'es',
  className = '',
}: ListingSortProps) {
  const t = getListingTranslations(lang);

  if (options.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor="listing-sort"
        className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
      >
        {t.sort.label}
      </label>
      <select
        id="listing-sort"
        value={sort.field}
        onChange={(e) => onSortChange({ ...sort, field: e.target.value })}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        {options.map((opt) => (
          <option key={opt.field} value={opt.field}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() =>
          onSortChange({
            ...sort,
            direction: sort.direction === 'asc' ? 'desc' : 'asc',
          })
        }
        className="rounded-md border border-gray-300 p-1.5 text-gray-500 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400"
        aria-label={sort.direction === 'asc' ? t.sort.desc : t.sort.asc}
      >
        {sort.direction === 'asc' ? '↑' : '↓'}
      </button>
    </div>
  );
}
```

- [ ] **Step 11: Run all core UI tests**

Run: `npx vitest run tests/unit/components/listing/ListingSearch.test.tsx tests/unit/components/listing/ListingFilters.test.tsx tests/unit/components/listing/ListingViewToggle.test.tsx`
Expected: PASS (all tests)

- [ ] **Step 12: Commit**

```bash
git add src/components/listing/ListingSearch.tsx src/components/listing/ListingFilters.tsx src/components/listing/ListingActiveFilters.tsx src/components/listing/ListingViewToggle.tsx src/components/listing/ListingSort.tsx tests/unit/components/listing/
git commit -m "feat(listing): add core UI components — Search, Filters, ActiveFilters, ViewToggle, Sort"
```

---

## Task 7: Layout Components (Grid, List, Compact, Table)

**Files:**

- Create: `src/components/listing/ListingGrid.tsx`
- Create: `src/components/listing/ListingList.tsx`
- Create: `src/components/listing/ListingCompact.tsx`
- Create: `src/components/listing/ListingTable.tsx`
- Create: `tests/unit/components/listing/ListingTable.test.tsx`

- [ ] **Step 1: Implement ListingGrid**

```tsx
// src/components/listing/ListingGrid.tsx
import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingGridProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingGrid<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingGridProps<T>) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      role="list"
    >
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'grid')}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement ListingList**

```tsx
// src/components/listing/ListingList.tsx
import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingListProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingListProps<T>) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} role="list">
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'list')}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement ListingCompact**

```tsx
// src/components/listing/ListingCompact.tsx
import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingCompactProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingCompact<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingCompactProps<T>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} role="list">
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'compact')}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement ListingTable**

```tsx
// src/components/listing/ListingTable.tsx
import React from 'react';
import type { ColumnDefinition, SortConfig } from '@lib/listing/types';

interface ListingTableProps<T> {
  items: T[];
  columns: ColumnDefinition<T>[];
  keyExtractor: (item: T) => string;
  sort?: SortConfig;
  onSortChange?: (sort: SortConfig) => void;
  className?: string;
}

export function ListingTable<T>({
  items,
  columns,
  keyExtractor,
  sort,
  onSortChange,
  className = '',
}: ListingTableProps<T>) {
  const handleHeaderClick = (col: ColumnDefinition<T>) => {
    if (!col.sortable || !onSortChange) return;
    const direction =
      sort?.field === col.key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field: col.key, direction });
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
                onClick={() => handleHeaderClick(col)}
                aria-sort={
                  sort?.field === col.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sort?.field === col.key && (
                    <span>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3"
                  style={{ textAlign: col.align ?? 'left' }}
                >
                  {col.accessor(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Write ListingTable tests**

```typescript
// tests/unit/components/listing/ListingTable.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingTable } from '@components/listing/ListingTable';

interface TestItem { id: string; name: string; score: number; }

const items: TestItem[] = [
  { id: '1', name: 'Alice', score: 95 },
  { id: '2', name: 'Bob', score: 80 },
];

const columns = [
  { key: 'name', label: 'Name', accessor: (i: TestItem) => i.name, sortable: true },
  { key: 'score', label: 'Score', accessor: (i: TestItem) => i.score, sortable: true, align: 'right' as const },
];

describe('ListingTable', () => {
  it('renders headers and rows', () => {
    render(<ListingTable items={items} columns={columns} keyExtractor={(i) => i.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('calls onSortChange when sortable header clicked', () => {
    const onSort = vi.fn();
    render(
      <ListingTable
        items={items}
        columns={columns}
        keyExtractor={(i) => i.id}
        sort={{ field: 'name', direction: 'asc' }}
        onSortChange={onSort}
      />
    );
    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith({ field: 'name', direction: 'desc' });
  });

  it('sets aria-sort on active column', () => {
    render(
      <ListingTable
        items={items}
        columns={columns}
        keyExtractor={(i) => i.id}
        sort={{ field: 'name', direction: 'asc' }}
      />
    );
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });
});
```

- [ ] **Step 6: Run layout tests**

Run: `npx vitest run tests/unit/components/listing/ListingTable.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/listing/ListingGrid.tsx src/components/listing/ListingList.tsx src/components/listing/ListingCompact.tsx src/components/listing/ListingTable.tsx tests/unit/components/listing/ListingTable.test.tsx
git commit -m "feat(listing): add layout components — Grid, List, Compact, Table"
```

---

## Task 8: Utility Components (Pagination, Empty, Loading, Stats)

**Files:**

- Create: `src/components/listing/ListingPagination.tsx`
- Create: `src/components/listing/ListingEmpty.tsx`
- Create: `src/components/listing/ListingLoading.tsx`
- Create: `src/components/listing/ListingStats.tsx`
- Create: `tests/unit/components/listing/ListingPagination.test.tsx`

- [ ] **Step 1: Implement ListingPagination**

```tsx
// src/components/listing/ListingPagination.tsx
import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingPaginationProps {
  page: number;
  totalPages: number;
  hasMore: boolean;
  paginationMode: 'offset' | 'cursor';
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
  loading?: boolean;
  lang?: ListingLang;
  className?: string;
}

export function ListingPagination({
  page,
  totalPages,
  hasMore,
  paginationMode,
  onPageChange,
  onLoadMore,
  loading = false,
  lang = 'es',
  className = '',
}: ListingPaginationProps) {
  const t = getListingTranslations(lang);

  if (paginationMode === 'cursor') {
    if (!hasMore) return null;
    return (
      <div className={`mt-6 flex justify-center ${className}`}>
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="rounded-lg border border-blue-300 px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
        >
          {loading ? t.loading.text : t.pagination.loadMore}
        </button>
      </div>
    );
  }

  // Offset pagination
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="pagination"
      className={`mt-6 flex items-center justify-center gap-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        {t.pagination.previous}
      </button>

      <div className="hidden gap-1 sm:flex">
        {pageNumbers.map((n, i) =>
          n === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 py-1.5 text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n as number)}
              aria-current={page === n ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${
                page === n
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
              }`}
            >
              {n}
            </button>
          )
        )}
      </div>

      <span className="text-sm text-gray-500 sm:hidden">
        {t.pagination.page(page, totalPages)}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-30 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        {t.pagination.next}
      </button>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
```

- [ ] **Step 2: Write pagination tests**

```typescript
// tests/unit/components/listing/ListingPagination.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingPagination } from '@components/listing/ListingPagination';

describe('ListingPagination', () => {
  describe('offset mode', () => {
    it('renders page buttons', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('disables previous on first page', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('calls onPageChange on click', () => {
      const onChange = vi.fn();
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={onChange}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      fireEvent.click(screen.getByText('3'));
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('marks current page with aria-current', () => {
      render(
        <ListingPagination
          page={3}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('3')).toHaveAttribute('aria-current', 'page');
    });

    it('returns null for single page', () => {
      const { container } = render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={false}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('cursor mode', () => {
    it('renders load more button', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={true}
          paginationMode="cursor"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('hides when no more items', () => {
      const { container } = render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={false}
          paginationMode="cursor"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });
});
```

- [ ] **Step 3: Implement ListingEmpty**

```tsx
// src/components/listing/ListingEmpty.tsx
import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingEmptyProps {
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  title?: string;
  description?: string;
  lang?: ListingLang;
  className?: string;
}

export function ListingEmpty({
  onClearFilters,
  hasActiveFilters = false,
  title,
  description,
  lang = 'es',
  className = '',
}: ListingEmptyProps) {
  const t = getListingTranslations(lang);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
    >
      <svg
        className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">
        {title ?? t.empty.title}
      </h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {description ?? t.empty.description}
      </p>
      {hasActiveFilters && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.empty.clearFilters}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement ListingLoading**

```tsx
// src/components/listing/ListingLoading.tsx
import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingLoadingProps {
  viewMode: ViewMode;
  count?: number;
  className?: string;
}

export function ListingLoading({
  viewMode,
  count = 6,
  className = '',
}: ListingLoadingProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  switch (viewMode) {
    case 'grid':
      return (
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
        >
          {skeletons.map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="mb-3 h-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      );

    case 'list':
      return (
        <div className={`flex flex-col gap-3 ${className}`}>
          {skeletons.map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="mb-2 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'compact':
      return (
        <div className={`flex flex-col gap-1 ${className}`}>
          {skeletons.map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className={`overflow-x-auto ${className}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                {[1, 2, 3, 4].map((i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletons.map((i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
```

- [ ] **Step 5: Implement ListingStats**

```tsx
// src/components/listing/ListingStats.tsx
import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingStatsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  lang?: ListingLang;
  className?: string;
}

export function ListingStats({
  page,
  pageSize,
  totalCount,
  lang = 'es',
  className = '',
}: ListingStatsProps) {
  const t = getListingTranslations(lang);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {t.pagination.showing(start, end, totalCount)}
    </div>
  );
}
```

- [ ] **Step 6: Run pagination tests**

Run: `npx vitest run tests/unit/components/listing/ListingPagination.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/listing/ListingPagination.tsx src/components/listing/ListingEmpty.tsx src/components/listing/ListingLoading.tsx src/components/listing/ListingStats.tsx tests/unit/components/listing/ListingPagination.test.tsx
git commit -m "feat(listing): add utility components — Pagination, Empty, Loading, Stats"
```

---

## Task 9: UniversalListing Convenience Wrapper & Public Exports

**Files:**

- Create: `src/components/listing/UniversalListing.tsx`
- Create: `src/components/listing/index.ts`
- Create: `tests/unit/components/listing/UniversalListing.test.tsx`

- [ ] **Step 1: Write integration test**

```typescript
// tests/unit/components/listing/UniversalListing.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UniversalListing } from '@components/listing/UniversalListing';
import type { DataAdapter } from '@lib/listing/adapters/types';

interface TestItem { id: string; name: string; category: string; }

const items: TestItem[] = [
  { id: '1', name: 'Alpha', category: 'tech' },
  { id: '2', name: 'Beta', category: 'science' },
  { id: '3', name: 'Gamma', category: 'tech' },
];

const mockAdapter: DataAdapter<TestItem> = {
  fetch: vi.fn().mockResolvedValue({
    items,
    totalCount: 3,
    hasMore: false,
  }),
};

describe('UniversalListing', () => {
  it('renders items after loading', async () => {
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  it('hides search when showSearch=false', async () => {
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        showSearch={false}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no items', async () => {
    const emptyAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockResolvedValue({ items: [], totalCount: 0, hasMore: false }),
    };

    render(
      <UniversalListing
        adapter={emptyAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });

  it('shows error state with retry', async () => {
    const failAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockRejectedValue(new Error('Failed')),
    };

    render(
      <UniversalListing
        adapter={failAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Implement UniversalListing**

```tsx
// src/components/listing/UniversalListing.tsx
import React from 'react';
import {
  useUniversalListing,
  type UseUniversalListingConfig,
} from '@/hooks/useUniversalListing';
import type {
  ViewMode,
  FilterDefinition,
  ColumnDefinition,
} from '@lib/listing/types';
import type { ListingLang } from '@lib/listing/i18n';
import { getListingTranslations } from '@lib/listing/i18n';
import { ListingSearch } from './ListingSearch';
import { ListingFilters } from './ListingFilters';
import { ListingActiveFilters } from './ListingActiveFilters';
import { ListingViewToggle } from './ListingViewToggle';
import { ListingSort, type SortOption } from './ListingSort';
import { ListingGrid } from './ListingGrid';
import { ListingList } from './ListingList';
import { ListingCompact } from './ListingCompact';
import { ListingTable } from './ListingTable';
import { ListingPagination } from './ListingPagination';
import { ListingEmpty } from './ListingEmpty';
import { ListingLoading } from './ListingLoading';
import { ListingStats } from './ListingStats';

interface UniversalListingProps<T> extends UseUniversalListingConfig<T> {
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  columns?: ColumnDefinition<T>[];
  sortOptions?: SortOption[];
  availableViewModes?: ViewMode[];
  filterMode?: 'collapsible' | 'visible' | 'drawer';
  showSearch?: boolean;
  showFilters?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showStats?: boolean;
  showPagination?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function UniversalListing<T>({
  renderItem,
  keyExtractor,
  columns,
  sortOptions = [],
  availableViewModes = ['grid', 'list'],
  filterMode = 'collapsible',
  showSearch = true,
  showFilters = true,
  showSort = true,
  showViewToggle = true,
  showStats = true,
  showPagination = true,
  emptyTitle,
  emptyDescription,
  className = '',
  ...hookConfig
}: UniversalListingProps<T>) {
  const listing = useUniversalListing<T>(hookConfig);
  const lang = hookConfig.lang ?? 'es';
  const t = getListingTranslations(lang);

  const hasActiveFilters = Object.values(listing.activeFilters).some(
    (v) =>
      v !== undefined &&
      v !== null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0)
  );

  // Error state
  if (listing.error && !listing.loading && listing.items.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
      >
        <h3 className="mb-2 text-lg font-medium text-red-600 dark:text-red-400">
          {t.error.title}
        </h3>
        <p className="mb-4 text-sm text-gray-500">{listing.error}</p>
        <button
          type="button"
          onClick={listing.retry}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          {t.error.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {showSearch && (
          <ListingSearch
            query={listing.query}
            onQueryChange={listing.setQuery}
            lang={lang}
            className="flex-1"
          />
        )}
        <div className="flex flex-shrink-0 items-center gap-2">
          {showSort && sortOptions.length > 0 && (
            <ListingSort
              sort={listing.sort}
              options={sortOptions}
              onSortChange={listing.setSort}
              lang={lang}
            />
          )}
          {showViewToggle && (
            <ListingViewToggle
              viewMode={listing.viewMode}
              availableModes={availableViewModes}
              onViewModeChange={listing.setViewMode}
              lang={lang}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && hookConfig.filterDefinitions && (
        <ListingFilters
          definitions={hookConfig.filterDefinitions}
          activeFilters={listing.activeFilters}
          onFilterChange={listing.setFilter}
          onClearAll={listing.clearFilters}
          filterMode={filterMode}
          lang={lang}
          className="mb-4"
        />
      )}

      {/* Active filter badges */}
      {hookConfig.filterDefinitions && (
        <ListingActiveFilters
          definitions={hookConfig.filterDefinitions}
          activeFilters={listing.activeFilters}
          onFilterChange={listing.setFilter}
          onClearAll={listing.clearFilters}
          className="mb-4"
        />
      )}

      {/* Stats */}
      {showStats && !listing.loading && listing.totalCount > 0 && (
        <ListingStats
          page={listing.page}
          pageSize={listing.pageSize}
          totalCount={listing.totalCount}
          lang={lang}
          className="mb-3"
        />
      )}

      {/* Loading */}
      {listing.loading && listing.items.length === 0 && (
        <ListingLoading viewMode={listing.viewMode} />
      )}

      {/* Empty */}
      {!listing.loading && listing.items.length === 0 && !listing.error && (
        <ListingEmpty
          onClearFilters={listing.clearFilters}
          hasActiveFilters={hasActiveFilters}
          title={emptyTitle}
          description={emptyDescription}
          lang={lang}
        />
      )}

      {/* Content */}
      {listing.items.length > 0 && (
        <>
          {listing.viewMode === 'grid' && (
            <ListingGrid
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'list' && (
            <ListingList
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'compact' && (
            <ListingCompact
              items={listing.items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          )}
          {listing.viewMode === 'table' && columns && (
            <ListingTable
              items={listing.items}
              columns={columns}
              keyExtractor={keyExtractor}
              sort={listing.sort}
              onSortChange={listing.setSort}
            />
          )}
        </>
      )}

      {/* Pagination */}
      {showPagination && listing.items.length > 0 && (
        <ListingPagination
          page={listing.page}
          totalPages={listing.totalPages}
          hasMore={listing.hasMore}
          paginationMode={hookConfig.paginationMode ?? 'offset'}
          onPageChange={listing.goToPage}
          onLoadMore={listing.loadMore}
          loading={listing.loading}
          lang={lang}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create public exports**

```typescript
// src/components/listing/index.ts
export { UniversalListing } from './UniversalListing';
export { ListingSearch } from './ListingSearch';
export { ListingFilters } from './ListingFilters';
export { ListingActiveFilters } from './ListingActiveFilters';
export { ListingViewToggle } from './ListingViewToggle';
export { ListingSort } from './ListingSort';
export type { SortOption } from './ListingSort';
export { ListingGrid } from './ListingGrid';
export { ListingList } from './ListingList';
export { ListingCompact } from './ListingCompact';
export { ListingTable } from './ListingTable';
export { ListingPagination } from './ListingPagination';
export { ListingEmpty } from './ListingEmpty';
export { ListingLoading } from './ListingLoading';
export { ListingStats } from './ListingStats';
```

- [ ] **Step 4: Run integration tests**

Run: `npx vitest run tests/unit/components/listing/UniversalListing.test.tsx`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Run ALL listing tests together**

Run: `npx vitest run tests/unit/lib/listing/ tests/unit/hooks/useUniversalListing.test.ts tests/unit/components/listing/`
Expected: PASS (all tests across the system)

- [ ] **Step 6: Commit**

```bash
git add src/components/listing/UniversalListing.tsx src/components/listing/index.ts tests/unit/components/listing/UniversalListing.test.tsx
git commit -m "feat(listing): add UniversalListing convenience wrapper and public exports"
```

---

## Task 10: Migrate SpotlightList

The simplest listing — currently has no search, no filters, no pagination. Perfect first migration target.

**Files:**

- Modify: `src/components/spotlight/SpotlightList.tsx`

**Current state** (from exploration): ~60 lines. Fetches via `getSpotlights()`, renders a grid of `SpotlightCard` components. No search, no filters, no view toggle.

- [ ] **Step 1: Read current SpotlightList implementation**

Read: `src/components/spotlight/SpotlightList.tsx` — understand current props, data flow, and SpotlightCard usage.

Also read: `src/types/spotlight.ts` — understand the Spotlight type shape for `keyExtractor` and `searchFields`.

- [ ] **Step 2: Rewrite SpotlightList using UniversalListing**

Replace the component body with:

```tsx
// src/components/spotlight/SpotlightList.tsx
import React, { useMemo } from 'react';
import { UniversalListing } from '@components/listing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import { getSpotlights } from '@/lib/spotlights';
import SpotlightCard from './SpotlightCard';
import type { AlumniSpotlight } from '@/types/spotlight';

interface SpotlightListProps {
  lang?: 'es' | 'en';
}

export default function SpotlightList({ lang = 'es' }: SpotlightListProps) {
  const adapter = useMemo(
    () =>
      new ClientSideAdapter<AlumniSpotlight>({
        fetchAll: getSpotlights,
        searchFields: ['name', 'story', 'program', 'graduationYear'],
        getId: (item) => item.id,
      }),
    []
  );

  return (
    <UniversalListing
      adapter={adapter}
      renderItem={(spotlight) => (
        <SpotlightCard spotlight={spotlight} lang={lang} />
      )}
      keyExtractor={(s) => s.id}
      defaultViewMode="grid"
      availableViewModes={['grid']}
      showFilters={false}
      showSort={false}
      showViewToggle={false}
      paginationMode="offset"
      defaultPageSize={12}
      lang={lang}
    />
  );
}
```

- [ ] **Step 3: Verify the migration compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i spotlight` (or run `npm run check`)
Expected: No new errors related to SpotlightList

- [ ] **Step 4: Run existing spotlight tests if any, plus full listing suite**

Run: `npx vitest run tests/unit/components/listing/ tests/unit/lib/listing/ tests/unit/hooks/useUniversalListing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/spotlight/SpotlightList.tsx
git commit -m "refactor(spotlight): migrate SpotlightList to UniversalListing — adds search"
```

---

## Task 11: Migrate CompanyList

Second migration target — has existing search + industry filter + view toggle. Validates ClientSideAdapter with filters.

**Files:**

- Modify: `src/components/companies/CompanyList.tsx`

**Current state** (from exploration): ~265 lines. Has search, industry filter, list/landscape view toggle, company drawer. Uses `getCompanies()` + `useMemo` for filtering.

- [ ] **Step 1: Read current CompanyList implementation fully**

Read: `src/components/companies/CompanyList.tsx` — map all state, filters, and the CompanyDrawer integration.

Also read: `src/types/company.ts` — Company type shape.

Note which parts are custom (CompanyDrawer, landscape view) and which map to universal components.

- [ ] **Step 2: Rewrite CompanyList using hook + building blocks**

CompanyList is more complex than SpotlightList — it has a CompanyDrawer and landscape view that are domain-specific. Use the hook directly with building blocks rather than the wrapper, keeping the drawer and landscape tab as custom code.

```tsx
// src/components/companies/CompanyList.tsx
import React, { useState, useMemo } from 'react';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import {
  ListingSearch,
  ListingFilters,
  ListingActiveFilters,
  ListingViewToggle,
  ListingGrid,
  ListingList,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
  ListingStats,
} from '@components/listing';
import { getCompanies, translateIndustry } from '@lib/companies'; // adjust import based on actual exports
import CompanyDrawer from './CompanyDrawer'; // keep existing drawer
import type { Company } from '@/types/company';
import type { FilterDefinition } from '@lib/listing/types';

interface CompanyListProps {
  lang?: 'es' | 'en';
}

export default function CompanyList({ lang = 'es' }: CompanyListProps) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const adapter = useMemo(
    () =>
      new ClientSideAdapter<Company>({
        fetchAll: getCompanies,
        searchFields: ['name', 'industry', 'location', 'description'],
        getId: (item) => item.id,
      }),
    []
  );

  // Build filter definitions from available industries dynamically
  // (This will be populated after data loads — a static list works initially)
  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: 'industry',
        label: lang === 'es' ? 'Industria' : 'Industry',
        type: 'select',
        options: [
          {
            value: 'technology',
            label: lang === 'es' ? 'Tecnología' : 'Technology',
          },
          { value: 'finance', label: lang === 'es' ? 'Finanzas' : 'Finance' },
          {
            value: 'consulting',
            label: lang === 'es' ? 'Consultoría' : 'Consulting',
          },
          {
            value: 'education',
            label: lang === 'es' ? 'Educación' : 'Education',
          },
          {
            value: 'healthcare',
            label: lang === 'es' ? 'Salud' : 'Healthcare',
          },
          {
            value: 'government',
            label: lang === 'es' ? 'Gobierno' : 'Government',
          },
        ],
      },
    ],
    [lang]
  );

  const listing = useUniversalListing<Company>({
    adapter,
    defaultViewMode: 'grid',
    paginationMode: 'offset',
    defaultPageSize: 12,
    filterDefinitions,
    lang,
  });

  const renderCompanyCard = (company: Company) => (
    <div
      onClick={() => setSelectedCompany(company)}
      className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-gray-700"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setSelectedCompany(company)}
    >
      <div className="mb-2 flex items-center gap-3">
        {company.logoUrl && (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="h-10 w-10 rounded object-cover"
          />
        )}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {company.name}
          </h3>
          {company.industry && (
            <span className="text-sm text-gray-500">
              {translateIndustry(company.industry, lang)}
            </span>
          )}
        </div>
      </div>
      {company.description && (
        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {company.description}
        </p>
      )}
      <div className="mt-2 text-xs text-gray-400">
        {company.memberCount} {lang === 'es' ? 'miembros' : 'members'}
      </div>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <ListingSearch
          query={listing.query}
          onQueryChange={listing.setQuery}
          lang={lang}
          className="flex-1"
        />
        <ListingViewToggle
          viewMode={listing.viewMode}
          availableModes={['grid', 'list']}
          onViewModeChange={listing.setViewMode}
          lang={lang}
        />
      </div>

      <ListingFilters
        definitions={filterDefinitions}
        activeFilters={listing.activeFilters}
        onFilterChange={listing.setFilter}
        onClearAll={listing.clearFilters}
        lang={lang}
        className="mb-4"
      />

      <ListingActiveFilters
        definitions={filterDefinitions}
        activeFilters={listing.activeFilters}
        onFilterChange={listing.setFilter}
        onClearAll={listing.clearFilters}
        className="mb-4"
      />

      <ListingStats
        page={listing.page}
        pageSize={listing.pageSize}
        totalCount={listing.totalCount}
        lang={lang}
        className="mb-3"
      />

      {/* Content */}
      {listing.loading && listing.items.length === 0 && (
        <ListingLoading viewMode={listing.viewMode} />
      )}

      {!listing.loading && listing.items.length === 0 && (
        <ListingEmpty
          onClearFilters={listing.clearFilters}
          hasActiveFilters={Object.keys(listing.activeFilters).length > 0}
          lang={lang}
        />
      )}

      {listing.items.length > 0 && listing.viewMode === 'grid' && (
        <ListingGrid
          items={listing.items}
          renderItem={renderCompanyCard}
          keyExtractor={(c) => c.id}
        />
      )}
      {listing.items.length > 0 && listing.viewMode === 'list' && (
        <ListingList
          items={listing.items}
          renderItem={renderCompanyCard}
          keyExtractor={(c) => c.id}
        />
      )}

      <ListingPagination
        page={listing.page}
        totalPages={listing.totalPages}
        hasMore={listing.hasMore}
        paginationMode="offset"
        onPageChange={listing.goToPage}
        onLoadMore={listing.loadMore}
        lang={lang}
        className="mt-4"
      />

      {/* Keep existing CompanyDrawer */}
      {selectedCompany && (
        <CompanyDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Adjust imports based on actual file exploration**

Read the actual `CompanyList.tsx`, `CompanyDrawer` import path, and `translateIndustry` source to ensure the migration uses correct imports. Adjust as needed.

- [ ] **Step 4: Verify compilation**

Run: `npm run check 2>&1 | grep -i company`
Expected: No new errors related to CompanyList

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run tests/unit/`
Expected: PASS (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/components/companies/CompanyList.tsx
git commit -m "refactor(companies): migrate CompanyList to useUniversalListing + building blocks"
```

---

## Task 12: Migrate MemberDirectory

Third migration target — validates FirestoreAdapter, multi-view (compact/list/grid), complex filters. Most comprehensive migration.

**Files:**

- Modify: `src/components/directory/MemberDirectory.tsx`
- Modify: `src/components/directory/MemberSearch.tsx` (simplify to use FilterDefinition[])

**Current state** (from exploration): MemberDirectory is a large component with grid/list/compact views, pagination, filter panel via MemberSearch, and stats. MemberSearch is 637 lines of filter UI.

- [ ] **Step 1: Read current MemberDirectory and MemberSearch fully**

Read both files completely. Map:

- All state variables and their purposes
- How MemberSearch communicates filters back (callback pattern)
- The MemberCard component usage per view mode
- Pagination implementation
- Stats display

- [ ] **Step 2: Define MemberDirectory filter definitions**

Create the FilterDefinition[] that replaces the 637-line MemberSearch component, reusing the same filter options:

```typescript
const memberFilterDefs: FilterDefinition[] = [
  {
    key: 'skills',
    label: lang === 'es' ? 'Habilidades' : 'Skills',
    type: 'multiselect',
    options: [
      { value: 'python', label: 'Python' },
      { value: 'machine-learning', label: 'Machine Learning' },
      { value: 'data-visualization', label: 'Data Visualization' },
      { value: 'sql', label: 'SQL' },
      { value: 'statistics', label: 'Statistics' },
      // ... same options from current MemberSearch
    ],
  },
  {
    key: 'experienceLevel',
    label: lang === 'es' ? 'Experiencia' : 'Experience',
    type: 'multiselect',
    options: [
      { value: 'junior', label: 'Junior' },
      { value: 'mid', label: 'Mid' },
      { value: 'senior', label: 'Senior' },
      { value: 'lead', label: 'Lead' },
    ],
  },
  {
    key: 'availability',
    label: lang === 'es' ? 'Disponibilidad' : 'Availability',
    type: 'multiselect',
    options: [
      { value: 'mentoring', label: lang === 'es' ? 'Mentoría' : 'Mentoring' },
      {
        value: 'opportunities',
        label: lang === 'es' ? 'Oportunidades' : 'Opportunities',
      },
      { value: 'networking', label: 'Networking' },
    ],
  },
];
```

- [ ] **Step 3: Rewrite MemberDirectory using hook + building blocks**

The MemberDirectory uses FirestoreAdapter per the spec. This is the key migration that validates the Firestore path. Use `FirestoreAdapter` with the `users` collection, mapping filters to Firestore `where()` clauses via `filterMap`. Text search is applied client-side after fetch (matching the existing pattern).

```tsx
// High-level structure — adapt to actual imports and types after reading files
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { FirestoreAdapter } from '@lib/listing/adapters/FirestoreAdapter';
import { where } from 'firebase/firestore';
import {
  ListingSearch,
  ListingFilters,
  ListingActiveFilters,
  ListingViewToggle,
  ListingSort,
  ListingGrid,
  ListingList,
  ListingCompact,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
  ListingStats,
} from '@components/listing';
import type { SortOption } from '@components/listing';
```

Keep existing MemberCard component as `renderItem`. Keep stats display as custom code above the listing.

- [ ] **Step 4: Verify compilation and run tests**

Run: `npm run check` and `npx vitest run tests/unit/`
Expected: No regressions

- [ ] **Step 5: Commit**

```bash
git add src/components/directory/MemberDirectory.tsx src/components/directory/MemberSearch.tsx
git commit -m "refactor(directory): migrate MemberDirectory to useUniversalListing + building blocks"
```

---

## Post-Implementation Notes

### Remaining Migrations (Future Tasks)

After validating with SpotlightList, CompanyList, and MemberDirectory, the remaining listings follow the same pattern:

4. **BlogList, EventList, ResourceLibrary** — ClientSideAdapter, medium complexity
5. **JobBoard, MentorshipMatcher** — JobBoard uses FirestoreAdapter, Mentorship uses ClientSideAdapter
6. **Admin tables** — FirestoreAdapter + table view mode, keep inline editing in parent
7. **ForumSearch** — Hook only with custom tabbed UI

Each follows: create adapter → configure filterDefinitions → use hook/wrapper → keep domain-specific UI.

### Key Testing Commands

```bash
# Run all listing system tests
npx vitest run tests/unit/lib/listing/ tests/unit/hooks/useUniversalListing.test.ts tests/unit/components/listing/

# Run full test suite to check for regressions
npm test

# Type check
npm run check
```
