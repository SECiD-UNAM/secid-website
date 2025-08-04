import { getTranslation } from '@/lib/translations';

import type { Language } from '@/types';

export function useTranslations(lang: Language = 'es') {
  return getTranslation(lang);
}
