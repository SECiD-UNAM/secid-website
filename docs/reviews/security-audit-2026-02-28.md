# Security Audit: SECiD Website

**Date**: 2026-02-28
**Reviewer**: Centinela (QA Agent)
**Scope**: `src/` directory, `functions/src/`, middleware, API routes
**Branch**: feature/hub

---

## Summary

One critical vulnerability found: three Stripe payment API endpoints accept unauthenticated requests and can be called by any anonymous user. All other OWASP Top 10 categories are reasonably addressed, though several areas need improvement. No hardcoded secrets found in tracked files.

---

## OWASP Top 10 Systematic Check

### A01: Broken Access Control — CRITICAL FINDING

**[C-1] Payment API endpoints have no authentication**

All three payment API routes accept POST requests from any caller without verifying the caller is a logged-in user:

- `src/pages/api/create-payment-intent.ts` — creates a Stripe PaymentIntent for arbitrary amounts
- `src/pages/api/create-subscription.ts` — creates a Stripe customer and subscription
- `src/pages/api/create-invoice.ts` — creates a Stripe invoice for any customer ID

**Impact**: An anonymous attacker can:

1. Create subscriptions for arbitrary Stripe customer IDs they enumerate
2. Generate invoices charged to any customer ID
3. Create payment intents for arbitrary amounts
4. Enumerate valid Stripe customer IDs by observing error responses

**Evidence**: No `Authorization` header check, no `verifyIdToken` call, no session token validation exists in any of the three files. The middleware session validation only covers `/api/user/`, `/api/admin/`, `/dashboard` — not `/api/create-*` paths.

**Fix**:

```typescript
// At the top of each API handler, before processing:
const authHeader = request.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
const token = authHeader.substring(7);
try {
  // Verify with Firebase Admin SDK
  const decodedToken = await adminAuth.verifyIdToken(token);
  const uid = decodedToken.uid;
  // Then proceed with the operation, scoped to uid
} catch {
  return new Response(JSON.stringify({ error: 'Invalid token' }), {
    status: 401,
  });
}
```

Additionally, add `/api/create-` to the `protectedPaths` array in `src/middleware/index.ts`.

---

**[W-1] Admin auth is client-side only — no server-side enforcement**

The `/admin/*` pages use `AdminAuthGuard` and `DashboardLayout`'s `requireRole`, both of which are React components rendered client-side via `client:only="react"` or `client:load`. This means:

1. The HTML for the admin page is sent to the browser before the auth check runs
2. A user with JavaScript disabled or who intercepts the response can see the admin page markup
3. The actual data fetching from Firestore is protected by Firestore rules, but the page shell leaks

**Fix**: For `/admin/*` routes, add server-side auth verification in the Astro frontmatter using Firebase Admin SDK and redirect on the server if not authenticated.

---

**[S-1] DashboardLayout requireRole is declarative but unenforced server-side**

`src/layouts/DashboardLayout.astro:28` passes `requireRole` to `DashboardShell` as a prop. The shell is `client:only="react"`, meaning all role enforcement is in the browser.

---

### A02: Cryptographic Failures — PASS (with caveats)

- Stripe keys are loaded from `import.meta.env` / `process.env` — correct
- Firebase Auth tokens are verified via Firebase SDK — correct
- No passwords or secrets stored in plaintext found
- HTTPS enforced via Firebase Hosting `_headers` file

**Caveat**: `.env.test` is committed to git. While current values appear to be placeholders (fake Stripe test key format `pk_test_51234567890abcdefghijklmnop`), this pattern is dangerous — a real key could accidentally be committed here in the future. Recommend adding a pre-commit hook to reject any `pk_live_` or `sk_` patterns in tracked files.

---

### A03: Injection — PASS (with caveats)

- `src/lib/validation/sanitization.ts` implements `sanitizeHtml` (DOMPurify), `sanitizeText`, `sanitizeForDatabase` (MongoDB operator prevention), `sanitizeSearchQuery`
- These utilities are well-implemented
- Firestore uses structured queries, not string interpolation
- Redis `eval()` at `src/lib/cache/redis-client.ts:394` passes scripts as literals — not user-controlled input

