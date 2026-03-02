import React, { useState, useEffect } from 'react';
import { 
  getResource, 
  trackDownload, 
  trackView, 
  addReview, 
  bookmarkResource, 
  removeBookmark,
  searchResources
} from '@/lib/resources';
import { getCurrentUser} from '@/lib/auth';
import { useTranslations} from '@/hooks/useTranslations';
import ResourceCard from './ResourceCard';
import type { Resource, ResourceReview } from '@/types/resource';

/**
 * ResourceDetail Component
 * Detailed resource view with download capability, reviews, and related resources
 */

interface ResourceDetailProps {
  resourceId: string;
  onClose?: () => void;
}

export default function ResourceDetail({ resourceId, onClose }: ResourceDetailProps) {
  const t = useTranslations();
  const [resource, setResource] = useState<Resource | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'versions'>('overview');
  
  const user = getCurrentUser();

  useEffect(() => {
    loadResource();
  }, [resourceId]);

  const loadResource = async () => {
    try {
      setLoading(true);
      const [resourceData, relatedData] = await Promise.all([
        getResource(resourceId),
        loadRelatedResources()
      ]);
      
      if(resourceData) {
        setResource(resourceData);
        await trackView(resourceId);
        
        // Check if user has bookmarked this resource
        // This would require a separate API call in a real implementation
        setIsBookmarked(false);
      }
      
      setRelatedResources(relatedData);
    } catch (error) {
      console.error('Error loading resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedResources = async (): Promise<Resource[]> => {
    try {
      // Get related resources based on tags and category
      const result = await searchResources(
        { 
          categories: resource ? [resource.category] : undefined,
          tags: resource?.tags.slice(0, 3)
        },
        { field: 'downloads', direction: 'desc' },
        1,
        4
      );
      return result?.resources?.filter(r => r.id !== resourceId);
    } catch (error) {
      console.error('Error loading related resources:', error);
      return [];
    }
  };

  const handleDownload = async () => {
    if (!resource || !user) return;
    
    try {
      setDownloading(true);
      
      // Check access permissions
      if (resource.accessLevel === 'premium' && !user) {
        alert(t?.resources?.loginRequired || 'Please login to download premium resources');
        return;
      }
      
      await trackDownload(resourceId);
      
      // Create download link
      const link = document['createElement']('a');
      link.href = resource.fileUrl;
      link.download = resource.fileName;
      link.target = '_blank';
      document['body'].appendChild(link);
      link.click();
      document['body'].removeChild(link);
      
      // Update download count in UI
      setResource(prev => prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : null);
      
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert(t?.resources?.downloadError || 'Error downloading resource');
    } finally {
      setDownloading(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      alert(t?.resources?.loginRequired || 'Please login to bookmark resources');
      return;
    }
    
    try {
      if(isBookmarked) {
        await removeBookmark(resourceId);
        setIsBookmarked(false);
        setResource(prev => prev ? { ...prev, bookmarkCount: prev.bookmarkCount - 1 } : null);
      } else {
        await bookmarkResource(resourceId);
        setIsBookmarked(true);
        setResource(prev => prev ? { ...prev, bookmarkCount: prev.bookmarkCount + 1 } : null);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !resource) {
      alert(t?.resources?.loginRequired || 'Please login to leave a review');
      return;
    }
    
    if (!reviewComment.trim()) {
      alert(t?.resources?.reviewRequired || 'Please enter a review comment');
      return;
    }
    
    try {
      setSubmittingReview(true);
      await addReview(resourceId, reviewRating, reviewComment);
      
      // Reload resource to get updated reviews
      await loadResource();
      
      // Reset form
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(t?.resources?.reviewError || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        onClick={() => interactive && onRate?.(i + 1)}
        className={`text-lg ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''} ${
          i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
        }`}
        disabled={!interactive}
      >
        ★
      </button>
    ));
  };

  if(loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t?.resources?.notFound || 'Resource not found'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t?.resources?.notFoundDescription || 'The requested resource could not be found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{resource.title}</h1>
              {resource.accessLevel === 'premium' && (
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-1 rounded-full">
                  ⭐ {t?.resources?.premium || 'Premium'}
                </span>
              )}
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">{resource['description']}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                {resource.author.avatar && (
                  <img
                    src={resource.author.avatar}
                    alt={resource.author.name}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span>{resource.author.name}</span>
                {resource.author.verified && <span className="text-blue-500">✓</span>}
              </div>
              <span>•</span>
              <span>{new Date(resource['createdAt']).toLocaleDateString()}</span>
              <span>•</span>
              <span>{formatFileSize(resource.fileSize)}</span>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Stats and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span>⬇️</span>
              <span>{resource.downloadCount} {t?.resources?.downloads || 'downloads'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>👁️</span>
              <span>{resource.viewCount} {t?.resources?.views || 'views'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>❤️</span>
              <span>{resource.bookmarkCount} {t?.resources?.bookmarks || 'bookmarks'}</span>
            </div>
            {resource.rating > 0 && (
              <div className="flex items-center gap-1">
                {renderStars(resource.rating)}
                <span>({resource.reviewCount})</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleBookmark}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                isBookmarked
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700 dark:text-red-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {isBookmarked ? '❤️ Bookmarked' : '🤍 Bookmark'}
            </button>
            
            {resource.hasPreview && (
              <button
                onClick={() => window.open(resource.previewUrl, '_blank')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t?.resources?.preview || 'Preview'}
              </button>
            )}
            
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  {t?.resources?.downloading || 'Downloading...'}
                </>
              ) : (
                t?.resources?.download || 'Download'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            {['overview', 'reviews', 'versions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t?.resources?.tabs?.[tab] || tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Thumbnail */}
              {resource.thumbnailUrl && (
                <div>
                  <img
                    src={resource.thumbnailUrl}
                    alt={resource.title}
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t?.resources?.details || 'Details'}</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t?.resources?.category || 'Category'}</dt>
                      <dd className="text-sm font-medium">{resource.category}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t?.resources?.type || 'Type'}</dt>
                      <dd className="text-sm font-medium">{resource['type']}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t?.resources?.difficulty?.title || 'Difficulty'}</dt>
                      <dd className="text-sm font-medium">{resource.difficulty}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">{t?.resources?.language || 'Language'}</dt>
                      <dd className="text-sm font-medium">{resource.language}</dd>
                    </div>
                    {resource.estimatedTime && (
                      <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">{t?.resources?.estimatedTime || 'Estimated Time'}</dt>
                        <dd className="text-sm font-medium">{resource.estimatedTime}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t?.resources?.tags || 'Tags'}</h3>
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  {resource.prerequisites.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t?.resources?.prerequisites || 'Prerequisites'}
                      </h4>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                        {resource.prerequisites.map((prereq, index) => (
                          <li key={index}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3">{t?.resources?.summary || 'Summary'}</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{resource.summary}</p>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review Form */}
              {user && (
                <div>
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t?.resources?.writeReview || 'Write a Review'}
                    </button>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">{t?.resources?.writeReview || 'Write a Review'}</h4>
                      
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t?.resources?.rating || 'Rating'}
                        </label>
                        <div className="flex items-center gap-1">
                          {renderStars(reviewRating, true, setReviewRating)}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t?.resources?.comment || 'Comment'}
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={4}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={t?.resources?.reviewPlaceholder || 'Share your thoughts about this resource...'}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {submittingReview ? t?.resources?.submitting : t?.common?.submit}
                        </button>
                        <button
                          onClick={() => setShowReviewForm(false)}
                          className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t?.common?.cancel || 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Reviews List */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {t?.resources?.reviews || 'Reviews'} ({resource.reviewCount})
                </h3>
                
                {resource.reviews.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {t?.resources?.noReviews || 'No reviews yet. Be the first to review!'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {resource.reviews.slice(0, 5).map((review, index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="flex items-start gap-3">
                          {/* This would need actual review data */}
                          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">User Name</span>
                              <div className="flex">{renderStars(5)}</div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">2 days ago</span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">Sample review content...</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t?.resources?.versions || 'Versions'}</h3>
              
              <div className="space-y-4">
                {resource.versions.map((version, index) => (
                  <div key={version.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">v{version.version}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(version.releaseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{version.changelog}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(version.fileSize)}
                      </span>
                      <button
                        onClick={() => window.open(version.downloadUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {t?.resources?.download || 'Download'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Resources */}
      {relatedResources.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t?.resources?.related || 'Related Resources'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedResources.map(relatedResource => (
              <ResourceCard
                key={relatedResource.id}
                resource={relatedResource}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}