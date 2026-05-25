/**
 * Firestore security rules tests (#50).
 *
 * Uses @firebase/rules-unit-testing v5 against the local Firestore emulator.
 * Foundation for systematic rules coverage. Each test asserts a specific
 * allow/deny path in firestore.rules.
 *
 * Run:
 *   firebase emulators:start --only firestore  # in one terminal
 *   npx vitest run tests/rules                # in another
 *
 * Or via npm script (defined in package.json — see :test:rules below).
 *
 * Tests SKIP if the emulator isn't reachable, so CI doesn't fail without
 * the emulator running. Add a CI step that boots the emulator + runs this
 * suite for full coverage.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const PROJECT_ID = 'secid-rules-test';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';

async function emulatorReachable(): Promise<boolean> {
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

let testEnv: RulesTestEnvironment | undefined;
let emulatorRunning = false;

beforeAll(async () => {
  if (!existsSync(RULES_PATH)) {
    throw new Error(`firestore.rules not found at ${RULES_PATH}`);
  }
  emulatorRunning = await emulatorReachable();
  if (!emulatorRunning) {
    console.warn(
      `Firestore emulator not running on ${EMULATOR_HOST}. ` +
        `Skipping rules tests. Start it with: firebase emulators:start --only firestore`
    );
    return;
  }
  const [host, port] = EMULATOR_HOST.split(':');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

describe.skipIf(!emulatorRunning)('firestore.rules — users collection', () => {
  it('anonymous can read user with privacy.profileVisibility="public" + cvVisibility="public"', async () => {
    if (!testEnv) throw new Error('testEnv not initialized');

    // Seed via admin context (bypasses rules).
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('public-cv-user')
        .set({
          email: 'public@example.com',
          privacy: { profileVisibility: 'public' },
          cvVisibility: 'public',
        });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(anonDb.collection('users').doc('public-cv-user').get());
  });

  it('anonymous CANNOT read user without public visibility flags', async () => {
    if (!testEnv) throw new Error('testEnv not initialized');

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('private-user')
        .set({
          email: 'private@example.com',
          // No privacy field at all — the rule must handle missing fields
          // safely (regression test for #64 — null access on undefined
          // privacy field used to error and deny everything including
          // owner reads).
        });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(anonDb.collection('users').doc('private-user').get());
  });

  it('owner can ALWAYS read their own user doc (even with no privacy field)', async () => {
    if (!testEnv) throw new Error('testEnv not initialized');

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('users')
        .doc('owner-uid')
        .set({
          email: 'owner@example.com',
        });
    });

    const ownerDb = testEnv.authenticatedContext('owner-uid').firestore();
    // Regression test for #64 — the privacy.profileVisibility access without
    // null-check used to throw at rule eval time and deny this read.
    await assertSucceeds(ownerDb.collection('users').doc('owner-uid').get());
  });
});

describe.skipIf(!emulatorRunning)(
  'firestore.rules — newsletter + contactMessages (S4)',
  () => {
    it('anonymous CANNOT create newsletter doc directly (must go through Cloud Function)', async () => {
      if (!testEnv) throw new Error('testEnv not initialized');
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        anonDb.collection('newsletter').add({
          email: 'spam@example.com',
          name: 'Spam',
          subscribedAt: new Date(),
        })
      );
    });

    it('anonymous CANNOT create contactMessages doc directly', async () => {
      if (!testEnv) throw new Error('testEnv not initialized');
      const anonDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        anonDb.collection('contactMessages').add({
          name: 'Spam',
          email: 'spam@example.com',
          subject: 'spam',
          message: 'spam message',
        })
      );
    });
  }
);

describe.skipIf(!emulatorRunning)(
  'firestore.rules — server-only collections',
  () => {
    const serverOnly = [
      'alternate_email_tokens',
      'alternate_email_audit',
      'alternate_email_ratelimit',
      'public_form_ratelimit',
      'merge_audit_log',
    ];

    for (const collection of serverOnly) {
      it(`anonymous cannot read ${collection}`, async () => {
        if (!testEnv) throw new Error('testEnv not initialized');
        const anonDb = testEnv.unauthenticatedContext().firestore();
        await assertFails(anonDb.collection(collection).limit(1).get());
      });

      it(`anonymous cannot write ${collection}`, async () => {
        if (!testEnv) throw new Error('testEnv not initialized');
        const anonDb = testEnv.unauthenticatedContext().firestore();
        await assertFails(anonDb.collection(collection).add({ x: 1 }));
      });
    }
  }
);
