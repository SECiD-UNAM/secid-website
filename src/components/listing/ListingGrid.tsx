import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingGridProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingGrid<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingGridProps<T>) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      role="list"
    >
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'grid')}
        </div>
      ))}
    </div>
  );
}
