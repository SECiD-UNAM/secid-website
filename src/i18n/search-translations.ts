/**
 * Comprehensive Search Translations for SECiD Platform
 * Supports Spanish (es) and English (en)
 */

export interface SearchTranslations {
  search: {
    // General search terms
    title: string;
    placeholder: string;
    button: string;
    loading: string;
    clear: string;
    voiceSearch: string;

    // Search suggestions
    suggestion: {
      query: string;
      filter: string;
      recent: string;
      popular: string;
    };

    // Search results
    results: {
      title: string;
      noResults: string;
      found: string;
      showing: string;
      of: string;
    };

    // No results state
    noResults: {
      title: string;
      description: string;
      suggestions: string[];
    };

    // Search filters
    filters: {
      title: string;
      toggle: string;
      clear: string;
      apply: string;
      contentType: string;
      category: string;
      tags: string;
      dateRange: string;
      location: string;
      language: string;
      author: string;
      status: string;
    };

    // Content types
    contentTypes: {
      all: string;
      jobs: string;
      events: string;
      forums: string;
      members: string;
      mentors: string;
      resources: string;
      news: string;
    };

    // Content type descriptions
    contentTypeDescriptions: {
      all: string;
      jobs: string;
      events: string;
      forums: string;
      members: string;
      mentors: string;
      resources: string;
      news: string;
    };

    // Sort options
    sort: {
      relevance: string;
      date: string;
      title: string;
      popularity: string;
      newest: string;
      oldest: string;
    };

    // Recent searches
    recent: {
      title: string;
      clear: string;
      empty: string;
    };

    // Popular searches
    popular: {
      title: string;
      trending: string;
      thisWeek: string;
      thisMonth: string;
    };

    // Search history
    history: {
      title: string;
      clear: string;
      delete: string;
      empty: string;
      resultsCount: string;
    };

    // Advanced search
    advanced: {
      title: string;
      exactPhrase: string;
      anyWords: string;
      excludeWords: string;
      dateRange: string;
      fileType: string;
      syntax: string;
    };

    // Search within results
    withinResults: string;

    // Export functionality
    export: string;
    exportFormats: {
      csv: string;
      json: string;
      xlsx: string;
      pdf: string;
    };

    // View modes
    viewModes: {
      list: string;
      grid: string;
      compact: string;
    };

    // Pagination
    pagination: {
      previous: string;
      next: string;
      page: string;
      of: string;
      showing: string;
      results: string;
    };

    // Keyboard shortcuts
    shortcuts: {
      navigate: string;
      select: string;
      close: string;
      search: string;
      clear: string;
    };

    // Search analytics
    analytics: {
      searchTime: string;
      resultsFound: string;
      noMatches: string;
      suggestions: string;
    };

    // Error messages
    errors: {
      generic: string;
      network: string;
      timeout: string;
      invalidQuery: string;
      tooManyRequests: string;
      serverError: string;
    };

    // Voice search
    voice: {
      start: string;
      stop: string;
      listening: string;
      notSupported: string;
      noSpeech: string;
      error: string;
    };

    // Search operators
    operators: {
      and: string;
      or: string;
      not: string;
      exact: string;
      wildcard: string;
      proximity: string;
    };

    // Search tips
    tips: {
      title: string;
      useQuotes: string;
      useFilters: string;
      checkSpelling: string;
      tryDifferent: string;
      useSynonyms: string;
    };
  };
}

