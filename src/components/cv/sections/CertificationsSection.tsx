/**
 * Certifications list with optional credential URLs.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import { SectionHeading } from './_primitives';
import { ExternalLinkIcon } from './_icons';

export function CvCertificationsSection({
  certifications,
  labels,
}: {
  certifications: CVData['certifications'];
  labels: Labels;
}) {
  if (certifications.length === 0) return null;

  return (
    <section id="certifications" className="scroll-mt-8">
      <SectionHeading>{labels.certifications}</SectionHeading>
      <div>
        {certifications.map((cert, i) => {
          const isLast = i === certifications.length - 1;
          return (
            <div
              key={`${cert.issuer}-${cert.name}-${i}`}
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
                    {cert.name}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {cert.issuer}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {cert.date}
                </span>
              </div>
              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <ExternalLinkIcon />
                  {labels.viewCredential}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
