/**
 * Firebase document type guards and safe accessors
 * Ensures type safety when working with Firestore documents
 */

import type {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User, Job, ForumTopic, ForumPost, Event } from '@/types';

/**
 * Type guard for DocumentSnapshot data
 */
export function hasData<T = DocumentData>(
  doc: DocumentSnapshot<T>
): doc is DocumentSnapshot<T> & { data(): T } {
  return doc.exists();
}

/**
 * Safe document data accessor
 */
export function getDocData<T = DocumentData>(
  doc: DocumentSnapshot<T> | QueryDocumentSnapshot<T>
): T | null {
  if (doc.exists()) {
    return doc.data();
  }
  return null;
}

/**
 * Safe property accessor for document data
 */
export function getDocProperty<T extends DocumentData, K extends keyof T>(
  doc: DocumentSnapshot<T> | QueryDocumentSnapshot<T>,
  key: K
): T[K] | undefined {
  const data = getDocData(doc);
  if (data && key in data) {
    return data[key];
  }
  return undefined;
}

/**
 * Type guard for User document
 */
export function isUserDoc(data: DocumentData): data is User {
  return (
    typeof data.email === 'string' && typeof data['createdAt'] !== 'undefined'
  );
}

/**
 * Type guard for Job document
 */
export function isJobDoc(data: DocumentData): data is Job {
  return (
    typeof data['title'] === 'string' &&
    typeof data['company'] === 'string' &&
    typeof data['postedAt'] !== 'undefined'
  );
}

/**
 * Type guard for ForumTopic document
 */
export function isForumTopicDoc(data: DocumentData): data is ForumTopic {
  return (
    typeof data['title'] === 'string' &&
    typeof data['categoryId'] === 'string' &&
    typeof data['authorId'] === 'string'
  );
}

/**
 * Type guard for ForumPost document
 */
export function isForumPostDoc(data: DocumentData): data is ForumPost {
  return (
    typeof data['topicId'] === 'string' &&
    typeof data['content'] === 'string' &&
    typeof data['authorId'] === 'string'
  );
}

/**
 * Type guard for Event document
 */
export function isEventDoc(data: DocumentData): data is Event {
  return (
    typeof data['title'] === 'string' &&
    typeof data['date'] !== 'undefined' &&
    typeof data['location'] === 'string'
  );
}

/**
 * Safe Firestore document converter
 */
export function createConverter<T>(): {
  toFirestore: (data: T) => DocumentData;
  fromFirestore: (snapshot: QueryDocumentSnapshot) => T;
} {
  return {
    toFirestore: (data: T): DocumentData => data as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
      const data = snapshot.data();
      return { id: snapshot.id, ...data } as T;
    },
  };
}

/**
 * Safe array accessor for Firestore data
 */
export function getArrayField<T>(
  data: DocumentData,
  field: string,
  defaultValue: T[] = []
): T[] {
  if (field in data && Array.isArray(data[field])) {
    return data[field] as T[];
  }
  return defaultValue;
}

/**
 * Safe object field accessor
 */
export function getObjectField<T extends Record<string, any>>(
  data: DocumentData,
  field: string,
  defaultValue: T
): T {
  if (
    field in data &&
    typeof data[field] === 'object' &&
    data[field] !== null
  ) {
    return data[field] as T;
  }
  return defaultValue;
}

/**
 * Safe string field accessor
 */
export function getStringField(
  data: DocumentData,
  field: string,
  defaultValue: string = ''
): string {
  if (field in data && typeof data[field] === 'string') {
    return data[field] as string;
  }
  return defaultValue;
}

/**
 * Safe number field accessor
 */
export function getNumberField(
  data: DocumentData,
  field: string,
  defaultValue: number = 0
): number {
  if (field in data && typeof data[field] === 'number') {
    return data[field] as number;
  }
  return defaultValue;
}

/**
 * Safe boolean field accessor
 */
export function getBooleanField(
  data: DocumentData,
  field: string,
  defaultValue: boolean = false
): boolean {
  if (field in data && typeof data[field] === 'boolean') {
    return data[field] as boolean;
  }
  return defaultValue;
}

/**
 * Safe date field accessor (handles Firestore Timestamps)
 */
export function getDateField(
  data: DocumentData,
  field: string,
  defaultValue: Date = new Date()
): Date {
  if (field in data) {
    const value = data[field];
    // Handle Firestore Timestamp
    if (
      value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof value.toDate === 'function'
    ) {
      return value.toDate();
    }
    // Handle Date object
    if (value instanceof Date) {
      return value;
    }
    // Handle string date
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return defaultValue;
}

/**
 * Create a typed document reference
 */
export function typedDoc<T>() {
  return {
    converter: createConverter<T>(),
  };
}
