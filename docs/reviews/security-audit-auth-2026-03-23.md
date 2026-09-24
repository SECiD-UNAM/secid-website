# Security Audit: Authentication and Access Control

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: API routes (`src/pages/api/`), middleware (`src/middleware/`), auth library (`src/lib/auth/`, `src/lib/session-manager.ts`), Firestore rules, Storage rules, AdminLayout, AdminAuthGuard, new LinkedIn Cloud Functions (`functions/src/parse-linkedin-pdf.ts`, `functions/src/linkedin-auth.ts`)

---

## Executive Summary

The platform has significantly improved its auth posture since the last audit (2026-02-28): payment APIs are now authenticated, the middleware `protectedPaths` list covers `/api/create-*`, and 2FA is correctly disabled rather than mocked. However, **one Critical vulnerability was found that must be resolved before any release**: a hardcoded emergency access password in `AdminLayout.astro` that grants client-side admin state escalation via `localStorage`. Two High-severity findings also require prompt remediation.

---

## Findings

### Critical (must fix before merge)

#### [C-1] Hardcoded emergency admin backdoor with plaintext password

- **File**: `src/layouts/AdminLayout.astro:243-255`
- **Impact**: Any visitor to any `/admin` page can open the browser console DevTools or use the keyboard shortcut `Ctrl+Shift+Alt+A`, enter `SECID_EMERGENCY_2024`, and set `localStorage['emergency_admin'] = 'true'`. The password is visible in the page source to anyone who views source. While `AdminAuthGuard.tsx` does not currently read `emergency_admin` from localStorage, this backdoor establishes a pattern that is one implementation step away from granting real admin bypass. Additionally: (1) the plaintext password `SECID_EMERGENCY_2024` is committed to git history and deployed in production HTML; (2) any future developer could inadvertently wire this flag into the auth check; (3) it is currently dead code that runs on every admin page load and writes to the DOM.
- **Code snippet**:
  ```js
  // Emergency admin access key combination (Ctrl+Shift+Alt+A)
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'A') {
      const password = prompt('Contraseña de emergencia:');
      if (password === 'SECID_EMERGENCY_2024') {
        console.log('Emergency admin access granted');
        localStorage.setItem('emergency_admin', 'true');
        window.location.reload();
      }
    }
  });
  ```
- **Fix**: Remove the entire `<!-- Emergency admin access -->` script block from `AdminLayout.astro`. Real emergency admin access should go through Firebase Console directly (set custom claims via Admin SDK). There is no legitimate use case for a client-side emergency backdoor.

---

### High (should fix)

#### [H-1] `verifyRequest` does not cryptographically verify the Firebase ID token — session-store dependency creates single point of failure

- **File**: `src/lib/auth/verify-request.ts:18-44` and `src/lib/session-manager.ts:622-671`
- **Impact**: The `verifyRequest` function returns `authenticated: true` only when `(request as any).session` is populated by the session middleware from the in-memory `MemorySessionStore`. It does NOT independently verify Firebase ID tokens. If the server restarts (e.g., cold start, deploy, crash), the in-memory session store is empty and ALL authenticated API requests will fail with 401 even for valid Firebase users. Additionally, if `createSecurityManagerFromEnv()` throws (line 19-23 of middleware/index.ts), `securityManager` remains null, the session middleware is completely skipped, and `verifyRequest` will then reject every request regardless of auth header content. The comment "Defense-in-depth, also enforced by middleware" on lines 24-25 of `create-payment-intent.ts` is accurate — but the defense is incomplete because neither layer validates the Firebase JWT independently.
- **Fix**: In `verify-request.ts`, add Firebase Admin SDK ID token verification as the fallback when `request.session` is absent:

  ```ts
  import { adminAuth } from '@/lib/firebase-admin';

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.replace('Bearer ', '');
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return { authenticated: true, userId: decoded.uid };
    } catch {
      return { authenticated: false, userId: null, error: 'Invalid token' };
    }
  }
  ```

  This makes the payment APIs resilient to session store restarts and removes the single point of failure.

