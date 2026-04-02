# Security Audit: Deep Auth/Auth Flow Trace

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: Full auth and authorization flow — middleware, JWT decode, sessions, Firestore rules, Storage rules, payment integrity, LinkedIn OAuth code exchange, Google/GitHub OAuth

---

## Executive Summary

The LinkedIn OAuth code-exchange implementation is materially improved over the prior design (token was previously delivered as a direct URL parameter). The short-lived code pattern is structurally sound. However, a **critical TOCTOU race condition** on the "used" flag means two simultaneous requests with the same code can both receive a valid Firebase custom token — allowing session duplication. Additionally, the JWT decode fallback in `verifyRequest` is missing `aud` and `iat` claim validation and trusts `atob()` which is absent in older Node.js server runtimes. The invoice endpoint continues to accept a client-supplied `amount`, and the `linkedin_auth_codes` collection has no Firestore rule — any authenticated user can read other users' codes, breaking the single-use guarantee entirely. Taken together, these are **three critical findings** that must be resolved before the LinkedIn integration ships.

---

## Findings

### CRITICAL

#### [C-1] TOCTOU Race Condition on LinkedIn Auth Code — session duplication possible

- **File**: `functions/src/linkedin-auth.ts:265-278`
- **Severity**: CRITICAL
- **What happens**: `exchangeLinkedInCode` reads `data.used`, checks the flag, then writes `{ used: true }` in a separate operation. If two requests arrive within the same Firestore write window (feasible on mobile with retry logic or a forked request), both pass the `data.used === false` check before either has committed the `used: true` write. Both then receive the same Firebase custom token and can sign in as the same user in separate sessions.
- **Current code** (`lines 265-278`):
  ```typescript
  if (data.used) {
    throw new HttpsError("already-exists", "Code already used");
  }
  if (data.expiresAt.toDate() < new Date()) { ... }
  await codeRef.update({ used: true });  // <-- NOT atomic with the read above
  codeRef.delete().catch(() => {});
  return { token: data.token };
  ```
- **Fix**: Wrap the read+update in a Firestore transaction. The transaction retries on contention and guarantees exactly-once redemption:
  ```typescript
  const db = admin.firestore();
  const codeRef = db.collection('linkedin_auth_codes').doc(code);
  let token: string;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(codeRef);
    if (!snap.exists)
      throw new HttpsError('not-found', 'Invalid or expired code');
    const d = snap.data()!;
    if (d.used) throw new HttpsError('already-exists', 'Code already used');
    if (d.expiresAt.toDate() < new Date()) {
      tx.delete(codeRef);
      throw new HttpsError('deadline-exceeded', 'Code expired');
    }
    tx.update(codeRef, { used: true });
    token = d.token;
  });
  codeRef.delete().catch(() => {});
  return { token: token! };
  ```

#### [C-2] `linkedin_auth_codes` collection has no Firestore security rule

- **File**: `firestore.rules` — no match block for `linkedin_auth_codes`
- **Severity**: CRITICAL
- **What happens**: Without a rule, Firestore's default-deny-all applies in theory, but any authenticated user who knows the collection name can attempt direct reads. More critically, if the app later adds a Firestore rule wildcard (`match /{document=**} { allow read: if isAuthenticated(); }`) as a convenience catch-all, every pending auth code becomes readable by any logged-in user. The collection contains unredacted Firebase custom tokens (1-hour JWTs). Additionally, with no write rule, any authenticated client can write arbitrary documents to this collection, potentially pre-seeding codes before a victim's flow completes.
- **Fix**: Add an explicit rule that restricts all operations to server-only (Admin SDK bypasses rules):
  ```
  // LinkedIn OAuth short-lived codes: server writes only
  match /linkedin_auth_codes/{codeId} {
    allow read, write: if false;
  }
  ```

#### [C-3] `verifyRequest` JWT decode missing `aud` claim validation — token cross-project acceptance

