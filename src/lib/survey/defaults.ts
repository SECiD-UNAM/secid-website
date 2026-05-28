/**
 * Survey question catalog with i18n labels.
 * Keep this as the single source of truth for question definitions —
 * SurveyForm renders from this, aggregator counts buckets from this.
 */

import type {
  IndustryCategory,
  JobFunction,
  SeniorityLevel,
  WorkMode,
  AreaOfInterest,
  TechTool,
  MentorshipRole,
  OpenToOpportunities,
  ReasonForJoining,
  HeardAboutUsFrom,
} from '@/types/survey';

export type QuestionType = 'single' | 'multi' | 'text' | 'number';

export interface SurveyQuestion<TValue = string> {
  id: keyof import('@/types/survey').MemberSurveyResponse;
  type: QuestionType;
  category:
    | 'demographic'
    | 'career'
    | 'interests'
    | 'community'
    | 'sensitive';
  required?: boolean;
  options?: { value: TValue; label: { es: string; en: string } }[];
  label: { es: string; en: string };
  help?: { es: string; en: string };
}

const industryOptions: SurveyQuestion<IndustryCategory>['options'] = [
  { value: 'tech', label: { es: 'Tecnología', en: 'Technology' } },
  { value: 'finance', label: { es: 'Finanzas', en: 'Finance' } },
  { value: 'consulting', label: { es: 'Consultoría', en: 'Consulting' } },
  { value: 'academia', label: { es: 'Academia', en: 'Academia' } },
  { value: 'healthcare', label: { es: 'Salud', en: 'Healthcare' } },
  { value: 'retail', label: { es: 'Retail', en: 'Retail' } },
  { value: 'consumer', label: { es: 'Consumo', en: 'Consumer goods' } },
  { value: 'energy', label: { es: 'Energía', en: 'Energy' } },
  { value: 'government', label: { es: 'Gobierno', en: 'Government' } },
  { value: 'manufacturing', label: { es: 'Manufactura', en: 'Manufacturing' } },
  { value: 'media', label: { es: 'Medios', en: 'Media' } },
  { value: 'fintech', label: { es: 'Fintech', en: 'Fintech' } },
  { value: 'biotech', label: { es: 'Biotech', en: 'Biotech' } },
  { value: 'logistics', label: { es: 'Logística', en: 'Logistics' } },
  { value: 'gaming', label: { es: 'Gaming', en: 'Gaming' } },
  { value: 'other', label: { es: 'Otro', en: 'Other' } },
];

const seniorityOptions: SurveyQuestion<SeniorityLevel>['options'] = [
  { value: 'student', label: { es: 'Estudiante', en: 'Student' } },
  { value: 'junior', label: { es: 'Junior (0-2 años)', en: 'Junior (0-2 yrs)' } },
  { value: 'mid', label: { es: 'Mid (2-5 años)', en: 'Mid (2-5 yrs)' } },
  { value: 'senior', label: { es: 'Senior (5-8 años)', en: 'Senior (5-8 yrs)' } },
  { value: 'lead', label: { es: 'Lead / Staff', en: 'Lead / Staff' } },
  { value: 'manager', label: { es: 'Manager', en: 'Manager' } },
  { value: 'director', label: { es: 'Director', en: 'Director' } },
  { value: 'vp', label: { es: 'VP', en: 'VP' } },
  { value: 'c-level', label: { es: 'C-level', en: 'C-level' } },
];

const jobFunctionOptions: SurveyQuestion<JobFunction>['options'] = [
  { value: 'data-scientist', label: { es: 'Data Scientist', en: 'Data Scientist' } },
  { value: 'ml-engineer', label: { es: 'ML Engineer', en: 'ML Engineer' } },
  { value: 'data-engineer', label: { es: 'Data Engineer', en: 'Data Engineer' } },
  { value: 'data-analyst', label: { es: 'Data Analyst', en: 'Data Analyst' } },
  { value: 'research', label: { es: 'Investigación', en: 'Research' } },
  { value: 'product-manager', label: { es: 'Product Manager', en: 'Product Manager' } },
  { value: 'engineering-manager', label: { es: 'Engineering Manager', en: 'Engineering Manager' } },
  { value: 'founder', label: { es: 'Fundador / CEO', en: 'Founder / CEO' } },
  { value: 'consultant', label: { es: 'Consultor', en: 'Consultant' } },
  { value: 'student', label: { es: 'Estudiante', en: 'Student' } },
  { value: 'other', label: { es: 'Otro', en: 'Other' } },
];

const workModeOptions: SurveyQuestion<WorkMode>['options'] = [
  { value: 'remote', label: { es: 'Remoto', en: 'Remote' } },
  { value: 'hybrid', label: { es: 'Híbrido', en: 'Hybrid' } },
  { value: 'on-site', label: { es: 'Presencial', en: 'On-site' } },
];

