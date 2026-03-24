import React from 'react';
import { GraduationCap, Handshake, Building2, ArrowRight } from 'lucide-react';

interface JoinPageProps {
  lang?: 'es' | 'en';
}

interface PathConfig {
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
}

interface PageTranslations {
  heading: string;
  subheading: string;
  paths: PathConfig[];
  postJobDescription: string;
  postJobLink: string;
  signInPrompt: string;
  signInLink: string;
}

const translations: Record<'es' | 'en', PageTranslations> = {
  es: {
    heading: 'Únete a SECiD',
    subheading:
      'Selecciona cómo quieres participar en la comunidad de egresados en ciencia de datos de la UNAM.',
    paths: [
      {
        role: 'member',
        icon: GraduationCap,
        title: 'Egresado / Miembro',
        description:
          'Soy egresado de la UNAM en Ciencia de Datos. Accede a la red de egresados, bolsa de trabajo, mentorías y eventos exclusivos.',
        borderColor: 'border-l-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-600',
      },
      {
        role: 'collaborator',
        icon: Handshake,
        title: 'Colaborador',
        description:
          'Quiero colaborar con la comunidad SECiD como aliado, empresa o investigador. Publica oportunidades y conéctate con talento.',
        borderColor: 'border-l-green-500',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        hoverBorder: 'hover:border-green-300 dark:hover:border-green-600',
      },
      {
        role: 'recruiter',
        icon: Building2,
        title: 'Reclutador',
        description:
          'Busco contratar talento en ciencia de datos. Publica vacantes y llega directamente a los mejores egresados de la UNAM.',
        borderColor: 'border-l-amber-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-600',
      },
    ],
    postJobDescription: '¿Solo quieres publicar una vacante?',
    postJobLink: 'Publica una oferta de trabajo sin registrarte',
    signInPrompt: '¿Ya tienes una cuenta?',
    signInLink: 'Inicia sesión',
  },
  en: {
    heading: 'Join SECiD',
    subheading:
      'Select how you want to participate in the UNAM data science alumni community.',
    paths: [
      {
        role: 'member',
        icon: GraduationCap,
        title: 'Alumni / Member',
        description:
          'I am a UNAM Data Science alumnus. Access the alumni network, job board, mentorships, and exclusive events.',
        borderColor: 'border-l-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-600',
      },
      {
        role: 'collaborator',
        icon: Handshake,
        title: 'Collaborator',
        description:
          'I want to collaborate with the SECiD community as an ally, company, or researcher. Post opportunities and connect with talent.',
        borderColor: 'border-l-green-500',
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        hoverBorder: 'hover:border-green-300 dark:hover:border-green-600',
      },
      {
        role: 'recruiter',
        icon: Building2,
        title: 'Recruiter',
        description:
          "I'm looking to hire data science talent. Post job openings and reach the best UNAM alumni directly.",
        borderColor: 'border-l-amber-500',
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-600 dark:text-amber-400',
        hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-600',
      },
    ],
    postJobDescription: 'Just want to post a job?',
    postJobLink: 'Post a job listing without registering',
    signInPrompt: 'Already have an account?',
    signInLink: 'Sign in',
  },
};

export const JoinPage: React.FC<JoinPageProps> = ({ lang = 'es' }) => {
  const t = translations[lang];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.heading}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t.subheading}
          </p>
        </div>

        <div className="space-y-3">
          {t.paths.map((path) => {
            const Icon = path.icon;

            return (
              <a
                key={path.role}
                href={`/${lang}/signup?role=${path.role}`}
                className={[
                  'flex items-center gap-4 rounded-lg border border-gray-200',
                  'border-l-4 bg-white p-4 transition-all',
                  'hover:shadow-md dark:bg-gray-800 dark:border-gray-700',
                  path.borderColor,
                  path.hoverBorder,
                ].join(' ')}
              >
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${path.iconBg}`}
                >
                  <Icon className={`h-6 w-6 ${path.iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {path.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {path.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              </a>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.postJobDescription}
          </p>
          <a
            href={`/${lang}/post-job`}
            className="mt-1 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t.postJobLink}
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {t.signInPrompt}{' '}
          <a
            href={`/${lang}/login`}
            className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t.signInLink}
          </a>
        </p>
      </div>
    </div>
  );
};

export default JoinPage;
