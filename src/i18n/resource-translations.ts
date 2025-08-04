/**
 * Resource Library Translations
 * Bilingual translations for all resource library components
 */

export interface ResourceTranslations {
  library: string;
  libraryDescription: string;

  // Navigation and tabs
  all: string;
  popular: string;
  recent: string;
  bookmarks: string;
  upload: string;

  // Categories
  categories: {
    title: string;
    tutorials: string;
    templates: string;
    tools: string;
    books: string;
    courses: string;
    datasets: string;
    research: string;
    documentation: string;
  };

  // File types
  fileTypes: string;

  // Access levels
  accessLevel: string;
  accessLevels: {
    free: string;
    premium: string;
    member: string;
    restricted: string;
  };

  // Difficulty levels
  difficulty: {
    title: string;
    beginner: string;
    intermediate: string;
    advanced: string;
  };

  // Resource properties
  title: string;
  titlePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  summary: string;
  summaryPlaceholder: string;
  tags: string;
  addTag: string;
  prerequisites: string;
  addPrerequisite: string;
  language: string;
  bilingual: string;
  estimatedTime: string;
  type: string;
  category: string;

  // Actions
  download: string;
  downloading: string;
  downloadError: string;
  preview: string;
  viewDetails: string;
  bookmark: string;
  addBookmark: string;
  removeBookmark: string;
  share: string;
  report: string;

  // Stats and metrics
  downloads: string;
  views: string;
  rating: string;
  reviews: string;
  totalResources: string;
  totalDownloads: string;
  contributors: string;
  averageRating: string;
  results: string;
  resources: string;

  // Upload process
  uploadResource: string;
  uploading: string;
  uploadSuccess: string;
  uploadError: string;
  uploadNotice: string;
  loginToUpload: string;
  loginRequired: string;

  // Upload form
  basicInfo: string;
  fileUpload: string;
  metadata: string;
  mainFile: string;
  includePreview: string;
  selectPreviewFile: string;
  withPreview: string;
  withoutPreview: string;
  thumbnail: string;
  selectThumbnail: string;
  dragDropFile: string;
  browseFiles: string;
  submitForReview: string;

  // Search and filters
  searchPlaceholder: string;
  advancedSearch: string;
  sortBy: string;
  sortOptions: {
    relevance: string;
    newest: string;
    oldest: string;
    mostDownloaded: string;
    highestRated: string;
    alphabetical: string;
  };
  minimumRating: string;
  dateRange: string;

  // Resource details
  details: string;
  tabs: {
    overview: string;
    reviews: string;
    versions: string;
  };
  related: string;
  versions: string;

  // Reviews
  writeReview: string;
  reviewPlaceholder: string;
  comment: string;
  submitting: string;
  reviewRequired: string;
  reviewError: string;
  noReviews: string;

  // Validation
  validation: {
    titleRequired: string;
    descriptionRequired: string;
    summaryRequired: string;
    fileRequired: string;
    tagsRequired: string;
  };

  // Status messages
  notFound: string;
  notFoundDescription: string;
  noResults: string;
  noResultsDescription: string;
  contributeFirst: string;
  verified: string;
}

