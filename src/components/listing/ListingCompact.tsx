import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingCompactProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingCompact<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingCompactProps<T>) {
  return (
    <div className={`flex flex-col gap-1 ${className}`} role="list">
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'compact')}
        </div>
      ))}
    </div>
  );
}
