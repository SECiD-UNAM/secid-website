export interface Commission {
  id: string;
  name: { es: string; en: string };
  description: { es: string; en: string };
  icon: string;
  color: string;
  parent?: string;
  responsibilities: { es: string[]; en: string[] };
}

export interface BoardMember {
  role: string;
  name: string;
  icon: string;
}

export const boardMembers: { es: BoardMember[]; en: BoardMember[] } = {
  es: [
    { role: 'Presidente', name: 'Jorge Alejandro Ramirez Bondi', icon: 'fas fa-user-tie' },
    { role: 'Secretario General', name: 'Artemio Santiago Padilla Robles', icon: 'fas fa-file-signature' },
    { role: 'Tesorera', name: 'Sara Kenia Cisneros', icon: 'fas fa-coins' },
  ],
  en: [
    { role: 'President', name: 'Jorge Alejandro Ramirez Bondi', icon: 'fas fa-user-tie' },
    { role: 'General Secretary', name: 'Artemio Santiago Padilla Robles', icon: 'fas fa-file-signature' },
    { role: 'Treasurer', name: 'Sara Kenia Cisneros', icon: 'fas fa-coins' },
  ],
};

export const directiveCommissions: Commission[] = [
  {
    id: 'vinculacion',
    name: {
      es: 'Vinculacion y Relaciones Institucionales',
      en: 'Institutional Relations & Outreach',
    },
    description: {
      es: 'Promover y crear alianzas estrategicas con empresas, instituciones educativas y organizaciones gubernamentales. Organizar eventos para conectar a los egresados con la UNAM y su comunidad.',
      en: 'Promote and create strategic alliances with companies, educational institutions, and government organizations. Organize events to connect alumni with UNAM and its community.',
    },
    icon: 'fas fa-handshake',
    color: '#3B82F6',
    parent: 'presidencia',
    responsibilities: {
      es: [
        'Vinculacion con sector privado',
        'Vinculacion con sector publico',
        'Vinculacion con egresados',
        'Vinculacion con la UNAM',
      ],
      en: [
        'Private sector outreach',
        'Public sector outreach',
        'Alumni outreach',
        'UNAM relations',
      ],
    },
  },
  {
    id: 'it',
    name: { es: 'IT', en: 'IT' },
    description: {
      es: 'Crear y administrar la infraestructura, assets y servicios tecnologicos de la sociedad.',
      en: 'Create and manage the infrastructure, assets, and technology services of the society.',
    },
    icon: 'fas fa-server',
    color: '#8B5CF6',
    parent: 'secretaria',
    responsibilities: {
      es: [
        'Infraestructura y servicios',
        'Documentacion',
        'Gestion de ordenes del dia / Jira',
      ],
      en: [
        'Infrastructure & services',
        'Documentation',
        'Agenda / Jira management',
      ],
    },
  },
  {
    id: 'transparencia',
    name: {
      es: 'Transparencia y Legalidad',
      en: 'Transparency & Legal',
    },
    description: {
      es: 'Supervisar el cumplimiento de los estatutos y reglamentos internos. Garantizar que las operaciones de la organizacion sean transparentes y legales.',
      en: 'Oversee compliance with internal statutes and regulations. Ensure the organization operates transparently and legally.',
    },
    icon: 'fas fa-balance-scale',
    color: '#10B981',
    parent: 'secretaria',
    responsibilities: {
      es: [
        'Cumplimiento de estatutos y reglamentos',
        'Gestion y resguardo de documentacion interna',
        'Control de minutas y ordenes del dia',
      ],
      en: [
        'Statute & regulation compliance',
        'Internal documentation management',
        'Meeting minutes & agenda control',
      ],
    },
  },
  {
    id: 'recursos',
    name: {
      es: 'Gestion de Recursos',
      en: 'Resource Management',
    },
    description: {
      es: 'Buscar patrocinios y gestionar eventos de recaudacion de fondos. Establecer estrategias para garantizar la sostenibilidad financiera de la organizacion.',
      en: 'Seek sponsorships and manage fundraising events. Establish strategies to ensure the financial sustainability of the organization.',
    },
    icon: 'fas fa-piggy-bank',
    color: '#F59E0B',
    parent: 'tesoreria',
    responsibilities: {
      es: [
        'Contabilidad y finanzas',
        'Cumplimiento fiscal',
        'Aseguramiento de ingresos',
      ],
      en: [
        'Accounting & finance',
        'Tax compliance',
        'Revenue assurance',
      ],
    },
  },
];