#### [H-2] LinkedIn OAuth callback passes Firebase custom token as a URL query parameter

- **File**: `functions/src/linkedin-auth.ts:67-end`
- **Impact**: Firebase custom tokens passed as URL query parameters are logged in: server access logs, browser history, Referer headers when navigating to the next page, and any analytics/monitoring tools that capture URL parameters. A custom token is valid for 1 hour and can be exchanged for a Firebase ID token. An attacker with access to any of these logs can impersonate any user who completed LinkedIn OAuth during the exposure window.
- **Fix**: Use a one-time code pattern instead. Store the custom token server-side (Firestore with a 60-second TTL) keyed to a random short-lived `code`, redirect to `${appUrl}/auth/linkedin?code=${code}`, and have the client exchange the code via a secure POST to retrieve the token. This pattern is standard for OAuth callback flows.

---

### Warning (should fix)

#### [W-1] `cors: true` on LinkedIn Cloud Functions allows all origins

- **File**: `functions/src/linkedin-auth.ts:35,68` and `functions/src/parse-linkedin-pdf.ts:38`
- **Impact**: `cors: true` in Firebase Functions v2 permits cross-origin requests from any domain. For HTTP functions this means any website can trigger the LinkedIn OAuth redirect or invoke the PDF parser on behalf of authenticated users. For callable functions (`onCall`), Firebase enforces auth token validation regardless of CORS, so `parse-linkedin-pdf.ts` is lower risk. The OAuth HTTP functions are higher risk as they trigger server-side flows.
- **Fix**: Replace `cors: true` with `cors: ['https://secid.mx', 'https://beta.secid.mx']` on the `onRequest` LinkedIn auth functions. For the callable function, `cors: true` is acceptable since Firebase validates auth tokens regardless.

#### [W-2] `stripe-webhook` GET endpoint leaks operational information

- **File**: `src/pages/api/stripe-webhook.ts:116-130`
- **Impact**: The GET endpoint returns `{ "status": "ok", "message": "Stripe webhook endpoint is active", "timestamp": "..." }` to any unauthenticated request. This is low-severity information disclosure (confirms the webhook URL is live) but provides enumeration value to attackers.
- **Fix**: Return HTTP 405 Method Not Allowed on GET, consistent with other API endpoints, or restrict to Stripe IP ranges if your hosting provider supports IP allowlisting.

#### [W-3] Middleware `securityManager` initialization failure silently disables all session validation

- **File**: `src/middleware/index.ts:16-23,162-207`
- **Impact**: If `createSecurityManagerFromEnv()` throws (e.g., missing environment variables in a deploy), `securityManager` is null, and both `rateLimitingMiddleware` and `sessionValidationMiddleware` silently call `next()` without performing any validation. The try/catch only `console.warn` — it does not prevent startup or alert monitoring. This means a misconfigured deploy could have no rate limiting and no session validation on any endpoint, with the only protection being `verifyRequest` in individual route handlers.
- **Fix**: Change the catch block behavior: in production, if `securityManager` initialization fails, either (a) throw the error and refuse to start (fail-safe), or (b) set a flag that causes `sessionValidationMiddleware` to reject all protected-path requests with a 503 Service Unavailable rather than passing them through. Log to structured logger, not `console.warn`.

#### [W-4] Storage rules: forum attachments allow any authenticated user to write

- **File**: `storage.rules:32-35`
- **Impact**: `allow write: if request.auth != null` on `forums/{forumId}/{allPaths=**}` means any authenticated user (including unauthenticated-after-email-verification members with `isActive: false` or `isVerified: false`) can upload any file to any forum path. No size limit, no content-type restriction.
- **Fix**:
  ```
  match /forums/{forumId}/{allPaths=**} {
    allow read: if request.auth != null;
    allow write: if request.auth != null
      && request.resource.size < 10 * 1024 * 1024
      && request.resource.contentType.matches('image/.*|application/pdf');
  }
  ```
  Add role check if forums are restricted to verified members.

#### [W-5] SSRF: user-controlled domain passed to server-side fetch without allowlist validation

