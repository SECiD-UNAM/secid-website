// @ts-nocheck
import {
  updateDoc,
  doc,
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { getCurrentUser} from '@/lib/auth';
import { db, isUsingMockAPI} from '@/lib/firebase';

/**
 * Two-Factor Authentication (2FA) Service
 * Implements TOTP (Time-based One-Time Password) authentication
 */

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

/**
 * Generate a random secret for TOTP
 */
export function generateTOTPSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return secret;
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-digit backup code
    const code = Math.random().toString().substr(2, 8);
    codes.push(code);
  }
  
  return codes;
}

/**
 * Generate QR code URL for TOTP setup
 */
export function generateQRCodeUrl(
  secret: string, 
  userEmail: string, 
  issuer: string = 'SECiD'
): string {
  const label = encodeURIComponent(`${issuer}:${userEmail}`);
  const issuerParam = encodeURIComponent(issuer);
  
  const otpAuthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuerParam}&algorithm=SHA1&digits=6&period=30`;
  
  // Using QR Server API for QR code generation
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
}

/**
 * Verify TOTP code using a simple algorithm
 * Note: This is a simplified implementation. In production, use a proper TOTP library
 */
export function verifyTOTPCode(secret: string, token: string, window: number = 1): boolean {
  if (!secret || !token || token.length !== 6) {
    return false;
  }
  
  const time = Math.floor(Date.now() / 1000 / 30);
  
  // Check current time window and adjacent windows
  for (let i = -window; i <= window; i++) {
    const timeSlice = time + i;
    const expectedToken = generateTOTPToken(secret, timeSlice);
    
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate TOTP token for given time slice
 * Simplified implementation - use a proper library in production
 */
function generateTOTPToken(secret: string, timeSlice: number): string {
  // This is a simplified implementation
  // In production, use libraries like 'otplib' or 'speakeasy'
  const hash = simpleHash(secret + timeSlice.toString());
  return (hash % 1000000).toString().padStart(6, '0');
}

/**
 * Simple hash function (for demo purposes only)
 */
function simpleHash(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Set up 2FA for user
 */
export async function setupTwoFactor(userEmail: string): Promise<TwoFactorSetup> {
  if (isUsingMockAPI()) {
    // Mock implementation
    const secret = generateTOTPSecret();
    return {
      secret,
      qrCodeUrl: generateQRCodeUrl(secret, userEmail),
      backupCodes: generateBackupCodes(),
      isEnabled: false,
    };
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes();
  const qrCodeUrl = generateQRCodeUrl(secret, userEmail);
  
  // Store setup info (but don't enable yet)
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    twoFactor: {
      secret,
      backupCodes: backupCodes.map(code => ({ code, used: false })),
      isEnabled: false,
      setupAt: new Date(),
    }
  });
  
  return {
    secret,
    qrCodeUrl,
    backupCodes,
    isEnabled: false,
    setupAt: new Date(),
  };
}

/**
 * Enable 2FA after verification
 */
export async function enableTwoFactor(verificationCode: string): Promise<boolean> {
  if (isUsingMockAPI()) {
    console.log('Mock: 2FA enabled with code:', verificationCode);
    return true;
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  // Get user's 2FA setup
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc['data']();
  const twoFactor = userData.twoFactor;
  
  if (!twoFactor || !twoFactor.secret) {
    throw new Error('2FA not set up');
  }
  
  // Verify the code
  const isValid = verifyTOTPCode(twoFactor.secret, verificationCode);
  if (!isValid) {
    throw new Error('Invalid verification code');
  }
  
  // Enable 2FA
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    'twoFactor.isEnabled': true,
    'twoFactor.enabledAt': new Date(),
  });
  
  return true;
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor(): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: 2FA disabled');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    'twoFactor.isEnabled': false,
    'twoFactor.disabledAt': new Date(),
  });
}

/**
 * Verify 2FA code during login
 */
export async function verifyTwoFactorLogin(
  uid: string, 
  verificationCode: string
): Promise<boolean> {
  if (isUsingMockAPI()) {
    console.log('Mock: 2FA verification for login:', verificationCode);
    return verificationCode === '123456'; // Mock verification
  }
  
  // Get user's 2FA settings
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc['data']();
  const twoFactor = userData.twoFactor;
  
  if (!twoFactor || !twoFactor.isEnabled || !twoFactor.secret) {
    throw new Error('2FA not enabled for this user');
  }
  
  // Verify the code
  return verifyTOTPCode(twoFactor.secret, verificationCode);
}

/**
 * Use backup code for recovery
 */
export async function useBackupCode(uid: string, backupCode: string): Promise<boolean> {
  if (isUsingMockAPI()) {
    console.log('Mock: Using backup code:', backupCode);
    return true;
  }
  
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc['data']();
  const twoFactor = userData.twoFactor;
  
  if (!twoFactor || !twoFactor.backupCodes) {
    throw new Error('No backup codes found');
  }
  
  // Find and mark backup code as used
  const backupCodes = twoFactor.backupCodes;
  const codeIndex = backupCodes.findIndex(
    (bc: BackupCode) => bc.code === backupCode && !bc.used
  );
  
  if (codeIndex === -1) {
    throw new Error('Invalid or already used backup code');
  }
  
  // Mark code as used
  backupCodes[codeIndex].used = true;
  backupCodes[codeIndex].usedAt = new Date();
  
  await updateDoc(userRef, {
    'twoFactor.backupCodes': backupCodes,
  });
  
  return true;
}

/**
 * Generate new backup codes
 */
export async function regenerateBackupCodes(): Promise<string[]> {
  if (isUsingMockAPI()) {
    const codes = generateBackupCodes();
    console.log('Mock: Generated new backup codes');
    return codes;
  }
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  const newCodes = generateBackupCodes();
  const userRef = doc(db, 'users', user.uid);
  
  await updateDoc(userRef, {
    'twoFactor.backupCodes': newCodes.map(code => ({ code, used: false })),
    'twoFactor.backupCodesRegeneratedAt': new Date(),
  });
  
  return newCodes;
}

/**
 * Get 2FA status for user
 */
export async function getTwoFactorStatus(uid: string): Promise<{
  isEnabled: boolean;
  hasBackupCodes: boolean;
  unusedBackupCodes: number;
}> {
  if (isUsingMockAPI()) {
    return {
      isEnabled: false,
      hasBackupCodes: true,
      unusedBackupCodes: 8,
    };
  }
  
  const userDoc = await getDoc(doc(db, 'users', uid));
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
 * Create 2FA session for step-up authentication
 */
export async function createTwoFactorSession(
  uid: string,
  expirationMinutes: number = 5
): Promise<string> {
  if (isUsingMockAPI()) {
    return `mock-session-${Date.now()}`;
  }
  
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  await addDoc(collection(db, 'twoFactorSessions'), {
    uid,
    sessionId,
    expiresAt,
    isVerified: false,
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
  });
  
  return sessionId;
}

/**
 * Verify 2FA session
 */
export async function verifyTwoFactorSession(
  sessionId: string, 
  verificationCode: string
): Promise<boolean> {
  if (isUsingMockAPI()) {
    return verificationCode === '123456';
  }
  
  // Find session
  const q = query(
    collection(db, 'twoFactorSessions'),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot['empty']) {
    throw new Error('Session not found');
  }
  
  const sessionDoc = snapshot['docs'][0];
  const session = sessionDoc['data']() as TwoFactorSession;
  
  // Check if session is expired
  if (new Date() > session.expiresAt) {
    throw new Error('Session expired');
  }
  
  // Check if too many attempts
  if (session.attempts >= session.maxAttempts) {
    throw new Error('Too many attempts');
  }
  
  // Verify the code
  const isValid = await verifyTwoFactorLogin(session.uid, verificationCode);
  
  if(isValid) {
    // Mark session as verified
    await updateDoc(sessionDoc.ref, {
      isVerified: true,
      verifiedAt: new Date(),
    });
    return true;
  } else {
    // Increment attempts
    await updateDoc(sessionDoc.ref, {
      attempts: session.attempts + 1,
    });
    return false;
  }
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}