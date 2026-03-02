import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Two-Factor Authentication (2FA) Service
 *
 * STATUS: NOT YET AVAILABLE
 * Real TOTP implementation requires a proper library (e.g., otplib) and
 * server-side secret storage. This module exposes the interface contracts
 * but all operations reject until a real implementation is in place.
 *
 * Feature flag: TWO_FACTOR_AVAILABLE (set to true when real TOTP is implemented)
 */

/** Feature flag -- set to true once real TOTP integration is complete. */
export const TWO_FACTOR_AVAILABLE = false;

/** User-facing message returned when 2FA operations are attempted. */
export const TWO_FACTOR_NOT_AVAILABLE_MESSAGE =
  'Two-factor authentication is not yet available. Coming soon.';

export const TWO_FACTOR_NOT_AVAILABLE_MESSAGE_ES =
  'La autenticaci\u00f3n de dos factores a\u00fan no est\u00e1 disponible. Pr\u00f3ximamente.';

// ---------------------------------------------------------------------------
// Interfaces (contract for future real implementation)
// ---------------------------------------------------------------------------

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  isEnabled: boolean;
  setupAt?: Date;
}

export interface TwoFactorSession {
  uid: string;
  sessionId: string;
  expiresAt: Date;
  isVerified: boolean;
  attempts: number;
  maxAttempts: number;
}

export interface BackupCode {
  code: string;
  used: boolean;
  usedAt?: Date;
}

// ---------------------------------------------------------------------------
// Helper -- guard that throws when feature is unavailable
// ---------------------------------------------------------------------------

function assertTwoFactorAvailable(): void {
  if (!TWO_FACTOR_AVAILABLE) {
    throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
  }
}

// ---------------------------------------------------------------------------
// Public API -- all operations guard on TWO_FACTOR_AVAILABLE
// ---------------------------------------------------------------------------

/**
 * Set up 2FA for user.
 * Throws when 2FA is not yet available.
 */
export async function setupTwoFactor(
  _userEmail: string
): Promise<TwoFactorSetup> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Enable 2FA after verification.
 * Throws when 2FA is not yet available.
 */
export async function enableTwoFactor(
  _verificationCode: string
): Promise<boolean> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Disable 2FA.
 * Throws when 2FA is not yet available.
 */
export async function disableTwoFactor(): Promise<void> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Verify 2FA code during login.
 * Throws when 2FA is not yet available.
 */
export async function verifyTwoFactorLogin(
  _uid: string,
  _verificationCode: string
): Promise<boolean> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Use backup code for recovery.
 * Throws when 2FA is not yet available.
 */
export async function useBackupCode(
  _uid: string,
  _backupCode: string
): Promise<boolean> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Generate new backup codes.
 * Throws when 2FA is not yet available.
 */
export async function regenerateBackupCodes(): Promise<string[]> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Get 2FA status for user.
 * When 2FA is not available, always returns disabled status.
 */
export async function getTwoFactorStatus(
  _uid: string
): Promise<{
  isEnabled: boolean;
  hasBackupCodes: boolean;
  unusedBackupCodes: number;
}> {
  if (!TWO_FACTOR_AVAILABLE) {
    return {
      isEnabled: false,
      hasBackupCodes: false,
      unusedBackupCodes: 0,
    };
  }

  // Real implementation will query Firestore here
  const userDoc = await getDoc(doc(db, 'users', _uid));
  if (!userDoc.exists()) {
    return {
      isEnabled: false,
      hasBackupCodes: false,
      unusedBackupCodes: 0,
    };
  }

  const userData = userDoc.data();
  const twoFactor = userData.twoFactor;

  if (!twoFactor) {
    return {
      isEnabled: false,
      hasBackupCodes: false,
      unusedBackupCodes: 0,
    };
  }

  const unusedBackupCodes = twoFactor.backupCodes
    ? twoFactor.backupCodes.filter((bc: BackupCode) => !bc.used).length
    : 0;

  return {
    isEnabled: twoFactor.isEnabled || false,
    hasBackupCodes: unusedBackupCodes > 0,
    unusedBackupCodes,
  };
}

/**
 * Create 2FA session for step-up authentication.
 * Throws when 2FA is not yet available.
 */
export async function createTwoFactorSession(
  _uid: string,
  _expirationMinutes: number = 5
): Promise<string> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}

/**
 * Verify 2FA session.
 * Throws when 2FA is not yet available.
 */
export async function verifyTwoFactorSession(
  _sessionId: string,
  _verificationCode: string
): Promise<boolean> {
  assertTwoFactorAvailable();
  throw new Error(TWO_FACTOR_NOT_AVAILABLE_MESSAGE);
}
