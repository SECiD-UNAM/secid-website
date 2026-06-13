import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { ALLOWED_CALLABLE_ORIGINS } from './env';

const db = admin.firestore();

interface CompleteRegistrationData {
  registrationType: 'member' | 'collaborator' | 'recruiter';
  // Member-specific
  numeroCuenta?: string;
  academicLevel?: string;
  campus?: string;
  generation?: string;
  graduationYear?: number;
  verificationDocumentUrl?: string;
  // Recruiter-specific
  companyName?: string;
  companyPosition?: string;
  companyWebsite?: string;
  // Common
  firstName?: string;
  lastName?: string;
}

export const completeRegistration = onCall(
  { cors: ALLOWED_CALLABLE_ORIGINS },
  async (request) => {
    // 1. Validate caller is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = request.auth.uid;
    const data = request.data as CompleteRegistrationData;

    // 2. Validate registrationType
    if (
      !['member', 'collaborator', 'recruiter'].includes(data.registrationType)
    ) {
      throw new HttpsError('invalid-argument', 'Invalid registration type');
    }

    // 3. Process by registration type. The idempotency check happens
    // inside each handler's transaction so the read-check-write is atomic
    // (a non-transactional pre-read could race a concurrent call).
    if (data.registrationType === 'member') {
      return handleMemberRegistration(uid, data);
    } else if (data.registrationType === 'recruiter') {
      return handleRecruiterRegistration(uid, data);
    } else {
      // Collaborator — minimal update
      const userRef = db.collection('users').doc(uid);
      return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(userRef);
        if (isAlreadyCompleted(snap.data(), 'collaborator')) {
          return { success: true, alreadyCompleted: true };
        }
        transaction.update(userRef, {
          registrationType: 'collaborator',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, registrationType: 'collaborator' };
      });
    }
  }
);

/**
 * Idempotency predicate: the user already completed this registration type.
 */
function isAlreadyCompleted(
  userData: Record<string, any> | undefined,
  registrationType: CompleteRegistrationData['registrationType']
): boolean {
  return (
    !!userData &&
    userData.registrationType === registrationType &&
    userData.lifecycle?.status !== 'collaborator'
  );
}

/**
 * Deterministic company doc ID derived from the normalized company name,
 * so concurrent registrations for the same company contend on the SAME
 * document inside the transaction instead of racing a query and creating
 * duplicates.
 */
function companyIdFromName(nameLower: string): string {
  // Strip combining diacritical marks (U+0300–U+036F) left by NFKD so
  // accented names slugify cleanly (e.g. "compañía" → "compania").
  const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
  const slug = nameLower
    .normalize('NFKD')
    .replace(combiningMarks, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  // Names with no slug-safe characters fall back to a stable hash
  return (
    slug || createHash('sha256').update(nameLower).digest('hex').slice(0, 20)
  );
}

async function handleMemberRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.numeroCuenta) {
    throw new HttpsError(
      'invalid-argument',
      'numeroCuenta is required for members'
    );
  }

  if (!/^\d{9}$/.test(data.numeroCuenta)) {
    throw new HttpsError(
      'invalid-argument',
      'numeroCuenta must be exactly 9 digits'
    );
  }

  const userRef = db.collection('users').doc(uid);

  // Atomic read-modify-write: idempotency check, completeness calculation
  // and the update all happen against the same snapshot.
  return db.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(userRef);
    if (isAlreadyCompleted(currentDoc.data(), 'member')) {
      return { success: true, alreadyCompleted: true };
    }

    const updateData: Record<string, any> = {
      registrationType: 'member',
      verificationStatus: 'pending',
      numeroCuenta: data.numeroCuenta,
      academicLevel: data.academicLevel || null,
      campus: data.campus || null,
      generation: data.generation || null,
      'lifecycle.status': 'pending',
      'lifecycle.statusChangedAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.graduationYear) {
      updateData['profile.graduationYear'] = data.graduationYear;
    }
    if (data.verificationDocumentUrl) {
      updateData.verificationDocumentUrl = data.verificationDocumentUrl;
    }
    if (data.firstName) {
      updateData.firstName = data.firstName;
    }
    if (data.lastName) {
      updateData.lastName = data.lastName;
    }

    // Calculate updated profile completeness
    const merged = { ...currentDoc.data(), ...updateData };
    updateData.profileCompleteness = calculateProfileCompleteness(merged);

    transaction.update(userRef, updateData);

    return { success: true, registrationType: 'member' };
  });
}