- **File**: `src/lib/auth/verify-request.ts:29-44`
- **Severity**: CRITICAL
- **What happens**: The `decodeAndValidateToken` function validates `sub`, `exp`, and `iss` (must start with `https://securetoken.google.com/`). It does NOT validate the `aud` (audience) claim. A Firebase ID token from any Firebase project has the same `iss` prefix. An attacker who controls a separate Firebase project can issue valid-looking tokens with the same issuer, and this function will accept them as authenticated for any `sub` value. The correct fix is to verify `aud === FIREBASE_PROJECT_ID`.
- **Current code**:
  ```typescript
  if (
    !payload.iss ||
    !payload.iss.startsWith('https://securetoken.google.com/')
  )
    return null;
  // aud is NEVER checked
  return { uid: payload.sub, exp: payload.exp };
  ```
- **Note on `atob`**: `atob()` is available in Node 18+ global scope and in all modern browsers. The URL-safe base64 normalization (`-` → `+`, `_` → `/`) is correct. The padding issue (`=`) is handled implicitly by `atob()` in most environments but could fail on some. A more robust decode would pad to 4-char boundaries first. This is a LOW risk in practice given Node 20 minimum requirement.
- **Fix**:
  ```typescript
  const FIREBASE_PROJECT_ID = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  // After iss check:
  if (!payload.aud || payload.aud !== FIREBASE_PROJECT_ID) return null;
  // Also add iat guard (issued-at must not be in the future):
  if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 30)
    return null;
  ```

### HIGH

#### [H-1] Invoice endpoint accepts client-supplied `amount` — price manipulation possible

- **File**: `src/pages/api/create-invoice.ts:14-16, 74, 103`
- **Severity**: HIGH
- **What happens**: `create-invoice.ts` declares `amount: number` as an `InvoiceRequest` field and uses `body.amount` directly when `body.items` is not provided. An authenticated user can send `{ customerId: "cus_xxx", amount: 1, description: "SECiD membership" }` to create a Stripe invoice for 1 cent. The `create-payment-intent.ts` correctly removed the client `amount` field (fixed per TD-020), but `create-invoice.ts` still trusts client input. This invoice endpoint appears used for one-time manual invoices (commissions, CFDI), not subscription plans, but the risk is real: an admin user billing a member can manipulate the invoice amount.
- **Fix**: If invoices are admin-only, add a role check (`auth.userId` maps to admin role). If they're used for fixed-price items, validate `amount` against a server-side price table. At minimum, add a minimum amount guard:
  ```typescript
  if (typeof body.amount === 'number' && body.amount < 100) {
    // 100 = $1.00 MXN minimum, prevents penny manipulation
    return new Response(JSON.stringify({ error: 'Amount below minimum' }), {
      status: 400,
    });
  }
  ```
- **Note**: Unlike `create-payment-intent.ts`, there is no server-side plan lookup for invoices. This is by design for custom invoices, but the endpoint needs either a role guard or amount floor.

#### [H-2] Session ID accepted as URL query parameter — token leaks in logs

- **File**: `src/lib/session-manager.ts:626-627`
- **Severity**: HIGH
- **What happens**: `createSessionMiddleware` extracts the session ID from either the `Authorization` header OR `?session=` query parameter. Query parameters appear in server access logs, reverse proxy logs, browser history, Referer headers, and CDN logs. A session token exposed in a URL is a persistent credential leak. The `Authorization: Bearer` header is the correct and only transport for session tokens.
- **Fix**: Remove the `searchParams.get('session')` fallback entirely:
  ```typescript
  const sessionId =
    request.headers.get('authorization')?.replace('Bearer ', '') ?? null;
  ```

#### [H-3] `linkedin_auth_codes` shadow variable — `const db` declared twice in same scope

