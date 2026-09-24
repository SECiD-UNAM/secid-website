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
  describe.sequential('with fetchAll', () => {
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
      /**
       * TC-CSA-001
       * Verifies: pagination returns correct slice and metadata
       */
      const result = await adapter.fetch({ pageSize: 2, page: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('returns second page correctly', async () => {
      /**
       * TC-CSA-002
       * Verifies: page offset is applied correctly
       */
      const result = await adapter.fetch({ pageSize: 2, page: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('3');
    });

    it('returns last page with hasMore false', async () => {
      /**
       * TC-CSA-003
       * Verifies: hasMore is false when no more items exist beyond current page
       */
      const result = await adapter.fetch({ pageSize: 2, page: 3 });
      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('caches data after first fetch', async () => {
      /**
       * TC-CSA-004
       * Verifies: fetchAll is only called once across multiple fetch() calls
       */
      await adapter.fetch({ pageSize: 10 });
      await adapter.fetch({ pageSize: 10 });
      expect(fetchAll).toHaveBeenCalledTimes(1);
    });

    it('filters by single value', async () => {
      /**
       * TC-CSA-005
       * Verifies: filter by exact field value returns only matching items
       */
      const result = await adapter.fetch({
        filters: { category: 'tech' },
        pageSize: 10,
      });
      expect(result.items).toHaveLength(3);
      expect(result.items.every((i) => i.category === 'tech')).toBe(true);
      expect(result.totalCount).toBe(3);
    });

    it('sorts ascending', async () => {
      /**
       * TC-CSA-006
       * Verifies: ascending sort orders items from lowest to highest
       */
      const result = await adapter.fetch({
        sort: { field: 'score', direction: 'asc' },
        pageSize: 10,
      });
      expect(result.items[0].score).toBe(60);
      expect(result.items[4].score).toBe(95);
    });

    it('sorts descending', async () => {
      /**
       * TC-CSA-007
       * Verifies: descending sort orders items from highest to lowest
       */
      const result = await adapter.fetch({
        sort: { field: 'score', direction: 'desc' },
        pageSize: 10,
      });
      expect(result.items[0].score).toBe(95);
      expect(result.items[4].score).toBe(60);
    });

    it('searches by text query', async () => {
      /**
       * TC-CSA-008
       * Verifies: text search filters items by matching against searchFields
       */
      const result = await adapter.fetch({
        query: 'Alpha',
        pageSize: 10,
      });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].name).toContain('Alpha');
    });

    it('combines search + filter + sort + pagination', async () => {
      /**
       * TC-CSA-009
       * Verifies: all operations compose correctly in a single fetch call
       */
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
      /**
       * TC-CSA-010
       * Verifies: invalidate() causes the next fetch to call fetchAll again
       */
      await adapter.fetch({ pageSize: 10 });
      adapter.invalidate();
      await adapter.fetch({ pageSize: 10 });
      expect(fetchAll).toHaveBeenCalledTimes(2);
    });
  });

  describe('with initialData', () => {
    it('uses provided data without fetching', async () => {
      /**
       * TC-CSA-011
       * Verifies: initialData is used directly without calling fetchAll
       */
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
