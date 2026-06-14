# Constancias Verificables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship verifiable HTML certificates ("constancias") on secid.mx — issued by admins from the dashboard, stored in Firestore, validated at a public URL with a QR code, and exportable to PDF via print.

**Architecture:** A thin store layer (`src/lib/constancias/store.ts`) is the only module that talks to Firebase, so a future Supabase swap touches one file. Admins issue via a Cloud Function (`issueConstancias`, role-gated, server-generates codes + SHA-256). Anyone with the link reads the doc directly (Firestore `get` public, `list` denied) on a static `/constancias/?c=CODE` page that renders a `ConstanciaCard` React island with an inline SVG seal + QR, plus print-CSS PDF export.

**Tech Stack:** Astro 6 (static), React islands, Firebase (Firestore + Functions v2 / firebase-functions v7), Zod, Vitest + @firebase/rules-unit-testing, Playwright, `qrcode` (new dep).

**Spec:** `docs/superpowers/specs/2026-06-10-constancias-verificables-design.md`

---

## Decisions locked for this plan (confirm before executing)

1. **Issuance gating = `role === 'admin'`** (read user doc in the function), matching the dominant codebase pattern (`syncGroupMembership`, `survey_aggregates`). The spec mentioned a `constancias` RBAC _resource_; adding one is invasive (Resource union + RESOURCES + RESOURCE_ABBREV + functions codec + rules regex + seedGroups) and deferred to a follow-up. **If you want full RBAC instead, say so before execution.**
2. **Canonical URL: `/constancias/?c=SECID-2026-X7K9Q4`** (HTTP 200 static page). Pretty `/constancias/<code>` paths redirect via `404.astro`.
3. **PDF v1 = browser print** (`window.print()` + `@media print`). Puppeteer pre-gen is fase 2 (not in this plan).
4. **Palette = site Tailwind tokens** (`primary` #f65425, `secondary` #5b7f99, `gold`/accent #fdb157).

## File structure

| File                                                   | Responsibility                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/types/constancia.ts`                              | Zod schema + inferred types (shared client + function source of truth)          |
| `src/lib/constancias/codes.ts`                         | Code generation (Crockford base32) + canonical-payload SHA-256 (isomorphic)     |
| `src/lib/constancias/store.ts`                         | Sole Firebase boundary: `getConstancia`, `issueConstancias`, `revokeConstancia` |
| `functions/src/constancias.ts`                         | Callables `issueConstancias` / `revokeConstancia` (admin-gated, server writes)  |
| `functions/src/index.ts`                               | Add exports (modify)                                                            |
| `firestore.rules`                                      | Add `constancias` + `constancias_audit` match blocks (modify)                   |
| `src/i18n/constancias.ts`                              | Bilingual UI strings for the verification page + card labels                    |
| `src/components/constancias/Seal.tsx`                  | Inline SVG seal (ring style, ported from stationery `draw_seal`)                |
| `src/components/constancias/ConstanciaCard.tsx`        | The document: seal, typography, QR, signatory, code+hash footer                 |
| `src/components/constancias/VerifyConstancia.tsx`      | Island: read `?c=`, fetch via store, render states + print/PDF buttons          |
| `src/components/constancias/IssueConstancias.tsx`      | Admin island: single form + CSV batch + results                                 |
| `src/pages/constancias/index.astro`                    | Public static shell mounting `VerifyConstancia`                                 |
| `src/pages/es/dashboard/admin/constancias/index.astro` | Admin page mounting `IssueConstancias` (DashboardLayout, requireRole=['admin']) |
| `src/pages/404.astro`                                  | Add redirect shim for `/constancias/<code>` (modify)                            |
| `tests/unit/constancias-codes.test.ts`                 | Unit: code gen + hash                                                           |
| `tests/rules/constancias.rules.test.ts`                | Rules: get allowed, list denied, write denied                                   |
| `tests/unit/functions/constancias.test.ts`             | Function: auth/role rejection, issue, revoke                                    |
| `tests/e2e/constancias.spec.ts`                        | E2E: verify page states + print smoke                                           |

---

## Task 1: Add the `qrcode` dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install qrcode + types**

Run:

```bash
cd /Users/artemiopadilla/Documents/repos/GitHub/secid/secid-website
npm install qrcode@^1.5.4 && npm install -D @types/qrcode@^1.5.5
```

Expected: `package.json` gains `qrcode` in dependencies and `@types/qrcode` in devDependencies; `package-lock.json` updates.

- [ ] **Step 2: Verify it imports**

Run:

```bash
node -e "import('qrcode').then(q => console.log(typeof q.toString))"
```

Expected: prints `function`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add qrcode dependency for constancias QR codes"
```

---

## Task 2: Zod schema + types

**Files:**

- Create: `src/types/constancia.ts`

- [ ] **Step 1: Write the schema module**

Create `src/types/constancia.ts`:

```typescript
import { z } from 'zod';

export const CONSTANCIA_TYPES = [
  'participacion',
  'ponente',
  'curso',
  'reconocimiento',
  'servicio',
] as const;

export const signatorySchema = z.object({
  name: z.string().min(2).max(120),
  title: z.string().min(2).max(120),
});

/** Fields an admin supplies when issuing (no server-generated fields). */
export const newConstanciaSchema = z.object({
  recipient: z.string().min(2, 'Nombre requerido').max(160),
  type: z.enum(CONSTANCIA_TYPES),
  achievement: z.string().min(2).max(300),
  event: z.string().min(2).max(200),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha YYYY-MM-DD'),
  lang: z.enum(['es', 'en']).default('es'),
  signatory: signatorySchema,
});
export type NewConstancia = z.infer<typeof newConstanciaSchema>;

/** Full stored document (server-generated fields included). */
export const constanciaSchema = newConstanciaSchema.extend({
  code: z.string().regex(/^SECID-\d{4}-[0-9A-HJ-NP-TV-Z]{6}$/),
  createdAt: z.number(), // epoch ms (serialized from Firestore Timestamp)
  templateId: z.string().default('v1'),
  revoked: z.boolean().default(false),
  revokedReason: z.string().nullable().default(null),
  sha256: z.string().length(64),
});
export type Constancia = z.infer<typeof constanciaSchema>;

export interface IssueResultItem {
  code: string;
  url: string;
}
export interface IssueResult {
  issued: IssueResultItem[];
  errors: { index: number; message: string }[];
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS (no errors referencing constancia.ts).

- [ ] **Step 3: Commit**

```bash
git add src/types/constancia.ts
git commit -m "feat(constancias): add Zod schema and types"
```

---

## Task 3: Code generation + canonical hash (TDD)

**Files:**

- Create: `src/lib/constancias/codes.ts`
- Test: `tests/unit/constancias-codes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/constancias-codes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  generateCode,
  CODE_ALPHABET,
  canonicalPayload,
  sha256Hex,
} from '../../src/lib/constancias/codes';
import type { Constancia } from '../../src/types/constancia';

