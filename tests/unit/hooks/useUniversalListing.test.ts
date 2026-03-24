// tests/unit/hooks/useUniversalListing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import type { DataAdapter } from '@lib/listing/adapters/types';

interface TestItem { id: string; name: string; }

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

describe.sequential('useUniversalListing', () => {
  let adapter: DataAdapter<TestItem>;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  it('fetches data on mount', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 3 })
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.totalCount).toBe(5);
    expect(adapter.fetch).toHaveBeenCalledTimes(1);
  });

  it('updates query and resets page', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 3 })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.setQuery('test'); });
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
    act(() => { result.current.setFilter('category', 'tech'); });
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { category: 'tech' }, page: 1 })
      );
    });
    act(() => { result.current.clearFilters(); });
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
    act(() => { result.current.setSort({ field: 'name', direction: 'asc' }); });
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ sort: { field: 'name', direction: 'asc' } })
      );
    });
  });

  it('navigates pages with goToPage', async () => {
    const { result } = renderHook(() =>
      useUniversalListing({ adapter, defaultPageSize: 3, paginationMode: 'offset' })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.goToPage(2); });
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
    act(() => { result.current.setViewMode('compact'); });
    expect(result.current.viewMode).toBe('compact');
  });

  it('handles errors', async () => {
    const failingAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockRejectedValue(new Error('Network error')),
    };
    const { result } = renderHook(() =>
      useUniversalListing({ adapter: failingAdapter })
    );
    await waitFor(() => { expect(result.current.error).toBe('Network error'); });
    expect(result.current.loading).toBe(false);
  });

  it('retries on error', async () => {
    const failThenSucceed: DataAdapter<TestItem> = {
      fetch: vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ items: mockItems, totalCount: 5, hasMore: false }),
    };
    const { result } = renderHook(() =>
      useUniversalListing({ adapter: failThenSucceed })
    );
    await waitFor(() => expect(result.current.error).toBe('Network error'));
    act(() => { result.current.retry(); });
    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.items).toHaveLength(5);
    });
  });
});
