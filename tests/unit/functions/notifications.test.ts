/**
 * Tests for the F19 email notification triggers.
 *
 * Source: functions/src/notifications.ts
 *
 *   - onContactMessageCreated: contactMessages/{id} → admin email with the
 *     sender as replyTo.
 *   - onEventRegistrationEmail: events/{id}/registrations/{uid} →
 *     confirmation to the member (honours notificationSettings.email).
 *   - sendEventReminders: daily schedule → reminder to every registrant of
 *     events starting in [now+24h, now+48h), marked with reminderSentAt.
 *
 * Mocking strategy mirrors event-attendees.test.ts: the trigger factories
 * return the handler directly, `./init` yields an in-memory Firestore stub
 * keyed by document path, and `./email-service` is a spy so each test can
 * assert the exact mail payload the trigger asked for.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    env: path.resolve('functions/src/env.ts'),
    emailService: path.resolve('functions/src/email-service.ts'),
    firebaseAdminFirestore: path.join(
      functionsModules,
      'firebase-admin/lib/esm/firestore/index.js'
    ),
    firebaseFunctionsFirestore: path.join(
      functionsModules,
      'firebase-functions/lib/esm/v2/providers/firestore.mjs'
    ),
    firebaseFunctionsScheduler: path.join(
      functionsModules,
      'firebase-functions/lib/esm/v2/providers/scheduler.mjs'
    ),
  };
});

const H = vi.hoisted(() => {
  type Data = Record<string, any>;
  const state = {
    docs: new Map<string, Data>(),
    updates: [] as Array<{ path: string; payload: Data }>,
  };
  const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' };
  const ts = (ms: number) => ({
    __timestamp: true,
    toMillis: () => ms,
    toDate: () => new Date(ms),
  });
  const Timestamp = {
    fromMillis: ts,
    fromDate: (d: Date) => ts(d.getTime()),
    now: () => ts(Date.now()),
  };
  const FieldValue = { serverTimestamp: () => SERVER_TIMESTAMP };

  const millis = (v: any) =>
    v && typeof v.toMillis === 'function' ? v.toMillis() : v;
  type Filter = { field: string; op: string; value: any };
  const matches = (data: Data, f: Filter) => {
    const a = millis(data[f.field]);
    const b = millis(f.value);
    if (a === undefined) return false;
    if (f.op === '>=') return a >= b;
    if (f.op === '<') return a < b;
    if (f.op === '==') return a === b;
    throw new Error(`unsupported op ${f.op}`);
  };

  function snapshot(path: string) {
    const data = state.docs.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: !!data,
      data: () => data,
      ref: docRef(path),
    };
  }
  function docRef(path: string): any {
    return {
      path,
      id: path.split('/').pop() as string,
      get: async () => snapshot(path),
      update: async (payload: Data) => {
        state.updates.push({ path, payload });
        state.docs.set(path, { ...(state.docs.get(path) ?? {}), ...payload });
      },
      collection: (name: string) => collectionRef(`${path}/${name}`),
    };
  }
  function collectionRef(path: string, filters: Filter[] = []): any {
    return {
      doc: (id: string) => docRef(`${path}/${id}`),
      where: (field: string, op: string, value: any) =>
        collectionRef(path, [...filters, { field, op, value }]),
      get: async () => {
        const docs = [...state.docs.keys()]
          .filter(
            (p) =>
              p.startsWith(`${path}/`) &&
              !p.slice(path.length + 1).includes('/')
          )
          .filter((p) =>
            filters.every((f) => matches(state.docs.get(p) as Data, f))
          )
          .map(snapshot);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }
  const db = { collection: (name: string) => collectionRef(name) };

  const sendEmail = vi.fn(async () => 'mail-id');
  const sendBatchEmails = vi.fn(async () => undefined);

  return {
    state,
    db,
    Timestamp,
    FieldValue,
    SERVER_TIMESTAMP,
    sendEmail,
    sendBatchEmails,
    docRef,
  };
});

vi.mock(PATHS.init, () => ({ admin: { firestore: () => H.db } }));
vi.mock(PATHS.env, () => ({ getAppUrl: () => 'https://secid.test' }));
vi.mock(PATHS.emailService, () => ({
  sendEmail: H.sendEmail,
  sendBatchEmails: H.sendBatchEmails,
}));
vi.mock(PATHS.firebaseAdminFirestore, () => ({
  FieldValue: H.FieldValue,
  Timestamp: H.Timestamp,
}));
vi.mock(PATHS.firebaseFunctionsFirestore, () => ({
  onDocumentCreated: (_path: unknown, handler: unknown) => handler,
}));
vi.mock(PATHS.firebaseFunctionsScheduler, () => ({
  onSchedule: (_opts: unknown, handler: unknown) => handler,
}));

import {
  onContactMessageCreated,
  onEventRegistrationEmail,
} from '../../../functions/src/notifications';

// The mocked trigger factories return the raw handlers.
const contactCreated = onContactMessageCreated as any;
const registrationCreated = onEventRegistrationEmail as any;

// 2026-11-05 18:00 America/Mexico_City (UTC-6).
const WEBINAR_START = Date.UTC(2026, 10, 6, 0, 0, 0);

function seedWebinar(id: string, overrides: Record<string, unknown> = {}) {
  H.state.docs.set(`events/${id}`, {
    title: 'Webinar: Carreras en Ciencia de Datos',
    startDate: H.Timestamp.fromMillis(WEBINAR_START),
    endDate: H.Timestamp.fromMillis(WEBINAR_START + 2 * 3600_000),
    timezone: 'America/Mexico_City',
    status: 'published',
    location: {
      type: 'virtual',
      virtualPlatform: 'zoom',
      virtualLink: 'https://zoom.us/j/987654321',
    },
    ...overrides,
  });
}

function seedUser(uid: string, overrides: Record<string, unknown> = {}) {
  H.state.docs.set(`users/${uid}`, {
    email: `${uid}@example.com`,
    firstName: 'Ana',
    displayName: 'Ana López',
    lang: 'es',
    notificationSettings: { email: true },
    ...overrides,
  });
}

function seedRegistration(eventId: string, uid: string) {
  H.state.docs.set(`events/${eventId}/registrations/${uid}`, {
    eventId,
    userId: uid,
    userName: 'Ana López',
    userEmail: `${uid}@example.com`,
    attendanceStatus: 'registered',
  });
}

async function registrationEvent(eventId: string, uid: string) {
  return firestoreEvent(`events/${eventId}/registrations/${uid}`, {
    eventId,
    registrationId: uid,
  });
}

/** Builds the FirestoreEvent an onDocumentCreated handler receives. */
async function firestoreEvent(path: string, params: Record<string, string>) {
  const snap = await H.docRef(path).get();
  return { params, data: snap };
}