export const horizontalCommissions: Commission[] = [
  {
    id: 'desarrollo-profesional',
    name: {
      es: 'Desarrollo Profesional',
      en: 'Professional Development',
    },
    description: {
      es: 'Coordinar talleres, cursos y programas de formacion continua para los egresados. Facilitar mentorias entre egresados con experiencia y recien graduados.',
      en: 'Coordinate workshops, courses, and continuing education programs for alumni. Facilitate mentorships between experienced alumni and recent graduates.',
    },
    icon: 'fas fa-graduation-cap',
    color: '#6366F1',
    responsibilities: {
      es: [
        'Talleres y cursos de formacion continua',
        'Programa de mentorias',
        'Promocion de servicios sociales de impacto',
      ],
      en: [
        'Continuing education workshops & courses',
        'Mentorship program',
        'Social impact services promotion',
      ],
    },
  },
  {
    id: 'comunicacion',
    name: {
      es: 'Comunicacion y Difusion',
      en: 'Communications & Outreach',
    },
    description: {
      es: 'Administrar redes sociales, boletines informativos y estrategias de marketing. Asegurarse de que las actividades de la organizacion sean visibles y accesibles.',
      en: "Manage social media, newsletters, and marketing strategies. Ensure the organization's activities are visible and accessible.",
    },
    icon: 'fas fa-bullhorn',
    color: '#EC4899',
    responsibilities: {
      es: [
        'Redes sociales',
        'Boletines informativos',
        'Estrategias de marketing',
      ],
      en: [
        'Social media',
        'Newsletters',
        'Marketing strategies',
      ],
    },
  },
  {
    id: 'cultura',
    name: {
      es: 'Cultura y Responsabilidad Social',
      en: 'Culture & Social Responsibility',
    },
    description: {
      es: 'Organizar actividades culturales, artisticas y sociales para la comunidad de egresados. Disenar proyectos sociales que reflejen los valores de la UNAM.',
      en: "Organize cultural, artistic, and social activities for the alumni community. Design social projects that reflect UNAM's values.",
    },
    icon: 'fas fa-heart',
    color: '#EF4444',
    responsibilities: {
      es: [
        'Actividades culturales y artisticas',
        'Proyectos de sostenibilidad e inclusion',
      ],
      en: [
        'Cultural & artistic activities',
        'Sustainability & inclusion projects',
      ],
    },
  },
  {
    id: 'academica',
    name: {
      es: 'Academica e Innovacion',
      en: 'Academic & Innovation',
    },
    description: {
      es: 'Proponer proyectos para fortalecer el prestigio academico de la UNAM y sus egresados. Promover colaboracion de investigacion y apoyar iniciativas de innovacion.',
      en: 'Propose projects to strengthen the academic prestige of UNAM and its alumni. Promote research collaboration and support innovation initiatives.',
    },
    icon: 'fas fa-flask',
    color: '#14B8A6',
    responsibilities: {
      es: [
        'Colaboracion de investigacion',
        'Iniciativas de innovacion',
        'Colaboraciones en talleres y cursos',
        'Difusion de oportunidades de desarrollo academico',
      ],
      en: [
        'Research collaboration',
        'Innovation initiatives',
        'Workshop & course collaborations',
        'Academic development opportunities',
      ],
    },
  },
  {
    id: 'etica',
    name: {
      es: 'Comite de Etica',
      en: 'Ethics Committee',
    },
    description: {
      es: 'Velar por el cumplimiento del Codigo de Conducta. Recibir, evaluar e investigar denuncias de conductas inapropiadas de manera confidencial e imparcial.',
      en: 'Ensure compliance with the Code of Conduct. Receive, evaluate, and investigate reports of inappropriate behavior confidentially and impartially.',
    },
    icon: 'fas fa-shield-alt',
    color: '#0EA5E9',
    responsibilities: {
      es: [
        'Cumplimiento del Codigo de Conducta',
        'Investigacion confidencial de denuncias',
        'Mediacion en conflictos internos',
        'Propuestas de mejora al Codigo de Conducta',
      ],
      en: [
        'Code of Conduct compliance',
        'Confidential complaint investigation',
        'Internal conflict mediation',
        'Code of Conduct improvement proposals',
      ],
    },
  },
];

export const parentLabels: Record<string, { es: string; en: string }> = {
  presidencia: { es: 'Presidencia', en: 'Presidency' },
  secretaria: { es: 'Secretaria General', en: 'General Secretariat' },
  tesoreria: { es: 'Tesoreria', en: 'Treasury' },
};

export const directionColors: Record<string, string> = {
  presidencia: '#3B82F6',
  secretaria: '#8B5CF6',
  tesoreria: '#F59E0B',
};

export const commissionsI18n = {
  es: {
    boardTitle: 'Consejo Directivo',
    directiveTitle: 'Comisiones Directivas',
    directiveSubtitle: 'Comisiones que operan bajo una direccion del consejo directivo',
    horizontalTitle: 'Comisiones Horizontales',
    horizontalSubtitle: 'Comisiones transversales que apoyan a toda la organizacion',
    reportsTo: 'Reporta a',
    areas: 'Areas',
    listView: 'Vista detallada',
    chartView: 'Organigrama',
  },
  en: {
    boardTitle: 'Board of Directors',
    directiveTitle: 'Directive Commissions',
    directiveSubtitle: 'Commissions that operate under a board directorate',
    horizontalTitle: 'Horizontal Commissions',
    horizontalSubtitle: 'Cross-cutting commissions that support the entire organization',
    reportsTo: 'Reports to',
    areas: 'Areas',
    listView: 'Detailed view',
    chartView: 'Org chart',
  },
};