export const resourceTranslations = {
  es: {
    library: 'Biblioteca de Recursos',
    libraryDescription:
      'Descubre y comparte materiales de aprendizaje, plantillas, herramientas y conjuntos de datos para acelerar tu viaje en ciencia de datos.',

    // Navigation and tabs
    all: 'Todos',
    popular: 'Populares',
    recent: 'Recientes',
    bookmarks: 'Favoritos',
    upload: 'Subir',

    // Categories
    categories: {
      title: 'Categorías',
      tutorials: 'Tutoriales',
      templates: 'Plantillas',
      tools: 'Herramientas',
      books: 'Libros',
      courses: 'Cursos',
      datasets: 'Conjuntos de Datos',
      research: 'Investigación',
      documentation: 'Documentación',
    },

    // File types
    fileTypes: 'Tipos de Archivo',

    // Access levels
    accessLevel: 'Nivel de Acceso',
    accessLevels: {
      free: 'Gratuito',
      premium: 'Premium',
      member: 'Solo Miembros',
      restricted: 'Restringido',
    },

    // Difficulty levels
    difficulty: {
      title: 'Dificultad',
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    },

    // Resource properties
    title: 'Título',
    titlePlaceholder: 'Ingresa un título descriptivo...',
    description: 'Descripción',
    descriptionPlaceholder: 'Descripción detallada del recurso...',
    summary: 'Resumen',
    summaryPlaceholder: 'Resumen breve (1-2 oraciones)...',
    tags: 'Etiquetas',
    addTag: 'Agregar etiqueta',
    prerequisites: 'Prerrequisitos',
    addPrerequisite: 'Agregar prerrequisito',
    language: 'Idioma',
    bilingual: 'Bilingüe',
    estimatedTime: 'Tiempo Estimado',
    type: 'Tipo',
    category: 'Categoría',

    // Actions
    download: 'Descargar',
    downloading: 'Descargando...',
    downloadError: 'Error al descargar el recurso',
    preview: 'Vista Previa',
    viewDetails: 'Ver Detalles',
    bookmark: 'Favorito',
    addBookmark: 'Agregar a favoritos',
    removeBookmark: 'Quitar de favoritos',
    share: 'Compartir',
    report: 'Reportar',

    // Stats and metrics
    downloads: 'descargas',
    views: 'visualizaciones',
    rating: 'Calificación',
    reviews: 'Reseñas',
    totalResources: 'Total de Recursos',
    totalDownloads: 'Descargas',
    contributors: 'Colaboradores',
    averageRating: 'Calificación Promedio',
    results: 'resultados',
    resources: 'recursos',

    // Upload process
    uploadResource: 'Subir Recurso',
    uploading: 'Subiendo...',
    uploadSuccess:
      '¡Recurso subido exitosamente! Será revisado antes de la publicación.',
    uploadError: 'Error al subir el recurso. Por favor intenta de nuevo.',
    uploadNotice:
      'Tu recurso será revisado por nuestro equipo antes de ser publicado. Se te notificará una vez que la revisión esté completa.',
    loginToUpload: 'Por favor inicia sesión para subir recursos.',
    loginRequired: 'Por favor inicia sesión para continuar.',

    // Upload form
    basicInfo: 'Información Básica',
    fileUpload: 'Subida de Archivo',
    metadata: 'Metadatos',
    mainFile: 'Archivo Principal',
    includePreview: 'Incluir Archivo de Vista Previa',
    selectPreviewFile: 'Seleccionar Archivo de Vista Previa',
    withPreview: 'Con Vista Previa',
    withoutPreview: 'Sin Vista Previa',
    thumbnail: 'Miniatura',
    selectThumbnail: 'Seleccionar Imagen de Miniatura',
    dragDropFile: 'Arrastra y suelta tu archivo aquí, o',
    browseFiles: 'buscar archivos',
    submitForReview: 'Enviar para Revisión',

    // Search and filters
    searchPlaceholder: 'Buscar recursos...',
    advancedSearch: 'Búsqueda Avanzada',
    sortBy: 'Ordenar por',
    sortOptions: {
      relevance: 'Relevancia',
      newest: 'Más Recientes',
      oldest: 'Más Antiguos',
      mostDownloaded: 'Más Descargados',
      highestRated: 'Mejor Calificados',
      alphabetical: 'A-Z',
    },
    minimumRating: 'Calificación Mínima',
    dateRange: 'Rango de Fechas',

    // Resource details
    details: 'Detalles',
    tabs: {
      overview: 'Vista General',
      reviews: 'Reseñas',
      versions: 'Versiones',
    },
    related: 'Recursos Relacionados',
    versions: 'Versiones',

    // Reviews
    writeReview: 'Escribir una Reseña',
    reviewPlaceholder: 'Comparte tus pensamientos sobre este recurso...',
    comment: 'Comentario',
    submitting: 'Enviando...',
    reviewRequired: 'Por favor ingresa un comentario para la reseña',
    reviewError: 'Error al enviar la reseña',
    noReviews: 'Aún no hay reseñas. ¡Sé el primero en reseñar!',

    // Validation
    validation: {
      titleRequired: 'El título es requerido',
      descriptionRequired: 'La descripción es requerida',
      summaryRequired: 'El resumen es requerido',
      fileRequired: 'El archivo es requerido',
      tagsRequired: 'Al menos una etiqueta es requerida',
    },

    // Status messages
    notFound: 'Recurso no encontrado',
    notFoundDescription: 'El recurso solicitado no pudo ser encontrado.',
    noResults: 'No se encontraron recursos',
    noResultsDescription:
      'Intenta ajustar tus filtros de búsqueda o navegar por categoría.',
    contributeFirst: '¡Sé el primero en contribuir!',
    verified: 'Verificado',
  } as ResourceTranslations,

  en: {
    library: 'Resource Library',
    libraryDescription:
      'Discover and share learning materials, templates, tools, and datasets to accelerate your data science journey.',

    // Navigation and tabs
    all: 'All',
    popular: 'Popular',
    recent: 'Recent',
    bookmarks: 'Bookmarks',
    upload: 'Upload',

    // Categories
    categories: {
      title: 'Categories',
      tutorials: 'Tutorials',
      templates: 'Templates',
      tools: 'Tools',
      books: 'Books',
      courses: 'Courses',
      datasets: 'Datasets',
      research: 'Research',
      documentation: 'Documentation',
    },

    // File types
    fileTypes: 'File Types',

    // Access levels
    accessLevel: 'Access Level',
    accessLevels: {
      free: 'Free',
      premium: 'Premium',
      member: 'Members Only',
      restricted: 'Restricted',
    },

    // Difficulty levels
    difficulty: {
      title: 'Difficulty',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    },

    // Resource properties
    title: 'Title',
    titlePlaceholder: 'Enter a descriptive title...',
    description: 'Description',
    descriptionPlaceholder: 'Detailed description of the resource...',
    summary: 'Summary',
    summaryPlaceholder: 'Brief summary (1-2 sentences)...',
    tags: 'Tags',
    addTag: 'Add tag',
    prerequisites: 'Prerequisites',
    addPrerequisite: 'Add prerequisite',
    language: 'Language',
    bilingual: 'Bilingual',
    estimatedTime: 'Estimated Time',
    type: 'Type',
    category: 'Category',

    // Actions
    download: 'Download',
    downloading: 'Downloading...',
    downloadError: 'Error downloading resource',
    preview: 'Preview',
    viewDetails: 'View Details',
    bookmark: 'Bookmark',
    addBookmark: 'Add to bookmarks',
    removeBookmark: 'Remove from bookmarks',
    share: 'Share',
    report: 'Report',

    // Stats and metrics
    downloads: 'downloads',
    views: 'views',
    rating: 'Rating',
    reviews: 'Reviews',
    totalResources: 'Total Resources',
    totalDownloads: 'Downloads',
    contributors: 'Contributors',
    averageRating: 'Avg Rating',
    results: 'results',
    resources: 'resources',

    // Upload process
    uploadResource: 'Upload Resource',
    uploading: 'Uploading...',
    uploadSuccess:
      'Resource uploaded successfully! It will be reviewed before publication.',
    uploadError: 'Error uploading resource. Please try again.',
    uploadNotice:
      'Your resource will be reviewed by our team before being published. You will be notified once the review is complete.',
    loginToUpload: 'Please sign in to upload resources.',
    loginRequired: 'Please sign in to continue.',

    // Upload form
    basicInfo: 'Basic Information',
    fileUpload: 'File Upload',
    metadata: 'Metadata',
    mainFile: 'Main File',
    includePreview: 'Include Preview File',
    selectPreviewFile: 'Select Preview File',
    withPreview: 'With Preview',
    withoutPreview: 'Without Preview',
    thumbnail: 'Thumbnail',
    selectThumbnail: 'Select Thumbnail Image',
    dragDropFile: 'Drag and drop your file here, or',
    browseFiles: 'browse files',
    submitForReview: 'Submit for Review',

    // Search and filters
    searchPlaceholder: 'Search resources...',
    advancedSearch: 'Advanced',
    sortBy: 'Sort by',
    sortOptions: {
      relevance: 'Relevance',
      newest: 'Newest',
      oldest: 'Oldest',
      mostDownloaded: 'Most Downloaded',
      highestRated: 'Highest Rated',
      alphabetical: 'A-Z',
    },
    minimumRating: 'Minimum Rating',
    dateRange: 'Date Range',

    // Resource details
    details: 'Details',
    tabs: {
      overview: 'Overview',
      reviews: 'Reviews',
      versions: 'Versions',
    },
    related: 'Related Resources',
    versions: 'Versions',

    // Reviews
    writeReview: 'Write a Review',
    reviewPlaceholder: 'Share your thoughts about this resource...',
    comment: 'Comment',
    submitting: 'Submitting...',
    reviewRequired: 'Please enter a review comment',
    reviewError: 'Error submitting review',
    noReviews: 'No reviews yet. Be the first to review!',

    // Validation
    validation: {
      titleRequired: 'Title is required',
      descriptionRequired: 'Description is required',
      summaryRequired: 'Summary is required',
      fileRequired: 'File is required',
      tagsRequired: 'At least one tag is required',
    },

    // Status messages
    notFound: 'Resource not found',
    notFoundDescription: 'The requested resource could not be found.',
    noResults: 'No resources found',
    noResultsDescription:
      'Try adjusting your search filters or browse by category.',
    contributeFirst: 'Be the first to contribute!',
    verified: 'Verified',
  } as ResourceTranslations,
};
