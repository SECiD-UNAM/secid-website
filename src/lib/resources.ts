import {
import { 
import { db, storage, isUsingMockAPI} from './firebase';
import { getCurrentUser} from './auth';

/**
 * Resource Library Service
 * Firebase functions for resource management, search, and analytics
 */

  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  getMetadata 
} from 'firebase/storage';
import type {
  Resource,
  ResourceCategory,
  ResourceType,
  ResourceSearchFilters,
  ResourceSearchSort,
  ResourceSearchResult,
  ResourceUploadRequest,
  ResourceReview,
  ResourceBookmark,
  ResourceCollection,
  ResourceStats,
  ResourceActivity,
  ResourceContributorProfile,
  ResourceAnalytics,
  AccessLevel
} from '@/types/resource';

const RESOURCES_COLLECTION = 'resources';
const REVIEWS_COLLECTION = 'resource_reviews';
const BOOKMARKS_COLLECTION = 'resource_bookmarks';
const COLLECTIONS_COLLECTION = 'resource_collections';
const DOWNLOADS_COLLECTION = 'resource_downloads';
const ACTIVITIES_COLLECTION = 'resource_activities';

/**
 * Search and filter resources
 */
export async function searchResources(
  filters: ResourceSearchFilters = {},
  sort: ResourceSearchSort = { field: 'relevance', direction: 'desc' },
  page: number = 1,
  pageSize: number = 20
): Promise<ResourceSearchResult> {
  if (isUsingMockAPI()) {
    return mockSearchResources(filters, sort, page, pageSize);
  }

  try {
    const resourcesRef = collection(db, RESOURCES_COLLECTION);
    let resourceQuery = query(resourcesRef);

    // Apply filters
    if (filters?.categories?.length) {
      resourceQuery = query(resourceQuery, where('category', 'in', filters.categories));
    }
    
    if (filters?.types?.length) {
      resourceQuery = query(resourceQuery, where('type', 'in', filters.types));
    }
    
    if (filters?.accessLevels?.length) {
      resourceQuery = query(resourceQuery, where('accessLevel', 'in', filters.accessLevels));
    }
    
    if (filters?.difficulties?.length) {
      resourceQuery = query(resourceQuery, where('difficulty', 'in', filters.difficulties));
    }
    
    if (filters?.languages?.length) {
      resourceQuery = query(resourceQuery, where('language', 'in', filters.languages));
    }
    
    if (filters.ratingMin) {
      resourceQuery = query(resourceQuery, where('rating', '>=', filters.ratingMin));
    }
    
    if (filters.hasPreview !== undefined) {
      resourceQuery = query(resourceQuery, where('hasPreview', '==', filters.hasPreview));
    }

    // Apply status filter (only approved resources)
    resourceQuery = query(resourceQuery, where('status', '==', 'approved'));

    // Apply sorting
    const sortField = sort.field === 'relevance' ? 'downloadCount' : sort.field;
    resourceQuery = query(resourceQuery, orderBy(sortField, sort.direction));
    
    // Apply pagination
    resourceQuery = query(resourceQuery, limit(pageSize));
    if (page > 1) {
      // This is simplified - in production, you'd need to handle pagination tokens
      const offset = (page - 1) * pageSize;
      resourceQuery = query(resourceQuery, startAfter(offset));
    }

    const snapshot = await getDocs(resourceQuery);
    const resources = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      publishedAt: doc['data']().publishedAt?.toDate()
    })) as Resource[];

    // Calculate facets (simplified version)
    const facets = await calculateSearchFacets(filters);
    
    return {
      resources,
      total: resources.length, // This should be calculated properly
      page,
      pageSize,
      totalPages: Math.ceil(resources.length / pageSize),
      facets
    };
  } catch (error) {
    console.error('Error searching resources:', error);
    throw new Error('Failed to search resources');
  }
}

/**
 * Get a single resource by ID
 */
export async function getResource(id: string): Promise<Resource | null> {
  if (isUsingMockAPI()) {
    return mockGetResource(id);
  }

  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap['id'],
      ...data,
      createdAt: data['createdAt']?.toDate(),
      updatedAt: data['updatedAt']?.toDate(),
      publishedAt: data['publishedAt']?.toDate()
    } as Resource;
  } catch (error) {
    console.error('Error getting resource:', error);
    throw new Error('Failed to get resource');
  }
}

/**
 * Upload a new resource
 */
