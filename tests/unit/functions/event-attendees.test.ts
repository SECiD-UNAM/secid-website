/**
 * Tests for the events/{eventId}.currentAttendees counter triggers.
 *
 * Source: functions/src/event-attendees.ts
 *
 * Members may create/delete their own events/{id}/registrations/{uid} doc
 * but may not update the event itself (firestore.rules), so the counter is
 * maintained server-side: onDocumentCreated +1, onDocumentDeleted -1,
 * clamped at 0, in a transaction, and a no-op when the event is gone.
 *
 * Mocking strategy mirrors merge-engine.audit-log.test.ts:
 *   - `firebase-functions/v2/firestore` is intercepted so the trigger
 *     factories return the handler directly; tests call it with a synthetic
 *     event carrying `params.eventId`.
 *   - `./init` (functions/src/init.ts) is replaced so no Firebase app is
 *     initialised; `admin.firestore()` returns an in-memory stub with a
 *     `runTransaction` that records the update it was asked for.
 */
import { describe, it, expect, vi } from 'vitest';

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
    init: path.resolve('functions/src/init.ts'),
    firebaseFunctionsFirestore: path.join(
      functionsModules,
      'firebase-functions/lib/esm/v2/providers/firestore.mjs'
    ),
  };
});

const H = vi.hoisted(() => {
  const state = {
    events: new Map<string, Record<string, unknown>>(),
    updates: [] as Array<{ id: string; payload: Record<string, unknown> }>,
  };

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ __id: id, __collection: name }),
    }),
    runTransaction: async (
      fn: (tx: {
        get: (ref: { __id: string }) => Promise<{
          exists: boolean;
          data: () => Record<string, unknown> | undefined;
        }>;
        update: (
          ref: { __id: string },
          payload: Record<string, unknown>
        ) => void;
      }) => Promise<unknown>
    ) =>
      fn({
        get: async (ref) => {
          const data = state.events.get(ref.__id);
          return { exists: !!data, data: () => data };
        },
        update: (ref, payload) => {
          state.updates.push({ id: ref.__id, payload });
          state.events.set(ref.__id, {
            ...(state.events.get(ref.__id) ?? {}),
            ...payload,
          });
        },
      }),
  };

  return { state, db };
});

vi.mock(PATHS.init, () => ({
  admin: { firestore: () => H.db },
}));

vi.mock(PATHS.firebaseFunctionsFirestore, () => ({
  onDocumentCreated: (_path: unknown, handler: unknown) => handler,
  onDocumentDeleted: (_path: unknown, handler: unknown) => handler,
}));

import {
  adjustAttendeeCount,
  onEventRegistrationCreated,
  onEventRegistrationDeleted,
} from '../../../functions/src/event-attendees';

// The mocked trigger factories return the raw handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const created = onEventRegistrationCreated as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deleted = onEventRegistrationDeleted as any;

function registrationEvent(eventId: string) {
  return { params: { eventId, registrationId: 'member-uid' } };
}

/** Updates recorded for one event (tests run concurrently; each uses its own id). */
function updatesFor(eventId: string) {
  return H.state.updates.filter((u) => u.id === eventId).map((u) => u.payload);
}

describe('event-attendees counter triggers', () => {
  it('onDocumentCreated increments currentAttendees by one', async () => {
    H.state.events.set('ev-create', { currentAttendees: 12 });
    await created(registrationEvent('ev-create'));
    expect(updatesFor('ev-create')).toEqual([{ currentAttendees: 13 }]);
  });

  it('onDocumentDeleted decrements currentAttendees by one', async () => {
    H.state.events.set('ev-delete', { currentAttendees: 13 });
    await deleted(registrationEvent('ev-delete'));
    expect(updatesFor('ev-delete')).toEqual([{ currentAttendees: 12 }]);
  });

  it('never goes below zero', async () => {
    H.state.events.set('ev-floor', { currentAttendees: 0 });
    await deleted(registrationEvent('ev-floor'));
    expect(updatesFor('ev-floor')).toEqual([{ currentAttendees: 0 }]);
  });

  it('treats a missing counter as zero', async () => {
    H.state.events.set('ev-nocounter', { title: 'No counter yet' });
    await created(registrationEvent('ev-nocounter'));
    expect(updatesFor('ev-nocounter')).toEqual([{ currentAttendees: 1 }]);
  });

  it('is a no-op when the event no longer exists', async () => {
    await expect(
      adjustAttendeeCount(H.db as never, 'ev-gone', 1)
    ).resolves.toBeNull();
    expect(updatesFor('ev-gone')).toEqual([]);
  });
});
