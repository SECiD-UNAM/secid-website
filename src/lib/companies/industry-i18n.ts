/**
 * Industry name translations (stored in Spanish in Firestore).
 */

const INDUSTRY_EN: Record<string, string> = {
  'Tecnología': 'Technology',
  'Finanzas': 'Finance',
  'Fintech': 'Fintech',
  'Retail': 'Retail',
  'Consultoría': 'Consulting',
  'Gobierno': 'Government',
  'Entretenimiento': 'Entertainment',
  'Consumo': 'Consumer Goods',
  'Educación': 'Education',
  'Fitness': 'Fitness',
  'Datos': 'Data',
  'Salud': 'Healthcare',
  'Conglomerado': 'Conglomerate',
  'Otros': 'Other',
};

export function translateIndustry(
  industry: string,
  lang: 'es' | 'en'
): string {
  if (lang === 'es') return industry;
  return INDUSTRY_EN[industry] || industry;
}
