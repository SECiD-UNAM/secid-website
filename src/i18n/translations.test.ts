import { describe, it, expect } from 'vitest';
import {
  getTranslations,
  getLanguageFromUrl,
  getAlternateUrls,
} from './translations';

describe('Translations', () => {
  describe('getTranslations', () => {
    it('returns Spanish translations for "es" language', () => {
      const translations = getTranslations('es');
      expect(translations.site.name).toBe('SECiD');
      expect(translations.nav.home).toBe('Inicio');
      expect(translations.auth.signIn.title).toBe('Iniciar sesión');
    });

    it('returns English translations for "en" language', () => {
      const translations = getTranslations('en');
      expect(translations.site.name).toBe('SECiD');
      expect(translations.nav.home).toBe('Home');
      expect(translations.auth.signIn.title).toBe('Sign In');
    });

    it('defaults to Spanish for invalid language', () => {
      const translations = getTranslations('fr' as any);
      expect(translations.nav.home).toBe('Inicio');
    });

    it('has complete translations for both languages', () => {
      const esTranslations = getTranslations('es');
      const enTranslations = getTranslations('en');

      // Check that all keys exist in both languages
      const checkKeys = (obj1: any, obj2: any, path = '') => {
        Object.keys(obj1).forEach((key) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof obj1[key] === 'object' && !Array.isArray(obj1[key])) {
            expect(
              obj2[key],
              `Missing key in EN: ${currentPath}`
            ).toBeDefined();
            checkKeys(obj1[key], obj2[key], currentPath);
          } else {
            expect(
              obj2[key],
              `Missing key in EN: ${currentPath}`
            ).toBeDefined();
          }
        });
      };

      checkKeys(esTranslations, enTranslations);
      checkKeys(enTranslations, esTranslations);
    });
  });

  describe('getLanguageFromUrl', () => {
    it('detects Spanish language from URL', () => {
      const url = new URL('https://secid.mx/es/about');
      expect(getLanguageFromUrl(url)).toBe('es');
    });

    it('detects English language from URL', () => {
      const url = new URL('https://secid.mx/en/about');
      expect(getLanguageFromUrl(url)).toBe('en');
    });

    it('defaults to Spanish for root URL', () => {
      const url = new URL('https://secid.mx/');
      expect(getLanguageFromUrl(url)).toBe('es');
    });

    it('defaults to Spanish for URLs without language prefix', () => {
      const url = new URL('https://secid.mx/about');
      expect(getLanguageFromUrl(url)).toBe('es');
    });
  });

  describe('getAlternateUrls', () => {
    it('generates alternate URLs for Spanish page', () => {
      const url = new URL('https://secid.mx/es/about');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/about');
      expect(alternates.en).toBe('https://secid.mx/en/about');
    });

    it('generates alternate URLs for English page', () => {
      const url = new URL('https://secid.mx/en/contact');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/contact');
      expect(alternates.en).toBe('https://secid.mx/en/contact');
    });

    it('handles root URL correctly', () => {
      const url = new URL('https://secid.mx/');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/');
      expect(alternates.en).toBe('https://secid.mx/en/');
    });

    it('handles URLs without language prefix', () => {
      const url = new URL('https://secid.mx/about');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/about');
      expect(alternates.en).toBe('https://secid.mx/en/about');
    });

    it('preserves query parameters', () => {
      const url = new URL('https://secid.mx/es/search?q=test&page=2');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/search?q=test&page=2');
      expect(alternates.en).toBe('https://secid.mx/en/search?q=test&page=2');
    });

    it('preserves hash fragments', () => {
      const url = new URL('https://secid.mx/es/docs#section');
      const alternates = getAlternateUrls(url);

      expect(alternates.es).toBe('https://secid.mx/es/docs#section');
      expect(alternates.en).toBe('https://secid.mx/en/docs#section');
    });
  });

  describe('Translation completeness', () => {
    it('has all required auth error messages', () => {
      const languages = ['es', 'en'] as const;
      const requiredErrors = [
        'auth/user-not-found',
        'auth/wrong-password',
        'auth/email-already-in-use',
        'auth/weak-password',
        'auth/invalid-email',
        'default',
      ];

      languages.forEach((lang) => {
        const translations = getTranslations(lang);
        requiredErrors.forEach((error) => {
          expect(
            translations.auth.errors[error],
            `Missing error translation for ${error} in ${lang}`
          ).toBeDefined();
        });
      });
    });

    it('has consistent translation keys structure', () => {
      const esKeys = Object.keys(getTranslations('es'));
      const enKeys = Object.keys(getTranslations('en'));

      expect(esKeys).toEqual(enKeys);
    });
  });
});