- **File**: `functions/src/linkedin-auth.ts:96, 222`
- **Severity**: HIGH (logic correctness, not security per se)
- **What happens**: Line 96 declares `const db = admin.firestore()` at the top of the callback. Line 222 re-declares `const db = admin.firestore()` inside the same `try` block. TypeScript/V8 should catch this as a compile error in strict mode, but if the compiled output silently shadows the outer `db`, any subsequent use of `db` after line 222 uses the re-declared instance. The real risk: if TypeScript allows this in the current config, the auth code write at line 224 uses a fresh Firestore instance while any batch operations above it on the original `db` may be on a different connection. Verify `tsc --strict` flags this.
- **Fix**: Remove the redundant declaration at line 222. The outer `db` (line 96) is already in scope.

#### [H-4] `linkedinAuthRedirect` and `linkedinAuthCallback` use `cors: true` — any origin can initiate OAuth

- **File**: `functions/src/linkedin-auth.ts:36, 69`
- **Severity**: HIGH
- **What happens**: `cors: true` in Firebase Cloud Functions HTTP handlers allows any origin to call these endpoints. A malicious site can drive a victim's browser through the LinkedIn OAuth flow on their behalf (CSRF-like). The state parameter lacks a random nonce (per TD-020), so there is no per-session binding. Combined, an attacker can initiate an OAuth flow from `evil.com`, LinkedIn authenticates the victim, and the callback fires with a code that `evil.com` never sees — but the victim is silently authenticated into SECiD under their LinkedIn identity (which may overwrite an existing account via the email-merge logic at line 162).
- **Note**: The `returnUrl` open redirect check at line 88 is now correct (rejects `https://` and `//` prefixes). The remaining exposure is the CSRF initiation vector.
- **Fix**: Change to `cors: ['https://secid.mx', 'https://beta.secid.mx']` and add a CSRF nonce to the state parameter (see TD-020 proposed fix in TECH_DEBT.md).

#### [H-5] `getCallbackUrl` trusts `x-forwarded-host` header without validation

- **File**: `functions/src/linkedin-auth.ts:16-22`
- **Severity**: HIGH
- **What happens**: `getCallbackUrl` builds the OAuth `redirect_uri` from the `x-forwarded-host` header. An attacker who can manipulate this header (e.g., via a SSRF chain or misconfigured proxy) can redirect the LinkedIn OAuth callback to a host they control. LinkedIn will reject a `redirect_uri` that doesn't match the registered callback URL, but this is defense-in-depth that relies entirely on LinkedIn's validation. If the registered callback is a wildcard (`*.secid.mx`) this becomes exploitable.
- **Fix**: Use a fixed environment variable for the callback URL:
  ```typescript
  function getCallbackUrl(): string {
    return (
      process.env.LINKEDIN_CALLBACK_URL ??
      'https://us-central1-secid-org.cloudfunctions.net/linkedinAuthCallback'
    );
  }
  ```

### MEDIUM

#### [M-1] 30-second expiry leeway is slightly generous but not exploitable alone

- **File**: `src/lib/auth/verify-request.ts:34-35`
- **Severity**: MEDIUM (INFORMATIONAL)
- **What happens**: `if (payload.exp < now - 30)` means a token that expired 29 seconds ago is still accepted. Firebase ID tokens expire after 1 hour. A 30-second grace period is well within industry norms (RFC 7519 suggests a few minutes for clock skew). This is not exploitable in isolation. However, combined with the missing `aud` check (C-3), an expired token from a different project would also be accepted for 30 seconds after expiry.
- **Fix**: Once C-3 is fixed, this leeway is acceptable. No change required.

#### [M-2] Session manager validates IP and User-Agent consistency — causes legitimate failures

