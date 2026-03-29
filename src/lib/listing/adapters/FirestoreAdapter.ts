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
import type { FetchParams, FetchResult, CountParams, SortConfig } from '../types';

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
    const fetchSize = params.query?.trim() ? pageSize * 2 : pageSize + 1;

    const constraints = this.buildConstraints(params, fetchSize);
    const ref = collection(db, this.config.collectionName);
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    let items = snapshot.docs.map((doc) =>
      this.config.mapDoc(doc.id, doc.data())
    );

    if (params.query?.trim()) {
      items = this.applyClientSearch(items, params.query.trim());
    }

    const hasMore = items.length > pageSize;
    items = items.slice(0, pageSize);

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

  private buildConstraints(params: FetchParams, fetchSize: number): QueryConstraint[] {
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

    const sort = params.sort ?? this.config.defaultSort;
    if (sort) {
      constraints.push(orderBy(sort.field, sort.direction));
    }

    if (params.cursor) {
      constraints.push(startAfter(params.cursor));
    }

    constraints.push(limit(fetchSize));

    return constraints;
  }

  private applyClientSearch(items: T[], searchQuery: string): T[] {
    const lowerQuery = searchQuery.toLowerCase();
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

  private async getTotalCount(params: FetchParams | CountParams): Promise<number> {
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

// Re-export where for consumers who configure filterMap
export { where };