describe('generateCode', () => {
  it('matches SECID-YYYY-XXXXXX with the unambiguous alphabet', () => {
    const code = generateCode(2026);
    expect(code).toMatch(/^SECID-2026-[0-9A-HJ-NP-TV-Z]{6}$/);
    const suffix = code.split('-')[2];
    for (const ch of suffix) expect(CODE_ALPHABET).toContain(ch);
  });

  it('excludes ambiguous characters I L O U', () => {
    for (const bad of ['I', 'L', 'O', 'U']) {
      expect(CODE_ALPHABET).not.toContain(bad);
    }
  });

  it('is practically unique across many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generateCode(2026));
    expect(seen.size).toBeGreaterThan(1990); // <0.5% collisions at this volume
  });
});

describe('canonicalPayload + sha256Hex', () => {
  const base = {
    code: 'SECID-2026-X7K9Q4',
    recipient: 'Jorge Alejandro Ramirez Bondi',
    type: 'participacion',
    achievement: 'Taller de MLOps (12 horas)',
    event: 'Congreso SECiD 2026',
    issuedAt: '2026-06-15',
  } as unknown as Constancia;

  it('produces a stable 64-char hex hash', async () => {
    const hash = await sha256Hex(canonicalPayload(base));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(canonicalPayload(base))).toBe(hash); // deterministic
  });

  it('changes when any payload field changes', async () => {
    const a = await sha256Hex(canonicalPayload(base));
    const b = await sha256Hex(
      canonicalPayload({ ...base, recipient: 'Otro Nombre' })
    );
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:unit -- constancias-codes`
Expected: FAIL — cannot resolve `../../src/lib/constancias/codes`.

- [ ] **Step 3: Implement**

Create `src/lib/constancias/codes.ts`:

```typescript
import type { Constancia } from '@/types/constancia';

// Crockford base32 minus ambiguous I, L, O, U.
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Generate a constancia code: SECID-<year>-<6 unambiguous chars>. */
export function generateCode(year: number): string {
  const bytes = new Uint8Array(6);
  // Web Crypto exists in browsers, Node 18+, and the Functions runtime.
  crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `SECID-${year}-${suffix}`;
}

/** Canonical string hashed for integrity (order + separator are fixed). */
export function canonicalPayload(
  c: Pick<
    Constancia,
    'code' | 'recipient' | 'type' | 'achievement' | 'event' | 'issuedAt'
  >
): string {
  return [c.code, c.recipient, c.type, c.achievement, c.event, c.issuedAt].join(
    '|'
  );
}

/** SHA-256 hex of a string via Web Crypto (isomorphic). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:unit -- constancias-codes`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/constancias/codes.ts tests/unit/constancias-codes.test.ts
git commit -m "feat(constancias): code generation + canonical SHA-256 (TDD)"
```

---

## Task 4: Firestore rules for constancias

**Files:**

- Modify: `firestore.rules` (add two match blocks inside the top-level `match /databases/{database}/documents { ... }`, before its closing brace)
- Test: `tests/rules/constancias.rules.test.ts`

- [ ] **Step 1: Write the failing rules test**

Create `tests/rules/constancias.rules.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const PROJECT_ID = 'secid-constancias-rules-test';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
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
  await testEnv.cleanup();
});
afterEach(async () => {
  await testEnv.clearFirestore();
});

const CODE = 'SECID-2026-X7K9Q4';
async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'constancias', CODE), {
      code: CODE,
      recipient: 'Test',
      type: 'participacion',
      achievement: 'x',
      event: 'y',
      issuedAt: '2026-06-15',
      lang: 'es',
      templateId: 'v1',
      revoked: false,
      revokedReason: null,
      sha256: 'a'.repeat(64),
      signatory: { name: 'A B', title: 'C' },
    });
  });
}

describe('constancias rules', () => {
  it('allows anyone (unauthenticated) to GET a constancia by code', async () => {
    await seed();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'constancias', CODE)));
  });

  it('denies LIST of the constancias collection', async () => {
    await seed();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'constancias')));
  });

  it('denies client writes even when authenticated', async () => {
    const db = testEnv.authenticatedContext('u1').firestore();
    await assertFails(
      setDoc(doc(db, 'constancias', CODE), { code: CODE, revoked: false })
    );
  });

  it('denies reads of the audit collection', async () => {
    const db = testEnv.authenticatedContext('u1').firestore();
    await assertFails(getDoc(doc(db, 'constancias_audit', 'x')));
  });
});
```

- [ ] **Step 2: Start the emulator and run the test, verify it fails**

Run (in one terminal): `firebase emulators:start --only firestore`
Run (in another): `npm run test -- tests/rules/constancias.rules.test.ts`
Expected: the GET-allowed and LIST-denied cases FAIL (no rules yet → default deny means GET fails; that's the failing signal).

- [ ] **Step 3: Add the rules blocks**

In `firestore.rules`, immediately before the final two closing braces (`  }\n}` that end `match /databases/{database}/documents`), add:

```
    // Verifiable constancias: public read-by-code, not enumerable, writes
    // only via the issueConstancias / revokeConstancia Cloud Functions.
    match /constancias/{code} {
      allow get: if true;
      allow list: if false;
      allow write: if false;
    }

    // Issuance/revocation audit trail: Cloud Function (Admin SDK) only.
    match /constancias_audit/{entryId} {
      allow read, write: if false;
    }
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test -- tests/rules/constancias.rules.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules/constancias.rules.test.ts
git commit -m "feat(constancias): Firestore rules — public get, no list, no client write"
```

---

## Task 5: Issuance + revocation Cloud Functions (TDD)

**Files:**

- Create: `functions/src/constancias.ts`
- Modify: `functions/src/index.ts`
- Test: `tests/unit/functions/constancias.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/functions/constancias.test.ts`. Mirror the mocking style of `tests/unit/functions/alternate-email.test.ts` (mock `firebase-admin` and `firebase-functions/v2/https` so `onCall(handler)` returns the handler; provide an in-memory Firestore stub). Cover:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- mocks (see alternate-email.test.ts for the exact hoisted-path style) ---
const state = vi.hoisted(() => ({
  users: new Map<string, any>(),
  constancias: new Map<string, any>(),
  audit: [] as any[],
}));

vi.mock('./init', () => ({ admin: makeAdminStub(state) }), { virtual: true });
// onCall passthrough:
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (optsOrHandler: any, maybeHandler?: any) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
  HttpsError: class extends Error {
    constructor(
      public code: string,
      msg: string
    ) {
      super(msg);
    }
  },
}));

import {
  issueConstancias,
  revokeConstancia,
} from '../../../functions/src/constancias';

beforeEach(() => {
  state.users.clear();
  state.constancias.clear();
  state.audit.length = 0;
});

describe('issueConstancias', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(
      issueConstancias({ data: { items: [], event: 'x' }, auth: null })
    ).rejects.toThrow(/unauthenticated/i);
  });

  it('rejects non-admin callers', async () => {
    state.users.set('u1', { role: 'member' });
    await expect(
      issueConstancias({
        data: { items: [validItem()], event: 'E' },
        auth: { uid: 'u1' },
      })
    ).rejects.toThrow(/permission/i);
  });

  it('issues codes + audit for an admin', async () => {
    state.users.set('admin1', { role: 'admin', email: 'a@x.com' });
    const res = await issueConstancias({
      data: { items: [validItem()], event: 'Congreso 2026' },
      auth: { uid: 'admin1' },
    });
    expect(res.issued).toHaveLength(1);
    expect(res.issued[0].code).toMatch(/^SECID-\d{4}-[0-9A-HJ-NP-TV-Z]{6}$/);
    expect(res.issued[0].url).toContain('/constancias/?c=');
    expect(state.constancias.size).toBe(1);
    expect(state.audit.some((a) => a.action === 'issue')).toBe(true);
  });

  it('reports per-row errors without aborting the batch', async () => {
    state.users.set('admin1', { role: 'admin' });
    const res = await issueConstancias({
      data: { items: [validItem(), { recipient: '' }], event: 'E' },
      auth: { uid: 'admin1' },
    });
    expect(res.issued).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].index).toBe(1);
  });
});

describe('revokeConstancia', () => {
  it('sets revoked + reason for an admin and writes audit', async () => {
    state.users.set('admin1', { role: 'admin' });
    state.constancias.set('SECID-2026-X7K9Q4', {
      code: 'SECID-2026-X7K9Q4',
      revoked: false,
    });
    await revokeConstancia({
      data: { code: 'SECID-2026-X7K9Q4', reason: 'error' },
      auth: { uid: 'admin1' },
    });
    expect(state.constancias.get('SECID-2026-X7K9Q4').revoked).toBe(true);
    expect(state.audit.some((a) => a.action === 'revoke')).toBe(true);
  });
});

function validItem() {
  return {
    recipient: 'Jorge Alejandro Ramirez Bondi',
    type: 'participacion',
    achievement: 'Taller de MLOps',
    event: 'Congreso 2026',
    issuedAt: '2026-06-15',
    lang: 'es',
    signatory: { name: 'Maria Lopez', title: 'Directora' },
  };
}
// makeAdminStub: implement an in-memory admin.firestore() with
// .collection(name).doc(id).get()/.set()/.update() and .collection(name).add()
// backed by the Maps in `state`. See alternate-email.test.ts for the shape.
function makeAdminStub(s: typeof state) {
  /* fill per alternate-email.test.ts */ return {} as any;
}
```

> Note for the implementer: complete `makeAdminStub` by copying the in-memory Firestore stub structure from `tests/unit/functions/alternate-email.test.ts` and backing reads/writes with `state.users` / `state.constancias` / `state.audit`. `FieldValue.serverTimestamp()` can return `Date.now()`.

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:unit -- constancias`
Expected: FAIL — cannot resolve `functions/src/constancias`.

- [ ] **Step 3: Implement the functions**

Create `functions/src/constancias.ts`:

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from './init';
import { getAppUrl } from './env';
import {
  generateCode,
  canonicalPayload,
  sha256Hex,
} from '../../src/lib/constancias/codes';
import {
  newConstanciaSchema,
  type NewConstancia,
} from '../../src/types/constancia';

const db = () => admin.firestore();

async function assertAdmin(uid: string | undefined): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const snap = await db().collection('users').doc(uid).get();
  if (snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin role required');
  }
}

function codeUrl(code: string): string {
  return `${getAppUrl()}/constancias/?c=${code}`;
}

interface IssueData {
  items: unknown[];
  event: string;
}

export const issueConstancias = onCall(async (request: any) => {
  await assertAdmin(request.auth?.uid);
  const { items } = (request.data ?? {}) as IssueData;
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError('invalid-argument', 'items[] required');
  }

  const issued: { code: string; url: string }[] = [];
  const errors: { index: number; message: string }[] = [];
  const year = new Date().getFullYear();

  for (let i = 0; i < items.length; i++) {
    const parsed = newConstanciaSchema.safeParse(items[i]);
    if (!parsed.success) {
      errors.push({
        index: i,
        message: parsed.error.issues[0]?.message ?? 'invalid',
      });
      continue;
    }
    const data: NewConstancia = parsed.data;

    // Generate a code, retrying on the rare collision.
    let code = generateCode(year);
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await db().collection('constancias').doc(code).get();
      if (!exists.exists) break;
      code = generateCode(year);
    }

    const sha256 = await sha256Hex(canonicalPayload({ ...data, code } as any));
    const docData = {
      ...data,
      code,
      templateId: 'v1',
      revoked: false,
      revokedReason: null,
      sha256,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db().collection('constancias').doc(code).set(docData);
    await db()
      .collection('constancias_audit')
      .add({
        action: 'issue',
        code,
        actorUid: request.auth.uid,
        actorEmail:
          (await db().collection('users').doc(request.auth.uid).get()).data()
            ?.email ?? null,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    issued.push({ code, url: codeUrl(code) });
  }

  return { issued, errors };
});

interface RevokeData {
  code: string;
  reason: string;
}

export const revokeConstancia = onCall(async (request: any) => {
  await assertAdmin(request.auth?.uid);
  const { code, reason } = (request.data ?? {}) as RevokeData;
  if (!code) throw new HttpsError('invalid-argument', 'code required');
  const ref = db().collection('constancias').doc(code);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'constancia not found');
  await ref.update({ revoked: true, revokedReason: reason ?? null });
  await db()
    .collection('constancias_audit')
    .add({
      action: 'revoke',
      code,
      reason: reason ?? null,
      actorUid: request.auth.uid,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  return { ok: true };
});
```

- [ ] **Step 4: Export from the functions index**

In `functions/src/index.ts`, after the existing `export { ... } from './public-forms';` exports near the end, add:

```typescript
// Constancias: admin issuance + revocation
export { issueConstancias, revokeConstancia } from './constancias';
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm run test:unit -- constancias`
Expected: PASS (all issue + revoke cases).

- [ ] **Step 6: Build the functions to catch TS errors**

Run: `cd functions && npm run build && cd ..`
Expected: tsc compiles with no errors. (If the cross-package import `../../src/...` is rejected by the functions tsconfig, add `"../src/types/constancia.ts"` and `"../src/lib/constancias/codes.ts"` to the functions build inputs, or copy these two pure modules — they have zero Firebase imports — into `functions/src/shared/`. Prefer the shared-copy only if the import fails.)

- [ ] **Step 7: Commit**

```bash
git add functions/src/constancias.ts functions/src/index.ts tests/unit/functions/constancias.test.ts
git commit -m "feat(constancias): issue + revoke Cloud Functions (admin-gated, TDD)"
```

---

## Task 6: Store layer (the only Firebase boundary)

**Files:**

- Create: `src/lib/constancias/store.ts`

- [ ] **Step 1: Implement the store**

Create `src/lib/constancias/store.ts`:

```typescript
import { db, functions } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  constanciaSchema,
  type Constancia,
  type NewConstancia,
  type IssueResult,
} from '@/types/constancia';

/** Public read by code. Returns null when the code does not exist. */
export async function getConstancia(code: string): Promise<Constancia | null> {
  const snap = await getDoc(doc(db, 'constancias', code));
  if (!snap.exists()) return null;
  const raw = snap.data();
  // Firestore Timestamp -> epoch ms before validation.
  const createdAt = raw.createdAt?.toMillis?.() ?? raw.createdAt ?? Date.now();
  const parsed = constanciaSchema.safeParse({ ...raw, createdAt });
  return parsed.success ? parsed.data : null;
}

export async function issueConstancias(
  items: NewConstancia[],
  event: string
): Promise<IssueResult> {
  const fn = httpsCallable<
    { items: NewConstancia[]; event: string },
    IssueResult
  >(functions, 'issueConstancias');
  const res = await fn({ items, event });
  return res.data;
}

export async function revokeConstancia(
  code: string,
  reason: string
): Promise<void> {
  const fn = httpsCallable<{ code: string; reason: string }, { ok: boolean }>(
    functions,
    'revokeConstancia'
  );
  await fn({ code, reason });
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constancias/store.ts
git commit -m "feat(constancias): store layer isolating Firebase access"
```

---

## Task 7: Bilingual UI strings

**Files:**

- Create: `src/i18n/constancias.ts`

- [ ] **Step 1: Create the strings module**

Create `src/i18n/constancias.ts` (mirrors the `{ es: {...}, en: {...} }` shape of `src/i18n/common.ts`):

```typescript
export const constanciasTranslations = {
  es: {
    verifying: 'Verificando constancia…',
    valid: 'Constancia válida',
    issuedBy: 'Emitida por SECiD',
    revoked: 'Constancia revocada',
    notFound: 'Constancia no encontrada o no verificable',
    awardedTo: 'Se otorga la presente a',
    for: 'por',
    download: 'Descargar PDF',
    print: 'Imprimir',
    code: 'Código',
    integrity: 'Hash de integridad',
    types: {
      participacion: 'Constancia de Participación',
      ponente: 'Constancia de Ponente',
      curso: 'Constancia de Curso',
      reconocimiento: 'Reconocimiento',
      servicio: 'Constancia de Servicio',
    },
  },
  en: {
    verifying: 'Verifying certificate…',
    valid: 'Valid certificate',
    issuedBy: 'Issued by SECiD',
    revoked: 'Revoked certificate',
    notFound: 'Certificate not found or not verifiable',
    awardedTo: 'This is awarded to',
    for: 'for',
    download: 'Download PDF',
    print: 'Print',
    code: 'Code',
    integrity: 'Integrity hash',
    types: {
      participacion: 'Certificate of Participation',
      ponente: 'Speaker Certificate',
      curso: 'Course Certificate',
      reconocimiento: 'Recognition',
      servicio: 'Certificate of Service',
    },
  },
} as const;

export type ConstanciasLang = keyof typeof constanciasTranslations;
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/constancias.ts
git commit -m "feat(constancias): bilingual UI strings"
```

---

## Task 8: Seal component

**Files:**

- Create: `src/components/constancias/Seal.tsx`

- [ ] **Step 1: Implement the seal**

Create `src/components/constancias/Seal.tsx` (ring-style medallion ported from the stationery `draw_seal`; pure SVG, no deps):

```tsx
interface SealProps {
  size?: number;
  colorMain?: string; // ring + monogram
  colorAccent?: string; // inner hairline
  monogram?: string;
}

export default function Seal({
  size = 96,
  colorMain = '#5b7f99',
  colorAccent = '#fdb157',
  monogram = 'S',
}: SealProps) {
  const c = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle cx={c} cy={c} r={c * 0.97} fill={colorMain} />
      <circle cx={c} cy={c} r={c * 0.8} fill="#ffffff" />
      <circle
        cx={c}
        cy={c}
        r={c * 0.74}
        fill="none"
        stroke={colorMain}
        strokeWidth={1.2}
      />
      <circle
        cx={c}
        cy={c}
        r={c * 0.66}
        fill="none"
        stroke={colorAccent}
        strokeWidth={0.8}
      />
      <text
        x={c}
        y={c + size * 0.17}
        textAnchor="middle"
        fontFamily="Poppins, Georgia, serif"
        fontWeight="700"
        fontSize={size * 0.5}
        fill={colorMain}
      >
        {monogram}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/constancias/Seal.tsx
git commit -m "feat(constancias): SVG seal component"
```

---

## Task 9: ConstanciaCard component

**Files:**

- Create: `src/components/constancias/ConstanciaCard.tsx`

- [ ] **Step 1: Implement the card**

Create `src/components/constancias/ConstanciaCard.tsx`. Renders in the constancia's own `lang`; QR generated from `qrcode` to a data URL in an effect.

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Seal from './Seal';
import type { Constancia } from '@/types/constancia';
import { constanciasTranslations } from '@/i18n/constancias';

export default function ConstanciaCard({
  constancia,
  url,
}: {
  constancia: Constancia;
  url: string;
}) {
  const t = constanciasTranslations[constancia.lang];
  const [qr, setQr] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 120 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);

  return (
    <article className="constancia-card mx-auto max-w-3xl rounded-2xl border border-secondary-200 bg-white p-10 text-center shadow-glow-sm print:border-0 print:shadow-none">
      <div className="flex justify-center">
        <Seal monogram="S" />
      </div>
      <h1 className="mt-6 font-heading text-3xl font-bold uppercase tracking-wide text-secondary-800">
        {t.types[constancia.type]}
      </h1>
      <div className="mx-auto mt-3 h-0.5 w-24 rounded bg-accent-400" />
      <p className="mt-6 text-sm text-secondary-500">{t.awardedTo}</p>
      <p className="mt-2 font-heading text-2xl font-bold text-primary-600">
        {constancia.recipient}
      </p>
      <p className="mt-4 text-sm text-secondary-600">
        {t.for} <span className="italic">{constancia.achievement}</span>
      </p>
      <p className="mt-1 text-sm text-secondary-500">{constancia.event}</p>

      <div className="mt-8 flex items-end justify-between">
        <div className="text-left">
          <p className="text-xs text-secondary-400">{constancia.issuedAt}</p>
          <p className="mt-3 border-t border-secondary-300 pt-1 text-sm font-semibold text-secondary-700">
            {constancia.signatory.name}
          </p>
          <p className="text-xs text-secondary-500">
            {constancia.signatory.title}
          </p>
        </div>
        {qr && <img src={qr} width={72} height={72} alt={constancia.code} />}
      </div>

      <footer className="mt-6 border-t border-secondary-100 pt-3 text-[10px] text-secondary-400">
        {t.code}: {constancia.code} · {t.integrity}:{' '}
        {constancia.sha256.slice(0, 16)}…
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/constancias/ConstanciaCard.tsx
git commit -m "feat(constancias): ConstanciaCard with seal + QR"
```

---

## Task 10: Verification island + public page

**Files:**

- Create: `src/components/constancias/VerifyConstancia.tsx`
- Create: `src/pages/constancias/index.astro`

- [ ] **Step 1: Implement the verification island**

Create `src/components/constancias/VerifyConstancia.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { getConstancia } from '@/lib/constancias/store';
import type { Constancia } from '@/types/constancia';
import {
  constanciasTranslations,
  type ConstanciasLang,
} from '@/i18n/constancias';
import ConstanciaCard from './ConstanciaCard';

type State =
  | { kind: 'loading' }
  | { kind: 'valid'; c: Constancia }
  | { kind: 'revoked'; c: Constancia }
  | { kind: 'notfound' };

export default function VerifyConstancia({ uiLang = 'es' as ConstanciasLang }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [url, setUrl] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('c') ?? '';
    setUrl(window.location.href);
    if (!code) {
      setState({ kind: 'notfound' });
      return;
    }
    getConstancia(code)
      .then((c) => {
        if (!c) setState({ kind: 'notfound' });
        else setState({ kind: c.revoked ? 'revoked' : 'valid', c });
      })
      .catch(() => setState({ kind: 'notfound' }));
  }, []);

  const t = constanciasTranslations[uiLang];

  if (state.kind === 'loading')
    return (
      <p className="py-20 text-center text-secondary-500">{t.verifying}</p>
    );
  if (state.kind === 'notfound')
    return <p className="py-20 text-center text-secondary-600">{t.notFound}</p>;

  const banner =
    state.kind === 'valid' ? (
      <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-center text-green-800 print:hidden">
        ✓ {t.valid} · {t.issuedBy}
      </div>
    ) : (
      <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-center text-red-800 print:hidden">
        ⚠ {t.revoked}
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {banner}
      <ConstanciaCard constancia={state.c} url={url} />
      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary-500 px-5 py-2 font-semibold text-white hover:bg-primary-600"
        >
          {t.print} / {t.download}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the static page**

Create `src/pages/constancias/index.astro`:

```astro
---
import ModernLayout from '@/layouts/ModernLayout.astro';
import VerifyConstancia from '@/components/constancias/VerifyConstancia';
---

<ModernLayout
  title="Constancia · SECiD"
  description="Constancia verificable emitida por SECiD"
  lang="es"
>
  <main class="min-h-screen bg-secondary-50">
    <VerifyConstancia client:only="react" uiLang="es" />
  </main>
</ModernLayout>

<style is:global>
  @media print {
    nav,
    footer,
    .feedback-fab {
      display: none !important;
    }
    @page {
      size: letter landscape;
      margin: 0.4in;
    }
    body {
      background: #fff !important;
    }
  }
</style>
```

- [ ] **Step 3: Build to verify the static page renders**

Run: `npm run build`
Expected: build succeeds and emits `dist/constancias/index.html`.

- [ ] **Step 4: Commit**

```bash
git add src/components/constancias/VerifyConstancia.tsx src/pages/constancias/index.astro
git commit -m "feat(constancias): public verification page + island"
```

---

## Task 11: Pretty-path redirect in 404

**Files:**

- Modify: `src/pages/404.astro`

- [ ] **Step 1: Add the redirect shim**

In `src/pages/404.astro`, add this inline script before `</body>` (or at the end of the page body). It rewrites `/constancias/SECID-...` to the canonical query URL so hand-typed pretty paths resolve:

```astro
<script is:inline>
  (function () {
    const m = window.location.pathname.match(
      /^\/constancias\/(SECID-\d{4}-[0-9A-HJ-NP-TV-Z]{6})\/?$/i
    );
    if (m) {
      window.location.replace('/constancias/?c=' + m[1].toUpperCase());
    }
  })();
</script>
```

- [ ] **Step 2: Build + sanity check**

Run: `npm run build`
Expected: build succeeds; `dist/404.html` contains the `constancias` redirect script.

- [ ] **Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat(constancias): redirect pretty /constancias/<code> paths to canonical URL"
```

---

## Task 12: Admin issuance UI

**Files:**

- Create: `src/components/constancias/IssueConstancias.tsx`
- Create: `src/pages/es/dashboard/admin/constancias/index.astro` (admin pages live under `dashboard/admin/`)

- [ ] **Step 1: Implement the admin island**

Create `src/components/constancias/IssueConstancias.tsx`. Single-issue form + CSV paste (CSV columns: `recipient,type,achievement,event,issuedAt,lang,signatoryName,signatoryTitle`). Validates each row with `newConstanciaSchema`, calls `issueConstancias`, shows resulting URLs with a copy-all button.

```tsx
import { useState } from 'react';
import { issueConstancias } from '@/lib/constancias/store';
import {
  newConstanciaSchema,
  CONSTANCIA_TYPES,
  type NewConstancia,
  type IssueResult,
} from '@/types/constancia';

function parseCsv(text: string): { items: NewConstancia[]; errors: string[] } {
  const items: NewConstancia[] = [];
  const errors: string[] = [];
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  // Skip a header row if present.
  const start = lines[0]?.toLowerCase().startsWith('recipient') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const [recipient, type, achievement, event, issuedAt, lang, sName, sTitle] =
      lines[i].split(',').map((s) => s.trim());
    const candidate = {
      recipient,
      type,
      achievement,
      event,
      issuedAt,
      lang: lang || 'es',
      signatory: { name: sName, title: sTitle },
    };
    const parsed = newConstanciaSchema.safeParse(candidate);
    if (parsed.success) items.push(parsed.data);
    else errors.push(`Fila ${i + 1}: ${parsed.error.issues[0]?.message}`);
  }
  return { items, errors };
}

export default function IssueConstancias() {
  const [csv, setCsv] = useState('');
  const [event, setEvent] = useState('');
  const [result, setResult] = useState<IssueResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  async function submit() {
    const { items, errors } = parseCsv(csv);
    setParseErrors(errors);
    if (!items.length) return;
    setBusy(true);
    try {
      setResult(await issueConstancias(items, event));
    } finally {
      setBusy(false);
    }
  }

  const urls = result?.issued.map((i) => i.url).join('\n') ?? '';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-secondary-800">
        Emitir constancias
      </h1>
      <p className="mt-1 text-sm text-secondary-500">
        Tipos válidos: {CONSTANCIA_TYPES.join(', ')}. CSV:
        recipient,type,achievement,event,issuedAt,lang,signatoryName,signatoryTitle
      </p>
      <input
        className="mt-4 w-full rounded border border-secondary-300 px-3 py-2"
        placeholder="Evento (etiqueta del lote)"
        value={event}
        onChange={(e) => setEvent(e.target.value)}
      />
      <textarea
        className="mt-3 h-48 w-full rounded border border-secondary-300 px-3 py-2 font-mono text-sm"
        placeholder="Pega filas CSV aquí"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <button
        onClick={submit}
        disabled={busy}
        className="mt-3 rounded-lg bg-primary-500 px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Emitiendo…' : 'Emitir'}
      </button>

      {parseErrors.length > 0 && (
        <ul className="mt-3 text-sm text-red-700">
          {parseErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className="mt-6">
          <p className="text-sm text-secondary-700">
            Emitidas: {result.issued.length} · Errores: {result.errors.length}
          </p>
          <textarea
            readOnly
            className="mt-2 h-40 w-full rounded border px-3 py-2 font-mono text-xs"
            value={urls}
          />
          <button
            onClick={() => navigator.clipboard.writeText(urls)}
            className="mt-2 rounded bg-secondary-600 px-4 py-1.5 text-sm text-white"
          >
            Copiar URLs
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the admin page (auth-gated)**

Create `src/pages/es/dashboard/admin/constancias/index.astro` using `DashboardLayout` with `requireRole={['admin']}` (this mirrors the existing `src/pages/es/dashboard/admin/index.astro`; `requireRole` is confirmed in `src/layouts/DashboardLayout.astro` and accepts `'admin'`):

```astro
---
import DashboardLayout from '@/layouts/DashboardLayout.astro';
import IssueConstancias from '@/components/constancias/IssueConstancias';
---

<DashboardLayout title="Constancias · SECiD" lang="es" requireRole={['admin']}>
  <IssueConstancias client:only="react" />
</DashboardLayout>
```

- [ ] **Step 3: Type-check + build**

Run: `npm run type-check && npm run build`
Expected: PASS; `dist/es/dashboard/admin/constancias/index.html` emitted.

- [ ] **Step 4: Commit**

```bash
git add src/components/constancias/IssueConstancias.tsx src/pages/es/dashboard/admin/constancias/index.astro
git commit -m "feat(constancias): admin issuance UI (single + CSV batch)"
```

---

## Task 13: E2E — verification page states

**Files:**

- Create: `tests/e2e/constancias.spec.ts`

- [ ] **Step 1: Write the E2E spec**

Create `tests/e2e/constancias.spec.ts`. Seed Firestore via the emulator (follow the seeding pattern in the existing E2E setup under `tests/global-setup.ts` / `tests/e2e/`), then:

```typescript
import { test, expect } from '@playwright/test';

const VALID = 'SECID-2026-X7K9Q4'; // seeded valid
const REVOKED = 'SECID-2026-REV0KD'; // seeded revoked (revoked:true)

test('valid constancia renders the card + valid banner', async ({ page }) => {
  await page.goto(`/constancias/?c=${VALID}`);
  await expect(page.getByText(/Constancia válida/i)).toBeVisible();
  await expect(page.locator('.constancia-card')).toBeVisible();
});

test('revoked constancia shows the revoked banner', async ({ page }) => {
  await page.goto(`/constancias/?c=${REVOKED}`);
  await expect(page.getByText(/Constancia revocada/i)).toBeVisible();
});

test('unknown code shows not-found', async ({ page }) => {
  await page.goto('/constancias/?c=SECID-2026-ZZZZZZ');
  await expect(page.getByText(/no encontrada/i)).toBeVisible();
});

test('pretty path redirects to canonical query URL', async ({ page }) => {
  await page.goto(`/constancias/${VALID}`);
  await expect(page).toHaveURL(new RegExp(`\\?c=${VALID}`));
});
```

> Implementer note: add the two seed docs in the E2E global setup (use the Admin SDK against the emulator, as existing E2E setup does). If the current E2E harness does not seed Firestore, gate these tests behind the emulator and seed inline in a `test.beforeAll` using `firebase/firestore` against `FIRESTORE_EMULATOR_HOST`.

- [ ] **Step 2: Run E2E**

Run: `npm run test:e2e -- constancias`
Expected: 4 tests PASS against the dev build + emulator.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/constancias.spec.ts
git commit -m "test(constancias): e2e verification page states + redirect"
```

---

## Task 14: Full verification pass + docs

**Files:**

- Modify: `docs/superpowers/specs/2026-06-10-constancias-verificables-design.md` (status note)

- [ ] **Step 1: Run the whole suite**

Run:

```bash
npm run type-check && npm run lint && npm run test && npm run build
```

Expected: all green; build emits constancias pages.

- [ ] **Step 2: Mark the spec implemented**

In the spec header `**Status:**` line, append: ` — v1 implemented 2026-06-13 (RBAC resource + Puppeteer PDF deferred to fase 2)`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-10-constancias-verificables-design.md
git commit -m "docs(constancias): mark v1 implemented"
```

---

## Self-review notes (coverage map)

- Data model → Task 2; rules → Task 4; store layer → Task 6; issuance function → Task 5; admin UI → Task 12; verification page + card + seal + QR → Tasks 8–10; routing/redirect → Tasks 10–11; i18n → Task 7; tests → Tasks 3,4,5,13; print PDF → Task 10 (`@media print` + button).
- **Deferred (flagged):** `constancias` RBAC resource (using `role==='admin'` instead — Decision 1); Puppeteer pre-generated PDFs (fase 2); per-event public index; personalized OG images; `listRecent` admin tab. These are spec "fase 2"/out-of-scope items, not v1 gaps.
- **Type consistency:** `NewConstancia` / `Constancia` / `IssueResult` defined in Task 2 and used identically in Tasks 5, 6, 9, 12. `generateCode` / `canonicalPayload` / `sha256Hex` defined in Task 3 and consumed in Task 5. Store method names `getConstancia` / `issueConstancias` / `revokeConstancia` consistent across Tasks 6, 10, 12.
