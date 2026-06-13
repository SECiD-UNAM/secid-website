/**
 * Floating button that downloads the member's contact info as a vCard.
 * The serialization is pure (see `src/lib/cv/vcard.ts`); this component
 * only owns the download trigger and styling.
 */
import React from 'react';
import type { CVData } from '@/types/cv';
import { getLabels } from '@/lib/cv/labels';
import { generateVCard } from '@/lib/cv/vcard';

export function VCardDownloadButton({
  personal,
  lang,
}: {
  personal: CVData['personal'];
  lang: 'es' | 'en';
}) {
  const labels = getLabels(lang);

  const handleDownload = () => {
    const vcf = generateVCard(personal);
    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${personal.name.full.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      title={labels.downloadVcard}
      aria-label={labels.downloadVcard}
      className="fixed bottom-6 left-[276px] z-40 hidden items-center gap-2 lg:flex"
      style={{
        background: '#10b981',
        color: '#ffffff',
        border: 'none',
        borderRadius: '9999px',
        padding: '0.625rem 1.25rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgb(16 185 129 / 0.3)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#059669';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgb(16 185 129 / 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#10b981';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgb(16 185 129 / 0.3)';
      }}
    >
      <span role="img" aria-hidden="true">
        &#x1F4C7;
      </span>
      {labels.downloadVcard}
    </button>
  );
}
