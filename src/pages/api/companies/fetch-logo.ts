/**
 * POST /api/companies/fetch-logo
 * Admin-only endpoint to fetch a company logo from Logo.dev (or Google Favicons
 * as fallback), upload it to Firebase Storage, and update the company doc.
 */

import type { APIRoute } from 'astro';
import {
  verifyRequest,
  unauthorizedResponse,
} from '../../../lib/auth/verify-request';
import { db, storage } from '../../../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const USERS_COLLECTION = 'users';
const COMPANIES_COLLECTION = 'companies';

interface FetchLogoRequest {
  domain: string;
  companyId: string;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function isAdmin(userId: string): Promise<boolean> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) return false;
  return userDoc.data().role === 'admin';
}

function validateRequest(
  body: unknown
): { valid: true; data: FetchLogoRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { domain, companyId } = body as Record<string, unknown>;

  if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
    return { valid: false, error: 'Domain is required' };
  }

  if (
    !companyId ||
    typeof companyId !== 'string' ||
    companyId.trim().length === 0
  ) {
    return { valid: false, error: 'Company ID is required' };
  }

  return {
    valid: true,
    data: {
      domain: domain.trim().toLowerCase(),
      companyId: companyId.trim(),
    },
  };
}

async function fetchLogoImage(
  domain: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const logoDevToken =
    import.meta.env.LOGO_DEV_API_TOKEN || process.env.LOGO_DEV_API_TOKEN;

  if (logoDevToken) {
    try {
      const logoDevUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}&format=png`;
      const response = await fetch(logoDevUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        return { buffer, contentType };
      }
    } catch (error) {
      console.warn(
        'Logo.dev fetch failed, falling back to Google Favicons:',
        error
      );
    }
  }

  const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const response = await fetch(googleUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch logo from any source for domain: ${domain}`
    );
  }
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/png';
  return { buffer, contentType };
}

export const POST: APIRoute = async ({ request }) => {
  const auth = verifyRequest(request);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse();
  }

  try {
    const admin = await isAdmin(auth.userId);
    if (!admin) {
      return jsonResponse({ error: 'Admin access required' }, 403);
    }

    const body = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const { domain, companyId } = validation.data;

    const companyDoc = await getDoc(doc(db, COMPANIES_COLLECTION, companyId));
    if (!companyDoc.exists()) {
      return jsonResponse({ error: 'Company not found' }, 404);
    }

    const { buffer, contentType } = await fetchLogoImage(domain);

    const logoRef = ref(storage, `companies/${companyId}/logo.png`);
    await uploadBytes(logoRef, new Uint8Array(buffer), { contentType });
    const logoUrl = await getDownloadURL(logoRef);

    await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), {
      logoUrl,
      updatedAt: serverTimestamp(),
    });

    return jsonResponse({ logoUrl }, 200);
  } catch (error) {
    console.error('Error fetching company logo:', error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch company logo',
      },
      500
    );
  }
};

export const GET: APIRoute = () => {
  return jsonResponse({ error: 'Method not allowed' }, 405);
};