**Caveat**: The sanitization utilities exist but are NOT called in any of the three payment API endpoints. Input from request bodies is used without sanitization (e.g., `body.description` goes directly into Stripe metadata). While Stripe itself sanitizes its inputs, this is a defense-in-depth gap.

---

### A04: Insecure Design — WARNING

**[W-2] Rate limiting does not cover payment API endpoints**

`src/middleware/index.ts:134` — the rate limiting middleware only applies to `/api/` paths AND only when `securityManager` is initialized. The payment API paths are under `/api/` so they should be covered, but the session validation middleware does NOT cover them. An attacker can call `POST /api/create-subscription` as fast as network allows.

**Fix**: Add payment endpoints explicitly to `captchaRequiredPaths` in the middleware, or add them to the rate-limited auth paths.

---

**[W-3] Event creation pages have missing form components (TODO state)**

`src/pages/en/dashboard/events/new.astro:87` and `src/pages/en/dashboard/events/edit/[id].astro:104` contain inline TODOs — no EventForm component exists. This means event creation is non-functional. If users can navigate to these pages, they see an incomplete UI. This is an insecure design issue: exposed incomplete features.

---

### A05: Security Misconfiguration — PASS

- CORS is restricted to `https://secid.mx` — not wildcard
- Security headers are set in middleware (CSP, HSTS, X-Frame-Options, etc.)
- `securetoken.googleapis.com` is correctly whitelisted in CSP
- Error handling middleware returns generic `Internal Server Error` — not stack traces
- `firebase.json` and `firestore.rules` are present

**Minor note**: The security manager initialization failure at `src/middleware/index.ts:21` fails silently with `console.warn`. If initialization fails in production, ALL security middleware (rate limiting, session validation, CAPTCHA) is bypassed. Consider failing hard or alerting on this.

---

### A06: Vulnerable Components — WARNING

```
npm audit results:
  Critical: 0
  High: 8
  Moderate: 12
  Total: 20
```

**High severity findings:**

- `rollup 4.0.0 - 4.58.0` — Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc). Fix: `npm audit fix`
- `minimatch` — used by `@typescript-eslint/typescript-estree` — ReDoS vulnerability

These are dev/build toolchain dependencies, not runtime. They do not affect the deployed application but do affect CI/CD pipeline security. Fix is available: `npm audit fix`.

---

### A07: Authentication Failures — PASS (with note)

- Firebase Auth handles authentication
- `AuthContext` properly tracks auth state
- `AdminAuthGuard` validates `isAdmin`/`isModerator` from Firestore profile
- Session persistence uses Firebase's built-in mechanisms
- Password policy is enforced in `SignUpForm` (length, uppercase, numbers, special)

**Note on 2FA**: `src/lib/auth/two-factor.ts` contains `console.log('Mock: 2FA enabled with code:', verificationCode)` at lines 191, 234, 258, 284, 329 — this means 2FA is **mocked** and does not actually work. Users who believe they have 2FA enabled are not actually protected. This is an A07 concern if 2FA is marketed as a feature.

---

### A08: Data Integrity — PASS

- Stripe webhook signature verification is implemented correctly in `src/lib/stripe/stripe-webhooks.ts` via `verifyWebhookSignature`
- `stripe-signature` header is checked before processing any webhook event

---

### A09: Logging Failures — WARNING

**[W-4] Security events logged to console instead of structured logger**

`src/lib/security-config.ts:364,462` uses `console.debug` and `console.log` for security and audit events. These logs are not persisted, not queryable, and will be lost in production environments where stdout is not captured.

The project has `src/lib/logger.ts` with a structured logger. Security events should use this.

**[W-5] Sensitive data potentially exposed in logs**

`src/contexts/AuthContext.tsx:175`: `console.log('Authenticated user:', firebaseUser['email'])` — user PII (email) is logged to browser console. This is visible to anyone with browser devtools access.

