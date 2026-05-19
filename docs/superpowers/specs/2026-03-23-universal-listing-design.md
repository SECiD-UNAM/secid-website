# Universal Listing System — Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Reusable composable listing system with search, filters, pagination, and multiple view modes for all SECiD listings (user-facing and admin).

---

## Problem

The codebase has 12+ listing components (MemberDirectory, CompanyList, JobBoard, EventList, ForumSearch, MentorshipMatcher, BlogList, SpotlightList, ResourceLibrary, UserManagement, AdminMembersTable, SalaryAdminTable) that independently re-implement the same patterns: search, filtering, sorting, pagination, view toggles, empty/loading states. Several listings lack search entirely (SpotlightList, MentorshipMatcher). There is no shared component — adding search to a listing means writing it from scratch each time.

## Goals

1. Build a composable listing system that any listing can adopt
2. Add browser search capabilities to all listings, including those that currently lack it
3. Support four view modes (grid, list, compact, table) with per-listing defaults
4. Support hybrid data fetching — client-side for small collections, Firestore for large ones
5. Migrate all 12 listings incrementally without breaking existing functionality

## Non-Goals

- External search service integration (Algolia/Typesense) — future work via custom adapter
- Real-time / live-updating listings
- Drag-and-drop reordering
- Bulk actions (remain in admin components, outside the universal system)
- URL state synchronization (syncing search/filter/page to URL params) — future enhancement, currently only ForumSearch does this

---

## Architecture

### Approach: Composable System with Headless Core Hook + UI Building Blocks

A `useUniversalListing<T>` hook manages all listing state and delegates data operations to an adapter. Thin UI components compose on top. A convenience `<UniversalListing>` wrapper composes them all for the common case.

This was chosen over a monolithic component because listings range from dead-simple (SpotlightList) to highly custom (ForumSearch with tabs and highlighting). The composable approach lets simple listings use the wrapper while complex ones use the hook with custom UI.

### File Structure

```
src/hooks/useUniversalListing.ts        # Core headless hook
src/lib/listing/
├── types.ts                            # Shared types and interfaces
├── adapters/
│   ├── types.ts                        # DataAdapter interface
│   ├── ClientSideAdapter.ts            # In-memory search/filter/sort/paginate
│   └── FirestoreAdapter.ts             # Firestore query builder + cursor pagination
└── i18n.ts                             # Built-in UI string translations (es/en)

src/components/listing/
├── UniversalListing.tsx                # Convenience wrapper
├── ListingSearch.tsx                   # Search input with debounce
├── ListingFilters.tsx                  # Filter panel (collapsible/visible/drawer)
├── ListingActiveFilters.tsx            # Applied filter badges with clear
├── ListingViewToggle.tsx               # Grid/List/Compact/Table icons
├── ListingSort.tsx                     # Sort dropdown
├── ListingGrid.tsx                     # Grid layout via renderItem
├── ListingList.tsx                     # Row layout via renderItem
├── ListingCompact.tsx                  # Dense row layout via renderItem
├── ListingTable.tsx                    # Sortable column table via column defs
├── ListingPagination.tsx               # Offset or cursor pagination
├── ListingEmpty.tsx                    # Empty state (icon + message + CTA)
├── ListingLoading.tsx                  # Skeleton loaders per view mode
├── ListingStats.tsx                    # "Showing X of Y" + optional stats
└── index.ts                           # Public exports
```

---

## Shared Types

These types are defined in `src/lib/listing/types.ts` and supersede any module-local definitions (e.g., `ViewMode` in `src/types/member.ts`, `CompanyList.tsx`, `EventList.tsx`). During migration, existing local `ViewMode` types are replaced with imports from this module.

```typescript
type ViewMode = 'grid' | 'list' | 'compact' | 'table';

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface ColumnDefinition<T> {
  key: string;
  label: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}
```

---

## Core Hook: `useUniversalListing<T>`

### Configuration

```typescript
interface UseUniversalListingConfig<T> {
  adapter: DataAdapter<T>;
  defaultViewMode?: ViewMode;
  defaultPageSize?: number;
  defaultSort?: SortConfig;
  filterDefinitions?: FilterDefinition[];
  paginationMode?: 'offset' | 'cursor';
  debounceMs?: number; // default 300
  lang?: 'es' | 'en';
}
```

### Return Value