- **File**: `src/pages/api/companies/fetch-logo.ts:69-102`
- **Impact**: The `fetchLogoImage` function fetches from `https://img.logo.dev/${domain}` and `https://www.google.com/s2/favicons?domain=${domain}` where `domain` comes from user input. Although admin-only, a compromised or malicious admin can pass `169.254.169.254` (GCP metadata endpoint) or other internal addresses. The metadata endpoint on GCP returns instance credentials, project ID, and service account tokens.
- **Fix**: Add domain validation in `validateRequest()`:
  ```ts
  const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i;
  if (
    !DOMAIN_RE.test(domain) ||
    domain.includes('169.254') ||
    domain.includes('localhost')
  ) {
    return { valid: false, error: 'Invalid domain' };
  }
  ```

#### [W-6] CSP shallow merge drops most production directives

- **File**: `src/middleware/security.ts:150-153`
- **Impact**: `{ ...defaultSecurityConfig, ...config }` is a shallow merge. `productionSecurityConfig` only provides a partial `csp` (just `scriptSrc` and `hsts`), which replaces the entire `defaultSecurityConfig.csp` object, deleting `imgSrc`, `styleSrc`, `connectSrc`, `fontSrc`, `objectSrc`, etc. from the production Content Security Policy. The production CSP is therefore either broken (causing page errors) or severely incomplete (allowing unintended sources).
- **Fix**: Use deep merge: `const merged = deepMerge(defaultSecurityConfig, config)`. Verify against the actual production response header at beta.secid.mx.

#### [W-8] Firestore `connectionRequests` does not enforce deletion by owner or moderator

- **File**: `firestore.rules:383`
- **Impact**: `allow delete: if isAuthenticated() && canAdminister()` — only admins can delete connection requests. The sender (`from`) cannot withdraw their own request. This is a UX issue that may force users to leave unwanted pending connection requests indefinitely, which could be used for harassment.
- **Fix**: `allow delete: if isAuthenticated() && (isOwner(resource.data.from) || canAdminister());`

---

### Suggestion (consider)

#### [S-1] AdminAuthGuard is client-side only — admin pages render server HTML before auth check

- **File**: `src/layouts/AdminLayout.astro` + `src/components/admin/AdminAuthGuard.tsx`
- **Context**: All admin pages use `AdminLayout.astro` which loads the React `AdminAuthGuard` component client-side. The page HTML is served before the auth check completes. This is a known architectural constraint (Astro hybrid rendering), and the actual admin data access is protected by Firestore rules. However, the admin page structure/layout is visible during the loading state, which could leak UI structure to unauthorized users.
- **Suggestion**: Add a server-side session check in the `.astro` page files (using `Astro.cookies.get('session')`) before rendering the layout, to redirect unauthenticated users at the SSR layer before any HTML is sent.

#### [S-2] `AdminLayout.astro` admin session timeout uses client-side `setTimeout` — bypassable

- **File**: `src/layouts/AdminLayout.astro:119-143`
- **Impact**: The 1-hour session warning and auto-logout are implemented with `setTimeout`. A user can cancel the timeout from DevTools (`clearTimeout`). Server-side session expiry via the session manager provides the real protection, but the client-side logout UX is not reliable.
- **Suggestion**: Poll `/api/admin/refresh-session` periodically and redirect on 401 rather than relying on a fixed client-side timer.

#### [S-3] `console.log` and `console.warn` used for security events in production

- **File**: `src/middleware/index.ts:22,34`, `src/lib/session-manager.ts`, `src/contexts/AuthContext.tsx`
- **Context**: Security events (session validation failures, auth state changes, middleware errors) are logged via `console.*` rather than the structured `src/lib/logger.ts`. This is tracked in TD-016.
- **Suggestion**: Replace in the next sprint per TD-016.

---

## OWASP Top 10 Assessment

