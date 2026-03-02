import React, { useState } from 'react';
import { trackView, bookmarkResource, removeBookmark } from '@/lib/resources';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * ResourceCard Component
 * Displays individual resource information in card format
 */

import type { Resource } from '@/types/resource';

interface ResourceCardProps {
  resource: Resource;
  onBookmarkChange?: (resourceId: string, isBookmarked: boolean) => void;
  isBookmarked?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

export default function ResourceCard({
  resource,
  onBookmarkChange,
  isBookmarked = false,
  compact = false,
  showActions = true,
}: ResourceCardProps) {
  const t = useTranslations();
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  const handleView = async () => {
    if (!hasViewed) {
      try {
        await trackView(resource.id);
        setHasViewed(true);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBookmarkLoading) return;

    setIsBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await removeBookmark(resource.id);
        onBookmarkChange?.(resource.id, false);
      } else {
        await bookmarkResource(resource.id);
        onBookmarkChange?.(resource.id, true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // This will open the detailed view where the actual download happens
    window.location.href = `/resources/${resource.id}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type: string): string => {
    const icons = {
      pdf: '📄',
      excel: '📊',
      jupyter: '📓',
      python: '🐍',
      r: '📈',
      sql: '🗄️',
      csv: '📋',
      json: '📋',
      video: '🎥',
      audio: '🎵',
      image: '🖼️',
      zip: '📦',
      link: '🔗',
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const getCategoryColor = (category: string): string => {
    const colors = {
      tutorials: 'bg-blue-100 text-blue-800',
      templates: 'bg-green-100 text-green-800',
      tools: 'bg-purple-100 text-purple-800',
      books: 'bg-yellow-100 text-yellow-800',
      courses: 'bg-indigo-100 text-indigo-800',
      datasets: 'bg-red-100 text-red-800',
      research: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
      documentation: 'bg-teal-100 text-teal-800',
    };
    return (
      colors[category as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    );
  };

  const getDifficultyColor = (difficulty: string): string => {
    const colors = {
      beginner: 'text-green-600',
      intermediate: 'text-yellow-600',
      advanced: 'text-red-600',
    };
    return colors[difficulty as keyof typeof colors] || 'text-gray-600 dark:text-gray-400';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
      >
        ★
      </span>
    ));
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md transition-shadow duration-200 hover:shadow-lg ${
        compact ? 'p-4' : 'p-6'
      }`}
      onClick={handleView}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(resource['type'])}</span>
          {resource.hasPreview && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">
              {t?.resources?.preview || 'Preview'}
            </span>
          )}
          {resource.accessLevel === 'premium' && (
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-600">
              ⭐ {t?.resources?.premium || 'Premium'}
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBookmark}
              disabled={isBookmarkLoading}
              className={`rounded-full p-2 transition-colors ${
                isBookmarked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-400 hover:text-red-500'
              }`}
              title={
                isBookmarked
                  ? t?.resources?.removeBookmark
                  : t?.resources?.addBookmark
              }
            >
              {isBookmarkLoading ? '⏳' : isBookmarked ? '❤️' : '🤍'}
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {resource.thumbnailUrl && !compact && (
        <div className="mb-4">
          <img
            src={resource.thumbnailUrl}
            alt={resource.title}
            className="h-32 w-full rounded-md object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Title and Description */}
      <div className="mb-3">
        <h3
          className={`mb-2 line-clamp-2 font-semibold text-gray-900 dark:text-white ${
            compact ? 'text-sm' : 'text-lg'
          }`}
        >
          {resource.title}
        </h3>
        <p
          className={`line-clamp-3 text-gray-600 dark:text-gray-400 ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {resource.summary || resource['description']}
        </p>
      </div>

      {/* Metadata */}
      <div className="mb-4 space-y-2">
        {/* Category and Difficulty */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs ${getCategoryColor(resource.category)}`}
          >
            {t?.resources?.categories?.[resource.category] || resource.category}
          </span>
          <span
            className={`text-xs font-medium ${getDifficultyColor(resource.difficulty)}`}
          >
            {t?.resources?.difficulty?.[resource.difficulty] ||
              resource.difficulty}
          </span>
          {resource.language && (
            <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              {resource.language.toUpperCase()}
            </span>
          )}
        </div>

        {/* Tags */}
        {resource.tags.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
              >
                #{tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{resource.tags.length - 3} {t?.common?.more || 'more'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Author and Stats */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          {resource.author.avatar && (
            <img
              src={resource.author.avatar}
              alt={resource.author.name}
              className="h-6 w-6 rounded-full"
            />
          )}
          <span className="truncate">{resource.author.name}</span>
          {resource.author.verified && (
            <span
              className="text-blue-500"
              title={t?.resources?.verified || 'Verified'}
            >
              ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Rating */}
          {resource.rating > 0 && (
            <div className="flex items-center gap-1">
              {renderStars(resource.rating)}
              <span className="text-xs">({resource.reviewCount})</span>
            </div>
          )}

          {/* Download count */}
          <div className="flex items-center gap-1">
            <span>⬇️</span>
            <span className="text-xs">{resource.downloadCount}</span>
          </div>
        </div>
      </div>

      {/* File Info */}
      <div className="mb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatFileSize(resource.fileSize)}</span>
        <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {resource.accessLevel === 'free'
              ? t?.resources?.download || 'Download'
              : t?.resources?.viewDetails || 'View Details'}
          </button>

          {resource.hasPreview && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(resource.previewUrl, '_blank');
              }}
              className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t?.resources?.preview || 'Preview'}
            </button>
          )}
        </div>
      )}

      {/* Estimated Time */}
      {resource.estimatedTime && !compact && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>⏱️</span>
            <span>
              {t?.resources?.estimatedTime || 'Estimated time'}:{' '}
              {resource.estimatedTime}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
