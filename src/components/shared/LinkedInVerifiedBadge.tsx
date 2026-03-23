import React from 'react';

interface LinkedInVerifiedBadgeProps {
  lang?: 'es' | 'en';
  size?: 'sm' | 'md';
  className?: string;
}

export const LinkedInVerifiedBadge: React.FC<LinkedInVerifiedBadgeProps> = ({
  lang = 'es',
  size = 'sm',
  className = '',
}) => {
  const tooltip = lang === 'es' ? 'Verificado en LinkedIn' : 'Verified on LinkedIn';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      <svg
        className={`${iconSize} text-[#0A66C2]`}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      <svg
        className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} -ml-1 text-green-500`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      <span className="sr-only">{tooltip}</span>
    </span>
  );
};

export default LinkedInVerifiedBadge;