`src/components/admin/AdminAuthGuard.tsx:64`: `console.warn('Unauthorized admin access attempt:', { userId, email, ... })` — logs user email on unauthorized attempts, which is acceptable for security logging but should use the structured logger.

---

### A10: SSRF — PASS

No server-side URL fetching based on user-controlled input found. External calls are only to Stripe and Firebase SDKs with fixed endpoints.

---

## Secrets Scan — PASS

- `.env` files are gitignored ✓
- No `sk_live_`, `pk_live_`, `AIzaSy` values found in tracked files ✓
- `.env.test` is tracked in git, contains only placeholder/test values ✓
- `STRIPE_SECRET_KEY` is read from `process.env`/`import.meta.env` in all lib files ✓

**Recommendation**: Add git hooks to prevent future credential leaks (e.g., `git-secrets` or a pre-commit hook checking for `sk_live_`/`pk_live_` patterns).

---

## Dependency Audit

```
High (8): rollup path traversal, minimatch ReDoS
Moderate (12): various typescript-eslint versions, other toolchain deps
Critical (0): none
```

Fix command: `npm audit fix` resolves the rollup issue without breaking changes.

---

## Architecture Security Review

**Positive**: Security middleware pipeline is well-structured: error handling → security headers → rate limiting → session validation → CAPTCHA → CORS → logging.

**Gap**: The middleware `protectedPaths` and `captchaRequiredPaths` arrays do not include the payment API endpoints. This is the root cause of finding C-1.

---

## Test Strategy for Security-Critical Paths

| Path                         | Current Test Coverage   | Status       |
| ---------------------------- | ----------------------- | ------------ |
| `/api/create-payment-intent` | 0 running tests         | CRITICAL GAP |
| `/api/create-subscription`   | 0 running tests         | CRITICAL GAP |
| `/api/create-invoice`        | 0 running tests         | CRITICAL GAP |
| Auth flow (login/signup)     | Tests exist but SKIPPED | GAP          |
| Admin authorization          | Tests exist but SKIPPED | GAP          |

---

## Security Verification Checklist (DO-CONFIRM)

- [x] No hardcoded secrets in tracked files
- [ ] All user input validated at API boundaries — FAIL (payment APIs)
- [x] Database queries parameterized (Firestore structured queries)
- [ ] Auth/authz on all protected endpoints — FAIL (3 payment API endpoints)
- [ ] Dependencies have no known critical CVEs — PASS (8 high, 0 critical)

---

## Verdict

**CHANGES REQUIRED**

One Critical finding (C-1: unauthenticated payment API endpoints) blocks merge. This must be resolved before any production deployment. The finding is exploitable now — any anonymous user can POST to `/api/create-subscription` and create Stripe objects.

---

## Findings by Priority

### Critical (must fix before merge)

1. **[C-1]** Unauthenticated payment API endpoints
   - Files: `src/pages/api/create-payment-intent.ts`, `src/pages/api/create-subscription.ts`, `src/pages/api/create-invoice.ts`
   - Fix: Add Firebase `verifyIdToken` check at the top of each handler; add paths to middleware session validation

### Warning (should fix)

2. **[W-1]** Admin pages use client-only auth guard — no server-side protection
3. **[W-2]** Payment endpoints not covered by rate limiting middleware
4. **[W-3]** 2FA is mocked — not functional despite being in the UI
5. **[W-4]** Security/audit events logged to console instead of structured logger
6. **[W-5]** User PII (email) logged to browser console in AuthContext

### Suggestion (consider)

7. **[S-1]** Add pre-commit hook to reject live API key patterns in tracked files
8. **[S-2]** Fail hard (not silently) if security manager initialization fails
9. **[S-3]** Add sanitization calls to payment API request bodies

---

_Report location: `docs/reviews/security-audit-2026-02-28.md`_
_Open findings tracker: `docs/reviews/security-audit-trail.md` (does not exist — recommend creating)_
