export type ListingLang = 'es' | 'en';

const translations = {
  es: {
    search: {
      placeholder: 'Buscar...',
      clearLabel: 'Limpiar búsqueda',
      resultsCount: (count: number) =>
        `${count} resultado${count !== 1 ? 's' : ''}`,
    },
    filters: {
      showFilters: 'Filtros',
      hideFilters: 'Ocultar filtros',
      clearAll: 'Limpiar todo',
      apply: 'Aplicar',
      activeCount: (count: number) =>
        `${count} filtro${count !== 1 ? 's' : ''} activo${count !== 1 ? 's' : ''}`,
    },
    sort: {
      label: 'Ordenar por',
      asc: 'Ascendente',
      desc: 'Descendente',
    },
    viewMode: {
      grid: 'Cuadrícula',
      list: 'Lista',
      compact: 'Compacto',
      table: 'Tabla',
    },
    pagination: {
      previous: 'Anterior',
      next: 'Siguiente',
      loadMore: 'Cargar más',
      showing: (start: number, end: number, total: number) =>
        `Mostrando ${start}–${end} de ${total}`,
      page: (current: number, total: number) =>
        `Página ${current} de ${total}`,
    },
    empty: {
      title: 'Sin resultados',
      description: 'No se encontraron elementos con los filtros actuales.',
      clearFilters: 'Limpiar filtros',
    },
    loading: {
      text: 'Cargando...',
    },
    error: {
      title: 'Error',
      retry: 'Reintentar',
    },
  },
  en: {
    search: {
      placeholder: 'Search...',
      clearLabel: 'Clear search',
      resultsCount: (count: number) =>
        `${count} result${count !== 1 ? 's' : ''}`,
    },
    filters: {
      showFilters: 'Filters',
      hideFilters: 'Hide filters',
      clearAll: 'Clear all',
      apply: 'Apply',
      activeCount: (count: number) =>
        `${count} active filter${count !== 1 ? 's' : ''}`,
    },
    sort: {
      label: 'Sort by',
      asc: 'Ascending',
      desc: 'Descending',
    },
    viewMode: {
      grid: 'Grid',
      list: 'List',
      compact: 'Compact',
      table: 'Table',
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      loadMore: 'Load more',
      showing: (start: number, end: number, total: number) =>
        `Showing ${start}–${end} of ${total}`,
      page: (current: number, total: number) =>
        `Page ${current} of ${total}`,
    },
    empty: {
      title: 'No results',
      description: 'No items found matching the current filters.',
      clearFilters: 'Clear filters',
    },
    loading: {
      text: 'Loading...',
    },
    error: {
      title: 'Error',
      retry: 'Retry',
    },
  },
} as const;

export type ListingTranslations = (typeof translations)['en'];

export function getListingTranslations(lang: ListingLang): ListingTranslations {
  return translations[lang];
}