// vitest.config.ts runs a file's tests (and sibling describes) concurrently;
// these share the in-memory Firestore, the mail spies and
// process.env.ADMIN_EMAIL, so the whole file is one sequential suite.
describe.sequential('F19 notifications', () => {
  beforeEach(() => {
    H.state.docs.clear();
    H.state.updates.length = 0;
    H.sendEmail.mockClear();
    H.sendBatchEmails.mockClear();
    delete process.env.ADMIN_EMAIL;
  });

  describe('onContactMessageCreated', () => {
    const message = {
      name: 'Ana López',
      email: 'ana@example.com',
      subject: 'Convenio con empresa',
      message: 'Hola, <b>quisiera</b> proponer un convenio.',
      lang: 'es',
      status: 'new',
    };

    it('emails ADMIN_EMAIL with the sender as replyTo and the admin panel link', async () => {
      process.env.ADMIN_EMAIL = 'admins@secid.mx';
      H.state.docs.set('contactMessages/msg-1', message);

      await contactCreated(
        await firestoreEvent('contactMessages/msg-1', { id: 'msg-1' })
      );

      expect(H.sendEmail).toHaveBeenCalledTimes(1);
      const payload = H.sendEmail.mock.calls[0][0] as any;
      expect(payload.to).toBe('admins@secid.mx');
      expect(payload.replyTo).toBe('ana@example.com');
      expect(payload.subject).toBe(
        'Nuevo mensaje de contacto: Convenio con empresa'
      );
      expect(payload.html).toContain('Ana López');
      expect(payload.html).toContain('ana@example.com');
      // User-controlled body is escaped, never rendered as markup.
      expect(payload.html).toContain('&lt;b&gt;quisiera&lt;/b&gt;');
      expect(payload.html).not.toContain('<b>quisiera</b>');
      expect(payload.html).toContain('https://secid.test/es/dashboard/admin');
    });

    it('falls back to contacto@secid.mx and the sender name when ADMIN_EMAIL/subject are missing', async () => {
      H.state.docs.set('contactMessages/msg-2', { ...message, subject: '' });

      await contactCreated(
        await firestoreEvent('contactMessages/msg-2', { id: 'msg-2' })
      );

      const payload = H.sendEmail.mock.calls[0][0] as any;
      expect(payload.to).toBe('contacto@secid.mx');
      expect(payload.subject).toBe('Nuevo mensaje de contacto: Ana López');
    });

    it('never throws when the mail write fails', async () => {
      H.sendEmail.mockRejectedValueOnce(new Error('mail down'));
      H.state.docs.set('contactMessages/msg-3', message);

      await expect(
        contactCreated(
          await firestoreEvent('contactMessages/msg-3', { id: 'msg-3' })
        )
      ).resolves.toBeUndefined();
    });

    it('is a no-op when the snapshot is missing', async () => {
      await contactCreated({ params: { id: 'gone' }, data: undefined });
      expect(H.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('onEventRegistrationEmail', () => {
    it('confirms the registration in Spanish with date, virtual link and event URL', async () => {
      seedWebinar('ev-1');
      seedUser('uid-1');
      seedRegistration('ev-1', 'uid-1');

      await registrationCreated(await registrationEvent('ev-1', 'uid-1'));

      expect(H.sendEmail).toHaveBeenCalledTimes(1);
      const payload = H.sendEmail.mock.calls[0][0] as any;
      expect(payload.to).toBe('uid-1@example.com');
      expect(payload.subject).toBe(
        'Confirmación de registro: Webinar: Carreras en Ciencia de Datos'
      );
      expect(payload.html).toContain('Ana');
      // Rendered in the event's timezone: 2026-11-05 18:00 CDMX.
      expect(payload.html).toContain('5 de noviembre de 2026');
      expect(payload.html).toContain('6:00');
      expect(payload.html).toContain('https://zoom.us/j/987654321');
      expect(payload.html).toContain(
        'https://secid.test/es/dashboard/events/ev-1'
      );
    });

    it('uses the English copy and dashboard route for lang=en users', async () => {
      seedWebinar('ev-2');
      seedUser('uid-2', { lang: 'en' });
      seedRegistration('ev-2', 'uid-2');

      await registrationCreated(await registrationEvent('ev-2', 'uid-2'));

      const payload = H.sendEmail.mock.calls[0][0] as any;
      expect(payload.subject).toBe(
        'Registration confirmed: Webinar: Carreras en Ciencia de Datos'
      );
      expect(payload.html).toContain('November 5, 2026');
      expect(payload.html).toContain(
        'https://secid.test/en/dashboard/events/ev-2'
      );
    });

    it('renders venue and address for physical events', async () => {
      seedWebinar('ev-3', {
        location: {
          type: 'physical',
          venue: 'UNAM Campus Ciudad Universitaria',
          address: 'Avenida Universidad 3000, CDMX',
        },
      });
      seedUser('uid-3');
      seedRegistration('ev-3', 'uid-3');

      await registrationCreated(await registrationEvent('ev-3', 'uid-3'));

      const payload = H.sendEmail.mock.calls[0][0] as any;
      expect(payload.html).toContain('UNAM Campus Ciudad Universitaria');
      expect(payload.html).toContain('Avenida Universidad 3000, CDMX');
    });

    it('honours notificationSettings.email === false', async () => {
      seedWebinar('ev-4');
      seedUser('uid-4', { notificationSettings: { email: false } });
      seedRegistration('ev-4', 'uid-4');

      await registrationCreated(await registrationEvent('ev-4', 'uid-4'));

      expect(H.sendEmail).not.toHaveBeenCalled();
    });

    it('falls back to the registration id when userId is missing', async () => {
      seedWebinar('ev-5');
      seedUser('uid-5');
      H.state.docs.set('events/ev-5/registrations/uid-5', { eventId: 'ev-5' });

      await registrationCreated(await registrationEvent('ev-5', 'uid-5'));

      expect((H.sendEmail.mock.calls[0][0] as any).to).toBe(
        'uid-5@example.com'
      );
    });

    it('skips silently when the event or the user is missing', async () => {
      seedUser('uid-6');
      seedRegistration('ev-missing', 'uid-6');
      await registrationCreated(await registrationEvent('ev-missing', 'uid-6'));

      seedWebinar('ev-7');
      seedRegistration('ev-7', 'uid-missing');
      await registrationCreated(await registrationEvent('ev-7', 'uid-missing'));

      expect(H.sendEmail).not.toHaveBeenCalled();
    });

    it('never throws when the mail write fails (registration must not break)', async () => {
      H.sendEmail.mockRejectedValueOnce(new Error('mail down'));
      seedWebinar('ev-8');
      seedUser('uid-8');
      seedRegistration('ev-8', 'uid-8');

      await expect(
        registrationCreated(await registrationEvent('ev-8', 'uid-8'))
      ).resolves.toBeUndefined();
    });
  });
}); // F19 notifications
