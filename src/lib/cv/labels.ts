/**
 * Localized UI strings for the CV viewer.
 *
 * Pure function with no side effects. Mirrors the keys consumed by the
 * CV page client + section components. Adding a key here makes it
 * available to every section via the shared `Labels` type.
 */

export function getLabels(lang: 'es' | 'en') {
  return lang === 'es'
    ? {
        loading: 'Cargando CV...',
        notFound: 'Miembro no encontrado',
        notFoundDetail: 'El perfil que buscas no existe o no esta disponible.',
        backToDirectory: 'Volver al directorio',
        accessDeniedPrivate: 'Este CV no esta disponible publicamente.',
        accessDeniedMembers: 'Inicia sesion para ver este CV.',
        signIn: 'Iniciar Sesion',
        memberDirectory: 'Directorio de Miembros',
        errorLoading: 'Error al cargar el CV',
        about: 'Acerca de',
        experience: 'Experiencia Profesional',
        education: 'Educacion',
        certifications: 'Certificaciones',
        skills: 'Habilidades Tecnicas',
        projects: 'Proyectos',
        languages: 'Idiomas',
        current: 'Actual',
        viewCredential: 'Ver credencial',
        featured: 'Destacado',
        directory: 'Directorio',
        generatedFrom: 'Generado desde el perfil SECiD',
        download: 'Descargar PDF',
        awards: 'Reconocimientos',
        currentlyWorkingOn: 'Actualmente',
        copyEmail: 'Copiar email',
        shareCv: 'Compartir CV',
        printCv: 'Imprimir',
        downloadVcard: 'Descargar contacto',
        currentEducation: 'Educacion en Curso',
        activeProjects: 'Proyectos Activos',
      }
    : {
        loading: 'Loading CV...',
        notFound: 'Member not found',
        notFoundDetail:
          'The profile you are looking for does not exist or is not available.',
        backToDirectory: 'Back to directory',
        accessDeniedPrivate: 'This CV is not publicly available.',
        accessDeniedMembers: 'Please sign in to view this CV.',
        signIn: 'Sign In',
        memberDirectory: 'Member Directory',
        errorLoading: 'Error loading CV',
        about: 'About',
        experience: 'Professional Experience',
        education: 'Education',
        certifications: 'Certifications',
        skills: 'Technical Skills',
        projects: 'Projects',
        languages: 'Languages',
        current: 'Current',
        viewCredential: 'View credential',
        featured: 'Featured',
        directory: 'Directory',
        generatedFrom: 'Generated from SECiD profile',
        download: 'Download PDF',
        awards: 'Awards',
        currentlyWorkingOn: 'Currently Working On',
        copyEmail: 'Copy Email',
        shareCv: 'Share CV',
        printCv: 'Print',
        downloadVcard: 'Download Contact',
        currentEducation: 'Current Education',
        activeProjects: 'Active Projects',
      };
}

export type Labels = ReturnType<typeof getLabels> & { _lang?: 'es' | 'en' };

/**
 * Wrapper that attaches the active language to the labels object so
 * downstream components can call locale-aware helpers (formatDateForDisplay)
 * without prop-drilling lang separately.
 */
export function getLabelsWithLang(lang: 'es' | 'en'): Labels {
  return { ...getLabels(lang), _lang: lang };
}
