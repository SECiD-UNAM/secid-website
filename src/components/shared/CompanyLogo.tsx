import React, { useState } from 'react';

/* ------------------------------------------------------------------ */
/* Color palette & hash                                                */
/* ------------------------------------------------------------------ */

const COMPANY_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#84CC16',
  '#E11D48',
  '#0EA5E9',
  '#A855F7',
  '#22C55E',
  '#D946EF',
] as const;

/** Deterministic color from a company name. Exported for reuse. */
export function getCompanyColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COMPANY_COLORS[Math.abs(hash) % COMPANY_COLORS.length] ?? '#3B82F6';
}

/* ------------------------------------------------------------------ */
/* Size mapping                                                        */
/* ------------------------------------------------------------------ */

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
} as const;

const ROUNDED_CLASSES = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
} as const;

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface CompanyLogoProps {
  company: { id?: string; name: string; logoUrl?: string };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  company,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const logoSrc = company.logoUrl;
  const hasLogo = !!logoSrc && !imageError;
  const sizeClass = SIZE_CLASSES[size];
  const roundedClass = ROUNDED_CLASSES[size];
  const initial = company.name.charAt(0).toUpperCase();
  const bgColor = getCompanyColor(company.name);

  if (hasLogo) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} shrink-0 overflow-hidden ${className}`.trim()}
      >
        <img
          src={logoSrc}
          alt={company.name}
          loading="lazy"
          onError={() => setImageError(true)}
          className={`h-full w-full object-contain ${roundedClass}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} flex shrink-0 items-center justify-center font-bold text-white ${className}`.trim()}
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
};

export default CompanyLogo;
