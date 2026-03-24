// @ts-nocheck
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import pdf from "pdf-parse";

const db = getFirestore();
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_UPLOADS_PER_HOUR = 5;

function decodePdfBuffer(pdfData: string): Buffer {
  return Buffer.from(pdfData, "base64");
}

function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new HttpsError("invalid-argument", "File exceeds 5MB limit");
  }
}

function validatePdfMagicBytes(buffer: Buffer): void {
  if (buffer.slice(0, 5).toString() !== "%PDF-") {
    throw new HttpsError("invalid-argument", "Invalid PDF file");
  }
}

function filterRecentTimestamps(
  timestamps: number[],
  windowStart: number,
): number[] {
  return timestamps.filter((t) => t > windowStart);
}

function isRateLimitExceeded(recentCount: number): boolean {
  return recentCount >= MAX_UPLOADS_PER_HOUR;
}

export const parseLinkedInPdf = onCall(
  { cors: true, memory: "256MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated");
    }

    const { pdfData } = request.data as { pdfData?: unknown };
    if (!pdfData || typeof pdfData !== "string") {
      throw new HttpsError("invalid-argument", "pdfData (base64) is required");
    }

    const uid = request.auth.uid;

    // Rate limiting: clean up stale timestamps, then enforce the window limit
    const rateRef = db.collection("rate_limits").doc(`pdf_parse_${uid}`);
    const rateDoc = await rateRef.get();
    const windowStart = Date.now() - RATE_LIMIT_WINDOW;

    if (rateDoc.exists) {
      const data = rateDoc.data();
      const recentUploads = filterRecentTimestamps(
        data?.timestamps ?? [],
        windowStart,
      );
      await rateRef.set({ timestamps: recentUploads });

      if (isRateLimitExceeded(recentUploads.length)) {
        throw new HttpsError(
          "resource-exhausted",
          "Rate limit exceeded. Try again later.",
        );
      }
    }

    const buffer = decodePdfBuffer(pdfData);
    validateFileSize(buffer);
    validatePdfMagicBytes(buffer);

    try {
      const parsed = await pdf(buffer);

      await rateRef.set(
        { timestamps: FieldValue.arrayUnion(Date.now()) },
        { merge: true },
      );

      return { text: parsed.text, pageCount: parsed.numpages };
    } catch (error) {
      console.error(`PDF parse error for ${uid}:`, error);
      throw new HttpsError("internal", "Failed to parse PDF");
    }
  },
);