| OWASP Category                | Status   | Details                                                                                                                          |
| ----------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | PARTIAL  | Payment APIs now auth-gated. Admin pages client-only (S-1). Emergency backdoor script exists (C-1).                              |
| A02 Cryptographic Failures    | WARNING  | Bearer tokens not cryptographically validated (H-1). LinkedIn custom token in URL (H-2).                                         |
| A03 Injection                 | PASS     | Firestore SDK parameterized. Input validated at API boundaries.                                                                  |
| A04 Insecure Design           | WARNING  | session-manager single point of failure (W-3). `cors: true` on Cloud Functions (W-1).                                            |
| A05 Security Misconfiguration | CRITICAL | Hardcoded password in deployed HTML (C-1). Permissive forum Storage rules (W-4).                                                 |
| A06 Vulnerable Components     | FAIL     | TD-001 (fast-xml-parser Critical CVE), TD-004 (jws High), TD-005 (rollup High) remain open.                                      |
| A07 Auth Failures             | WARNING  | 2FA not implemented. Session store in-memory only — does not survive restart (H-1).                                              |
| A08 Data Integrity            | PASS     | Stripe webhook signature verified. Firestore rules prevent ownership changes.                                                    |
| A09 Logging Failures          | WARNING  | Security events use console.\* not structured logger (TD-016 / S-3).                                                             |
| A10 SSRF                      | WARNING  | `fetch-logo.ts` fetches user-controlled domain without SSRF allowlist (W-5). GCP metadata endpoint reachable by malicious admin. |

---

## API Route Auth Summary

| Endpoint                          | Auth Check                                            | Rate Limited              | Notes                       |
| --------------------------------- | ----------------------------------------------------- | ------------------------- | --------------------------- |
| POST `/api/create-payment-intent` | verifyRequest (defense-in-depth) + middleware session | Yes (via securityManager) | OK                          |
| POST `/api/create-subscription`   | verifyRequest + middleware session                    | Yes                       | OK                          |
| POST `/api/create-invoice`        | verifyRequest + middleware session                    | Yes                       | OK                          |
| GET `/api/create-invoice`         | verifyRequest + middleware session                    | Yes                       | OK                          |
| POST `/api/stripe-webhook`        | Stripe signature (HMAC)                               | No (webhooks exempt)      | OK                          |
| GET `/api/stripe-webhook`         | None                                                  | No                        | W-2: information disclosure |
| POST `/api/companies`             | verifyRequest + verified-member Firestore check       | Yes (5/day per user)      | OK                          |
| POST `/api/companies/fetch-logo`  | verifyRequest + admin Firestore check                 | Yes                       | OK                          |

---

## Middleware Auth Summary

| Middleware         | Coverage                                                                     | Notes                                                             |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Session validation | `/api/user/`, `/api/admin/`, `/api/companies/`, `/dashboard`, `/api/create-` | Skipped if securityManager null (W-3)                             |
| Rate limiting      | All `/api/`                                                                  | Skipped if securityManager null                                   |
| CAPTCHA            | `/api/auth/`, `/api/contact`, `/api/jobs`                                    | Skipped if securityManager null                                   |
| CORS               | All `/api/`                                                                  | Allowlist: secid.mx + beta.secid.mx — correctly restrictive       |
| CSP                | HTML responses only                                                          | `unsafe-inline` + `unsafe-eval` in default config — inherent risk |

---

## Firestore Rules Assessment

- **No `allow read/write: if true` wildcards** (except `companies` read and `newsletter_archive/blog/spotlights/commissions` read — all intentionally public)
- **Role hierarchy**: admin > moderator > verified member > member correctly implemented
- **Field-level protection**: Users collection prevents role escalation via `diff().affectedKeys().hasOnly(...)` — well implemented
- **Networking cross-update**: Line 109-111 allows any authenticated user to update `networking` and `activity` fields on any user document. While this is intentional for connection requests, it should be restricted to the specific fields required by the feature (already limited to those two keys).
- **`rateLimitCheck()`** on line 45-48 is a stub that returns `true` — not a security risk since it is not used in any rule, but should be either implemented or removed.
- **Compensation sub-collection** (line 136-139): `allow write: if isAuthenticated() && isOwner(userId)` with no field restriction. Users can write any fields to their own compensation entries — appropriate for self-reported data.

