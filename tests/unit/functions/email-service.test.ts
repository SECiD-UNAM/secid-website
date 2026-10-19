/**
 * functions/src/email-service.ts — QA accounts must never be emailed.
 * Beta and production share one backend, so a test signup on beta would
 * otherwise trigger real welcome / job-match / status emails.
 */
import { describe, it, expect, vi } from 'vitest';

// The SUT resolves `firebase-admin` from functions/node_modules, so the
// mock must target that file (same pattern as alternate-email.test.ts).
const PATHS = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // functions/node_modules may be a symlink in a worktree; vite resolves
  // the SUT's import to the real path, so the mock spec must match it.
  const functionsModules = fs.realpathSync(
    path.resolve('functions/node_modules')
  );
  return {
    // Modular entry the SUT imports getFirestore/FieldValue from (vite picks
    // the "import" export condition, hence lib/esm).
    firebaseAdminFirestore: path.join(
      functionsModules,
      'firebase-admin/lib/esm/firestore/index.js'
    ),
  };
});

const H = vi.hoisted(() => {
  const add = vi.fn(async () => ({ id: 'mail-doc' }));
  const batchSet = vi.fn();
  const batchCommit = vi.fn(async () => undefined);
  const firestore = () => ({
    collection: () => ({ add, doc: () => ({}) }),
    batch: () => ({ set: batchSet, commit: batchCommit }),
  });
  (firestore as unknown as { FieldValue: unknown }).FieldValue = {
    serverTimestamp: () => 'ts',
  };
  return { add, batchSet, batchCommit, firestore };
});

// The SUT imports getFirestore/FieldValue from the modular entry.
vi.mock(PATHS.firebaseAdminFirestore, () => ({
  getFirestore: H.firestore,
  FieldValue: (H.firestore as unknown as { FieldValue: unknown }).FieldValue,
}));

const { add, batchSet, batchCommit } = H;

import {
  isQaRecipient,
  sendEmail,
  sendBatchEmails,
} from '../../../functions/src/email-service';

describe('isQaRecipient', () => {
  it.each([
    'ana+qa@gmail.com',
    'ana+QA@gmail.com',
    'artemiopadilla+secidtest0802@gmail.com',
    'ana+test-2@secid.mx',
    '  ana+qa@gmail.com ',
  ])('flags %s', (email) => {
    expect(isQaRecipient(email)).toBe(true);
  });

  it.each([
    'ana@gmail.com',
    'ana+newsletter@gmail.com',
    'qa@secid.mx',
    'test@secid.mx',
    'ana@test.secid.mx',
    '',
    undefined,
    null,
  ])('does not flag %s', (email) => {
    expect(isQaRecipient(email)).toBe(false);
  });
});

// vitest runs tests in a file concurrently (sequence.concurrent), so each
// test inspects the mock calls for its own recipient instead of counting.
const queuedTo = (recipient: string) =>
  add.mock.calls.some(
    ([doc]) => (doc as { to: string } | undefined)?.to === recipient
  );
const batchedTo = (recipient: string) =>
  batchSet.mock.calls.some(
    ([, doc]) => (doc as { to: string } | undefined)?.to === recipient
  );

describe('sendEmail', () => {
  it('queues mail for real members', async () => {
    const id = await sendEmail({
      to: 'real-member@gmail.com',
      subject: 's',
      html: 'h',
    });
    expect(id).toBe('mail-doc');
    expect(queuedTo('real-member@gmail.com')).toBe(true);
  });

  it('queues nothing for QA accounts', async () => {
    const id = await sendEmail({
      to: 'tester+qa@gmail.com',
      subject: 's',
      html: 'h',
    });
    expect(id).toBe('');
    expect(queuedTo('tester+qa@gmail.com')).toBe(false);
  });

  it('writes replyTo at the top level of the mail doc only when given', async () => {
    await sendEmail({
      to: 'admin-replyto@secid.mx',
      subject: 's',
      html: 'h',
      replyTo: 'sender@example.com',
    });
    const withReply = add.mock.calls.find(
      ([doc]) => (doc as { to: string })?.to === 'admin-replyto@secid.mx'
    )?.[0] as Record<string, unknown>;
    expect(withReply).toMatchObject({
      to: 'admin-replyto@secid.mx',
      replyTo: 'sender@example.com',
      message: { subject: 's', html: 'h' },
    });

    await sendEmail({ to: 'admin-noreply@secid.mx', subject: 's', html: 'h' });
    const without = add.mock.calls.find(
      ([doc]) => (doc as { to: string })?.to === 'admin-noreply@secid.mx'
    )?.[0] as Record<string, unknown>;
    expect(without).not.toHaveProperty('replyTo');
  });

  it('drops QA recipients from batches', async () => {
    await sendBatchEmails([
      { to: 'batch-real@gmail.com', subject: 's', html: 'h' },
      { to: 'batch-tester+secidtest@gmail.com', subject: 's', html: 'h' },
    ]);
    expect(batchedTo('batch-real@gmail.com')).toBe(true);
    expect(batchedTo('batch-tester+secidtest@gmail.com')).toBe(false);
    expect(batchCommit).toHaveBeenCalled();
  });
});
