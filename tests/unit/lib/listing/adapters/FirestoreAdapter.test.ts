// tests/unit/lib/listing/adapters/FirestoreAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreAdapter } from '@lib/listing/adapters/FirestoreAdapter';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  query: vi.fn((...args: unknown[]) => ({ _constraints: args.slice(1) })),
  collection: vi.fn((_db: unknown, name: string) => ({ path: name })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field: string, dir: string) => ({ type: 'orderBy', field, dir })),
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
  { id: '1', data: () => ({ name: 'Alice', status: 'active', createdAt: { toDate: () => new Date('2026-01-01') } }) },
  { id: '2', data: () => ({ name: 'Bob', status: 'active', createdAt: { toDate: () => new Date('2026-02-01') } }) },
  { id: '3', data: () => ({ name: 'Charlie', status: 'inactive', createdAt: { toDate: () => new Date('2026-03-01') } }) },
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
      mapDoc: (id, data) => ({ id, ...data } as unknown as TestDoc),
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
    expect(getDocs).toHaveBeenCalled();
  });
});