const areasOfInterestOptions: SurveyQuestion<AreaOfInterest>['options'] = [
  { value: 'ml', label: { es: 'Machine Learning', en: 'Machine Learning' } },
  { value: 'dl', label: { es: 'Deep Learning', en: 'Deep Learning' } },
  { value: 'nlp', label: { es: 'NLP', en: 'NLP' } },
  { value: 'cv', label: { es: 'Computer Vision', en: 'Computer Vision' } },
  { value: 'rl', label: { es: 'Reinforcement Learning', en: 'Reinforcement Learning' } },
  { value: 'gen-ai', label: { es: 'Generative AI / LLMs', en: 'Generative AI / LLMs' } },
  { value: 'mlops', label: { es: 'MLOps', en: 'MLOps' } },
  { value: 'data-eng', label: { es: 'Data Engineering', en: 'Data Engineering' } },
  { value: 'analytics', label: { es: 'Analítica', en: 'Analytics' } },
  { value: 'bi', label: { es: 'Business Intelligence', en: 'Business Intelligence' } },
  { value: 'statistics', label: { es: 'Estadística', en: 'Statistics' } },
  { value: 'research', label: { es: 'Investigación', en: 'Research' } },
  { value: 'ethics', label: { es: 'Ética en IA', en: 'AI Ethics' } },
  { value: 'product', label: { es: 'Product / Strategy', en: 'Product / Strategy' } },
  { value: 'leadership', label: { es: 'Liderazgo', en: 'Leadership' } },
];

const techToolOptions: SurveyQuestion<TechTool>['options'] = [
  { value: 'python', label: { es: 'Python', en: 'Python' } },
  { value: 'r', label: { es: 'R', en: 'R' } },
  { value: 'sql', label: { es: 'SQL', en: 'SQL' } },
  { value: 'scala', label: { es: 'Scala', en: 'Scala' } },
  { value: 'java', label: { es: 'Java', en: 'Java' } },
  { value: 'rust', label: { es: 'Rust', en: 'Rust' } },
  { value: 'go', label: { es: 'Go', en: 'Go' } },
  { value: 'spark', label: { es: 'Spark', en: 'Spark' } },
  { value: 'kafka', label: { es: 'Kafka', en: 'Kafka' } },
  { value: 'airflow', label: { es: 'Airflow', en: 'Airflow' } },
  { value: 'dbt', label: { es: 'dbt', en: 'dbt' } },
  { value: 'snowflake', label: { es: 'Snowflake', en: 'Snowflake' } },
  { value: 'bigquery', label: { es: 'BigQuery', en: 'BigQuery' } },
  { value: 'tensorflow', label: { es: 'TensorFlow', en: 'TensorFlow' } },
  { value: 'pytorch', label: { es: 'PyTorch', en: 'PyTorch' } },
  { value: 'sklearn', label: { es: 'scikit-learn', en: 'scikit-learn' } },
  { value: 'transformers', label: { es: 'Transformers (HF)', en: 'Transformers (HF)' } },
  { value: 'langchain', label: { es: 'LangChain', en: 'LangChain' } },
  { value: 'aws', label: { es: 'AWS', en: 'AWS' } },
  { value: 'gcp', label: { es: 'GCP', en: 'GCP' } },
  { value: 'azure', label: { es: 'Azure', en: 'Azure' } },
  { value: 'docker', label: { es: 'Docker', en: 'Docker' } },
  { value: 'kubernetes', label: { es: 'Kubernetes', en: 'Kubernetes' } },
  { value: 'terraform', label: { es: 'Terraform', en: 'Terraform' } },
  { value: 'tableau', label: { es: 'Tableau', en: 'Tableau' } },
  { value: 'power-bi', label: { es: 'Power BI', en: 'Power BI' } },
  { value: 'looker', label: { es: 'Looker', en: 'Looker' } },
];

const mentorshipOptions: SurveyQuestion<MentorshipRole>['options'] = [
  { value: 'want-mentor', label: { es: 'Quiero un mentor', en: 'Want a mentor' } },
  { value: 'want-mentee', label: { es: 'Quiero ser mentor', en: 'Want to mentor' } },
  { value: 'both', label: { es: 'Ambos', en: 'Both' } },
  { value: 'neither', label: { es: 'Ninguno', en: 'Neither' } },
];

const openToOpportunitiesOptions: SurveyQuestion<OpenToOpportunities>['options'] = [
  { value: 'actively-looking', label: { es: 'Buscando activamente', en: 'Actively looking' } },
  { value: 'open', label: { es: 'Abierto a propuestas', en: 'Open to opportunities' } },
  { value: 'not-looking', label: { es: 'No estoy buscando', en: 'Not looking' } },
];

