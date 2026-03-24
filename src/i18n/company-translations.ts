/**
 * Company translations: profile, list, drawer, member cards, ecosystem map.
 */

export const companyTranslations = {
  es: {
    companies: {
      // Shared
      loading: 'Cargando...',
      loadingCompanies: 'Cargando empresas...',
      notFound: 'Empresa no encontrada',
      loadError: 'Error al cargar la empresa',
      loadListError: 'Error al cargar empresas',
      retry: 'Reintentar',
      backToDirectory: 'Volver al directorio',
      website: 'Sitio web',
      connections: 'conexiones SECiD',
      members: 'miembros',
      signInToView: 'Inicia sesion para ver',
      viewProfile: 'Ver perfil',
      viewFullProfile: 'Ver perfil completo',
      close: 'Cerrar',
      present: 'Presente',
      nowAt: 'Ahora en',

      // Tabs
      tabCurrent: 'Miembros actuales',
      tabAlumni: 'Anteriores',
      tabRoles: 'Roles',

      // Empty states
      noCurrentMembers: 'Sin miembros actuales registrados',
      noFormerMembers: 'Sin miembros anteriores registrados',
      noRoles: 'Sin roles registrados',
      noCompaniesFound: 'No se encontraron empresas',

      // List page
      networkTitle: 'Red de Empresas SECiD',
      networkDescription:
        'Descubre donde trabajan los miembros de SECiD y conecta con tu red profesional.',
      statsCompanies: 'Empresas',
      statsActiveMembers: 'Miembros activos',
      statsIndustries: 'Industrias',
      searchPlaceholder: 'Buscar empresa...',
      allIndustries: 'Todas las industrias',
      listView: 'Vista de lista',
      list: 'Lista',
      industryMap: 'Mapa de industrias',
      map: 'Mapa',
      companiesFound: 'empresas encontradas',

      // Drawer
      currentMembersCount: (count: number) => `Miembros actuales (${count})`,
      formerMembersCount: (count: number) => `Anteriores (${count})`,

      // Ecosystem map
      ecosystemTitle: '¿Dónde trabajan los miembros de SECiD?',
      ecosystemSubtitle:
        'Empresas donde nuestros egresados generan impacto',
      statsConnections: 'Conexiones',
      statsDataScience: 'Ciencia de Datos',
      filterCurrent: 'Actuales',
      filterFullHistory: 'Historial completo',
      legendCurrent: 'Actuales',
      legendFormer: 'Anteriores',
    },
  },
  en: {
    companies: {
      // Shared
      loading: 'Loading...',
      loadingCompanies: 'Loading companies...',
      notFound: 'Company not found',
      loadError: 'Error loading company',
      loadListError: 'Error loading companies',
      retry: 'Retry',
      backToDirectory: 'Back to directory',
      website: 'Website',
      connections: 'SECiD connections',
      members: 'members',
      signInToView: 'Sign in to view',
      viewProfile: 'View profile',
      viewFullProfile: 'View full profile',
      close: 'Close',
      present: 'Present',
      nowAt: 'Now at',

      // Tabs
      tabCurrent: 'Current members',
      tabAlumni: 'Former',
      tabRoles: 'Roles',

      // Empty states
      noCurrentMembers: 'No current members registered',
      noFormerMembers: 'No former members registered',
      noRoles: 'No roles registered',
      noCompaniesFound: 'No companies found',

      // List page
      networkTitle: 'SECiD Company Network',
      networkDescription:
        'Discover where SECiD members work and connect with your professional network.',
      statsCompanies: 'Companies',
      statsActiveMembers: 'Active members',
      statsIndustries: 'Industries',
      searchPlaceholder: 'Search company...',
      allIndustries: 'All industries',
      listView: 'List view',
      list: 'List',
      industryMap: 'Industry map',
      map: 'Map',
      companiesFound: 'companies found',

      // Drawer
      currentMembersCount: (count: number) => `Current members (${count})`,
      formerMembersCount: (count: number) => `Former (${count})`,

      // Ecosystem map
      ecosystemTitle: 'Where do SECiD members work?',
      ecosystemSubtitle:
        'Companies where our graduates make an impact',
      statsConnections: 'Connections',
      statsDataScience: 'Data Science',
      filterCurrent: 'Current',
      filterFullHistory: 'Full history',
      legendCurrent: 'Current',
      legendFormer: 'Former',
    },
  },
} as const;

export type CompanyTranslations = (typeof companyTranslations)['es']['companies'];

export function getCompanyTranslations(lang: 'es' | 'en') {
  return companyTranslations[lang].companies;
}
