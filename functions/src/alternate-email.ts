import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sendEmail } from './email-service';

const db = admin.firestore();

// App base URL for verification links. Mirrors linkedin-auth.ts (process.env.APP_URL)
// but falls back to the beta host since feature/hub deploys to beta.secid.mx.
function getBaseUrl(): string {
  return process.env.APP_URL || 'https://beta.secid.mx';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface RequestAlternateEmailData {
  email: string;
}

interface ConfirmAlternateEmailData {
  token: string;
}

/**
 * Step 1: a signed-in member requests adding a secondary email.
 * Sends a verification link to that address. Always returns a generic
 * `{ ok: true }` — never leaks whether the email is already in use.
 */
export const requestAlternateEmail = onCall(
  { cors: [/secid\.mx$/, /secid\.org$/, 'localhost'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = request.auth.uid;
    const data = request.data as RequestAlternateEmailData;

    const emailLower = String(data?.email || '')
      .trim()
      .toLowerCase();

    if (!emailLower || !EMAIL_RE.test(emailLower)) {
      throw new HttpsError('invalid-argument', 'A valid email is required', {
        reason: 'invalid_format',
      });
    }

    const callerSnap = await db.collection('users').doc(uid).get();
    const callerData = callerSnap.data();

    // Multi-email identity is a first-class-member privilege only
    // (isVerified = numeroCuenta + proof + admin approval). Basic /
    // pending accounts cannot register alternate emails.
    if (!callerData?.isVerified) {
      throw new HttpsError(
        'failed-precondition',
        'Alternate emails are available to full members only',
        { reason: 'members_only' }
      );
    }

    // Reject if it equals the caller's own primary email.
    const callerPrimary = String(
      callerData?.primaryEmail || callerData?.email || ''
    )
      .trim()
      .toLowerCase();
    if (callerPrimary && callerPrimary === emailLower) {
      throw new HttpsError(
        'invalid-argument',
        'That email is already your primary email',
        { reason: 'primary_email' }
      );
    }

    // Existence checks. If the email is already claimed (alias index, or a
    // users doc primary/alternate for a DIFFERENT uid) we still return a
    // generic success but do NOT create a token (no enumeration oracle).
    let alreadyClaimed = false;

    const aliasSnap = await db.collection('email_alias').doc(emailLower).get();
    if (aliasSnap.exists) {
      alreadyClaimed = true;
    }

    if (!alreadyClaimed) {
      const primaryQuery = await db
        .collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      if (!primaryQuery.empty && primaryQuery.docs[0].id !== uid) {
        alreadyClaimed = true;
      }
    }

    if (!alreadyClaimed) {
      const altQuery = await db
        .collection('users')
        .where('alternateEmails', 'array-contains', emailLower)
        .limit(1)
        .get();
      if (!altQuery.empty && altQuery.docs[0].id !== uid) {
        alreadyClaimed = true;
      }
    }

    if (alreadyClaimed) {
      // Generic response — do not leak existence, do not create a token.
      return { ok: true };
    }

    // Create a single-use, time-boxed verification token.
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
    const now = Date.now();

    await db
      .collection('alternate_email_tokens')
      .doc(token)
      .set({
        canonicalUid: uid,
        email: emailLower,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(now + TOKEN_TTL_MS),
        used: false,
      });

    const link = `${getBaseUrl()}/es/verify-alternate-email?token=${token}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#f5f5f5; margin:0; padding:20px;">
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden;">
    <div style="background:linear-gradient(135deg,#003B5C,#C4A24C); padding:30px; text-align:center; color:#fff;">
      <h1 style="margin:0; font-size:24px;">SECiD</h1>
    </div>
    <div style="padding:30px;">
      <p>Hola,</p>
      <p>Recibimos una solicitud para agregar este correo como correo alterno de tu cuenta en SECiD.</p>
      <p>Para confirmarlo, haz clic en el siguiente botón. El enlace expira en 24 horas.</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${link}" style="display:inline-block; padding:12px 24px; background:#003B5C; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">Confirmar correo alterno</a>
      </p>
      <p style="font-size:12px; color:#999;">Si no solicitaste esto, puedes ignorar este correo.</p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: emailLower,
      subject: 'Confirma tu correo alterno en SECiD',
      html,
    });

    return { ok: true };
  }
);

/**
 * Step 2: the member clicks the link while signed in to the canonical
 * account. Verifies the token and registers the alternate email.
 */
export const confirmAlternateEmail = onCall(
  { cors: [/secid\.mx$/, /secid\.org$/, 'localhost'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = request.auth.uid;
    const data = request.data as ConfirmAlternateEmailData;
    const token = String(data?.token || '').trim();

    if (!token) {
      throw new HttpsError('invalid-argument', 'A token is required');
    }

    const tokenRef = db.collection('alternate_email_tokens').doc(token);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      throw new HttpsError('not-found', 'Invalid verification token');
    }

    const tokenData = tokenSnap.data()!;

    if (tokenData.used === true) {
      throw new HttpsError(
        'failed-precondition',
        'This verification link has already been used'
      );
    }

    const expiresAtMs =
      tokenData.expiresAt && typeof tokenData.expiresAt.toMillis === 'function'
        ? tokenData.expiresAt.toMillis()
        : 0;
    if (expiresAtMs && expiresAtMs < Date.now()) {
      throw new HttpsError(
        'deadline-exceeded',
        'This verification link has expired'
      );
    }

    if (request.auth.uid !== tokenData.canonicalUid) {
      throw new HttpsError(
        'permission-denied',
        'This verification link belongs to a different account'
      );
    }

    const emailLower = String(tokenData.email || '')
      .trim()
      .toLowerCase();
    const canonicalUid: string = tokenData.canonicalUid;

    // Detect whether a SEPARATE account already owns this email as its
    // primary. If so, we do NOT silently link — an admin merge-alias
    // operation must consolidate the two accounts instead.
    let conflictUid: string | null = null;

    try {
      const authUser = await admin.auth().getUserByEmail(emailLower);
      if (authUser && authUser.uid !== canonicalUid) {
        conflictUid = authUser.uid;
      }
    } catch {
      // No Firebase Auth user with that email — not an error.
    }

    if (!conflictUid) {
      const primaryQuery = await db
        .collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      if (!primaryQuery.empty && primaryQuery.docs[0].id !== canonicalUid) {
        conflictUid = primaryQuery.docs[0].id;
      }
    }

    if (conflictUid) {
      // Do not modify anything; consume the token so the link can't be
      // replayed. Admin merge-alias flow handles the existing account.
      await tokenRef.update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, email: emailLower, requiresAdminMerge: true };
    }

    // Register the verified alternate email on the canonical user doc.
    const canonicalRef = db.collection('users').doc(canonicalUid);
    const canonicalSnap = await canonicalRef.get();
    if (!canonicalSnap.exists) {
      throw new HttpsError('not-found', 'Canonical account not found');
    }
    // Alternate emails only attach to first-class member profiles.
    if (!canonicalSnap.data()?.isVerified) {
      throw new HttpsError(
        'failed-precondition',
        'Alternate emails are available to full members only',
        { reason: 'members_only' }
      );
    }

    const existing: { email: string; verifiedAt: unknown }[] =
      canonicalSnap.data()?.alternateEmails || [];
    const deduped = existing.filter(
      (e) => String(e?.email || '').toLowerCase() !== emailLower
    );
    deduped.push({
      email: emailLower,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await canonicalRef.update({
      alternateEmails: deduped,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('email_alias').doc(emailLower).set({
      canonicalUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await tokenRef.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { ok: true, email: emailLower };
  }
);
