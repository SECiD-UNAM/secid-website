# Security Audit: Secrets & Credentials Deep Scan

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: Full repository secrets scan — hardcoded credentials, API keys, OAuth secrets, database connection strings, .env files, backdoors
**Branch**: feature/hub
**Trigger**: User-requested targeted secrets and credentials scan

---

## Summary

This scan found two previously-undocumented security issues not covered in today's earlier audit (`security-audit-2026-03-23.md`): a UNAM email verification Cloud Function that hardcodes `isValid = true` and grants `isVerified: true` to any caller, and the Stripe secret key being stored in Firestore through the admin Settings component. The hardcoded emergency password (`SECID_EMERGENCY_2024`) was already documented as C-1 in the earlier audit and is confirmed here. No real API keys, live Stripe secrets, or OAuth client secrets were found hardcoded in source files.

---

## NON-NORMAL: Critical Vulnerability Response

### New Critical Finding: UNAM Verification Mock in Production

**File**: `functions/src/index.ts:115-135`
**Discovered during**: Secrets scan — while checking for hardcoded values

```typescript
// In production, this would call UNAM's verification API
// For now, we'll simulate verification
const isValid = true; // Mock verification

if (isValid) {
  await admin.firestore().collection("users").doc(userId).update({
    isVerified: true,
    unamEmail,
    studentId: studentId || "",
    ...
  });
}
```

**Exploitability**: IMMEDIATELY EXPLOITABLE in production. Any authenticated Firebase user can call the `verifyUnamEmail` callable Cloud Function with any email string containing `@alumno.unam.mx` or `@unam.mx` and receive `isVerified: true` on their account. The function only validates the email format (contains UNAM domain), then unconditionally approves. Verification gates in Firestore rules (`isVerified()` check) and component-level guards (`isVerified !== false`) are bypassed.

This is parallel to the 2FA mock issue (TD-009, now resolved). The same mitigation pattern applies.

---

## Findings

### Critical (must fix before merge / production deployment)

**[C-SEC-1] Hardcoded emergency admin password in client-side JavaScript** — PREVIOUSLY DOCUMENTED

- **File**: `src/layouts/AdminLayout.astro:248`
- **Credential**: `SECID_EMERGENCY_2024`
- **Already in**: `security-audit-2026-03-23.md` as C-1
- **Status**: Not yet fixed

**[C-SEC-2] UNAM email verification hardcodes `isValid = true` — grants verified status to anyone**

- **File**: `functions/src/index.ts:117`
- **Credential type**: Authentication bypass / privilege escalation
- **NEW FINDING** — not in prior audit
- **Impact**: Any authenticated user can bypass the UNAM alumni verification gate by calling `verifyUnamEmail` with any `@unam.mx` email. This grants `isVerified: true`, which unlocks job board posting, mentorship access, event creation, and other member-only permissions guarded by Firestore `isVerified()` checks.
- **Severity**: CRITICAL — this is a broken authentication bypass identical in impact to the 2FA mock (TD-009)
- **Fix**: Apply the same pattern used for 2FA: add a feature flag `UNAM_VERIFICATION_AVAILABLE = false` constant. When false, the callable function throws `HttpsError('unimplemented', 'UNAM verification not yet available')` before making any Firestore writes. Set flag to `true` only when real UNAM API integration is implemented.

```typescript
// Proposed fix:
const UNAM_VERIFICATION_AVAILABLE = false;

export const verifyUnamEmail = onCall<VerifyUnamEmailData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  if (!UNAM_VERIFICATION_AVAILABLE) {
    throw new HttpsError(
      'unimplemented',
      'UNAM email verification is not yet available. Contact an administrator to manually verify your membership.'
    );
  }

  // ... rest of implementation when real API is available
});
```

---

### Warning (should fix)

**[W-SEC-1] Stripe secret key model stored in Firestore via admin Settings component**

