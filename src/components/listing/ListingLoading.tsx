import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingLoadingProps {
  viewMode: ViewMode;
  count?: number;
  className?: string;
}

export function ListingLoading({
  viewMode,
  count = 6,
  className = '',
}: ListingLoadingProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  switch (viewMode) {
    case 'grid':
      return (
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
        >
          {skeletons.map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="mb-3 h-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      );

    case 'list':
      return (
        <div className={`flex flex-col gap-3 ${className}`}>
          {skeletons.map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="mb-2 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'compact':
      return (
        <div className={`flex flex-col gap-1 ${className}`}>
          {skeletons.map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div className={`overflow-x-auto ${className}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                {[1, 2, 3, 4].map((i) => (
                  <th key={i} className="px-4 py-3">
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletons.map((i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
