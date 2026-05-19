import React from 'react';
import type { ColumnDefinition, SortConfig } from '@lib/listing/types';

interface ListingTableProps<T> {
  items: T[];
  columns: ColumnDefinition<T>[];
  keyExtractor: (item: T) => string;
  sort?: SortConfig;
  onSortChange?: (sort: SortConfig) => void;
  className?: string;
}

export function ListingTable<T>({
  items,
  columns,
  keyExtractor,
  sort,
  onSortChange,
  className = '',
}: ListingTableProps<T>) {
  const handleHeaderClick = (col: ColumnDefinition<T>) => {
    if (!col.sortable || !onSortChange) return;
    const direction =
      sort?.field === col.key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field: col.key, direction });
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
                onClick={() => handleHeaderClick(col)}
                aria-sort={
                  sort?.field === col.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sort?.field === col.key && (
                    <span>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3"
                  style={{ textAlign: col.align ?? 'left' }}
                >
                  {col.accessor(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
