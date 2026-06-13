import React from 'react';
import type { ViewMode } from '@lib/listing/types';

interface ListingListProps<T> {
  items: T[];
  renderItem: (item: T, viewMode: ViewMode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function ListingList<T>({
  items,
  renderItem,
  keyExtractor,
  className = '',
}: ListingListProps<T>) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} role="list">
      {items.map((item) => (
        <div key={keyExtractor(item)} role="listitem">
          {renderItem(item, 'list')}
        </div>
      ))}
    </div>
  );
}
