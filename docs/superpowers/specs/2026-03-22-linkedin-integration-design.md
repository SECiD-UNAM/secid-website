# LinkedIn Integration Design

**Date:** 2026-03-22
**Status:** Approved
**Branch:** feature/hub

## Summary

Integrate LinkedIn deeply into SECiD across three phases: OAuth login (alongside Google and GitHub), LinkedIn Verified badges for member trust, and enhanced profile import via improved copy-paste parser and PDF parsing. A fourth phase (Share on LinkedIn) is deferred as a future consideration.

## Context

SECiD currently has a basic copy-paste LinkedIn import (`src/lib/linkedin-parser.ts`) that parses the Experience section only. The OAuth backend already supports LinkedIn (`src/lib/auth/oauth-providers.ts`) but the UI only exposes a Google login button. GitHub is also configured but not exposed.

**Available LinkedIn API Products:**

- Sign In with LinkedIn using OpenID Connect (Standard Tier)
- Verified on LinkedIn (Development Tier, upgrade requestable)
- Share on LinkedIn (Default Tier)

## Phase 1: Login & Identity

### Goal

Add LinkedIn and GitHub as login options alongside Google. Auto-merge accounts by email. Auto-populate profile fields from OAuth data.

### Changes

**Firebase Console:** Enable LinkedIn as a sign-in provider with OIDC Client ID + Client Secret from the LinkedIn Developer Portal.

**`src/components/auth/SocialLoginButtons.tsx`:**

- Add three buttons: Google (existing), LinkedIn (new), GitHub (new)
- Order: Google first (most familiar), LinkedIn second (most relevant for alumni), GitHub third

**`src/types/user.ts`:**

- Fix type mismatch: update `SupportedProvider` from `'google'` to `'google' | 'github' | 'linkedin'` to match `oauth-providers.ts`
- This becomes the canonical source; remove the duplicate definition from `oauth-providers.ts` and import from `user.ts`

**`src/components/auth/SocialLoginButtons.tsx`:**

- Remove `// @ts-nocheck` and add proper type imports
- Import `SupportedProvider` from `@/types/user`

**`src/lib/auth/oauth-providers.ts`:**

- Fix provider ID mismatch: the `SupportedProvider` type uses `'linkedin'` but Firebase expects `'linkedin.com'`. Add a mapping (`PROVIDER_ID_MAP`) to translate between the short form used in our types and the Firebase provider ID.

### Auto-merge Flow (New Logic — Must Be Built)

The current `signInWithOAuth` function does NOT implement auto-merge. It catches `auth/account-exists-with-different-credential` and re-throws a user-friendly error. The auto-merge flow requires new implementation:

1. User attempts sign-in with LinkedIn
2. Firebase throws `auth/account-exists-with-different-credential`, which includes the email and pending credential
3. New merge handler catches this error and:
   a. Stores the pending LinkedIn credential temporarily (in-memory, not persisted)
   b. Queries Firestore `users` collection by email to find the existing account's provider
   c. Prompts user: "An account with this email exists via [Google]. Sign in with [Google] to link your LinkedIn account automatically."
   d. User signs in with the existing provider
   e. After successful sign-in, calls `linkWithCredential()` using the stored pending credential
   f. Updates `linkedAccounts` array in Firestore
4. If the user closes the browser during step (d), the pending credential is lost. On next LinkedIn sign-in attempt, the flow restarts from step 1 — no partial state to clean up.

**Note:** `fetchSignInMethodsForEmail` is deprecated by Firebase for security reasons. Instead, we query the Firestore `users` collection to find which provider the existing account uses.

**Firebase Console prerequisite:** Ensure "One account per email address" is enabled in Authentication > Settings (this is the default).

### Auto-populate on First LinkedIn Login

The `beforeUserCreated` Cloud Function (`functions/src/index.ts`) already sets `displayName` and `photoURL` from the Firebase Auth user object, which LinkedIn OIDC populates. The client-side post-login flow should NOT duplicate this. Client-side is only responsible for:

- The one-time LinkedIn URL prompt (not available from OIDC)
- Any fields the Cloud Function does not set

| Field         | Source        | Notes                                                                                   |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| `displayName` | LinkedIn OIDC | Name from LinkedIn profile                                                              |
| `email`       | LinkedIn OIDC | Email address                                                                           |
| `photoURL`    | LinkedIn OIDC | Profile photo                                                                           |
| `linkedinUrl` | User prompt   | LinkedIn OIDC does not return profile URL; prompt user to add it on first profile visit |

### Edge Cases

- LinkedIn OIDC does not return the user's LinkedIn profile URL (only name, email, photo). After first LinkedIn login, show a one-time prompt: "Add your LinkedIn profile URL to complete your profile."
- If Firebase auth is in "one account per email" mode, the auto-merge handles conflicts transparently.

### Cross-Provider Account Conflicts with Different Emails