```typescript
interface UseUniversalListingReturn<T> {
  // Data
  items: T[];
  totalCount: number;
  stats?: Record<string, number>;

  // State
  loading: boolean;
  error: string | null;
  retry: () => void;

  // Search
  query: string;
  setQuery: (q: string) => void;

  // Filters
  activeFilters: Record<string, any>;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;

  // Sorting
  sort: SortConfig;
  setSort: (sort: SortConfig) => void;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  goToPage: (n: number) => void;
  loadMore: () => void;

  // View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}
```

### Behavior

- Search input is debounced (default 300ms). Changing the query resets pagination to page 1.
- Changing filters resets pagination to page 1.
- Changing sort re-fetches via adapter with current filters/query.
- Pagination mode determines whether `goToPage` (offset) or `loadMore` (cursor) is the primary navigation method. Both are always available.
- The hook calls `adapter.fetch()` reactively when query, filters, sort, or page change.

---

## Data Adapters

### Interface

```typescript
interface DataAdapter<T> {
  fetch(params: FetchParams): Promise<FetchResult<T>>;
  count?(params: CountParams): Promise<number>;
}

interface FetchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: SortConfig;
  page?: number;
  pageSize?: number;
  cursor?: any;
}

interface FetchResult<T> {
  items: T[];
  totalCount: number;
  nextCursor?: any;
  hasMore: boolean;
}
```

### ClientSideAdapter

For small collections (under ~500 items): events, blog posts, spotlights, mentors, companies, resources.

- Constructor takes `fetchAll: () => Promise<T[]>` (or `initialData: T[]` to skip initial fetch), `searchFields: string[]`, and an optional `toSearchable: (item: T) => string` mapper
- Fetches the full dataset once, caches it
- Applies search using the existing `src/lib/search/search-engine.ts` (fuzzy matching, typo tolerance, bilingual support). The adapter transforms items to `IndexedContent` internally using `searchFields` to extract text and `toSearchable` for custom extraction. Results are mapped back to `T[]` via ID matching.
- Applies filters, sort, and pagination in-memory
- Re-fetches on cache invalidation (optional TTL or manual `invalidate()`)

### FirestoreAdapter

For large collections: members, jobs, admin user tables.

- Constructor takes collection ref, base query constraints, searchFields, and cursorField
- Translates filters to Firestore `where()` clauses
- Translates sort to `orderBy()`
- Uses `startAfter(lastDoc)` for cursor pagination
- **Text search strategy:** Firestore has no native full-text search. The adapter fetches documents matching the active filters and sort order, then applies text search client-side using the search engine. For cursor-paginated queries, the adapter over-fetches (2x pageSize) to compensate for client-side filtering reducing the result set. This matches the existing pattern in `JobBoard.tsx`.

### Custom Adapters

Any object implementing `DataAdapter<T>` works. Future integrations (Algolia, Typesense, REST APIs) implement the same interface.

---

## UI Components

### Rendering

- **ListingGrid, ListingList, ListingCompact** accept `renderItem: (item: T, viewMode: ViewMode) => ReactNode`. Existing card components (JobCard, MemberCard, etc.) are reused as renderItem functions — they are not replaced.
- **ListingTable** accepts `columns: ColumnDefinition<T>[]` (see Shared Types section for full definition).

### ListingFilters

Accepts `FilterDefinition[]`:

```typescript
interface FilterDefinition {
  key: string;
  label: string; // translated by consumer
  type: 'select' | 'multiselect' | 'range' | 'date' | 'toggle';
  options?: { value: string; label: string }[];
  placeholder?: string;
}
```

Filter panel mode controlled via `filterMode: 'collapsible' | 'visible' | 'drawer'` prop. Defaults to `collapsible`. On mobile (below `md` breakpoint), always renders as drawer regardless of prop.

### ListingEmpty and ListingLoading

Both adapt to the current `viewMode`:

- Grid → card-shaped skeletons / centered empty icon
- List/Compact → row skeletons / horizontal empty layout
- Table → table row skeletons / centered empty state

### ListingPagination

Renders based on `paginationMode`:

- `offset` → numbered page buttons with prev/next, switches to simple prev/next on mobile
- `cursor` → "Load More" button with remaining count

### UniversalListing (Convenience Wrapper)

Composes all building blocks:

```tsx
<UniversalListing
  adapter={adapter}
  renderItem={(item, mode) => <MemberCard member={item} viewMode={mode} />}
  filterDefinitions={memberFilters}
  sortOptions={memberSortOptions}
  defaultViewMode="compact"
  availableViewModes={['compact', 'list', 'grid']}
  paginationMode="offset"
  pageSize={20}
  lang={lang}
/>
```

Optional props to hide sections: `showSearch`, `showFilters`, `showSort`, `showViewToggle`, `showStats`, `showPagination` (all default `true`).