- **File**: `src/components/admin/Settings.tsx:75,153,307-312`
- **NEW FINDING** — not in prior audit
- **Pattern**: The `PlatformSettings` React state type includes `stripeSecretKey: string`. The `saveSettings()` function spreads the full settings object into `admin_settings/platform_config` in Firestore via `updateDoc(settingsRef, { ...settings, ... })`. Any admin who accesses Settings can enter a Stripe secret key which would then be persisted in Firestore.
- **Firestore rule coverage**: `admin_settings` has no explicit rule — it falls under `match /admin/{document=**}` which requires `canAdminister()`. The collection is admin-only readable. However:
  1. Stripe secret keys should NEVER be in a database — only in environment variables or GCP Secret Manager.
  2. Any Firebase data export, Admin SDK query, or future rule misconfiguration could expose it.
  3. The key would appear in Firebase Console to any Google account with project owner access.
- **Fix**: Remove `stripeSecretKey` and `paypalClientSecret` from `PlatformSettings` in both `src/components/admin/Settings.tsx` and `src/types/admin.ts`. Stripe keys are configured via environment variables (`STRIPE_SECRET_KEY` in `.env`, GCP Secret Manager for Cloud Functions). The admin UI payment tab should configure prices, enable/disable features, and link to external dashboards — not store credentials.

**[W-SEC-2] `.env.test` not in `.gitignore` — tracked or at risk of being tracked**

- **File**: `.env.test`
- **ALREADY IN**: `security-audit-2026-03-23.md` as W-2
- **Contents confirmed**: Test user passwords (`TestPassword123!`, `AdminPassword123!`, `PremiumPassword123!`, `CompanyPassword123!`), a Stripe test key pattern (`pk_test_51234567890abcdefghijklmnop`)
- **Action**: `git ls-files .env.test` — if output is non-empty, run `git rm --cached .env.test` immediately and add `.env.test` to `.gitignore`

**[W-SEC-3] Dev fallback secrets with known values used when `SESSION_SECRET` / `JWT_SECRET` not set**

- **File**: `src/lib/security-config.ts:489,494`
- **Values**: `'dev-session-secret-change-in-production'`, `'dev-jwt-secret-change-in-production'`
- **Risk**: If a staging deployment omits these environment variables, sessions signed with the known fallback secret can be forged. The prod check at line 499 only runs when `environment === 'production'`; a staging environment set to `NODE_ENV=staging` skips the check.
- **Fix**: Expand the mandatory secret check to all non-development environments: `if (!['development', 'test'].includes(environment))`. Add a startup assertion that fails loudly with a clear error if the secrets contain the placeholder strings.

---

### Suggestion

**[S-SEC-1] `admin_settings` collection has no explicit Firestore security rule**

- **File**: `firestore.rules`
- **Note**: `admin_settings/platform_config` is covered by the wildcard `match /admin/{document=**}` (line 413), requiring `canAdminister()`. This is functional but implicit. During future rule refactors it could inadvertently lose protection. Add an explicit rule:

```
match /admin_settings/{document=**} {
  allow read, write: if isAuthenticated() && canAdminister();
}
```

**[S-SEC-2] User email logged to browser console unconditionally in emulator mode**

- **File**: `src/contexts/AuthContext.tsx:205`
- **Code**: `console.log('👤 Authenticated user:', firebaseUser['email']);`
- **Note**: Guarded by `isEmulatorMode()`, but staging deployments that enable emulators would log user PII to browser console. Wrap in `process.env.NODE_ENV === 'development'` guard as well.

**[S-SEC-3] `YOUR_AMPLITUDE_API_KEY` placeholder shipped to production in BaseLayout**

- **File**: `src/layouts/BaseLayout.astro:203`
- **ALREADY IN**: `security-audit-2026-03-23.md` as S-3
- **Note**: Amplitude SDK initialized with literal string `'YOUR_AMPLITUDE_API_KEY'`. Replace with `import.meta.env.PUBLIC_AMPLITUDE_API_KEY || ''`.

---

## Full Secrets Scan Results

### Pattern: API Keys, Tokens, Connection Strings