When a member uses Google with one email and LinkedIn with a different email, Firebase creates two separate accounts (auto-merge only works on matching emails). This is handled by the **Profile Merge System** (see `docs/superpowers/specs/2026-03-21-profile-merge-system-design.md`), not by the LinkedIn integration:

1. Both accounts share the same `numeroCuenta` (UNAM student ID)
2. The `numero_cuenta_index` detects the duplicate during registration
3. The newer account gets a `potentialMergeMatch` flag
4. User sees a dashboard banner prompting them to claim the existing profile
5. Admin approves the merge → profiles are combined, old auth account disabled

**No additional work needed in the LinkedIn integration for this case.** The merge system is provider-agnostic and handles any combination of Google/LinkedIn/GitHub/email accounts with different emails but the same `numeroCuenta`.

## Phase 2: Trust & Verification

### Goal

Show a "LinkedIn Verified" badge on member profiles for users who have completed LinkedIn's identity verification.

### External Dependency

This phase requires the "Verified on LinkedIn" API product to be upgraded from Development Tier. Request the upgrade during Phase 1 implementation. **If the upgrade is denied or delayed beyond 4 weeks, skip Phase 2 and proceed to Phase 3.** Phase 2 can be revisited independently later.

### Token Management

LinkedIn OIDC access tokens are short-lived (typically minutes to hours). The verification check must happen during the login flow while the token is still valid — not on-demand later. Specifically:

1. During `signInWithOAuth`, extract the access token from the `OAuthCredential` result
2. Immediately call the `checkLinkedInVerification` Cloud Function, passing the access token
3. The Cloud Function uses the token to call LinkedIn's verification API, then discards it
4. Result is stored in Firestore (server-only write via Admin SDK)

No tokens are stored long-term. Verification status is re-checked on each LinkedIn login.

### Implementation

**New Cloud Function: `checkLinkedInVerification`**

- Called immediately after LinkedIn OAuth login (while access token is valid)
- Calls LinkedIn's verification endpoint using the short-lived access token
- Stores result in Firestore (via Admin SDK, bypassing security rules):
  - `users/{uid}.linkedinVerified: boolean`
  - `users/{uid}.linkedinVerifiedAt: timestamp`
- Re-checks on each LinkedIn login (verification status can change)

**Firestore security:** `linkedinVerified` and `linkedinVerifiedAt` are intentionally excluded from the user self-update allowlist in `firestore.rules`. These fields are server-only writes via Admin SDK to prevent users from self-verifying.

**Profile badge display locations:**

- Member directory cards
- Profile pages
- Mentorship listings

**Badge visual:** LinkedIn logo icon + checkmark, with tooltip "Verified on LinkedIn" / "Verificado en LinkedIn"

**Privacy:**

- Badge visibility is opt-in — user can hide it in privacy settings
- Only stores verified/not-verified status, not verification method or documents

**Fallback:** If user hasn't logged in via LinkedIn, the API upgrade is pending, or the API is unavailable — no badge shown, no error, just absent.

## Phase 3: Enhanced Content Import

### Goal

Expand the copy-paste parser beyond Experience to cover full profile sections, and add LinkedIn PDF import as an alternative.

### Parser Expansion

| Section               | Fields Parsed                   | Stored As          |
| --------------------- | ------------------------------- | ------------------ |
| Experience (existing) | Title, company, dates, location | `workExperience[]` |
| Education (new)       | School, degree, field, dates    | `education[]`      |
| Skills (new)          | Skill names                     | `skills[]`         |
| Certifications (new)  | Name, issuer, date              | `certifications[]` |
| Languages (new)       | Language, proficiency           | `languages[]`      |

### UX: Guided Multi-Section Modal

1. **Step 1:** Instructions — "Go to your LinkedIn profile" with options to copy-paste sections or upload PDF
2. **Step 2:** Paste each section via tabs (Experience / Education / Skills / Certifications / Languages)
3. **Step 3:** Preview parsed data, edit inline before saving

### PDF Import

LinkedIn's "Save to PDF" generates a standardized PDF with all profile sections.

- User uploads LinkedIn PDF via the import modal
- Cloud Function receives the PDF, parses it into structured data
- Returns parsed data to the client for user confirmation
- More reliable than text parsing — one action imports everything

**Cloud Function: `parseLinkedInPdf`**

- Accepts: PDF file upload (authenticated users only)
- Parses: All profile sections from the standardized LinkedIn PDF format using `pdf-parse` (lightweight, pdf.js-based)
- Returns: Structured data matching the parser output types
- Security:
  - Requires authenticated user (verify Firebase Auth token)
  - Validate MIME type (`application/pdf`) and file magic bytes
  - Size limit: 5MB
  - Process in memory only — no file storage
  - Reject malformed/encrypted PDFs early
  - Rate limit: 5 uploads per user per hour

