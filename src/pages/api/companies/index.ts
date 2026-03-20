/**
 * POST /api/companies
 * Member company creation endpoint.
 * Verified members can create company entries that go into pendingReview state.
 * Rate-limited to 5 creations per 24-hour window per user.
 */

import type { APIRoute } from 'astro';
import {
  verifyRequest,
  unauthorizedResponse,
} from '../../../lib/auth/verify-request';
import { db } from '../../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const COMPANIES_COLLECTION = 'companies';
const USERS_COLLECTION = 'users';
const MAX_CREATIONS_PER_DAY = 5;
const NAME_MAX_LENGTH = 100;

interface CompanyCreateRequest {
  name: string;
  domain: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function isVerifiedMember(userId: string): Promise<boolean> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) return false;
  const data = userDoc.data();
  return (
    data.role === 'member' &&
    (data.verificationStatus === 'approved' || data.verified === true)
  );
}

async function getRecentCreationCount(userId: string): Promise<number> {
  const twentyFourHoursAgo = Timestamp.fromDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const recentQuery = query(
    collection(db, COMPANIES_COLLECTION),
    where('createdBy', '==', userId),
    where('createdAt', '>=', twentyFourHoursAgo)
  );
  const snapshot = await getDocs(recentQuery);
  return snapshot.size;
}

function validateRequest(
  body: unknown
):
  | { valid: true; data: CompanyCreateRequest }
  | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { name, domain } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Company name is required' };
  }

  if (name.trim().length > NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Company name must be ${NAME_MAX_LENGTH} characters or fewer`,
    };
  }

  if (!domain || typeof domain !== 'string' || domain.trim().length === 0) {
    return { valid: false, error: 'Company domain is required' };
  }

  const data: CompanyCreateRequest = {
    name: name.trim(),
    domain: domain.trim().toLowerCase(),
  };

  const optional = body as Record<string, unknown>;
  if (optional.industry && typeof optional.industry === 'string') {
    data.industry = optional.industry.trim();
  }
  if (optional.location && typeof optional.location === 'string') {
    data.location = optional.location.trim();
  }
  if (optional.website && typeof optional.website === 'string') {
    data.website = optional.website.trim();
  }
  if (optional.description && typeof optional.description === 'string') {
    data.description = optional.description.trim();
  }

  return { valid: true, data };
}

export const POST: APIRoute = async ({ request }) => {
  const auth = verifyRequest(request);
  if (!auth.authenticated || !auth.userId) {
    return unauthorizedResponse();
  }

  try {
    const verified = await isVerifiedMember(auth.userId);
    if (!verified) {
      return jsonResponse(
        { error: 'Only verified members can create companies' },
        403
      );
    }

    const recentCount = await getRecentCreationCount(auth.userId);
    if (recentCount >= MAX_CREATIONS_PER_DAY) {
      return jsonResponse(
        {
          error:
            'Rate limit exceeded. Maximum 5 company submissions per 24 hours.',
        },
        429
      );
    }

    const body = await request.json();
    const validation = validateRequest(body);
    if (!validation.valid) {
      return jsonResponse({ error: validation.error }, 400);
    }

    const { data } = validation;

    const docRef = doc(collection(db, COMPANIES_COLLECTION));
    await setDoc(docRef, {
      name: data.name,
      domain: data.domain,
      ...(data.industry && { industry: data.industry }),
      ...(data.location && { location: data.location }),
      ...(data.website && { website: data.website }),
      ...(data.description && { description: data.description }),
      memberCount: 0,
      createdBy: auth.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      pendingReview: true,
    });

    return jsonResponse({ companyId: docRef.id }, 201);
  } catch (error) {
    console.error('Error creating company:', error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create company',
      },
      500
    );
  }
};

export const GET: APIRoute = () => {
  return jsonResponse({ error: 'Method not allowed' }, 405);
};
