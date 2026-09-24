/**
 * Resource Library Components Exports
 * Central export point for all resource library components
 */

export { default as ResourceLibrary } from './ResourceLibrary';
export { default as ResourceCard } from './ResourceCard';
export { default as ResourceSearch } from './ResourceSearch';
export { default as ResourceDetail } from './ResourceDetail';
export { default as ResourceUpload } from './ResourceUpload';

// Re-export types for convenience
export type {
  Resource,
  ResourceCategory,
  ResourceType,
  ResourceSearchFilters,
  ResourceSearchSort,
  ResourceSearchResult,
  ResourceUploadRequest,
  ResourceStats,
  AccessLevel,
} from '@/types/resource';
