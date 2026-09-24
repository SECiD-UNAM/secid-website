import { translations } from '../i18n/translations';

/**
 * Type-safe translation system for strict TypeScript
 * Handles dynamic language access without violating noUncheckedIndexedAccess
 */

import type { Language } from '../types';

/**
 * Get translations for a specific language with type safety
 * @param language - The language code ('en' or 'es')
 * @returns The translation object for the specified language
 */
export function getTranslation(language: Language): typeof translations.en {
  // Explicitly handle both supported languages
  if (language === 'es') {
    return translations.es;
  }
  // Default to English for any other value
  return translations.en;
}

/**
 * Type guard to check if a key exists in translations
 * @param key - The key to check
 * @returns True if the key is valid
 */
export function isValidTranslationKey(
  key: string
): key is keyof typeof translations.en {
  return key in translations.en;
}

/**
 * Get a specific translation value with fallback
 * @param language - The language code
 * @param path - Dot-notation path to the translation (e.g., 'common.save')
 * @returns The translation string or the path if not found
 */
export function getTranslationValue(language: Language, path: string): string {
  const t = getTranslation(language);
  const keys = path.split('.');

  let current: any = t;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Return the path as fallback
    }
  }

  return typeof current === 'string' ? current : path;
}

/**
 * Safe access to translation properties
 * @param obj - The object to access
 * @param key - The property key
 * @returns The property value or undefined
 */
export function safeTranslationAccess<T extends Record<string, any>>(
  obj: T,
  key: string
): T[keyof T] | undefined {
  if (key in obj) {
    return obj[key as keyof T];
  }
  return undefined;
}

/**
 * Get nested translation object with type safety
 * @param language - The language code
 * @param section - The section of translations (e.g., 'forum', 'admin')
 * @returns The section object or empty object
 */
export function getTranslationSection<K extends keyof typeof translations.en>(
  language: Language,
  section: K
): (typeof translations.en)[K] {
  const t = getTranslation(language);
  return t[section];
}

// Re-export the original translations for backward compatibility
export { translations };
