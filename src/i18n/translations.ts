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
    },
    hero: {
      title: 'Conectando el futuro de los datos',
      subtitle: 'Sociedad de Egresados en Ciencia de Datos UNAM',
      description:
        'Una comunidad vibrante de profesionales en ciencia de datos, unidos por nuestra formación en la UNAM y nuestro compromiso con la excelencia en el análisis de datos.',
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
    },
    hero: {
      title: 'Connecting the future of data',
      subtitle: 'UNAM Data Science Alumni Society',
      description:
        'A vibrant community of data science professionals, united by our UNAM education and commitment to excellence in data analysis.',
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