| Pattern                               | Files Found                        | Result                      |
| ------------------------------------- | ---------------------------------- | --------------------------- |
| `sk_live_*` (Stripe live secret)      | None                               | CLEAR                       |
| `sk_test_*` (Stripe test secret)      | None in src/                       | CLEAR                       |
| `pk_live_*` (Stripe live publishable) | None                               | CLEAR                       |
| `AIzaSy*` (Firebase API key)          | None hardcoded                     | CLEAR — sourced from env    |
| `rsa_private_key` / `-----BEGIN`      | Not searched (no PEM files)        | N/A                         |
| `LINKEDIN_CLIENT_SECRET`              | `defineSecret()` reference only    | SECURE — GCP Secret Manager |
| `JWT_SECRET` hardcoded                | Fallback string only (see W-SEC-3) | LOW RISK                    |
| `SESSION_SECRET` hardcoded            | Fallback string only (see W-SEC-3) | LOW RISK                    |
| `SECID_EMERGENCY_2024`                | `AdminLayout.astro:248`            | CRITICAL — see C-SEC-1      |
| `YOUR_AMPLITUDE_API_KEY`              | `BaseLayout.astro:203`             | MEDIUM — placeholder bug    |

### Pattern: Passwords & Backdoors

| Finding                                   | File                         | Severity        |
| ----------------------------------------- | ---------------------------- | --------------- |
| `SECID_EMERGENCY_2024` hardcoded password | `AdminLayout.astro:248`      | CRITICAL        |
| `isValid = true` mock — UNAM bypass       | `functions/src/index.ts:117` | CRITICAL        |
| Test passwords in `.env.test`             | `.env.test:6-22`             | HIGH if tracked |
| Dev fallback session/JWT secrets          | `security-config.ts:489,494` | MEDIUM          |

### Pattern: .env Files

| File           | In `.gitignore` | Secrets present                 | Risk                      |
| -------------- | --------------- | ------------------------------- | ------------------------- |
| `.env`         | Yes             | Real credentials possible       | Protected                 |
| `.env.local`   | Yes             | Real credentials possible       | Protected                 |
| `.env.example` | No              | Empty placeholders only         | OK — safe to commit       |
| `.env.test`    | **No**          | Test passwords + Stripe pattern | NEEDS IMMEDIATE ATTENTION |

---

## Git History Note

Git log search for `sk_live` could not be run (Bash tool not permitted). The prior 2026-02-28 audit found "no hardcoded secrets in tracked files." The current scan found no real secret values in source, only the hardcoded password `SECID_EMERGENCY_2024` and mock bypass. Recommend the team run `git log --all -p -S "sk_live"` and `git log --all -p -S "SECID_EMERGENCY"` manually to verify history.

---

## Comparison With Prior Audit (2026-02-28)

| Finding                      | Prior Status          | Current Status               |
| ---------------------------- | --------------------- | ---------------------------- |
| Payment APIs unauthenticated | CRITICAL              | RESOLVED (TD-010)            |
| 2FA mocked                   | CRITICAL              | RESOLVED (TD-009)            |
| Emergency admin password     | Not found             | CRITICAL (C-SEC-1 / C-1)     |
| UNAM verification mock       | Not found             | **CRITICAL (C-SEC-2 — new)** |
| Stripe secret in Firestore   | Not found             | **HIGH (W-SEC-1 — new)**     |
| .env.test not gitignored     | Not found             | HIGH (W-SEC-2 / W-2)         |
| TD-001 fast-xml-parser CVE   | CRITICAL (functions/) | Open — unverified            |
| TD-004 jws JWT bypass        | HIGH (functions/)     | Open — unverified            |

---

## Verdict

**CHANGES REQUIRED**

Two critical findings must be addressed before production deployment:

1. **C-SEC-1** — Remove `SECID_EMERGENCY_2024` from `AdminLayout.astro` (already in prior audit as C-1)
2. **C-SEC-2** — Disable `verifyUnamEmail` mock with feature flag (NEW — not in prior audit)

One high-severity warning should be addressed before next release:

3. **W-SEC-1** — Remove `stripeSecretKey` from Firestore settings pattern (NEW — not in prior audit)

**Re-verification criteria**:

- C-SEC-1: `grep -r 'SECID_EMERGENCY' src/` returns no matches
- C-SEC-2: `verifyUnamEmail` callable returns HttpsError when `UNAM_VERIFICATION_AVAILABLE = false`; no `isValid = true` line remains in production code path
- W-SEC-1: `PlatformSettings` type and `saveSettings()` no longer include `stripeSecretKey` or `paypalClientSecret`; `admin_settings` Firestore document does not contain these fields