---

## Per-Listing Configuration

| Listing           | Adapter               | Default View | Pagination | Available Views     | Filter Mode |
| ----------------- | --------------------- | ------------ | ---------- | ------------------- | ----------- |
| MemberDirectory   | Firestore             | compact      | offset     | compact, list, grid | collapsible |
| CompanyList       | ClientSide            | grid         | offset     | grid, list          | collapsible |
| JobBoard          | Firestore             | list         | cursor     | list, grid          | collapsible |
| EventList         | ClientSide            | grid         | offset     | grid, list          | visible     |
| ForumSearch       | Hook only (custom UI) | list         | cursor     | —                   | custom tabs |
| MentorshipMatcher | ClientSide            | grid         | offset     | grid, list          | collapsible |
| BlogList          | ClientSide            | grid         | cursor     | grid                | collapsible |
| SpotlightList     | ClientSide            | grid         | offset     | grid                | none        |
| ResourceLibrary   | ClientSide            | grid         | offset     | grid, list          | collapsible |
| UserManagement    | Firestore             | table        | offset     | table, compact      | visible     |
| AdminMembersTable | Firestore             | table        | offset     | table, compact      | visible     |
| SalaryAdminTable  | Firestore             | table        | offset     | table               | visible     |

**View mode migration notes:**

- **EventList** currently has a `'calendar'` view mode. Calendar view is domain-specific and stays as custom rendering outside the universal system. The migrated EventList uses the hook for search/filter/sort state but renders its calendar tab via custom code, similar to how ForumSearch uses the hook with custom UI.
- **CompanyList** currently has a `'landscape'` (industry map) view mode. This maps conceptually to grid view in the universal system. The landscape view is domain-specific visualization and stays as a custom tab outside the universal component, rendered alongside the standard grid/list views.

---

## i18n

All built-in UI strings are translated using a small internal translation map (`src/lib/listing/i18n.ts`) keyed by `'es' | 'en'`. Strings include: search placeholder, filter button labels, pagination text, empty state messages, stats format, view mode labels.

Custom content (filter option labels, column headers, empty state CTAs) comes from the consumer and follows the existing codebase i18n patterns.

---

## Accessibility

- `ListingSearch` — `role="search"`, `aria-label`, result count announced via `aria-live="polite"`
- `ListingFilters` — collapsible panel uses `aria-expanded`, `aria-controls`; all filter inputs labeled
- `ListingViewToggle` — `role="radiogroup"` with `aria-label` per option, keyboard navigable
- `ListingTable` — `<thead>`/`<tbody>`, `aria-sort` on sortable columns, `scope="col"` on headers
- `ListingPagination` — `<nav aria-label="pagination">`, current page with `aria-current="page"`
- All interactive elements keyboard accessible with visible focus indicators

---

## Mobile

- Table view auto-hides below `md` breakpoint
- Grid responsive: 3 → 2 → 1 columns
- Filter panel renders as bottom drawer on mobile regardless of `filterMode`
- Search input full-width on mobile
- Offset pagination switches to prev/next on small screens

---

## Migration Strategy

Incremental migration, simplest first to validate the system:

1. **SpotlightList** — no search today, simplest listing, proves the happy path
2. **CompanyList** — basic search + filters, validates ClientSideAdapter
3. **MemberDirectory** — complex filters, validates FirestoreAdapter + multi-view
4. **BlogList, EventList, ResourceLibrary** — medium complexity, solidifies patterns
5. **JobBoard, MentorshipMatcher** — domain-specific features
6. **Admin tables (UserManagement, AdminMembersTable, SalaryAdminTable)** — table view, inline editing stays in parent
7. **ForumSearch** — most custom, uses hook directly with its own tabbed UI

Each migration:

- Replaces internal state management with `useUniversalListing` hook
- Replaces search/filter/pagination UI with listing building blocks
- Keeps existing card/row components as `renderItem` functions
- Existing component file is refactored in-place (no new page-level files)

---

## Testing Strategy

- **Hook tests** — `useUniversalListing` tested with mock adapters: search debounce, filter reset, pagination, sort changes
- **Adapter tests** — ClientSideAdapter tested with in-memory data. FirestoreAdapter tested with Firestore emulator.
- **Component tests** — each UI building block tested in isolation (render, interactions, a11y)
- **Integration tests** — `UniversalListing` wrapper tested with real adapter + full user flow (search → filter → sort → paginate)
- **Migration tests** — each migrated listing's existing tests updated, no regression in functionality
