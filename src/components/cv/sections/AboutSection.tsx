/**
 * About / hero section: name, title, location, summary, social links,
 * and profile photo. First section rendered on the CV page.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import {
  LinkedInIcon,
  GitHubIcon,
  TwitterIcon,
  EmailIcon,
  PortfolioIcon,
} from './_icons';
import { SocialButton } from './_primitives';

export function CvAboutSection({
  personal,
}: {
  personal: CVData['personal'];
}) {
  const { name, title, location, contact, profileImage, summary } = personal;

  return (
    <section id="about" className="scroll-mt-8">
      <div className="flex flex-col-reverse gap-8 md:flex-row md:items-start">
        {/* Text column */}
        <div className="flex-1">
          <h1
            className="text-5xl font-bold uppercase leading-tight tracking-wide md:text-6xl"
            style={{ color: 'var(--color-text)' }}
          >
            {name.full}
          </h1>

          {(title || location) && (
            <div className="mb-6 mt-3 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
              <span
                className="text-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {[title, location].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}

          {summary && (
            <p
              className="leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {summary}
            </p>
          )}

          {/* Social icons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {contact.linkedin && (
              <SocialButton href={contact.linkedin} label="LinkedIn">
                <LinkedInIcon />
              </SocialButton>
            )}
            {contact.github && (
              <SocialButton href={contact.github} label="GitHub">
                <GitHubIcon />
              </SocialButton>
            )}
            {contact.twitter && (
              <SocialButton href={contact.twitter} label="Twitter">
                <TwitterIcon />
              </SocialButton>
            )}
            {contact.email && (
              <SocialButton href={`mailto:${contact.email}`} label="Email">
                <EmailIcon />
              </SocialButton>
            )}
            {contact.portfolio && (
              <SocialButton href={contact.portfolio} label="Portfolio">
                <PortfolioIcon />
              </SocialButton>
            )}
          </div>
        </div>

        {/* Profile image */}
        <div className="flex flex-shrink-0 justify-center md:justify-end">
          {profileImage ? (
            <img
              src={profileImage}
              alt={name.full}
              className="h-36 w-36 rounded-full border-4 object-cover shadow-xl md:h-44 md:w-44"
              style={{ borderColor: 'var(--color-surface-light)' }}
            />
          ) : (
            <div
              className="flex h-36 w-36 items-center justify-center rounded-full text-4xl font-bold shadow-xl md:h-44 md:w-44 md:text-5xl"
              style={{
                background: 'var(--color-surface-light)',
                color: 'var(--color-primary)',
                border: '4px solid var(--color-border)',
              }}
            >
              {`${name.first.charAt(0)}${name.last.charAt(0)}`.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
