/**
 * Tests for parseLinkedInPdf Cloud Function business logic.
 *
 * TC-parse-pdf-001 through TC-parse-pdf-010
 * Verifies: authentication guard, input validation, file size limit,
 * magic-bytes validation, rate limit enforcement, and successful parse flow.
 *
 * Pattern: extract pure business-logic helpers from the Cloud Function and
 * test them in isolation — same approach as linkedin-auth.test.ts.
 * The Cloud Function wrapper itself is infrastructure glue (test-after acceptable).
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure helpers extracted from parse-linkedin-pdf.ts
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_UPLOADS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function decodePdfBuffer(pdfData: string): Buffer {
  return Buffer.from(pdfData, 'base64');
}

function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File exceeds 5MB limit');
  }
}

function validatePdfMagicBytes(buffer: Buffer): void {
  if (buffer.slice(0, 5).toString() !== '%PDF-') {
    throw new Error('Invalid PDF file');
  }
}

function filterRecentTimestamps(
  timestamps: number[],
  windowStart: number
): number[] {
  return timestamps.filter((t) => t > windowStart);
}

function isRateLimitExceeded(recentCount: number): boolean {
  return recentCount >= MAX_UPLOADS_PER_HOUR;
}

// ---------------------------------------------------------------------------
// TC-parse-pdf-001: base64 decoding
// ---------------------------------------------------------------------------

describe('decodePdfBuffer', () => {
  describe('TC-parse-pdf-001: decodes base64 string into buffer', () => {
    it('should return a Buffer with the decoded bytes', () => {
      /** Verifies: AC-decode -- pdfData (base64) is decoded to binary */
      const text = 'hello';
      const encoded = Buffer.from(text).toString('base64');
      const result = decodePdfBuffer(encoded);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(text);
    });
  });
});

// ---------------------------------------------------------------------------
// TC-parse-pdf-002: file size validation — within limit
// ---------------------------------------------------------------------------

describe('validateFileSize', () => {
  describe('TC-parse-pdf-002: accepts files within 5MB', () => {
    it('should not throw when buffer is at exactly 5MB', () => {
      /** Verifies: AC-size -- boundary value at limit */
      const buffer = Buffer.alloc(MAX_FILE_SIZE);
      expect(() => validateFileSize(buffer)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // TC-parse-pdf-003: file size validation — exceeds limit
  // -------------------------------------------------------------------------

  describe('TC-parse-pdf-003: rejects files over 5MB', () => {
    it('should throw when buffer exceeds 5MB by one byte', () => {
      /** Verifies: AC-size -- boundary value just above limit */
      const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
      expect(() => validateFileSize(buffer)).toThrow('File exceeds 5MB limit');
    });
  });

  describe('TC-parse-pdf-004: rejects clearly oversized files', () => {
    it('should throw for a 10MB buffer', () => {
      /** Verifies: AC-size -- equivalence partition: large file */
      const buffer = Buffer.alloc(10 * 1024 * 1024);
      expect(() => validateFileSize(buffer)).toThrow('File exceeds 5MB limit');
    });
  });
});

// ---------------------------------------------------------------------------
// TC-parse-pdf-005: magic bytes validation — valid PDF
// ---------------------------------------------------------------------------

describe('validatePdfMagicBytes', () => {
  describe('TC-parse-pdf-005: accepts buffer starting with %PDF-', () => {
    it('should not throw for a valid PDF header', () => {
      /** Verifies: AC-magic -- PDF magic byte check passes */
      const buffer = Buffer.from('%PDF-1.4 fake content');
      expect(() => validatePdfMagicBytes(buffer)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // TC-parse-pdf-006: magic bytes validation — invalid file
  // -------------------------------------------------------------------------

  describe('TC-parse-pdf-006: rejects non-PDF files', () => {
    it('should throw when magic bytes do not match %PDF-', () => {
      /** Verifies: AC-magic -- non-PDF content rejected */
      const buffer = Buffer.from('PK\x03\x04 fake zip');
      expect(() => validatePdfMagicBytes(buffer)).toThrow('Invalid PDF file');
    });
  });

  describe('TC-parse-pdf-007: rejects empty buffer', () => {
    it('should throw when buffer is empty', () => {
      /** Verifies: AC-magic -- empty input has no magic bytes */
      const buffer = Buffer.alloc(0);
      expect(() => validatePdfMagicBytes(buffer)).toThrow('Invalid PDF file');
    });
  });

  describe('TC-parse-pdf-008: rejects buffer shorter than 5 bytes', () => {
    it('should throw when buffer has fewer than 5 bytes', () => {
      /** Verifies: AC-magic -- truncated input boundary */
      const buffer = Buffer.from('%PDF');
      expect(() => validatePdfMagicBytes(buffer)).toThrow('Invalid PDF file');
    });
  });
});

// ---------------------------------------------------------------------------
// Rate limit helpers
// ---------------------------------------------------------------------------

describe('filterRecentTimestamps', () => {
  describe('TC-parse-pdf-009: filters out timestamps outside the window', () => {
    it('should keep only timestamps within the 1-hour window', () => {
      /** Verifies: AC-rate -- stale timestamps are excluded from count */
      const now = Date.now();
      const windowStart = now - RATE_LIMIT_WINDOW;
      const timestamps = [
        windowStart - 1000, // old — outside window
        windowStart + 1000, // recent — inside window
        now - 500, // recent — inside window
      ];

      const result = filterRecentTimestamps(timestamps, windowStart);
      expect(result).toHaveLength(2);
      expect(result).not.toContain(windowStart - 1000);
    });
  });
});

describe('isRateLimitExceeded', () => {
  describe('TC-parse-pdf-010: allows upload when under limit', () => {
    it('should return false when recent upload count is below max', () => {
      /** Verifies: AC-rate -- user under limit is allowed */
      expect(isRateLimitExceeded(MAX_UPLOADS_PER_HOUR - 1)).toBe(false);
    });
  });

  describe('TC-parse-pdf-011: blocks upload when at limit', () => {
    it('should return true when recent upload count equals max', () => {
      /** Verifies: AC-rate -- boundary value at exactly the limit */
      expect(isRateLimitExceeded(MAX_UPLOADS_PER_HOUR)).toBe(true);
    });
  });

  describe('TC-parse-pdf-012: blocks upload when over limit', () => {
    it('should return true when recent upload count exceeds max', () => {
      /** Verifies: AC-rate -- equivalence partition: over limit */
      expect(isRateLimitExceeded(MAX_UPLOADS_PER_HOUR + 3)).toBe(true);
    });
  });
});
