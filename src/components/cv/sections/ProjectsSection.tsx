/**
 * Projects grid section with category, featured, technologies, and
 * optional GitHub / live demo links.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { SectionHeading } from './_primitives';
import { StarIcon, GitHubIcon, ExternalLinkIcon } from './_icons';

export function CvProjectsSection({
  projects,
  labels,
}: {
  projects: CVData['projects'];
  labels: Labels;
}) {
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="scroll-mt-8">
      <SectionHeading>{labels.projects}</SectionHeading>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {projects.map((project, i) => (
          <div
            key={`${project.title}-${i}`}
            className="flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {project.title}
              </h3>
              <div className="flex flex-shrink-0 items-center gap-2">
                {project.featured && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'rgb(245 158 11 / 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgb(245 158 11 / 0.3)',
                    }}
                  >
                    <StarIcon />
                    {labels.featured}
                  </span>
                )}
                {project.category && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'rgb(246 84 37 / 0.15)',
                      color: 'var(--color-primary)',
                      border: '1px solid rgb(246 84 37 / 0.3)',
                    }}
                  >
                    {project.category}
                  </span>
                )}
              </div>
            </div>

            <p
              className="mb-3 flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {project.description}
            </p>

            {project.technologies.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
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

            <div className="flex items-center gap-3">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <GitHubIcon />
                  GitHub
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <ExternalLinkIcon />
                  Live
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
