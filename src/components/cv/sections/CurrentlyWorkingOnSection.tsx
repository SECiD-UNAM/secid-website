/**
 * "Currently Working On" section combining ongoing education and
 * active highlighted projects. Caller passes the already-non-null
 * payload to keep the component focused on rendering.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { SectionHeading, SkillPill } from './_primitives';

export function CvCurrentlyWorkingOnSection({
  data,
  labels,
}: {
  data: NonNullable<CVData['currentlyWorkingOn']>;
  labels: Labels;
}) {
  return (
    <section id="currentlyWorkingOn" className="scroll-mt-8">
      <SectionHeading>{labels.currentlyWorkingOn}</SectionHeading>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {data.education && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="Education">
                &#x1F393;
              </span>
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-primary)' }}
              >
                {labels.currentEducation}
              </h3>
            </div>
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {data.education.degree}
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {data.education.institution}
            </p>
            {data.education.expectedCompletion && (
              <p
                className="mt-2 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {data.education.expectedCompletion}
              </p>
            )}
          </div>
        )}

        {data.activeProjects && data.activeProjects.length > 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="Projects">
                &#x1F680;
              </span>
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: 'var(--color-primary)' }}
              >
                {labels.activeProjects}
              </h3>
            </div>
            <div className="space-y-3">
              {data.activeProjects.map((project) => (
                <div key={project.title}>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {project.title}
                  </p>
                  <p
                    className="mt-0.5 text-xs leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {project.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {project.technologies.map((tech) => (
                      <SkillPill key={tech} label={tech} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
