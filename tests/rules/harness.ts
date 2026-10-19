/**
 * Shared setup for the Firestore security rules suites in tests/rules.
 *
 * Every suite in this folder runs against the local Firestore emulator
 * through @firebase/rules-unit-testing v5 and skips when the emulator is
 * not reachable (CI boots one in the "Firestore Rules Tests" job; locally,
 * `npx firebase-tools emulators:exec --only firestore --project
 * secid-rules-test "npx vitest run tests/rules"`).
 *
 * Call `emulatorReachable()` at module top level (top-level await) so the
 * `describe.skipIf` guard is evaluated while the file is collected, and
 * `createTestEnv()` from `beforeAll`.
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
export const PROJECT_ID = 'secid-rules-test';
export const EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';

export async function emulatorReachable(): Promise<boolean> {
  try {
    const [host, port] = EMULATOR_HOST.split(':');
    const res = await fetch(`http://${host}:${port}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Each suite file should pass its own `projectId` suffix: vitest runs files
 * in parallel threads against the same emulator, and `clearFirestore()`
 * only clears the calling environment's project, so distinct ids keep one
 * file's afterEach from wiping another file's seeded data mid-test.
 */
export async function createTestEnv(
  suffix = ''
): Promise<RulesTestEnvironment> {
  if (!existsSync(RULES_PATH)) {
    throw new Error(`firestore.rules not found at ${RULES_PATH}`);
  }
  const [host, port] = EMULATOR_HOST.split(':');
  return initializeTestEnvironment({
    projectId: suffix ? `${PROJECT_ID}-${suffix}` : PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host,
      port: Number(port),
    },
  });
}

/** Minimal users/{uid} doc that satisfies isVerified() + isActive(). */
export function verifiedMemberDoc(email: string) {
  return {
    email,
    firstName: 'Test',
    lastName: 'Member',
    role: 'member',
    isVerified: true,
    isActive: true,
  };
}
