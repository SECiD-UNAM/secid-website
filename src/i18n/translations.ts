export type Language = 'es' | 'en';

export interface Translations {
  site: {
    name: string;
    title: string;
    description: string;
  };
  nav: {
    home: string;
    about: string;
    jobs: string;
    contact: string;
    community: string;
    members: string;
    events: string;
    mentorship: string;
    resources: string;
    blog: string;
    commissions: string;
    spotlights: string;
    newsletter: string;
    journalClub: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
    joinButton: string;
    jobsButton: string;
  };
  features: {
    title: string;
    networking: {
      title: string;
      description: string;
    };
    jobs: {
      title: string;
      description: string;
    };
    growth: {
      title: string;
      description: string;
    };
    community: {
      title: string;
      description: string;
    };
  };
  initiatives: {
    title: string;
    talentMatcher: {
      title: string;
      description: string;
      cta: string;
    };
    consulting: {
      title: string;
      description: string;
      cta: string;
    };
    hackathons: {
      title: string;
      description: string;
      cta: string;
    };
    workshops: {
      title: string;
      description: string;
      cta: string;
    };
    seminars: {
      title: string;
      description: string;
      cta: string;
    };
    mentoring: {
      title: string;
      description: string;
      cta: string;
    };
  };
  cta: {
    title: string;
    jobs: {
      title: string;
      description: string;
      button: string;
    };
    register: {
      title: string;
      description: string;
      button: string;
    };
  };
  search: {
    placeholder: string;
  };
  sidebar: {
    menu: string;
    getInTouch: string;
    description: string;
  };
  footer: {
    rights: string;
    design: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    submit: string;
    cancel: string;
    close: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    more: string;
    all: string;
    any: string;
    from: string;
    to: string;
    add: string;
    optional: string;
    clearFilters: string;
    button: string;
  };
  auth: {
    signUp: {
      title: string;
      subtitle: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      acceptTerms: string;
      alreadyHaveAccount: string;
      signInHere: string;
      orContinueWith: string;
      googleSignUp: string;
      createAccount: string;
      termsAndConditions: string;
      privacyPolicy: string;
      button: string;
      google: string;
      haveAccount: string;
      signIn: string;
    };
    signIn: {
      title: string;
      subtitle: string;
      email: string;
      password: string;
      rememberMe: string;
      forgotPassword: string;
      signIn: string;
      noAccount: string;
      signUpHere: string;
      orContinueWith: string;
      googleSignIn: string;
      button: string;
    };
    or: string;
    acceptTerms: {
      prefix: string;
      link: string;
    };
    errors: {
      [key: string]: string;
      default: string;
    };
  };
  pricing: {
    [key: string]: string;
  };
  languages: {
    spanish: string;
    english: string;
  };
  resources: {
    [key: string]: any;
  };
  mentorship: {
    dashboard: {
      title: string;
      welcome: string;
      findMentor: string;
      editProfile: string;
      scheduleSession: string;
      overview: string;
      matches: string;
      sessions: string;
      profile: string;
      activeMatches: string;
      completedSessions: string;
      upcomingSessions: string;
      averageRating: string;
      recentActivity: string;
      pendingRequests: string;
      newMenteeRequest: string;
      mentorRequestPending: string;
      view: string;
      join: string;
      programStats: string;
      totalMentors: string;
      totalMentees: string;
      globalActiveMatches: string;
      successRate: string;
      yourMatches: string;
      noMatches: string;
      noMatchesDescription: string;
      becomeMentor: string;
      menteeMatch: string;
      mentorMatch: string;
      compatibility: string;
      goals: string;
      acceptRequest: string;
      viewRequest: string;
      declineRequest: string;
      sendMessage: string;
      noSessions: string;
      noSessionsDescription: string;
      minutes: string;
      agenda: string;
      joinSession: string;
      editSession: string;
      cancelSession: string;
      yourProfile: string;
      mentorProfile: string;
      menteeProfile: string;
      rating: string;
      mentees: string;
      expertise: string;
      interests: string;
      yearsExperience: string;
      noProfile: string;
      noProfileDescription: string;
      createMentorProfile: string;
      createMenteeProfile: string;
    };
    matcher: {
      excellent: string;
      veryGood: string;
      good: string;
      fair: string;
      poor: string;
      loading: string;
      createProfile: string;
      createProfileDescription: string;
      createMenteeProfile: string;
      title: string;
      description: string;
      availableMentors: string;
      matches: string;
      filters: string;
      sortBy: string;
      compatibility: string;
      rating: string;
      experience: string;
      calculating: string;
      recalculate: string;
      filterOptions: string;
      minimumRating: string;
      stars: string;
      experienceLevel: string;
      anyExperience: string;
      juniorLevel: string;
      midLevel: string;
      seniorLevel: string;
      minimumHours: string;
      hoursPerWeek: string;
      clearFilters: string;
      analyzingProfiles: string;
      calculatingCompatibility: string;
      noMatches: string;
      noMatchesDescription: string;
      adjustFilters: string;
      yearsExperience: string;
      sessions: string;
      mentees: string;
      compatibilityBreakdown: string;
      skills: string;
      availability: string;
      style: string;
      language: string;
      whyThisMatch: string;
      expertise: string;
      viewProfile: string;
      requestPending: string;
      requestMentorship: string;
      requestModalDescription: string;
      yourGoals: string;
      continueRequest: string;
    };
    status: {
      [key: string]: string;
    };
    frequency: {
      [key: string]: string;
    };
    communication: {
      [key: string]: string;
    };
    sessionType: {
      [key: string]: string;
    };
    level: {
      [key: string]: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  es: {
    site: {
      name: 'SECiD',
      title: 'SECiD - Sociedad de Egresados en Ciencia de Datos UNAM',
      description:
        'Conectando egresados en ciencia de datos de la UNAM. Oportunidades laborales, networking y crecimiento profesional.',
    },
    nav: {
      home: 'Inicio',
      about: 'Nosotros',
      jobs: 'Empleos',
      contact: 'Contacto',
      community: 'Comunidad',
      members: 'Miembros',
      events: 'Eventos',
      mentorship: 'Mentoría',
      resources: 'Recursos',
      blog: 'Blog',
      commissions: 'Comisiones',
      spotlights: 'Historias de Éxito',
      newsletter: 'Newsletter',
      journalClub: 'Journal Club',
    },
    hero: {
      title: 'Bienvenidos a SECiD',
      subtitle: 'El sitio para conectar con la Sociedad de Egresados en Ciencia de Datos de la UNAM.',
      description:
        'SECiD (Sociedad de Egresados en Ciencia de Datos, A. C.) es una red profesional vibrante que empodera a los egresados de ciencia de datos de la UNAM. Nuestro objetivo es fomentar conexiones significativas, impulsar el crecimiento profesional y crear oportunidades para nuestra comunidad a través de eventos de networking, publicaciones de empleo exclusivas, iniciativas de aprendizaje continuo y colaboraciones que apoyan el éxito continuo de los profesionales de ciencia de datos de la Universidad Nacional Autónoma de México (UNAM).',
      joinButton: 'Únete a SECiD',
      jobsButton: 'Ver Empleos',
    },
    features: {
      title: '¿Por qué unirse a SECiD?',
      networking: {
        title: 'Networking Profesional',
        description:
          'Conecta con otros egresados de ciencia de datos de la UNAM y expande tu red profesional en la industria.',
      },
      jobs: {
        title: 'Oportunidades Laborales',
        description:
          'Accede a ofertas de empleo exclusivas y oportunidades de carrera en empresas líderes del sector.',
      },
      growth: {
        title: 'Crecimiento Profesional',
        description:
          'Participa en eventos, talleres y conferencias para mantenerte actualizado con las últimas tendencias.',
      },
      community: {
        title: 'Comunidad Sólida',
        description:
          'Forma parte de una comunidad comprometida con el intercambio de conocimientos y experiencias.',
      },
    },
    initiatives: {
      title: 'Iniciativas',
      talentMatcher: {
        title: 'Bolsa de Trabajo',
        description: 'Un lugar para publicar y suscribirte a oportunidades laborales.',
        cta: 'Publica tu vacante y encuentra al mejor talento.',
      },
      consulting: {
        title: 'Consultoría',
        description: 'Obtén servicios de consultoría de los mejores profesionales en ciencia de datos y machine learning en México.',
        cta: 'Contáctanos.',
      },
      hackathons: {
        title: 'Hackathons',
        description: '¿Tienes un problema interesante en tu organización y te gustaría co-organizar un hackathon?',
        cta: 'Contáctanos.',
      },
      workshops: {
        title: 'Talleres y Cursos',
        description: 'Adquiere conocimientos de nuestra comunidad con cursos bajo demanda de expertos en ciencia de datos y machine learning.',
        cta: 'En Roadmap.',
      },
      seminars: {
        title: 'Seminarios',
        description: 'Reúnete con expertos del campo para presentar y discutir temas académicos y de ingeniería de actualidad.',
        cta: 'En Roadmap.',
      },
      mentoring: {
        title: 'Mentoría',
        description: '¿Eres egresado de ciencia de datos y buscas mentoría o retroalimentación de tus pares? Recibe mentoría o conviértete en Mentor.',
        cta: 'En Roadmap.',
      },
    },
    cta: {
      title: 'Comienza tu journey',
      jobs: {
        title: 'Encuentra tu próximo empleo',
        description:
          'Explora oportunidades laborales exclusivas para miembros de SECiD en empresas innovadoras.',
        button: 'Ver empleos',
      },
      register: {
        title: 'Únete a nuestra comunidad',
        description:
          'Regístrate como miembro de SECiD y accede a todos los beneficios de nuestra red profesional.',
        button: 'Registrarse',
      },
    },
    search: {
      placeholder: 'Buscar...',
    },
    sidebar: {
      menu: 'Menú',
      getInTouch: 'Mantente en contacto',
      description:
        'Síguenos en nuestras redes sociales y mantente al día con las últimas noticias y oportunidades.',
    },
    footer: {
      rights: 'Todos los derechos reservados.',
      design: 'Diseño',
    },
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      submit: 'Enviar',
      cancel: 'Cancelar',
      close: 'Cerrar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      back: 'Atrás',
      next: 'Siguiente',
      previous: 'Anterior',
      more: 'más',
      all: 'Todos',
      any: 'Cualquiera',
      from: 'Desde',
      to: 'Hasta',
      add: 'Agregar',
      optional: 'Opcional',
      clearFilters: 'Limpiar filtros',
      button: 'Botón',
    },
    auth: {
      signUp: {
        title: 'Crear Cuenta',
        subtitle: 'Únete a la comunidad de egresados en ciencia de datos de la UNAM',
        firstName: 'Nombre',
        lastName: 'Apellido',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        acceptTerms: 'Acepto los términos y condiciones',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        signInHere: 'Inicia sesión aquí',
        orContinueWith: 'O continúa con',
        googleSignUp: 'Registrarse con Google',
        createAccount: 'Crear Cuenta',
        termsAndConditions: 'Términos y Condiciones',
        privacyPolicy: 'Política de Privacidad',
        button: 'Crear Cuenta',
        google: 'Registrarse con Google',
        haveAccount: '¿Ya tienes una cuenta?',
        signIn: 'Inicia sesión aquí',
      },
      signIn: {
        title: 'Iniciar Sesión',
        subtitle: 'Accede a tu cuenta de SECiD',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        rememberMe: 'Recordarme',
        forgotPassword: '¿Olvidaste tu contraseña?',
        signIn: 'Iniciar Sesión',
        noAccount: '¿No tienes una cuenta?',
        signUpHere: 'Regístrate aquí',
        orContinueWith: 'O continúa con',
        googleSignIn: 'Iniciar sesión con Google',
        button: 'Iniciar Sesión',
      },
      or: 'o',
      acceptTerms: {
        prefix: 'Acepto los',
        link: 'términos y condiciones',
      },
      errors: {
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña es muy débil',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/operation-not-allowed': 'Operación no permitida',
        default: 'Ha ocurrido un error',
      },
    },
    pricing: {
      title: 'Planes de Membresía',
      subtitle: 'Elige el plan que mejor se adapte a tus necesidades profesionales',
      monthly: 'Mensual',
      yearly: 'Anual',
      save17: 'Ahorra 17%',
      popular: 'Popular',
      recommended: 'Recomendado',
      advanced: 'Avanzado',
      mostPopular: 'Más Popular',
      free: 'Gratis',
      year: 'año',
      month: 'mes',
      perMonth: '/mes',
      currentPlan: 'Plan Actual',
      getStarted: 'Comenzar',
      upgrade: 'Mejorar Plan',
      checkout: 'Finalizar Compra',
      chooseCommission: 'Elige tu Comisión',
      commissionDescription: 'Selecciona la comisión que más se alinee con tus intereses profesionales',
      faq: 'Preguntas Frecuentes',
      faq1Question: '¿Puedo cambiar de plan después?',
      faq1Answer: 'Sí, puedes actualizar o cambiar tu plan en cualquier momento desde tu panel de control.',
      faq2Question: '¿Qué métodos de pago aceptan?',
      faq2Answer: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, AMEX) y transferencias bancarias.',
      faq3Question: '¿Hay descuento para estudiantes?',
      faq3Answer: 'Sí, ofrecemos un 50% de descuento para estudiantes activos de la UNAM con credencial vigente.',
      faq4Question: '¿Puedo cancelar en cualquier momento?',
      faq4Answer: 'Sí, puedes cancelar tu suscripción en cualquier momento sin penalización.',
    },
    languages: {
      spanish: 'Español',
      english: 'Inglés',
    },
    resources: {
      preview: 'Vista previa',
      premium: 'Premium',
      removeBookmark: 'Quitar marcador',
      addBookmark: 'Agregar marcador',
      verified: 'Verificado',
      download: 'Descargar',
      viewDetails: 'Ver detalles',
      estimatedTime: 'Tiempo estimado',
      loginRequired: 'Por favor inicia sesión para continuar',
      downloadError: 'Error al descargar recurso',
      reviewRequired: 'Por favor ingresa un comentario',
      reviewError: 'Error al enviar reseña',
      notFound: 'Recurso no encontrado',
      notFoundDescription: 'El recurso solicitado no pudo ser encontrado.',
      downloads: 'descargas',
      views: 'vistas',
      bookmarks: 'Marcadores',
      downloading: 'Descargando...',
      details: 'Detalles',
      category: 'Categoría',
      type: 'Tipo',
      language: 'Idioma',
      tags: 'Etiquetas',
      prerequisites: 'Prerrequisitos',
      summary: 'Resumen',
      writeReview: 'Escribir una reseña',
      rating: 'Calificación',
      comment: 'Comentario',
      reviewPlaceholder: 'Comparte tu opinión sobre este recurso...',
      submitting: 'Enviando...',
      reviews: 'Reseñas',
      noReviews: 'Sin reseñas aún. ¡Sé el primero en opinar!',
      versions: 'Versiones',
      related: 'Recursos relacionados',
      resources: 'recursos',
      totalResources: 'Total de recursos',
      totalDownloads: 'Descargas',
      contributors: 'Colaboradores',
      averageRating: 'Calificación promedio',
      popular: 'Popular',
      recent: 'Reciente',
      upload: 'Subir',
      noResults: 'No se encontraron recursos',
      noResultsDescription: 'Intenta ajustar tus filtros de búsqueda o navega por categoría.',
      contributeFirst: '¡Sé el primero en contribuir!',
      library: 'Biblioteca de recursos',
      libraryDescription: 'Descubre y comparte materiales de aprendizaje, plantillas, herramientas y conjuntos de datos para acelerar tu camino en ciencia de datos.',
      searchPlaceholder: 'Buscar recursos...',
      advancedSearch: 'Avanzado',
      sortBy: 'Ordenar por',
      results: 'resultados',
      fileTypes: 'Tipos de archivo',
      accessLevel: 'Nivel de acceso',
      bilingual: 'Bilingüe',
      minimumRating: 'Calificación mínima',
      withPreview: 'Con vista previa',
      withoutPreview: 'Sin vista previa',
      dateRange: 'Rango de fechas',
      loginToUpload: 'Por favor inicia sesión para subir recursos.',
      title: 'Título',
      description: 'Descripción',
      titlePlaceholder: 'Ingresa un título descriptivo...',
      summaryPlaceholder: 'Resumen breve (1-2 oraciones)...',
      descriptionPlaceholder: 'Descripción detallada del recurso...',
      basicInfo: 'Información básica',
      fileUpload: 'Subir archivo',
      mainFile: 'Archivo principal',
      dragDropFile: 'Arrastra y suelta tu archivo aquí, o',
      browseFiles: 'buscar archivos',
      includePreview: 'Incluir archivo de vista previa',
      selectPreviewFile: 'Seleccionar archivo de vista previa',
      thumbnail: 'Miniatura',
      selectThumbnail: 'Seleccionar imagen de miniatura',
      metadata: 'Metadatos',
      addTag: 'Agregar una etiqueta...',
      addPrerequisite: 'Agregar un prerrequisito...',
      uploadResource: 'Subir recurso',
      uploading: 'Subiendo...',
      submitForReview: 'Enviar para revisión',
      uploadNotice: 'Tu recurso será revisado por nuestro equipo antes de ser publicado. Serás notificado cuando la revisión esté completa.',
      uploadSuccess: '¡Recurso subido exitosamente! Será revisado antes de su publicación.',
      uploadError: 'Error al subir recurso. Por favor intenta de nuevo.',
      categories: {
        title: 'Categorías',
        tutorials: 'Tutoriales',
        templates: 'Plantillas',
        tools: 'Herramientas',
        books: 'Libros',
        courses: 'Cursos',
        datasets: 'Conjuntos de datos',
        research: 'Investigación',
        documentation: 'Documentación',
      },
      difficulty: {
        title: 'Dificultad',
        beginner: 'Principiante',
        intermediate: 'Intermedio',
        advanced: 'Avanzado',
      },
      sortOptions: {
        relevance: 'Relevancia',
        newest: 'Más reciente',
        oldest: 'Más antiguo',
        mostDownloaded: 'Más descargados',
        highestRated: 'Mejor calificados',
        alphabetical: 'A-Z',
      },
      accessLevels: {
        free: 'Gratis',
        premium: 'Premium',
        member: 'Solo miembros',
        restricted: 'Restringido',
      },
      tabs: {
        overview: 'General',
        reviews: 'Reseñas',
        versions: 'Versiones',
      },
      validation: {
        titleRequired: 'El título es requerido',
        descriptionRequired: 'La descripción es requerida',
        summaryRequired: 'El resumen es requerido',
        fileRequired: 'El archivo es requerido',
        tagsRequired: 'Se requiere al menos una etiqueta',
      },
    },
    mentorship: {
      dashboard: {
        title: 'Panel de Mentoría',
        welcome: 'Bienvenido a tu panel de mentoría',
        findMentor: 'Buscar Mentor',
        editProfile: 'Editar Perfil',
        scheduleSession: 'Agendar Sesión',
        overview: 'Resumen',
        matches: 'Conexiones',
        sessions: 'Sesiones',
        profile: 'Perfil',
        activeMatches: 'Conexiones Activas',
        completedSessions: 'Sesiones Completadas',
        upcomingSessions: 'Próximas Sesiones',
        averageRating: 'Calificación Promedio',
        recentActivity: 'Actividad Reciente',
        pendingRequests: 'Solicitudes Pendientes',
        newMenteeRequest: 'Nueva solicitud de mentoría recibida',
        mentorRequestPending: 'Tu solicitud de mentoría está pendiente',
        view: 'Ver',
        join: 'Unirse',
        programStats: 'Estadísticas del Programa',
        totalMentors: 'Total de Mentores',
        totalMentees: 'Total de Mentees',
        globalActiveMatches: 'Conexiones Activas Globales',
        successRate: 'Tasa de Éxito',
        yourMatches: 'Tus Conexiones',
        noMatches: 'Sin Conexiones',
        noMatchesDescription: 'Aún no tienes conexiones de mentoría.',
        becomeMentor: 'Ser Mentor',
        menteeMatch: 'Conexión con Mentee',
        mentorMatch: 'Conexión con Mentor',
        compatibility: 'Compatibilidad',
        goals: 'Objetivos',
        acceptRequest: 'Aceptar Solicitud',
        viewRequest: 'Ver Solicitud',
        declineRequest: 'Rechazar Solicitud',
        sendMessage: 'Enviar Mensaje',
        noSessions: 'Sin Sesiones',
        noSessionsDescription: 'No tienes sesiones próximas programadas.',
        minutes: 'minutos',
        agenda: 'Agenda',
        joinSession: 'Unirse a Sesión',
        editSession: 'Editar Sesión',
        cancelSession: 'Cancelar Sesión',
        yourProfile: 'Tu Perfil',
        mentorProfile: 'Perfil de Mentor',
        menteeProfile: 'Perfil de Mentee',
        rating: 'Calificación',
        mentees: 'Mentees',
        expertise: 'Expertise',
        interests: 'Intereses',
        yearsExperience: 'años de experiencia',
        noProfile: 'Sin Perfil',
        noProfileDescription: 'Crea un perfil para comenzar con la mentoría.',
        createMentorProfile: 'Crear Perfil de Mentor',
        createMenteeProfile: 'Crear Perfil de Mentee',
      },
      matcher: {
        excellent: 'Excelente',
        veryGood: 'Muy Bueno',
        good: 'Bueno',
        fair: 'Regular',
        poor: 'Bajo',
        loading: 'Buscando mentores...',
        createProfile: 'Crea tu Perfil',
        createProfileDescription: 'Necesitas crear un perfil de mentee para buscar mentores.',
        createMenteeProfile: 'Crear Perfil de Mentee',
        title: 'Encuentra tu Mentor',
        description: 'Encuentra el mentor ideal basado en tu perfil e intereses.',
        availableMentors: 'Mentores Disponibles',
        matches: 'Coincidencias',
        filters: 'Filtros',
        sortBy: 'Ordenar por',
        compatibility: 'Compatibilidad',
        rating: 'Calificación',
        experience: 'Experiencia',
        calculating: 'Calculando...',
        recalculate: 'Recalcular',
        filterOptions: 'Opciones de Filtro',
        minimumRating: 'Calificación Mínima',
        stars: 'estrellas',
        experienceLevel: 'Nivel de Experiencia',
        anyExperience: 'Cualquier Experiencia',
        juniorLevel: 'Junior (1-3 años)',
        midLevel: 'Mid (3-7 años)',
        seniorLevel: 'Senior (7+ años)',
        minimumHours: 'Horas Mínimas',
        hoursPerWeek: 'horas/semana',
        clearFilters: 'Limpiar Filtros',
        analyzingProfiles: 'Analizando perfiles...',
        calculatingCompatibility: 'Calculando compatibilidad con mentores disponibles.',
        noMatches: 'Sin Coincidencias',
        noMatchesDescription: 'No se encontraron mentores con los filtros actuales.',
        adjustFilters: 'Ajustar Filtros',
        yearsExperience: 'años de experiencia',
        sessions: 'sesiones',
        mentees: 'mentees',
        compatibilityBreakdown: 'Desglose de Compatibilidad',
        skills: 'Habilidades',
        availability: 'Disponibilidad',
        style: 'Estilo',
        language: 'Idioma',
        whyThisMatch: '¿Por qué esta coincidencia?',
        expertise: 'Expertise',
        viewProfile: 'Ver Perfil',
        requestPending: 'Solicitud Pendiente',
        requestMentorship: 'Solicitar Mentoría',
        requestModalDescription: 'Envía una solicitud de mentoría a este mentor.',
        yourGoals: 'Tus Objetivos',
        continueRequest: 'Continuar Solicitud',
      },
      status: {
        pending: 'Pendiente',
        active: 'Activo',
        completed: 'Completado',
        cancelled: 'Cancelado',
      },
      frequency: {
        weekly: 'Semanal',
        biweekly: 'Quincenal',
        monthly: 'Mensual',
      },
      communication: {
        video: 'Video',
        chat: 'Chat',
        email: 'Email',
        'in-person': 'Presencial',
      },
      sessionType: {
        video: 'Video',
        voice: 'Voz',
        chat: 'Chat',
        'in-person': 'Presencial',
      },
      level: {
        student: 'Estudiante',
        entry: 'Principiante',
        mid: 'Intermedio',
        senior: 'Senior',
      },
    },
  },
  en: {
    site: {
      name: 'SECiD',
      title: 'SECiD - UNAM Data Science Alumni Society',
      description:
        'Connecting UNAM data science alumni. Job opportunities, networking, and professional growth.',
    },
    nav: {
      home: 'Home',
      about: 'About',
      jobs: 'Jobs',
      contact: 'Contact',
      community: 'Community',
      members: 'Members',
      events: 'Events',
      mentorship: 'Mentorship',
      resources: 'Resources',
      blog: 'Blog',
      commissions: 'Commissions',
      spotlights: 'Success Stories',
      newsletter: 'Newsletter',
      journalClub: 'Journal Club',
    },
    hero: {
      title: 'Welcome to SECiD',
      subtitle: 'The site to connect with UNAM\'s Data Science Alumni Society.',
      description:
        'SECiD (Sociedad de Egresados en Ciencia de Datos, A. C.) is a vibrant professional network empowering UNAM data science graduates. Our goal is to foster meaningful connections, drive professional growth, and create opportunities for our community through networking events, exclusive job postings, continuous learning initiatives, and collaborations that support and boost the ongoing success of data science professionals from the National Autonomous University of Mexico (UNAM).',
      joinButton: 'Join SECiD',
      jobsButton: 'View Jobs',
    },
    features: {
      title: 'Why join SECiD?',
      networking: {
        title: 'Professional Networking',
        description:
          'Connect with other UNAM data science alumni and expand your professional network in the industry.',
      },
      jobs: {
        title: 'Job Opportunities',
        description:
          'Access exclusive job offers and career opportunities at leading companies in the sector.',
      },
      growth: {
        title: 'Professional Growth',
        description:
          'Participate in events, workshops, and conferences to stay updated with the latest trends.',
      },
      community: {
        title: 'Strong Community',
        description:
          'Be part of a community committed to knowledge and experience sharing.',
      },
    },
    initiatives: {
      title: 'Initiatives',
      talentMatcher: {
        title: 'Talent / Demand Matcher',
        description: 'A place to post and subscribe to job opportunities.',
        cta: 'Submit your job and find top talent.',
      },
      consulting: {
        title: 'Consulting',
        description: 'Get consulting services from the best prepared professionals on data science and machine learning in Mexico.',
        cta: 'Contact Us.',
      },
      hackathons: {
        title: 'Hackathons',
        description: 'Do you have an interesting problem within your organization and would like to co-host a hackathon?',
        cta: 'Contact Us.',
      },
      workshops: {
        title: 'Workshops and Courses',
        description: 'Get the knowledge from our community with on-demand courses from experts on data science and machine learning.',
        cta: 'In Roadmap.',
      },
      seminars: {
        title: 'Seminars',
        description: 'Gather around with experts in the field to present and discuss academic and engineering hot topics.',
        cta: 'In Roadmap.',
      },
      mentoring: {
        title: 'Mentoring',
        description: 'Are you a data science graduate who wants some mentoring or feedback from your peers? Get mentoring or become a Mentor.',
        cta: 'In Roadmap.',
      },
    },
    cta: {
      title: 'Start your journey',
      jobs: {
        title: 'Find your next job',
        description:
          'Explore exclusive job opportunities for SECiD members at innovative companies.',
        button: 'View jobs',
      },
      register: {
        title: 'Join our community',
        description:
          'Register as a SECiD member and access all the benefits of our professional network.',
        button: 'Register',
      },
    },
    search: {
      placeholder: 'Search...',
    },
    sidebar: {
      menu: 'Menu',
      getInTouch: 'Get in touch',
      description:
        'Follow us on our social networks and stay up to date with the latest news and opportunities.',
    },
    footer: {
      rights: 'All rights reserved.',
      design: 'Design',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      submit: 'Submit',
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      more: 'more',
      all: 'All',
      any: 'Any',
      from: 'From',
      to: 'To',
      add: 'Add',
      optional: 'Optional',
      clearFilters: 'Clear filters',
      button: 'Button',
    },
    auth: {
      signUp: {
        title: 'Create Account',
        subtitle: 'Join the UNAM data science alumni community',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        acceptTerms: 'I accept the terms and conditions',
        alreadyHaveAccount: 'Already have an account?',
        signInHere: 'Sign in here',
        orContinueWith: 'Or continue with',
        googleSignUp: 'Sign up with Google',
        createAccount: 'Create Account',
        termsAndConditions: 'Terms and Conditions',
        privacyPolicy: 'Privacy Policy',
        button: 'Create Account',
        google: 'Sign up with Google',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in here',
      },
      signIn: {
        title: 'Sign In',
        subtitle: 'Access your SECiD account',
        email: 'Email Address',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot your password?',
        signIn: 'Sign In',
        noAccount: "Don't have an account?",
        signUpHere: 'Sign up here',
        orContinueWith: 'Or continue with',
        googleSignIn: 'Sign in with Google',
        button: 'Sign In',
      },
      or: 'or',
      acceptTerms: {
        prefix: 'I accept the',
        link: 'terms and conditions',
      },
      errors: {
        'auth/user-not-found': 'No account exists with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password is too weak',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        default: 'An error occurred',
      },
    },
    pricing: {
      title: 'Membership Plans',
      subtitle: 'Choose the plan that best fits your professional needs',
      monthly: 'Monthly',
      yearly: 'Yearly',
      save17: 'Save 17%',
      popular: 'Popular',
      recommended: 'Recommended',
      advanced: 'Advanced',
      mostPopular: 'Most Popular',
      free: 'Free',
      year: 'year',
      month: 'month',
      perMonth: '/month',
      currentPlan: 'Current Plan',
      getStarted: 'Get Started',
      upgrade: 'Upgrade',
      checkout: 'Checkout',
      chooseCommission: 'Choose Your Commission',
      commissionDescription: 'Select the commission that best aligns with your professional interests',
      faq: 'Frequently Asked Questions',
      faq1Question: 'Can I change my plan later?',
      faq1Answer: 'Yes, you can upgrade or change your plan at any time from your dashboard.',
      faq2Question: 'What payment methods do you accept?',
      faq2Answer: 'We accept credit/debit cards (Visa, Mastercard, AMEX) and bank transfers.',
      faq3Question: 'Is there a student discount?',
      faq3Answer: 'Yes, we offer a 50% discount for active UNAM students with a valid ID.',
      faq4Question: 'Can I cancel at any time?',
      faq4Answer: 'Yes, you can cancel your subscription at any time without penalty.',
    },
    languages: {
      spanish: 'Spanish',
      english: 'English',
    },
    resources: {
      preview: 'Preview',
      premium: 'Premium',
      removeBookmark: 'Remove bookmark',
      addBookmark: 'Add bookmark',
      verified: 'Verified',
      download: 'Download',
      viewDetails: 'View Details',
      estimatedTime: 'Estimated time',
      loginRequired: 'Please login to continue',
      downloadError: 'Error downloading resource',
      reviewRequired: 'Please enter a review comment',
      reviewError: 'Error submitting review',
      notFound: 'Resource not found',
      notFoundDescription: 'The requested resource could not be found.',
      downloads: 'downloads',
      views: 'views',
      bookmarks: 'Bookmarks',
      downloading: 'Downloading...',
      details: 'Details',
      category: 'Category',
      type: 'Type',
      language: 'Language',
      tags: 'Tags',
      prerequisites: 'Prerequisites',
      summary: 'Summary',
      writeReview: 'Write a Review',
      rating: 'Rating',
      comment: 'Comment',
      reviewPlaceholder: 'Share your thoughts about this resource...',
      submitting: 'Submitting...',
      reviews: 'Reviews',
      noReviews: 'No reviews yet. Be the first to review!',
      versions: 'Versions',
      related: 'Related Resources',
      resources: 'resources',
      totalResources: 'Total Resources',
      totalDownloads: 'Downloads',
      contributors: 'Contributors',
      averageRating: 'Avg Rating',
      popular: 'Popular',
      recent: 'Recent',
      upload: 'Upload',
      noResults: 'No resources found',
      noResultsDescription: 'Try adjusting your search filters or browse by category.',
      contributeFirst: 'Be the first to contribute!',
      library: 'Resource Library',
      libraryDescription: 'Discover and share learning materials, templates, tools, and datasets to accelerate your data science journey.',
      searchPlaceholder: 'Search resources...',
      advancedSearch: 'Advanced',
      sortBy: 'Sort by',
      results: 'results',
      fileTypes: 'File Types',
      accessLevel: 'Access Level',
      bilingual: 'Bilingual',
      minimumRating: 'Minimum Rating',
      withPreview: 'With Preview',
      withoutPreview: 'Without Preview',
      dateRange: 'Date Range',
      loginToUpload: 'Please sign in to upload resources.',
      title: 'Title',
      description: 'Description',
      titlePlaceholder: 'Enter a descriptive title...',
      summaryPlaceholder: 'Brief summary (1-2 sentences)...',
      descriptionPlaceholder: 'Detailed description of the resource...',
      basicInfo: 'Basic Information',
      fileUpload: 'File Upload',
      mainFile: 'Main File',
      dragDropFile: 'Drag and drop your file here, or',
      browseFiles: 'browse files',
      includePreview: 'Include Preview File',
      selectPreviewFile: 'Select Preview File',
      thumbnail: 'Thumbnail',
      selectThumbnail: 'Select Thumbnail Image',
      metadata: 'Metadata',
      addTag: 'Add a tag...',
      addPrerequisite: 'Add a prerequisite...',
      uploadResource: 'Upload Resource',
      uploading: 'Uploading...',
      submitForReview: 'Submit for Review',
      uploadNotice: 'Your resource will be reviewed by our team before being published. You will be notified once the review is complete.',
      uploadSuccess: 'Resource uploaded successfully! It will be reviewed before publication.',
      uploadError: 'Error uploading resource. Please try again.',
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
      difficulty: {
        title: 'Difficulty',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
      },
      sortOptions: {
        relevance: 'Relevance',
        newest: 'Newest',
        oldest: 'Oldest',
        mostDownloaded: 'Most Downloaded',
        highestRated: 'Highest Rated',
        alphabetical: 'A-Z',
      },
      accessLevels: {
        free: 'Free',
        premium: 'Premium',
        member: 'Members Only',
        restricted: 'Restricted',
      },
      tabs: {
        overview: 'Overview',
        reviews: 'Reviews',
        versions: 'Versions',
      },
      validation: {
        titleRequired: 'Title is required',
        descriptionRequired: 'Description is required',
        summaryRequired: 'Summary is required',
        fileRequired: 'File is required',
        tagsRequired: 'At least one tag is required',
      },
    },
    mentorship: {
      dashboard: {
        title: 'Mentorship Dashboard',
        welcome: 'Welcome to your mentorship dashboard',
        findMentor: 'Find Mentor',
        editProfile: 'Edit Profile',
        scheduleSession: 'Schedule Session',
        overview: 'Overview',
        matches: 'Matches',
        sessions: 'Sessions',
        profile: 'Profile',
        activeMatches: 'Active Matches',
        completedSessions: 'Completed Sessions',
        upcomingSessions: 'Upcoming Sessions',
        averageRating: 'Average Rating',
        recentActivity: 'Recent Activity',
        pendingRequests: 'Pending Requests',
        newMenteeRequest: 'New mentorship request received',
        mentorRequestPending: 'Your mentorship request is pending',
        view: 'View',
        join: 'Join',
        programStats: 'Program Statistics',
        totalMentors: 'Total Mentors',
        totalMentees: 'Total Mentees',
        globalActiveMatches: 'Global Active Matches',
        successRate: 'Success Rate',
        yourMatches: 'Your Matches',
        noMatches: 'No Matches',
        noMatchesDescription: 'You don\'t have any mentorship matches yet.',
        becomeMentor: 'Become a Mentor',
        menteeMatch: 'Mentee Match',
        mentorMatch: 'Mentor Match',
        compatibility: 'Compatibility',
        goals: 'Goals',
        acceptRequest: 'Accept Request',
        viewRequest: 'View Request',
        declineRequest: 'Decline Request',
        sendMessage: 'Send Message',
        noSessions: 'No Sessions',
        noSessionsDescription: 'You have no upcoming sessions scheduled.',
        minutes: 'minutes',
        agenda: 'Agenda',
        joinSession: 'Join Session',
        editSession: 'Edit Session',
        cancelSession: 'Cancel Session',
        yourProfile: 'Your Profile',
        mentorProfile: 'Mentor Profile',
        menteeProfile: 'Mentee Profile',
        rating: 'Rating',
        mentees: 'Mentees',
        expertise: 'Expertise',
        interests: 'Interests',
        yearsExperience: 'years of experience',
        noProfile: 'No Profile',
        noProfileDescription: 'Create a profile to get started with mentorship.',
        createMentorProfile: 'Create Mentor Profile',
        createMenteeProfile: 'Create Mentee Profile',
      },
      matcher: {
        excellent: 'Excellent',
        veryGood: 'Very Good',
        good: 'Good',
        fair: 'Fair',
        poor: 'Poor',
        loading: 'Finding mentors...',
        createProfile: 'Create Your Profile',
        createProfileDescription: 'You need to create a mentee profile to find mentors.',
        createMenteeProfile: 'Create Mentee Profile',
        title: 'Find Your Mentor',
        description: 'Find the ideal mentor based on your profile and interests.',
        availableMentors: 'Available Mentors',
        matches: 'Matches',
        filters: 'Filters',
        sortBy: 'Sort by',
        compatibility: 'Compatibility',
        rating: 'Rating',
        experience: 'Experience',
        calculating: 'Calculating...',
        recalculate: 'Recalculate',
        filterOptions: 'Filter Options',
        minimumRating: 'Minimum Rating',
        stars: 'stars',
        experienceLevel: 'Experience Level',
        anyExperience: 'Any Experience',
        juniorLevel: 'Junior (1-3 years)',
        midLevel: 'Mid (3-7 years)',
        seniorLevel: 'Senior (7+ years)',
        minimumHours: 'Minimum Hours',
        hoursPerWeek: 'hours/week',
        clearFilters: 'Clear Filters',
        analyzingProfiles: 'Analyzing profiles...',
        calculatingCompatibility: 'Calculating compatibility with available mentors.',
        noMatches: 'No Matches',
        noMatchesDescription: 'No mentors found with current filters.',
        adjustFilters: 'Adjust Filters',
        yearsExperience: 'years of experience',
        sessions: 'sessions',
        mentees: 'mentees',
        compatibilityBreakdown: 'Compatibility Breakdown',
        skills: 'Skills',
        availability: 'Availability',
        style: 'Style',
        language: 'Language',
        whyThisMatch: 'Why this match?',
        expertise: 'Expertise',
        viewProfile: 'View Profile',
        requestPending: 'Request Pending',
        requestMentorship: 'Request Mentorship',
        requestModalDescription: 'Send a mentorship request to this mentor.',
        yourGoals: 'Your Goals',
        continueRequest: 'Continue Request',
      },
      status: {
        pending: 'Pending',
        active: 'Active',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      frequency: {
        weekly: 'Weekly',
        biweekly: 'Biweekly',
        monthly: 'Monthly',
      },
      communication: {
        video: 'Video',
        chat: 'Chat',
        email: 'Email',
        'in-person': 'In-Person',
      },
      sessionType: {
        video: 'Video',
        voice: 'Voice',
        chat: 'Chat',
        'in-person': 'In-Person',
      },
      level: {
        student: 'Student',
        entry: 'Entry',
        mid: 'Mid-Level',
        senior: 'Senior',
      },
    },
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.es;
}

export function getLanguageFromUrl(url: URL): Language {
  const pathname = url.pathname;
  if (pathname.startsWith('/en/')) return 'en';
  return 'es';
}

export function getAlternateUrls(currentUrl: URL): Record<Language, string> {
  const pathname = currentUrl.pathname;

  // Remove language prefix if present
  const cleanPath = pathname.replace(/^\/(es|en)/, '') || '/';

  return {
    es: `/es${cleanPath}`,
    en: `/en${cleanPath}`,
  };
}

export const supportedLanguages: Language[] = ['es', 'en'];

export const defaultLanguage: Language = 'es';