export async function uploadResource(request: ResourceUploadRequest): Promise<string> {
  if (isUsingMockAPI()) {
    return mockUploadResource(request);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    return await runTransaction(db, async (transaction) => {
      // Upload main file
      const fileRef = ref(storage, `resources/${Date.now()}_${request.file['name']}`);
      const fileSnapshot = await uploadBytes(fileRef, request.file);
      const fileUrl = await getDownloadURL(fileSnapshot.ref);
      const fileMetadata = await getMetadata(fileSnapshot.ref);
      
      // Upload preview file if provided
      let previewUrl: string | undefined;
      if (request.previewFile) {
        const previewRef = ref(storage, `resources/previews/${Date.now()}_${request.previewFile['name']}`);
        const previewSnapshot = await uploadBytes(previewRef, request.previewFile);
        previewUrl = await getDownloadURL(previewSnapshot.ref);
      }
      
      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined;
      if (request.thumbnailFile) {
        const thumbnailRef = ref(storage, `resources/thumbnails/${Date.now()}_${request.thumbnailFile['name']}`);
        const thumbnailSnapshot = await uploadBytes(thumbnailRef, request.thumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
      }

      // Create resource document
      const resourceRef = doc(collection(db, RESOURCES_COLLECTION));
      const resource: Omit<Resource, 'id'> = {
        title: request.title,
        description: request.description,
        summary: request.summary,
        category: request.category,
        type: request['type'],
        tags: request.tags,
        fileUrl,
        fileName: request.file['name'],
        fileSize: request.file.size,
        mimeType: request.file['type'],
        author: {
          uid: user.uid,
          name: user.displayName || 'Unknown',
          email: user['email'] || '',
          avatar: user.photoURL,
          verified: false,
          contributionCount: 0
        },
        contributors: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersion: '1.0.0',
        versions: [{
          id: 'v1',
          version: '1.0.0',
          releaseDate: new Date(),
          changelog: 'Initial release',
          downloadUrl: fileUrl,
          fileSize: request.file.size,
          fileName: request.file['name'],
          uploadedBy: user.uid
        }],
        accessLevel: request.accessLevel,
        status: 'pending', // Requires moderation
        downloadCount: 0,
        viewCount: 0,
        bookmarkCount: 0,
        rating: 0,
        reviewCount: 0,
        reviews: [],
        relatedResources: [],
        prerequisites: request.prerequisites || [],
        language: request.language,
        difficulty: request.difficulty,
        estimatedTime: request.estimatedTime,
        hasPreview: request.hasPreview,
        previewUrl,
        thumbnailUrl,
        searchKeywords: [...request.tags, request.title.toLowerCase().split(' ')].flat()
      };

      transaction.set(resourceRef, resource);
      
      // Log activity
      const activityRef = doc(collection(db, ACTIVITIES_COLLECTION));
      transaction.set(activityRef, {
        type: 'upload',
        userId: user.uid,
        userName: user.displayName,
        resourceId: resourceRef['id'],
        resourceTitle: request.title,
        description: `Uploaded new resource: ${request.title}`,
        createdAt: new Date()
      });

      return resourceRef['id'];
    });
  } catch (error) {
    console.error('Error uploading resource:', error);
    throw new Error('Failed to upload resource');
  }
}

/**
 * Update a resource
 */
export async function updateResource(id: string, updates: Partial<Resource>): Promise<void> {
  if (isUsingMockAPI()) {
    return mockUpdateResource(id, updates);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const docRef = doc(db, RESOURCES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });

    // Log activity
    await logActivity({
      type: 'update',
      userId: user.uid,
      userName: user.displayName || 'Unknown',
      resourceId: id,
      resourceTitle: updates.title || 'Unknown',
      description: `Updated resource: ${updates.title || id}`
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    throw new Error('Failed to update resource');
  }
}

/**
 * Delete a resource
 */
export async function deleteResource(id: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockDeleteResource(id);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const resourceRef = doc(db, RESOURCES_COLLECTION, id);
      const resourceDoc = await transaction.get(resourceRef);
      
      if (!resourceDoc.exists()) {
        throw new Error('Resource not found');
      }

      const resource = resourceDoc['data']() as Resource;
      
      // Check permissions
      if (resource.author.uid !== user.uid) {
        // Check if user is admin/moderator
        // This would require additional role checking
        throw new Error('Permission denied');
      }

      // Delete resource document
      transaction.delete(resourceRef);
      
      // Delete associated files from storage
      try {
        const fileRef = ref(storage, resource.fileUrl);
        await deleteObject(fileRef);
        
        if (resource.previewUrl) {
          const previewRef = ref(storage, resource.previewUrl);
          await deleteObject(previewRef);
        }
        
        if (resource.thumbnailUrl) {
          const thumbnailRef = ref(storage, resource.thumbnailUrl);
          await deleteObject(thumbnailRef);
        }
      } catch (storageError) {
        console.warn('Error deleting files from storage:', storageError);
      }
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    throw new Error('Failed to delete resource');
  }
}

/**
 * Track resource download
 */
export async function trackDownload(resourceId: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockTrackDownload(resourceId);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const resourceRef = doc(db, RESOURCES_COLLECTION, resourceId);
      const downloadRef = doc(collection(db, DOWNLOADS_COLLECTION));
      
      // Increment download count
      transaction.update(resourceRef, {
        downloadCount: increment(1)
      });
      
      // Log download
      transaction.set(downloadRef, {
        userId: user.uid,
        resourceId,
        downloadedAt: new Date(),
        version: 'current' // This could be more specific
      });
      
      // Log activity
      const activityRef = doc(collection(db, ACTIVITIES_COLLECTION));
      transaction.set(activityRef, {
        type: 'download',
        userId: user.uid,
        userName: user.displayName,
        resourceId,
        resourceTitle: 'Resource', // This should be fetched
        description: `Downloaded resource`,
        createdAt: new Date()
      });
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    throw new Error('Failed to track download');
  }
}