// Spanish translations
export const searchTranslationsEs: SearchTranslations = {
  search: {
    title: 'Buscar en SECiD',
    placeholder: 'Buscar empleos, eventos, foros, miembros...',
    button: 'Buscar',
    loading: 'Buscando...',
    clear: 'Limpiar búsqueda',
    voiceSearch: 'Búsqueda por voz',

    suggestion: {
      query: 'Búsqueda',
      filter: 'Filtro',
      recent: 'Reciente',
      popular: 'Popular',
    },

    results: {
      title: 'Resultados de búsqueda',
      noResults: 'No se encontraron resultados',
      found: 'encontrados',
      showing: 'Mostrando',
      of: 'de',
    },

    noResults: {
      title: 'No se encontraron resultados',
      description: 'Intenta ajustar tus términos de búsqueda o filtros',
      suggestions: [
        'Verifica la ortografía de las palabras clave',
        'Intenta con palabras clave más generales',
        'Prueba con diferentes palabras clave',
        'Usa menos filtros',
      ],
    },

    filters: {
      title: 'Filtros',
      toggle: 'Alternar filtros',
      clear: 'Limpiar filtros',
      apply: 'Aplicar filtros',
      contentType: 'Tipo de contenido',
      category: 'Categoría',
      tags: 'Etiquetas',
      dateRange: 'Rango de fechas',
      location: 'Ubicación',
      language: 'Idioma',
      author: 'Autor',
      status: 'Estado',
    },

    contentTypes: {
      all: 'Todo',
      jobs: 'Empleos',
      events: 'Eventos',
      forums: 'Foros',
      members: 'Miembros',
      mentors: 'Mentores',
      resources: 'Recursos',
      news: 'Noticias',
    },

    contentTypeDescriptions: {
      all: 'Buscar en todos los tipos de contenido',
      jobs: 'Oportunidades laborales y ofertas de empleo',
      events: 'Talleres, encuentros y conferencias',
      forums: 'Discusiones de la comunidad y preguntas',
      members: 'Directorio de exalumnos y perfiles',
      mentors: 'Oportunidades de mentoría',
      resources: 'Materiales de aprendizaje y recursos',
      news: 'Últimas noticias y anuncios',
    },

    sort: {
      relevance: 'Relevancia',
      date: 'Fecha',
      title: 'Título',
      popularity: 'Popularidad',
      newest: 'Más reciente',
      oldest: 'Más antiguo',
    },

    recent: {
      title: 'Búsquedas recientes',
      clear: 'Limpiar historial',
      empty: 'No hay búsquedas recientes',
    },

    popular: {
      title: 'Búsquedas populares',
      trending: 'Tendencia',
      thisWeek: 'Esta semana',
      thisMonth: 'Este mes',
    },

    history: {
      title: 'Historial de búsqueda',
      clear: 'Limpiar historial',
      delete: 'Eliminar',
      empty: 'No hay historial de búsqueda',
      resultsCount: 'resultados',
    },

    advanced: {
      title: 'Búsqueda avanzada',
      exactPhrase: 'Frase exacta',
      anyWords: 'Cualquiera de estas palabras',
      excludeWords: 'Excluir estas palabras',
      dateRange: 'Rango de fechas',
      fileType: 'Tipo de archivo',
      syntax: 'Sintaxis de búsqueda',
    },

    withinResults: 'Buscar dentro de los resultados...',

    export: 'Exportar',
    exportFormats: {
      csv: 'Archivo CSV',
      json: 'Archivo JSON',
      xlsx: 'Archivo Excel',
      pdf: 'Archivo PDF',
    },

    viewModes: {
      list: 'Vista de lista',
      grid: 'Vista de cuadrícula',
      compact: 'Vista compacta',
    },

    pagination: {
      previous: 'Anterior',
      next: 'Siguiente',
      page: 'Página',
      of: 'de',
      showing: 'Mostrando',
      results: 'resultados',
    },

    shortcuts: {
      navigate: 'Usar flechas para navegar',
      select: 'Presionar Enter para seleccionar',
      close: 'Presionar Escape para cerrar',
      search: 'Ctrl+K para buscar',
      clear: 'Ctrl+L para limpiar',
    },

    analytics: {
      searchTime: 'Tiempo de búsqueda',
      resultsFound: 'resultados encontrados',
      noMatches: 'Sin coincidencias',
      suggestions: 'sugerencias',
    },

    errors: {
      generic: 'Error en la búsqueda. Por favor, intenta de nuevo.',
      network: 'Error de conexión. Verifica tu internet.',
      timeout: 'La búsqueda tardó demasiado. Intenta de nuevo.',
      invalidQuery: 'Consulta de búsqueda inválida.',
      tooManyRequests: 'Demasiadas búsquedas. Espera un momento.',
      serverError: 'Error del servidor. Intenta más tarde.',
    },

    voice: {
      start: 'Iniciar búsqueda por voz',
      stop: 'Detener búsqueda por voz',
      listening: 'Escuchando...',
      notSupported: 'Búsqueda por voz no compatible',
      noSpeech: 'No se detectó voz',
      error: 'Error en la búsqueda por voz',
    },

    operators: {
      and: 'Y',
      or: 'O',
      not: 'NO',
      exact: 'Frase exacta',
      wildcard: 'Comodín',
      proximity: 'Proximidad',
    },

    tips: {
      title: 'Consejos de búsqueda',
      useQuotes: 'Usa comillas para frases exactas',
      useFilters: 'Aplica filtros para afinar resultados',
      checkSpelling: 'Verifica la ortografía',
      tryDifferent: 'Prueba con palabras diferentes',
      useSynonyms: 'Usa sinónimos',
    },
  },
};

