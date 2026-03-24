import React, { useMemo } from 'react';
import { UniversalListing } from '@components/listing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import { getSpotlights } from '@/lib/spotlights';
import SpotlightCard from './SpotlightCard';
import type { AlumniSpotlight } from '@/types/spotlight';

interface SpotlightListProps {
  lang?: 'es' | 'en';
}

export default function SpotlightList({ lang = 'es' }: SpotlightListProps) {
  const adapter = useMemo(
    () =>
      new ClientSideAdapter<AlumniSpotlight>({
        fetchAll: getSpotlights,
        searchFields: ['name', 'title', 'company', 'excerpt'],
        getId: (item) => item.id,
      }),
    []
  );

  return (
    <UniversalListing
      adapter={adapter}
      renderItem={(spotlight) => (
        <SpotlightCard spotlight={spotlight} lang={lang} />
      )}
      keyExtractor={(s) => s.id}
      defaultViewMode="grid"
      availableViewModes={['grid']}
      showFilters={false}
      showSort={false}
      showViewToggle={false}
      paginationMode="offset"
      defaultPageSize={12}
      lang={lang}
    />
  );
}
