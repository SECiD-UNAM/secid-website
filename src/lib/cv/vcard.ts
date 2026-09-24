/**
 * vCard (RFC 6350 v3.0) generation for CV contact export.
 *
 * Pure string builder. No DOM, no React. The download trigger lives in
 * the UI layer (see `VCardDownloadButton`).
 */

import type { CVData } from '@/types/cv';

export function generateVCard(personal: CVData['personal']): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${personal.name.full}`,
    `N:${personal.name.last};${personal.name.first};;;`,
  ];

  if (personal.title) {
    lines.push(`TITLE:${personal.title}`);
  }
  if (personal.location) {
    lines.push(`ADR;TYPE=WORK:;;${personal.location};;;;`);
  }
  if (personal.contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${personal.contact.email}`);
  }
  if (personal.contact.linkedin) {
    lines.push(`URL;TYPE=LinkedIn:${personal.contact.linkedin}`);
  }
  if (personal.contact.github) {
    lines.push(`URL;TYPE=GitHub:${personal.contact.github}`);
  }
  if (personal.contact.portfolio) {
    lines.push(`URL;TYPE=Portfolio:${personal.contact.portfolio}`);
  }
  if (personal.summary) {
    lines.push(`NOTE:${personal.summary.replace(/\n/g, '\\n')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}
