/**
 * Awards / achievements section. Caller is expected to pass the
 * non-null awards array (CVData.awards is optional).
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { SectionHeading } from './_primitives';

export function CvAwardsSection({
  awards,
  labels,
}: {
  awards: NonNullable<CVData['awards']>;
  labels: Labels;
}) {
  if (awards.length === 0) return null;

  return (
    <section id="awards" className="scroll-mt-8">
      <SectionHeading>{labels.awards}</SectionHeading>
      <div>
        {awards.map((award, i) => {
          const isLast = i === awards.length - 1;
          return (
            <div
              key={`${award.title}-${i}`}
              style={{
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {award.title}
                  </h3>
                  {award.category && (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: 'rgb(245 158 11 / 0.2)',
                        color: '#f59e0b',
                        border: '1px solid rgb(245 158 11 / 0.3)',
                      }}
                    >
                      {award.category}
                    </span>
                  )}
                </div>
                {award.year && (
                  <span
                    className="flex-shrink-0 text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {award.year}
                  </span>
                )}
              </div>
              {award.description && (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {award.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