---

## Storage Rules Assessment

- Profile images: read by authenticated, write by owner — appropriate
- Application documents: restricted to owner only — appropriate
- Company logos: any authenticated user can write up to 2MB image — acceptable (admin endpoint for logo upload bypasses this)
- Event images: role-checked (admin/moderator) — appropriate
- Forum attachments: **W-4 — no size or content-type restriction**
- Verification documents: owner write + admin/moderator read — appropriate

---

## New LinkedIn Features Assessment

### `parse-linkedin-pdf.ts`

- Authentication: `request.auth` check via Firebase callable — correct
- Rate limiting: 5 uploads/hour per user via Firestore `rate_limits` collection — appropriate
- File validation: size limit (5MB) + magic bytes (`%PDF-`) check — appropriate
- Error handling: Firestore errors not caught before `validateFileSize` — if `rateRef.get()` fails, the function throws an unhandled error that Firebase will return as `internal`

### `linkedin-auth.ts`

- Secrets: managed via Firebase `defineSecret` — correct, not hardcoded
- Custom token in URL: **H-2 — critical flow issue**
- State parameter: base64-encoded but not signed — CSRF risk if `returnUrl` is attacker-controlled (open redirect potential). Should include a random nonce in state and validate it on callback.
- `getCallbackUrl` uses `x-forwarded-host` header — an attacker who can control this header could redirect the OAuth callback to a malicious domain. Validate against allowed callback domains.

---

## Dead Code / Security-specific Dead Code

- `localStorage.setItem('emergency_admin', 'true')` in `AdminLayout.astro` — the flag is written but never read by `AdminAuthGuard`. It is dead code with no functional effect today, but its presence creates future risk.
- `rateLimitCheck()` in `firestore.rules` — defined but never called in any rule.
- `window.isAdminPanel = true` in `AdminLayout.astro:110` — set but never used.

---

## Time Out — Security Verification Checklist

- [ ] **FAIL**: Hardcoded credential `SECID_EMERGENCY_2024` in deployed HTML (C-1)
- [x] All user input validated at boundaries
- [x] DB queries parameterized (Firestore SDK)
- [x] Auth enforced on payment API routes (both middleware + route-level)
- [ ] **FAIL**: Dependency CVEs open (TD-001 fast-xml-parser Critical, TD-004 jws High, TD-005 rollup High)

**Verdict required: CHANGES REQUIRED** (non-negotiable per Security Verification checklist)

---

## Verdict: CHANGES REQUIRED

The platform has made substantial security progress since February 2026. The payment API auth and 2FA issues are properly resolved. However, three blockers prevent approval:

1. **C-1**: `SECID_EMERGENCY_2024` hardcoded in `AdminLayout.astro`. Remove immediately — this is a hardcoded credential committed to source control and deployed in production HTML.
2. **H-1**: `verifyRequest` does not verify Firebase ID tokens — auth reliability depends entirely on in-memory session store survival. Add Firebase Admin SDK token verification as fallback.
3. **H-2**: LinkedIn custom token passed in redirect URL. Implement a server-side code exchange instead.

**Required before merge**:

- Remove emergency admin backdoor script from `AdminLayout.astro` (C-1)
- Implement Firebase Admin SDK token verification in `verify-request.ts` (H-1)
- Replace URL-param token delivery in `linkedin-auth.ts` with server-side code exchange (H-2)

**Recommended before release**:

- `cd functions && npm audit fix` to resolve TD-001 and TD-004 (Critical/High CVEs)
- `npm audit fix` at root to resolve TD-005
- Fix W-1 (CORS), W-3 (securityManager fail-safe), W-4 (Storage rules forum)

---

## SIGN OUT

- [x] Review written to `docs/reviews/security-audit-auth-2026-03-23.md`
- [ ] MEMORY.md to be updated with new findings
- [ ] TECH_DEBT.md to be updated with new debt items (H-1, H-2, LinkedIn CORS, state nonce)
- [x] Re-verification criteria stated (see below)
- [x] Handoff prepared
