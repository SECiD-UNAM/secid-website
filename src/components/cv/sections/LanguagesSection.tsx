/**
 * Languages section with proficiency badges.
 * Badge colors derive from the language proficiency keyword (native,
 * fluent, advanced, intermediate, basic) — see `getLevelBadgeStyle`.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { getLevelBadgeStyle } from '@/lib/cv/formatters';
import { SectionHeading } from './_primitives';

export function CvLanguagesSection({
  languages,
  labels,
}: {
  languages: CVData['languages'];
  labels: Labels;
}) {
  if (languages.length === 0) return null;

  return (
    <section id="languages" className="scroll-mt-8">
      <SectionHeading>{labels.languages}</SectionHeading>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {languages.map((language, i) => (
          <div
            key={`${language.name}-${i}`}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {language.name}
              </h3>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={getLevelBadgeStyle(language.proficiency)}
              >
                {language.proficiency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