### Smart Deduplication

When a user imports again (client-side, in the preview modal before saving):

- Match against existing entries by company+title (experience) or school+degree (education), using case-insensitive comparison and trimmed whitespace
- Skills: merge imported skills into existing `skills[]`, deduplicating by case-insensitive match
- Offer to update existing entries rather than creating duplicates
- New entries are added; unchanged entries are skipped

### Technical Approach

- Text parser stays client-side (no sensitive data leaves the browser)
- PDF parsing happens in a Cloud Function (upload -> parse -> return structured data -> user confirms)
- All imported data goes through existing profile form validation before saving

## Future Considerations: Share on LinkedIn

Deferred until community activity warrants it. The "Share on LinkedIn" API product is already available.

**Concept:** Let members share SECiD milestones to their LinkedIn feed:

- Membership approved
- Event attendance
- Mentorship milestones
- Certifications/badges earned
- Job posted/landed (opt-in)

**Requirements when revisited:**

- Cloud Function to post via LinkedIn's Share API
- Always opt-in, never auto-post
- Pre-filled editable text with link back to SECiD
- Open Graph meta tags on shareable pages for link previews
- Token refresh handling (LinkedIn tokens expire after 60 days)

## Existing Code Inventory

| File                                         | Status          | Changes Needed                                                                 |
| -------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `src/lib/auth/oauth-providers.ts`            | Ready           | LinkedIn provider already configured with OIDC scopes                          |
| `src/lib/auth/oauth-providers.ts`            | Ready           | `signInWithOAuth`, `linkOAuthProvider`, `unlinkOAuthProvider` support LinkedIn |
| `src/components/auth/SocialLoginButtons.tsx` | Needs update    | Add LinkedIn + GitHub buttons                                                  |
| `src/types/user.ts`                          | Needs update    | `SupportedProvider` type only includes `'google'`                              |
| `src/lib/linkedin-parser.ts`                 | Needs expansion | Add education, skills, certifications, languages parsers                       |
| `src/components/profile/tabs/CareerTab.tsx`  | Needs update    | Enhanced import modal UX                                                       |
| `src/contexts/AuthContext.tsx`               | Ready           | Already handles multi-provider auth                                            |
| `functions/src/index.ts`                     | Needs additions | Add `checkLinkedInVerification` and `parseLinkedInPdf` functions               |
| `firestore.rules`                            | May need update | Rules for new fields (`linkedinVerified`, expanded profile arrays)             |

## LinkedIn Developer Portal Setup

1. Register app at LinkedIn Developer Portal
2. Contact email: `contacto@secid.mx`
3. Privacy Policy URL: `https://secid.org/es/privacy`
4. Enable "Sign In with LinkedIn using OpenID Connect" product
5. Request upgrade for "Verified on LinkedIn" product
6. Copy Client ID + Client Secret to Firebase Console (Authentication > Sign-in method > LinkedIn)
7. Add authorized redirect URIs from Firebase to LinkedIn app settings

## i18n

All new user-facing strings must be added to both Spanish and English translation files. New strings include:

- Login button labels ("Continuar con LinkedIn" / "Continue with LinkedIn")
- Auto-merge prompt ("Ya existe una cuenta con este correo vía [Google]..." / "An account with this email already exists via [Google]...")
- LinkedIn URL prompt ("Agrega tu URL de LinkedIn..." / "Add your LinkedIn profile URL...")
- Verified badge tooltip ("Verificado en LinkedIn" / "Verified on LinkedIn")
- Import modal instructions and section labels
- Error messages for PDF upload failures

Follow the existing pattern used in each component (inline ternary or i18n translation files).

## Testing Strategy

**Unit tests:**

- Expanded parser sections (education, skills, certifications, languages) with bilingual fixtures
- Deduplication logic (case-insensitive matching, merge behavior)
- Provider ID mapping (`'linkedin'` ↔ `'linkedin.com'`)
- Auto-merge error handler logic (credential storage, provider detection)

**Integration tests:**

- Auto-merge flow (sign in with provider A, then provider B with same email)
- LinkedIn verification Cloud Function (mock LinkedIn API response)
- PDF parsing Cloud Function (use sample LinkedIn PDFs as test fixtures)

**E2E tests:**

- Full login flow with each provider (Google, LinkedIn, GitHub)
- Social login buttons render correctly with all three options

**Manual testing:**

- LinkedIn OAuth popup flow in staging (`beta.secid.mx`)
- Update `tests/unit/components/auth/SocialLoginButtons.test.tsx` for new buttons

**Firebase emulator notes:**

- Firebase emulators have limited OIDC support. For LinkedIn OAuth testing, mock the provider response in integration tests rather than relying on the emulator's OIDC flow.
- Test PDFs: generate sample LinkedIn PDFs by exporting real profiles (anonymized) for use as test fixtures in `tests/fixtures/`.
