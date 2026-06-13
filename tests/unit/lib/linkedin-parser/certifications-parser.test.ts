/**
 * Tests for LinkedIn certifications section parser.
 *
 * TC-linkedin-cert-001 through TC-linkedin-cert-004
 * Verifies: AC-1 (parsing cert with issuer and date), AC-2 (multiple certs),
 *           AC-3 (bilingual date strings), AC-4 (empty input guard)
 */
import { describe, it, expect } from 'vitest';
import { parseLinkedInCertifications } from '@/lib/linkedin-parser/certifications-parser';

describe('parseLinkedInCertifications', () => {
  it('TC-linkedin-cert-001: parses certification with issuer and date', () => {
    // Arrange
    const text = `AWS Solutions Architect\nAmazon Web Services (AWS)\nIssued Jan 2023`;

    // Act
    const result = parseLinkedInCertifications(text);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services (AWS)',
      issuedDate: 'Jan 2023',
    });
  });

  it('TC-linkedin-cert-002: parses multiple certifications', () => {
    // Arrange
    const text = `AWS SA\nAWS\nIssued Jan 2023\n\nGCP DE\nGoogle\nIssued Mar 2022`;

    // Act
    const result = parseLinkedInCertifications(text);

    // Assert
    expect(result).toHaveLength(2);
  });

  it('TC-linkedin-cert-003: handles Spanish date (bilingual issued line)', () => {
    // Arrange
    const text = `Cert\nCoursera\nIssued Ene 2023`;

    // Act
    const result = parseLinkedInCertifications(text);

    // Assert
    expect(result[0].issuedDate).toBe('Ene 2023');
  });

  it('TC-linkedin-cert-004: returns empty array for empty input', () => {
    expect(parseLinkedInCertifications('')).toEqual([]);
  });
});