/**
 * Track resource view
 */
export async function trackView(resourceId: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockTrackView(resourceId);
  }

  try {
    const resourceRef = doc(db, RESOURCES_COLLECTION, resourceId);
    await updateDoc(resourceRef, {
      viewCount: increment(1)
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't throw error for view tracking failures
  }
}

/**
 * Add a review to a resource
 */
export async function addReview(resourceId: string, rating: number, comment: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockAddReview(resourceId, rating, comment);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const resourceRef = doc(db, RESOURCES_COLLECTION, resourceId);
      const reviewRef = doc(collection(db, REVIEWS_COLLECTION));
      
      const review: Omit<ResourceReview, 'id'> = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.photoURL,
        rating,
        comment,
        createdAt: new Date(),
        helpful: 0,
        helpfulUsers: []
      };
      
      transaction.set(reviewRef, review);
      
      // Update resource review count and rating
      // This is simplified - in production, you'd calculate the new average rating
      transaction.update(resourceRef, {
        reviewCount: increment(1),
        reviews: arrayUnion(reviewRef['id'])
      });
    });
  } catch (error) {
    console.error('Error adding review:', error);
    throw new Error('Failed to add review');
  }
}

/**
 * Bookmark a resource
 */
export async function bookmarkResource(resourceId: string, notes?: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockBookmarkResource(resourceId, notes);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const bookmarkRef = doc(collection(db, BOOKMARKS_COLLECTION));
    await setDoc(bookmarkRef, {
      userId: user.uid,
      resourceId,
      createdAt: new Date(),
      notes: notes || ''
    });

    // Update bookmark count
    const resourceRef = doc(db, RESOURCES_COLLECTION, resourceId);
    await updateDoc(resourceRef, {
      bookmarkCount: increment(1)
    });
  } catch (error) {
    console.error('Error bookmarking resource:', error);
    throw new Error('Failed to bookmark resource');
  }
}

/**
 * Remove bookmark
 */
export async function removeBookmark(resourceId: string): Promise<void> {
  if (isUsingMockAPI()) {
    return mockRemoveBookmark(resourceId);
  }

  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const bookmarksRef = collection(db, BOOKMARKS_COLLECTION);
    const q = query(
      bookmarksRef,
      where('userId', '==', user.uid),
      where('resourceId', '==', resourceId)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot['docs'].forEach(doc => {
      batch.delete(doc['ref']);
    });
    
    await batch.commit();

    // Update bookmark count
    const resourceRef = doc(db, RESOURCES_COLLECTION, resourceId);
    await updateDoc(resourceRef, {
      bookmarkCount: increment(-1)
    });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw new Error('Failed to remove bookmark');
  }
}

/**
 * Get user's bookmarked resources
 */
export async function getUserBookmarks(userId: string): Promise<Resource[]> {
  if (isUsingMockAPI()) {
    return mockGetUserBookmarks(userId);
  }

  try {
    const bookmarksRef = collection(db, BOOKMARKS_COLLECTION);
    const q = query(bookmarksRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const resourceIds = snapshot['docs'].map(doc => doc['data']().resourceId);
    
    if (resourceIds.length === 0) {
      return [];
    }
    
    const resourcesRef = collection(db, RESOURCES_COLLECTION);
    const resourcesQuery = query(resourcesRef, where('__name__', 'in', resourceIds));
    const resourcesSnapshot = await getDocs(resourcesQuery);
    
    return resourcesSnapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc['data'](),
      createdAt: doc['data']().createdAt?.toDate(),
      updatedAt: doc['data']().updatedAt?.toDate(),
      publishedAt: doc.data().publishedAt?.toDate()
    })) as Resource[];
  } catch (error) {
    console.error('Error getting user bookmarks:', error);
    throw new Error('Failed to get user bookmarks');
  }
}