const reasonsForJoiningOptions: SurveyQuestion<ReasonForJoining>['options'] = [
  { value: 'networking', label: { es: 'Networking', en: 'Networking' } },
  { value: 'job-opportunities', label: { es: 'Oportunidades laborales', en: 'Job opportunities' } },
  { value: 'stay-updated', label: { es: 'Mantenerme actualizado', en: 'Stay updated' } },
  { value: 'learning', label: { es: 'Aprender', en: 'Learning' } },
  { value: 'mentorship', label: { es: 'Mentoría', en: 'Mentorship' } },
  { value: 'speaking', label: { es: 'Compartir / dar charlas', en: 'Speaking / share' } },
  { value: 'recruiting', label: { es: 'Reclutar talento', en: 'Recruiting' } },
  { value: 'community-building', label: { es: 'Construir comunidad', en: 'Community building' } },
];

const heardAboutUsOptions: SurveyQuestion<HeardAboutUsFrom>['options'] = [
  { value: 'unam', label: { es: 'UNAM (profesor, compañero)', en: 'UNAM (professor, classmate)' } },
  { value: 'friend', label: { es: 'Amigo / colega', en: 'Friend / colleague' } },
  { value: 'event', label: { es: 'Evento', en: 'Event' } },
  { value: 'social', label: { es: 'Redes sociales', en: 'Social media' } },
  { value: 'search', label: { es: 'Búsqueda', en: 'Search' } },
  { value: 'other', label: { es: 'Otro', en: 'Other' } },
];

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'industry',
    type: 'single',
    category: 'career',
    label: { es: 'Industria actual', en: 'Current industry' },
    options: industryOptions as SurveyQuestion['options'],
  },
  {
    id: 'jobFunction',
    type: 'single',
    category: 'career',
    label: { es: 'Rol profesional', en: 'Job function' },
    options: jobFunctionOptions as SurveyQuestion['options'],
  },
  {
    id: 'seniority',
    type: 'single',
    category: 'career',
    label: { es: 'Nivel de experiencia', en: 'Seniority level' },
    options: seniorityOptions as SurveyQuestion['options'],
  },
  {
    id: 'workMode',
    type: 'single',
    category: 'career',
    label: { es: 'Modalidad de trabajo', en: 'Work mode' },
    options: workModeOptions as SurveyQuestion['options'],
  },
  {
    id: 'yearsOfExperience',
    type: 'number',
    category: 'career',
    label: { es: 'Años de experiencia', en: 'Years of experience' },
  },
  {
    id: 'countryCode',
    type: 'text',
    category: 'demographic',
    label: { es: 'País (código ISO, ej. MX)', en: 'Country (ISO code, e.g. MX)' },
  },
  {
    id: 'city',
    type: 'text',
    category: 'demographic',
    label: { es: 'Ciudad', en: 'City' },
  },
  {
    id: 'areasOfInterest',
    type: 'multi',
    category: 'interests',
    label: { es: 'Áreas de interés', en: 'Areas of interest' },
    options: areasOfInterestOptions as SurveyQuestion['options'],
  },
  {
    id: 'techStack',
    type: 'multi',
    category: 'interests',
    label: { es: 'Tecnologías que utilizas', en: 'Technologies you use' },
    options: techToolOptions as SurveyQuestion['options'],
  },
  {
    id: 'mentorshipRole',
    type: 'single',
    category: 'community',
    label: { es: '¿Mentoría?', en: 'Mentorship?' },
    options: mentorshipOptions as SurveyQuestion['options'],
  },
  {
    id: 'openToOpportunities',
    type: 'single',
    category: 'community',
    label: { es: '¿Buscando nuevas oportunidades?', en: 'Open to opportunities?' },
    options: openToOpportunitiesOptions as SurveyQuestion['options'],
  },
  {
    id: 'reasonsForJoining',
    type: 'multi',
    category: 'community',
    label: { es: '¿Por qué te uniste a SECiD?', en: 'Why did you join SECiD?' },
    options: reasonsForJoiningOptions as SurveyQuestion['options'],
  },
  {
    id: 'heardAboutUsFrom',
    type: 'single',
    category: 'community',
    label: { es: '¿Cómo nos conociste?', en: 'How did you hear about us?' },
    options: heardAboutUsOptions as SurveyQuestion['options'],
  },
];

/**
 * Subset shown in the (optional) signup wizard step — the most-impactful
 * 5 questions. Members can fill the rest later in profile editor.
 */
export const SIGNUP_QUESTION_IDS = [
  'industry',
  'jobFunction',
  'seniority',
  'areasOfInterest',
  'mentorshipRole',
] as const;
