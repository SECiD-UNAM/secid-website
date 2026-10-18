import React from 'react';
import { getListingTranslations, type ListingLang } from '@lib/listing/i18n';

interface ListingStatsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  lang?: ListingLang;
  className?: string;
}

export function ListingStats({
  page,
  pageSize,
  totalCount,
  lang = 'es',
  className = '',
}: ListingStatsProps) {
  const t = getListingTranslations(lang);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {t.pagination.showing(start, end, totalCount)}
    </div>
  );
}
