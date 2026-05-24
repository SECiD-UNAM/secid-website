/**
 * Professional experience timeline section.
 * Caller should not mount this when `experience` is empty;
 * the component also guards against an empty array as a safety net.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { SectionHeading } from './_primitives';

export function CvExperienceSection({
  experience,
  labels,
}: {
  experience: CVData['experience'];
  labels: Labels;
}) {
  if (experience.length === 0) return null;

  return (
    <section id="experience" className="scroll-mt-8">
      <SectionHeading>{labels.experience}</SectionHeading>
      <div>
        {experience.map((exp, i) => {
          const isLast = i === experience.length - 1;
          return (
            <div
              key={`${exp.company}-${exp.title}-${i}`}
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
                    {exp.title}
                  </h3>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {exp.company}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span
                    className="whitespace-nowrap text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {exp.startDate} &ndash; {exp.endDate || labels.current}
                  </span>
                  {exp.current && (
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

              {exp.description && (
                <ul className="mt-3 space-y-2">
                  <li
                    className="flex items-start gap-3 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span
                      className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full"
                      style={{ background: 'var(--color-border)' }}
                    />
                    <span>{exp.description}</span>
                  </li>
                </ul>
              )}

              {exp.technologies && exp.technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {exp.technologies.map((tech) => (
                    <span
                      key={tech}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-surface-light)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
