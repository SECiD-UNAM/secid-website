/**
 * Education history timeline section.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { formatDateForDisplay } from '@/lib/cv/formatters';
import { SectionHeading } from './_primitives';

export function CvEducationSection({
  education,
  labels,
}: {
  education: CVData['education'];
  labels: Labels;
}) {
  if (education.length === 0) return null;

  return (
    <section id="education" className="scroll-mt-8">
      <SectionHeading>{labels.education}</SectionHeading>
      <div>
        {education.map((edu, i) => {
          const isLast = i === education.length - 1;
          return (
            <div
              key={`${edu.institution}-${edu.degree}-${i}`}
              style={{
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {edu.degree}
                  </h3>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {edu.institution}
                  </p>
                  {edu.fieldOfStudy && (
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {edu.fieldOfStudy}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className="whitespace-nowrap text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {edu.startDate} &ndash; {edu.endDate || labels.current}
                  </span>
                  {edu.current && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: 'rgb(16 185 129 / 0.2)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgb(16 185 129 / 0.3)',
                      }}
                    >
                      {labels.current}
                    </span>
                  )}
                </div>
              </div>

              {edu.gpa != null && (
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span
                    className="font-medium"
                    style={{ color: 'var(--color-text)' }}
                  >
                    GPA:
                  </span>{' '}
                  {edu.gpa}
                </p>
              )}

              {edu.description && (
                <ul className="mt-3 space-y-2">
                  <li
                    className="flex items-start gap-3 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span
                      className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                      style={{ background: 'var(--color-border)' }}
                    />
                    <span>{edu.description}</span>
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
