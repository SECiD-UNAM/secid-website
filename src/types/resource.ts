/**
 * Resource Library Type Definitions
 */

export type ResourceCategory =
  | 'tutorials'
  | 'templates'
  | 'tools'
  | 'books'
  | 'courses'
  | 'datasets'
  | 'research'
  | 'documentation';

export type ResourceType =
  | 'pdf'
  | 'excel'
  | 'jupyter'
  | 'python'
  | 'r'
  | 'sql'
  | 'csv'
  | 'json'
  | 'xml'
  | 'video'
  | 'audio'
  | 'image'
  | 'zip'
  | 'link'
  | 'text';

export type AccessLevel = 'free' | 'premium' | 'member' | 'restricted';

export type ResourceStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'archived';

export interface ResourceAuthor {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  title?: string;
  company?: string;
  verified: boolean;
  contributionCount: number;
}

export interface ResourceVersion {
  id: string;
  version: string;
  releaseDate: Date;
  changelog: string;
  downloadUrl: string;
  fileSize: number;
  fileName: string;
  uploadedBy: string;
}

export interface ResourceReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: Date;
  helpful: number; // Number of users who found this helpful
  helpfulUsers: string[]; // User IDs who marked as helpful
}

export interface ResourceDownload {
  id: string;
  userId: string;
  downloadedAt: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResourceBookmark {
  id: string;
  userId: string;
  resourceId: string;
  createdAt: Date;
  notes?: string;
}

export interface ResourceCollection {
  id: string;
  name: string;
  description: string;
  userId: string;
  userName: string;
  isPublic: boolean;
  resourceIds: string[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  followers: string[];
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  summary: string;
  category: ResourceCategory;
  type: ResourceType;
  tags: string[];

  // File information
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Metadata
  author: ResourceAuthor;
  contributors: ResourceAuthor[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Version control
  currentVersion: string;
  versions: ResourceVersion[];

  // Access control
  accessLevel: AccessLevel;
  status: ResourceStatus;

  // Engagement metrics
  downloadCount: number;
  viewCount: number;
  bookmarkCount: number;
  rating: number; // Average rating
  reviewCount: number;
  reviews: ResourceReview[];

  // Related resources
  relatedResources: string[]; // Resource IDs
  prerequisites: string[];

  // Content metadata
  language: 'es' | 'en' | 'both';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string; // e.g., "2 hours", "1 week"

  // Preview information
  hasPreview: boolean;
  previewUrl?: string;
  thumbnailUrl?: string;

  // Search optimization
  searchKeywords: string[];

  // Moderation
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationNotes?: string;
}

export interface ResourceSearchFilters {
  query?: string;
  categories?: ResourceCategory[];
  types?: ResourceType[];
  tags?: string[];
  authors?: string[];
  accessLevels?: AccessLevel[];
  difficulties?: ('beginner' | 'intermediate' | 'advanced')[];
  languages?: ('es' | 'en' | 'both')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  ratingMin?: number;
  hasPreview?: boolean;
}

export interface ResourceSearchSort {
  field: 'relevance' | 'date' | 'downloads' | 'rating' | 'title' | 'author';
  direction: 'asc' | 'desc';
}

export interface ResourceSearchResult {
  resources: Resource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    categories: { [key in ResourceCategory]: number };
    types: { [key in ResourceType]: number };
    tags: { [key: string]: number };
    authors: { [key: string]: number };
    difficulties: { [key: string]: number };
  };
}

export interface ResourceUploadRequest {
  title: string;
  description: string;
  summary: string;
  category: ResourceCategory;
  type: ResourceType;
  tags: string[];
  accessLevel: AccessLevel;
  language: 'es' | 'en' | 'both';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: string;
  prerequisites?: string[];
  file: File;
  hasPreview: boolean;
  previewFile?: File;
  thumbnailFile?: File;
}

export interface ResourceStats {
  totalResources: number;
  totalDownloads: number;
  totalViews: number;
  totalAuthors: number;
  averageRating: number;
  categoryCounts: { [key in ResourceCategory]: number };
  typeCounts: { [key in ResourceType]: number };
  recentUploads: Resource[];
  topDownloaded: Resource[];
  topRated: Resource[];
  trendingTags: string[];
}

export interface ResourceActivity {
  id: string;
  type: 'upload' | 'download' | 'review' | 'bookmark' | 'update';
  userId: string;
  userName: string;
  resourceId: string;
  resourceTitle: string;
  description: string;
  createdAt: Date;
  metadata?: {
    [key: string]: any;
  };
}

export interface ResourceContributorProfile {
  user: ResourceAuthor;
  stats: {
    totalContributions: number;
    totalDownloads: number;
    averageRating: number;
    totalReviews: number;
    joinedDate: Date;
    lastActivity: Date;
  };
  recentResources: Resource[];
  specializations: string[];
  achievements: string[];
}

export interface ResourceAnalytics {
  resourceId: string;
  timeframe: 'day' | 'week' | 'month' | 'year';
  downloads: {
    date: string;
    count: number;
  }[];
  views: {
    date: string;
    count: number;
  }[];
  ratings: {
    date: string;
    rating: number;
  }[];
  topReferrers: {
    source: string;
    count: number;
  }[];
  userCountries: {
    country: string;
    count: number;
  }[];
  deviceTypes: {
    type: string;
    count: number;
  }[];
}