// English translations
export const searchTranslationsEn: SearchTranslations = {
  search: {
    title: 'Search SECiD',
    placeholder: 'Search jobs, events, forums, members...',
    button: 'Search',
    loading: 'Searching...',
    clear: 'Clear search',
    voiceSearch: 'Voice search',

    suggestion: {
      query: 'Search',
      filter: 'Filter',
      recent: 'Recent',
      popular: 'Popular',
    },

    results: {
      title: 'Search Results',
      noResults: 'No results found',
      found: 'found',
      showing: 'Showing',
      of: 'of',
    },

    noResults: {
      title: 'No results found',
      description: 'Try adjusting your search terms or filters',
      suggestions: [
        'Check the spelling of your keywords',
        'Try more general keywords',
        'Try different keywords',
        'Use fewer filters',
      ],
    },

    filters: {
      title: 'Filters',
      toggle: 'Toggle filters',
      clear: 'Clear filters',
      apply: 'Apply filters',
      contentType: 'Content Type',
      category: 'Category',
      tags: 'Tags',
      dateRange: 'Date Range',
      location: 'Location',
      language: 'Language',
      author: 'Author',
      status: 'Status',
    },

    contentTypes: {
      all: 'All',
      jobs: 'Jobs',
      events: 'Events',
      forums: 'Forums',
      members: 'Members',
      mentors: 'Mentors',
      resources: 'Resources',
      news: 'News',
    },

    contentTypeDescriptions: {
      all: 'Search across all content types',
      jobs: 'Job opportunities and openings',
      events: 'Workshops, meetups, and conferences',
      forums: 'Community discussions and Q&A',
      members: 'Alumni directory and profiles',
      mentors: 'Mentorship opportunities',
      resources: 'Learning materials and resources',
      news: 'Latest news and announcements',
    },

    sort: {
      relevance: 'Relevance',
      date: 'Date',
      title: 'Title',
      popularity: 'Popularity',
      newest: 'Newest',
      oldest: 'Oldest',
    },

    recent: {
      title: 'Recent Searches',
      clear: 'Clear history',
      empty: 'No recent searches',
    },

    popular: {
      title: 'Popular Searches',
      trending: 'Trending',
      thisWeek: 'This week',
      thisMonth: 'This month',
    },

    history: {
      title: 'Search History',
      clear: 'Clear history',
      delete: 'Delete',
      empty: 'No search history',
      resultsCount: 'results',
    },

    advanced: {
      title: 'Advanced Search',
      exactPhrase: 'Exact phrase',
      anyWords: 'Any of these words',
      excludeWords: 'Exclude these words',
      dateRange: 'Date range',
      fileType: 'File type',
      syntax: 'Search syntax',
    },

    withinResults: 'Search within results...',

    export: 'Export',
    exportFormats: {
      csv: 'CSV File',
      json: 'JSON File',
      xlsx: 'Excel File',
      pdf: 'PDF File',
    },

    viewModes: {
      list: 'List view',
      grid: 'Grid view',
      compact: 'Compact view',
    },

    pagination: {
      previous: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
      showing: 'Showing',
      results: 'results',
    },

    shortcuts: {
      navigate: 'Use arrow keys to navigate',
      select: 'Press Enter to select',
      close: 'Press Escape to close',
      search: 'Ctrl+K to search',
      clear: 'Ctrl+L to clear',
    },

    analytics: {
      searchTime: 'Search time',
      resultsFound: 'results found',
      noMatches: 'No matches',
      suggestions: 'suggestions',
    },

    errors: {
      generic: 'Search error. Please try again.',
      network: 'Connection error. Check your internet.',
      timeout: 'Search took too long. Try again.',
      invalidQuery: 'Invalid search query.',
      tooManyRequests: 'Too many searches. Please wait.',
      serverError: 'Server error. Try again later.',
    },

    voice: {
      start: 'Start voice search',
      stop: 'Stop voice search',
      listening: 'Listening...',
      notSupported: 'Voice search not supported',
      noSpeech: 'No speech detected',
      error: 'Voice search error',
    },

    operators: {
      and: 'AND',
      or: 'OR',
      not: 'NOT',
      exact: 'Exact phrase',
      wildcard: 'Wildcard',
      proximity: 'Proximity',
    },

    tips: {
      title: 'Search Tips',
      useQuotes: 'Use quotes for exact phrases',
      useFilters: 'Apply filters to narrow results',
      checkSpelling: 'Check spelling',
      tryDifferent: 'Try different words',
      useSynonyms: 'Use synonyms',
    },
  },
};

// Helper function to get search translations by language
export function getSearchTranslations(
  language: 'es' | 'en'
): SearchTranslations {
  return language === 'es' ? searchTranslationsEs : searchTranslationsEn;
}

// Export default as Spanish
export default searchTranslationsEs;