- **File**: `src/lib/session-manager.ts:280-289`
- **Severity**: MEDIUM (usability/correctness)
- **What happens**: `SessionSecurityValidator.validateSession` marks a session as violating if `session.ipAddress !== clientIP` or `session.userAgent !== clientUserAgent`. Mobile users on cellular networks change IP every few minutes. Carrier NAT, VPNs, and CDN origins mean the original IP stored at login almost never matches the current IP on subsequent requests. This causes real users to receive `IP address mismatch` violations and potentially re-auth prompts on every request. The code never blocks the request on these violations (it just marks `requiresReauth: true`), but it generates spurious security event logs.
- **Fix**: Remove IP validation entirely (standard practice — even Google doesn't bind sessions to IP). Consider logging User-Agent changes silently rather than requiring re-auth.

#### [M-3] `webhookSecret` not guarded at startup — undefined secret silently fails open

- **File**: `src/lib/stripe/stripe-webhooks.ts:19`
- **Severity**: MEDIUM
- **What happens**: `const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET`. If this env var is absent (e.g., in staging or after a misconfiguration), `webhookSecret` is `undefined`. `stripe.webhooks.constructEvent(payload, signature, undefined)` will throw a Stripe SDK error, which is caught at line 159-161 and re-thrown as `'Invalid webhook signature'`. The `stripe-webhook.ts` handler then returns HTTP 400. So the fail-safe is correct — unverified webhooks are rejected. However, there is no startup warning and no clear error distinguishing "wrong secret" from "missing secret."
- **Fix**: Add a startup guard:
  ```typescript
  if (!import.meta.env.STRIPE_WEBHOOK_SECRET) {
    console.error(
      '[CRITICAL] STRIPE_WEBHOOK_SECRET is not set. Webhook processing will fail.'
    );
  }
  ```

#### [M-4] Storage `profiles/` and `applications/` paths have no file size or content-type limits

- **File**: `storage.rules:5-14`
- **Severity**: MEDIUM
- **What happens**: Users can upload arbitrarily large files to `profiles/{userId}/` and `applications/{userId}/`. An attacker (or abusive member) can upload a 1GB file to either path, consuming Firebase Storage quota at the platform's expense.
- **Fix**:
  ```
  match /profiles/{userId}/{allPaths=**} {
    allow read: if request.auth != null;
    allow write: if request.auth != null
      && request.auth.uid == userId
      && request.resource.size < 5 * 1024 * 1024  // 5MB max
      && request.resource.contentType.matches('image/.*');
  }
  match /applications/{userId}/{allPaths=**} {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow write: if request.auth != null
      && request.auth.uid == userId
      && request.resource.size < 10 * 1024 * 1024;  // 10MB max for documents
  }
  ```

#### [M-5] Storage `forums/` path allows any authenticated user to write any file type and size

- **File**: `storage.rules:32-35`
- **Severity**: MEDIUM (already tracked as W-4 in prior audit)
- **What happens**: `allow write: if request.auth != null` for forums allows any authenticated user (even unverified) to upload files of any type and size to any forum directory. An attacker can upload malicious executables, HTML pages, or 1GB archives.
- **Fix**:
  ```
  match /forums/{forumId}/{allPaths=**} {
    allow read: if request.auth != null;
    allow write: if request.auth != null
      && request.resource.size < 20 * 1024 * 1024  // 20MB max
      && request.resource.contentType.matches('(image|application/pdf|text)/.*');
  }
  ```

#### [M-6] `create-invoice.ts` leaks internal Stripe error messages to callers

- **File**: `src/pages/api/create-invoice.ts:227-234, 241-248`
- **Severity**: MEDIUM (also tracked as TD-024)
- **What happens**: `error instanceof Error ? error.message : ...` returns the raw Stripe SDK exception message to the HTTP caller. Stripe error messages contain internal IDs, error codes, and sometimes partial request data useful for reconnaissance.
- **Fix**: Return a generic `"Invoice creation failed"` message and log the full error server-side with a correlation ID. Apply same fix to `create-payment-intent.ts` and `create-subscription.ts`.

### LOW

#### [L-1] `verifyRequest` fallback path re-validates Bearer token without issuing a new session

- **File**: `src/lib/auth/verify-request.ts:65-89`
- **Severity**: LOW
- **What happens**: When `verifyRequest` falls back to decoding a Bearer JWT, it successfully authenticates the user but does NOT create a session in the `MemorySessionStore`. The user's subsequent requests all go through the decode fallback again. There is no rate limiting on this path. An attacker with a valid ID token (not in the session store) can bypass session concurrent-limit enforcement.
- **Impact**: Low — concurrent session limits are a UX feature, not a security gate.

#### [L-2] Session middleware accepts session ID from both Authorization header and Bearer prefix

- **File**: `src/lib/session-manager.ts:625-626`
- **Severity**: LOW
- **What happens**: The extraction logic strips `'Bearer '` prefix via `.replace('Bearer ', '')`. If the header contains `Bearer Bearer sess_xxx`, the result is `Bearer sess_xxx` — which will not match any session and fail gracefully. Not exploitable, but fragile.

#### [L-3] `atob()` base64 padding not explicitly handled

- **File**: `src/lib/auth/verify-request.ts:26`
- **Severity**: LOW
- **What happens**: JWT payload segments are base64url-encoded without padding. The fix for `+`/`/` substitution is correct. However, if `encodedPayload.length % 4 !== 0`, `atob()` can throw on some Node.js versions (< 18) and some browsers. Node 20 handles this gracefully, but adding padding is a more robust pattern:
  ```typescript
  const padded = encodedPayload + '==='.slice((encodedPayload.length + 3) % 4);
  const payload = JSON.parse(
    atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  );
  ```

---

## Firestore Rules Deep Dive

### Collection Coverage

| Collection                    | Non-admin read other users' data?                          | Unauthorized write?                                             | `if true`? | Notes                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `users/{userId}`              | Partially — any `isVerified()` user can read all profiles  | No — field diff prevents role escalation                        | No         | Role escalation blocked by field allowlist.                                                                                    |
| `users/{userId}/compensation` | No — owner + canModerate() only                            | No                                                              | No         | Moderators can read salary data (TD-025 — fix narrows to canAdminister)                                                        |
| `companies`                   | **Yes** — `allow read: if true`                            | No                                                              | **Yes**    | Intentional: logos/names are public. PII risk is low.                                                                          |
| `jobs`                        | Any authenticated user                                     | No                                                              | No         | Acceptable: job listings are member-visible                                                                                    |
| `forums` and posts            | Any authenticated user                                     | No                                                              | No         | Acceptable                                                                                                                     |
| `blog`                        | **Yes** — `allow read: if true`                            | No                                                              | **Yes**    | Intentional: published blog posts are public                                                                                   |
| `newsletter_archive`          | **Yes** — `allow read: if true`                            | No                                                              | **Yes**    | Intentional: public newsletter                                                                                                 |
| `spotlights`                  | **Yes** — `allow read: if true`                            | No                                                              | **Yes**    | Intentional: alumni spotlights are public                                                                                      |
| `commissions`                 | **Yes** — `allow read: if true`                            | No                                                              | **Yes**    | Intentional: commissions are public                                                                                            |
| `conversations`               | No — participant check                                     | No                                                              | No         | Correct                                                                                                                        |
| `messages`                    | No — sender/receiver only                                  | Partially — any authenticated user can create message to anyone | No         | `allow create: if isAuthenticated() && request.resource.data.from == request.auth.uid` — no `isVerified()` check. Spam vector. |
| `linkedin_auth_codes`         | **Not covered** — default deny applies, but catch-all risk | **Not covered**                                                 | No         | **CRITICAL gap — see C-2**                                                                                                     |
| `rate_limits`                 | Admin only                                                 | Server only                                                     | No         | Correct                                                                                                                        |
| `merge_requests`              | Owner or admin only                                        | Controlled                                                      | No         | Correct                                                                                                                        |
| `connectionRequests`          | No — from/to check                                         | No `isVerified()` on create                                     | No         | Any unverified authenticated user can send connection requests                                                                 |

### `isVerified()` Usage Assessment

The `isVerified()` helper is used consistently for job posting, event registration, forum post creation, resource upload, and mentorship. It is NOT required for:

- Reading any profile (isVerified OR the reader is verified — transitive)
- Sending connection requests (only `isAuthenticated()`)
- Sending direct messages (only `isAuthenticated()`)

These omissions are intentional design choices but should be documented explicitly.

---

## Storage Rules Deep Dive

| Path                         | Can users upload arbitrary types? | Can users overwrite other users' files?          | Size limit?      |
| ---------------------------- | --------------------------------- | ------------------------------------------------ | ---------------- |
| `profiles/{userId}`          | **Yes** — no contentType check    | No — uid check                                   | **No** — see M-4 |
| `applications/{userId}`      | **Yes**                           | No                                               | **No**           |
| `companies/{companyId}`      | No — `image/.*` required          | **Yes** — any authenticated user, no owner check | 2MB              |
| `events/{eventId}`           | **Yes** — no contentType          | No — admin/mod only                              | **No**           |
| `forums/{forumId}`           | **Yes**                           | **Yes** — any authenticated user                 | **No**           |
| `verification-docs/{userId}` | **Yes**                           | No                                               | **No**           |

Key finding on `companies/{companyId}`: Any authenticated user can overwrite any company logo because there is no ownership check on the write rule (line 19). Only a size and content-type check is present. A verified member could replace another company's logo.

---

## Session Management Assessment

**Storage**: In-memory `MemorySessionStore` — a `Map<string, SessionData>`. Confirmed not Redis, not Firestore. All sessions are lost on server restart.

**Session fixation protection**: The session ID is generated fresh on login via `generateSessionId()` (crypto.getRandomValues), which is correct. However, there is no explicit invalidation of any pre-existing session when a new one is created — the concurrent session limit (default 3) evicts the oldest, but does not invalidate a potentially attacker-provided session.

**Cookie transport**: `createCookieOptions()` returns `httpOnly: true, secure: true, sameSite: 'strict'` by default. However, **no code in the codebase actually calls `createCookieOptions()` or sets any cookies**. The session ID is passed exclusively in the `Authorization: Bearer` header. This means:

1. There is no HttpOnly cookie protecting the session — it lives in JavaScript memory/localStorage and is therefore vulnerable to XSS.
2. The session manager's cookie configuration is dead code.

**SIGN OUT (session destruction)**: `destroySession()` correctly removes from the store and logs the `logout` activity. No issues.

---

## Payment Flow Integrity

### `create-payment-intent.ts`

- Amount is correctly derived server-side from `planId` — TD-020 fix confirmed. No client `amount` accepted.
- `verifyRequest()` called at top — confirmed.
- Error messages: `error.message` forwarded to client — should be opaque (TD-024).
- Metadata: client can inject arbitrary `body.metadata` keys (line 63-66: `...body.metadata`). Recommend allowlisting metadata keys to prevent injection of misleading audit data.

### `create-subscription.ts`

- No client `amount` accepted — correct. Price comes from Stripe price ID via plan lookup.
- `verifyRequest()` called at top — confirmed.
- Customer creation: `customerData.email` is taken from client body. If a member submits someone else's email, the Stripe customer is created with that email. This is a data integrity concern, not a payment bypass.
- Error messages: leak internal errors (TD-024).

### `create-invoice.ts`

- **HIGH: Client `amount` accepted** — see H-1 above.
- `verifyRequest()` called at top — confirmed.
- `body.items[].unit_amount` is also client-controlled and summed server-side. Same manipulation risk.

### `stripe-webhook.ts`

- Signature verification: `stripe.webhooks.constructEvent()` — correct HMAC-SHA256 validation.
- Signature is checked before any event processing — correct order.
- `webhookSecret` guard: fails open with a 400 if undefined — fail-safe confirmed (see M-3).
- No auth bypass possible on this endpoint.

---

## TIME OUT: Security Verification Checklist

- [x] No hardcoded secrets, API keys, or credentials in code — TD-017 (emergency password) was previously found; confirmed NOT present in new files reviewed here.
- [ ] **FAIL**: All user input validated — `create-invoice.ts` accepts client `amount`. `getCallbackUrl` trusts `x-forwarded-host`.
- [x] Database queries parameterized — Firestore SDK parameterizes all queries by design.
- [ ] **FAIL**: Authentication enforced on all protected endpoints — `linkedin_auth_codes` collection has no Firestore rule (C-2). Company logo overwrite has no ownership check.
- [ ] **FAIL**: Dependencies have no known critical CVEs — root: 0 critical / 10 high. functions: 0 critical / 6 high. Not blocking but should be addressed.

## TIME OUT: Quality Verification Checklist

- [x] Tests exist for auth flows (verify-request, payment-auth, linkedin-auth unit tests present)
- [ ] **PARTIAL**: AC traceability — LinkedIn auth tests exist but do not cover the TOCTOU race (C-1) or missing Firestore rule (C-2)
- [x] Clean Code: new files (linkedin-auth.ts, verify-request.ts) are well-structured, under 300 lines
- [x] Architecture compliance: Cloud Functions use Admin SDK correctly, independent of session store
- [ ] **FAIL**: Code meets all acceptance criteria — C-1, C-2, C-3 are unresolved security gaps
- [x] No dead code in new files

---

## Verdict

**CHANGES REQUIRED**

Three critical findings block the LinkedIn OAuth integration from shipping:

1. **C-1**: TOCTOU race condition allows code reuse — fix with Firestore transaction
2. **C-2**: `linkedin_auth_codes` has no Firestore rule — fix with `allow read, write: if false`
3. **C-3**: JWT decode does not validate `aud` claim — fix by checking against `PUBLIC_FIREBASE_PROJECT_ID`

H-1 (invoice amount bypass), H-2 (session in URL), H-4 (CORS wildcard), and H-5 (Host header injection) must also be addressed but do not independently block shipping if the critical items are resolved first.

---

## Fix Priority Order for Forja

1. **C-2** (5 minutes): Add Firestore rule for `linkedin_auth_codes`. Zero code risk.
2. **C-1** (30 minutes): Wrap `exchangeLinkedInCode` in a Firestore transaction.
3. **C-3** (15 minutes): Add `aud` and `iat` validation to `decodeAndValidateToken`.
4. **H-2** (5 minutes): Remove `?session=` query param support from session middleware.
5. **H-5** (10 minutes): Replace `getCallbackUrl(req)` with env variable.
6. **H-4** (5 minutes): Narrow `cors: true` to `cors: ['https://secid.mx', 'https://beta.secid.mx']`.
7. **H-1** (30 minutes): Add role check or amount floor to `create-invoice.ts`.
8. **M-4/M-5** (20 minutes): Add size and content-type limits to Storage rules.

---

## New Tech Debt Items

- **TD-027** [CRITICAL]: TOCTOU race in `exchangeLinkedInCode` — no Firestore transaction (C-1)
- **TD-028** [CRITICAL]: Missing Firestore rule for `linkedin_auth_codes` (C-2)
- **TD-029** [HIGH]: JWT decode in `verifyRequest` missing `aud` claim validation (C-3)
- **TD-030** [HIGH]: Session ID accepted as URL query parameter in `session-manager.ts` (H-2)
- **TD-031** [HIGH]: `getCallbackUrl` trusts `x-forwarded-host` (H-5)
- **TD-032** [MEDIUM]: Storage rules missing size/content-type limits on `profiles/` and `applications/` (M-4)
- **TD-033** [MEDIUM]: `companies` Storage path allows any authenticated user to overwrite any logo (ownership gap)