/**
 * Get resource statistics
 */
export async function getResourceStats(): Promise<ResourceStats> {
  if (isUsingMockAPI()) {
    return mockGetResourceStats();
  }

  try {
    // This is a simplified implementation
    // In production, you'd use aggregation queries or maintain these stats separately
    const resourcesRef = collection(db, RESOURCES_COLLECTION);
    const snapshot = await getDocs(resourcesRef);
    
    const resources = snapshot['docs'].map(doc => doc['data']()) as Resource[];
    
    const stats: ResourceStats = {
      totalResources: resources.length,
      totalDownloads: resources.reduce((sum, r) => sum + (r.downloadCount || 0), 0),
      totalViews: resources.reduce((sum, r) => sum + (r.viewCount || 0), 0),
      totalAuthors: new Set(resources.map(r => r.author.uid)).size,
      averageRating: resources.reduce((sum, r) => sum + (r.rating || 0), 0) / resources.length,
      categoryCounts: {} as any,
      typeCounts: {} as any,
      recentUploads: resources
        .sort((a, b) => b['createdAt'].getTime() - a['createdAt'].getTime())
        .slice(0, 5),
      topDownloaded: resources
        .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
        .slice(0, 5),
      topRated: resources
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5),
      trendingTags: []
    };
    
    // Calculate category and type counts
    resources.forEach(resource => {
      stats.categoryCounts[resource.category] = (stats.categoryCounts[resource.category] || 0) + 1;
      stats.typeCounts[resource['type']] = (stats.typeCounts[resource['type']] || 0) + 1;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting resource stats:', error);
    throw new Error('Failed to get resource stats');
  }
}

/**
 * Helper function to log activities
 */
async function logActivity(activity: Omit<ResourceActivity, 'id' | 'createdAt'>): Promise<void> {
  try {
    const activityRef = doc(collection(db, ACTIVITIES_COLLECTION));
    await setDoc(activityRef, {
      ...activity,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Helper function to calculate search facets
 */
async function calculateSearchFacets(filters: ResourceSearchFilters): Promise<any> {
  // This is a simplified implementation
  // In production, you'd use more sophisticated aggregation
  return {
    categories: {},
    types: {},
    tags: {},
    authors: {},
    difficulties: {}
  };
}

// Mock implementations for development/testing
function mockSearchResources(filters: ResourceSearchFilters, sort: ResourceSearchSort, page: number, pageSize: number): Promise<ResourceSearchResult> {
  return Promise.resolve({
    resources: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    facets: {
      categories: {} as any,
      types: {} as any,
      tags: {},
      authors: {},
      difficulties: {}
    }
  });
}

function mockGetResource(id: string): Promise<Resource | null> {
  return Promise.resolve(null);
}

function mockUploadResource(request: ResourceUploadRequest): Promise<string> {
  return Promise.resolve('mock-resource-id');
}

function mockUpdateResource(id: string, updates: Partial<Resource>): Promise<void> {
  return Promise.resolve();
}

function mockDeleteResource(id: string): Promise<void> {
  return Promise.resolve();
}

function mockTrackDownload(resourceId: string): Promise<void> {
  return Promise.resolve();
}

function mockTrackView(resourceId: string): Promise<void> {
  return Promise.resolve();
}

function mockAddReview(resourceId: string, rating: number, comment: string): Promise<void> {
  return Promise.resolve();
}

function mockBookmarkResource(resourceId: string, notes?: string): Promise<void> {
  return Promise.resolve();
}

function mockRemoveBookmark(resourceId: string): Promise<void> {
  return Promise.resolve();
}

function mockGetUserBookmarks(userId: string): Promise<Resource[]> {
  return Promise.resolve([]);
}

function mockGetResourceStats(): Promise<ResourceStats> {
  return Promise.resolve({
    totalResources: 0,
    totalDownloads: 0,
    totalViews: 0,
    totalAuthors: 0,
    averageRating: 0,
    categoryCounts: {} as any,
    typeCounts: {} as any,
    recentUploads: [],
    topDownloaded: [],
    topRated: [],
    trendingTags: []
  });
}