async function handleRecruiterRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.companyName || !data.companyPosition) {
    throw new HttpsError(
      'invalid-argument',
      'companyName and companyPosition are required for recruiters'
    );
  }

  // Find or create company using a transaction. The company doc ID is
  // deterministic (slug of the normalized name) so concurrent
  // registrations contend on the same doc via transaction.get instead of
  // racing non-transactional queries and creating duplicates.
  const nameLower = data.companyName.toLowerCase().trim();
  const companyRef = db
    .collection('companies')
    .doc(companyIdFromName(nameLower));
  const userRef = db.collection('users').doc(uid);

  const result = await db.runTransaction(async (transaction) => {
    // --- Reads first (Firestore requires all reads before writes) ---
    const companySnap = await transaction.get(companyRef);

    // Legacy companies were created with auto IDs, so also look them up
    // by name (transactional query) before creating at the slug ID.
    let existingCompanyRef: FirebaseFirestore.DocumentReference | null =
      companySnap.exists ? companyRef : null;
    let backfillNameLower = false;
    if (!existingCompanyRef) {
      const companyQuery = await transaction.get(
        db.collection('companies').where('nameLower', '==', nameLower).limit(1)
      );
      if (!companyQuery.empty) {
        existingCompanyRef = companyQuery.docs[0].ref;
      } else {
        // Also try exact name match (for companies without nameLower)
        const exactQuery = await transaction.get(
          db
            .collection('companies')
            .where('name', '==', data.companyName!.trim())
            .limit(1)
        );
        if (!exactQuery.empty) {
          existingCompanyRef = exactQuery.docs[0].ref;
          backfillNameLower = true;
        }
      }
    }

    const currentUserDoc = await transaction.get(userRef);
    const currentData = currentUserDoc.data() || {};

    // Idempotency check — atomic with the writes below
    if (isAlreadyCompleted(currentData, 'recruiter')) {
      return {
        success: true,
        alreadyCompleted: true,
        companyId: String(currentData.profile?.companyId || ''),
      };
    }

    // --- Writes ---
    let companyId: string;
    if (existingCompanyRef) {
      // Link to existing company
      companyId = existingCompanyRef.id;
      transaction.update(existingCompanyRef, {
        ...(backfillNameLower ? { nameLower } : {}),
        memberCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Create new company at the deterministic slug ID
      companyId = companyRef.id;
      transaction.set(companyRef, {
        name: data.companyName!.trim(),
        nameLower,
        website: data.companyWebsite || '',
        createdBy: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        memberCount: 1,
        status: 'active',
      });
    }

    // Calculate profile completeness for recruiter
    const mergedData = {
      ...currentData,
      role: 'company',
      registrationType: 'recruiter',
      profile: {
        ...currentData.profile,
        company: data.companyName!.trim(),
        position: data.companyPosition,
      },
    };
    const completeness = calculateProfileCompleteness(mergedData);

    // Update user doc
    transaction.update(userRef, {
      role: 'company',
      registrationType: 'recruiter',
      isVerified: true,
      'profile.company': data.companyName!.trim(),
      'profile.companyId': companyId,
      'profile.position': data.companyPosition,
      'lifecycle.status': 'active',
      'lifecycle.statusChangedAt': admin.firestore.FieldValue.serverTimestamp(),
      profileCompleteness: completeness,
      _skipGroupSync: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, alreadyCompleted: false, companyId };
  });

  if (result.alreadyCompleted) {
    return { success: true, alreadyCompleted: true };
  }
  const companyId = result.companyId;

  // Alert admins about new recruiter registration
  try {
    await db.collection('admin_alerts').add({
      type: 'new_recruiter_registration',
      userId: uid,
      companyName: data.companyName,
      companyPosition: data.companyPosition,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  } catch (alertErr) {
    // Non-blocking: alert failure shouldn't break registration
    console.warn('Failed to create admin alert:', alertErr);
  }

  return { success: true, registrationType: 'recruiter', companyId };
}

function calculateProfileCompleteness(userData: Record<string, any>): number {
  let score = 0;
  // Name (10%)
  if (userData.firstName || userData.profile?.firstName) score += 5;
  if (userData.lastName || userData.profile?.lastName) score += 5;
  // Photo (10%)
  if (userData.photoURL || userData.profile?.photoURL) score += 10;
  // Registration type completed (20%)
  if (
    userData.registrationType &&
    userData.registrationType !== 'collaborator'
  ) {
    score += 20;
  }
  if (userData.registrationType === 'collaborator') score += 10;
  // Education (15%)
  if (userData.academicLevel || userData.profile?.degree) score += 15;
  // Career (15%)
  if (userData.profile?.position || userData.profile?.company) score += 15;
  // Skills (10%)
  const skills = userData.profile?.skills || userData.skills || [];
  if (skills.length >= 3) score += 10;
  else if (skills.length > 0) score += 5;
  // Bio/headline (10%)
  if (userData.profile?.bio) score += 10;
  return Math.min(score, 100);
}
