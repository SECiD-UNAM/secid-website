/**
 * Forum translations: categories, topics, posts, search, errors, etc.
 */

export const forumTranslations = {
  es: {
    forum: {
      title: 'Foro',
      topics: 'Temas',
      posts: 'Publicaciones',
      members: 'Miembros',
      categories: 'Categorías',
      searchPlaceholder: 'Buscar en el foro...',
      createTopic: 'Nuevo Tema',
      latestActivity: 'Actividad Reciente',
      reply: 'Responder',
      search: 'Buscar',
      searchResults: 'resultados encontrados',
      noResults: 'Sin resultados',
      noResultsDescription:
        'No se encontraron resultados. Intenta con otros términos de búsqueda.',

      // Sorting
      sortByDate: 'Más recientes',
      sortByReplies: 'Más respuestas',
      sortByVotes: 'Más votados',
      sortByRelevance: 'Relevancia',

      // Filtering
      filters: 'Filtros',
      clearFilters: 'Limpiar filtros',
      filterByCategory: 'Filtrar por categoría',
      filterByDate: 'Filtrar por fecha',

      // Default category names and descriptions
      categoryList: {
        careerAdvice: {
          name: 'Consejos de Carrera',
          description:
            'Comparte y recibe consejos sobre desarrollo profesional en ciencia de datos',
        },
        technicalDiscussion: {
          name: 'Discusión Técnica',
          description:
            'Debates sobre herramientas, algoritmos y metodologías',
        },
        industryNews: {
          name: 'Noticias de la Industria',
          description:
            'Últimas noticias y tendencias en ciencia de datos',
        },
        jobOpportunities: {
          name: 'Oportunidades Laborales',
          description:
            'Ofertas de trabajo y oportunidades profesionales',
        },
        networking: {
          name: 'Networking',
          description:
            'Conecta con otros profesionales y egresados',
        },
        generalDiscussion: {
          name: 'Discusión General',
          description:
            'Temas generales y conversaciones de la comunidad',
        },
      },

      // Error messages
      errors: {
        notFound: 'No encontrado',
        loadingFailed: 'Error al cargar los datos',
        postingFailed: 'Error al publicar',
        validation: {
          titleRequired: 'El título es obligatorio',
          contentRequired: 'El contenido es obligatorio',
          categoryRequired: 'La categoría es obligatoria',
          titleTooLong:
            'El título es demasiado largo (máximo 200 caracteres)',
          contentTooLong:
            'El contenido es demasiado largo (máximo 10000 caracteres)',
        },
      },

      // Topic operations
      topic: {
        createTopic: 'Crear Tema',
        edit: 'Editar Tema',
        title: 'Título',
        topicTitle: 'Título del tema',
        category: 'Categoría',
        selectCategory: 'Seleccionar categoría',
        content: 'Contenido',
        preview: 'Vista previa',
        topicContent: 'Escribe el contenido del tema...',
        attachments: 'Archivos adjuntos',
        maxFileSize: 'Tamaño máximo: 10MB',
        allowedTypes: 'Tipos permitidos: PDF, DOC, PPT, XLS, PNG, JPG, GIF',
        tags: 'Etiquetas',
        tagPlaceholder: 'Agregar etiqueta...',
        uploadFile: 'Subir archivo',
        publish: 'Publicar',
        formatting: 'Soporta formato Markdown',
        solved: 'Resuelto',
        pinned: 'Fijado',
        share: 'Compartir',
      },

      // Post operations
      post: {
        writeReply: 'Escribe tu respuesta',
        replyPlaceholder: 'Escribe tu respuesta aquí...',
        postReply: 'Publicar Respuesta',
        lastEdited: 'editado',
        showLess: 'Mostrar menos',
        showMore: 'Mostrar más',
        attachments: 'Archivos adjuntos',
        reply: 'Responder',
        quote: 'Citar',
        markSolution: 'Marcar como solución',
        report: 'Reportar',
        noReplies: 'Sin respuestas aún',
        loadMore: 'Cargar más',
        edit: 'Editar',
        bold: 'Negrita',
        italic: 'Cursiva',
        codeBlock: 'Bloque de código',
        link: 'Enlace',
        list: 'Lista',
      },
    },
  },
  en: {
    forum: {
      title: 'Forum',
      topics: 'Topics',
      posts: 'Posts',
      members: 'Members',
      categories: 'Categories',
      searchPlaceholder: 'Search the forum...',
      createTopic: 'New Topic',
      latestActivity: 'Recent Activity',
      reply: 'Reply',
      search: 'Search',
      searchResults: 'results found',
      noResults: 'No results',
      noResultsDescription:
        'No results found. Try different search terms.',

      // Sorting
      sortByDate: 'Most recent',
      sortByReplies: 'Most replies',
      sortByVotes: 'Most voted',
      sortByRelevance: 'Relevance',

      // Filtering
      filters: 'Filters',
      clearFilters: 'Clear filters',
      filterByCategory: 'Filter by category',
      filterByDate: 'Filter by date',

      // Default category names and descriptions
      categoryList: {
        careerAdvice: {
          name: 'Career Advice',
          description:
            'Share and receive tips on professional development in data science',
        },
        technicalDiscussion: {
          name: 'Technical Discussion',
          description:
            'Discussions about tools, algorithms, and methodologies',
        },
        industryNews: {
          name: 'Industry News',
          description:
            'Latest news and trends in data science',
        },
        jobOpportunities: {
          name: 'Job Opportunities',
          description:
            'Job listings and professional opportunities',
        },
        networking: {
          name: 'Networking',
          description:
            'Connect with other professionals and alumni',
        },
        generalDiscussion: {
          name: 'General Discussion',
          description:
            'General topics and community conversations',
        },
      },

      // Error messages
      errors: {
        notFound: 'Not found',
        loadingFailed: 'Failed to load data',
        postingFailed: 'Failed to post',
        validation: {
          titleRequired: 'Title is required',
          contentRequired: 'Content is required',
          categoryRequired: 'Category is required',
          titleTooLong:
            'Title is too long (maximum 200 characters)',
          contentTooLong:
            'Content is too long (maximum 10000 characters)',
        },
      },

      // Topic operations
      topic: {
        createTopic: 'Create Topic',
        edit: 'Edit Topic',
        title: 'Title',
        topicTitle: 'Topic title',
        category: 'Category',
        selectCategory: 'Select category',
        content: 'Content',
        preview: 'Preview',
        topicContent: 'Write the topic content...',
        attachments: 'Attachments',
        maxFileSize: 'Maximum size: 10MB',
        allowedTypes: 'Allowed types: PDF, DOC, PPT, XLS, PNG, JPG, GIF',
        tags: 'Tags',
        tagPlaceholder: 'Add tag...',
        uploadFile: 'Upload file',
        publish: 'Publish',
        formatting: 'Supports Markdown formatting',
        solved: 'Solved',
        pinned: 'Pinned',
        share: 'Share',
      },

      // Post operations
      post: {
        writeReply: 'Write your reply',
        replyPlaceholder: 'Write your reply here...',
        postReply: 'Post Reply',
        lastEdited: 'edited',
        showLess: 'Show less',
        showMore: 'Show more',
        attachments: 'Attachments',
        reply: 'Reply',
        quote: 'Quote',
        markSolution: 'Mark as solution',
        report: 'Report',
        noReplies: 'No replies yet',
        loadMore: 'Load more',
        edit: 'Edit',
        bold: 'Bold',
        italic: 'Italic',
        codeBlock: 'Code block',
        link: 'Link',
        list: 'List',
      },
    },
  },
} as const;
