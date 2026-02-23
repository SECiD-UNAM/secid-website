import { getTranslation, getTranslationValue } from '@/lib/translations';

import type { Language } from '@/types';

/**
 * A callable translation function that also has translation properties
 */
export type TranslationFunction = ((key: string, fallback?: string) => string) &
  ReturnType<typeof getTranslation>;

/**
 * The return type of useTranslations - supports both patterns:
 * 1. `const { t, language } = useTranslations()` - destructure t and language
 * 2. `const t = useTranslations()` - use t.common.key directly
 */
export type TranslationsResult = {
  t: TranslationFunction;
  language: Language;
} & ReturnType<typeof getTranslation>;

/**
 * Hook to get translations for a specific language
 * Supports multiple usage patterns:
 * - `const { t } = useTranslations()` then `t('key', 'fallback')` or `t.common.save`
 * - `const t = useTranslations()` then `t.common.save`
 */
export function useTranslations(lang: Language = 'es'): TranslationsResult {
  const translations = getTranslation(lang);

  // Create a callable function that also has the translation object properties
  const t = ((key: string, fallback?: string) => {
    // Use the getTranslationValue helper to resolve dot-notation keys
    const value = getTranslationValue(lang, key);
    // If the value equals the key (not found), return fallback or key
    return value === key ? (fallback ?? key) : value;
  }) as TranslationFunction;

  // Copy all properties from the translations object to the function
  Object.assign(t, translations);

  // Return object with t, language, AND all translation properties spread at top level
  // This supports both: const { t } = useTranslations() AND const t = useTranslations(); t.common.save
  return Object.assign({}, translations, { t, language: lang }) as TranslationsResult;
}
