/**
 * Skills section with smart category grouping.
 * Categorisation logic lives in `src/lib/cv/formatters.ts`.
 */
import React from 'react';
import type { Labels } from '@/lib/cv/labels';
import { categorizeSkills } from '@/lib/cv/formatters';
import { SectionHeading, SkillPill } from './_primitives';

export function CvSkillsSection({
  skills,
  labels,
  lang,
}: {
  skills: string[];
  labels: Labels;
  lang: 'es' | 'en';
}) {
  if (skills.length === 0) return null;

  const groups = categorizeSkills(skills, lang);

  return (
    <section id="skills" className="scroll-mt-8">
      <SectionHeading>{labels.skills}</SectionHeading>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.label}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <h3
              className="mb-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-primary)' }}
            >
              {group.label}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((skill) => (
                <SkillPill key={skill} label={skill} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
