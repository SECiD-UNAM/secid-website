# Security Audit: src/ + functions/ — Injection & OWASP Top 10

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: Full `src/` and `functions/src/` audit covering XSS, Injection, SSRF, Insecure Design, Security Misconfiguration, and Data Integrity. Focused on feature/hub branch changes (LinkedIn OAuth, PDF import, multi-section import modal) plus existing surface.

---

## Summary

The feature/hub branch introduces well-structured new code (LinkedIn import modal, PDF Cloud Function, provider ID map) with authentication enforced correctly. However, **seven pre-existing XSS vectors** in forum and blog components remain unsanitized despite a `DOMPurify`-based `sanitizeHtml()` utility being available. One **SSRF vector** exists in the admin logo-fetch endpoint. One **Host Header Injection** vulnerability exists in the LinkedIn OAuth callback. Error messages **leak internal exception text** in all payment API endpoints. A placeholder API key literal was found in a layout file. One **payment amount manipulation** vector allows clients to bypass server-side pricing.

---

## Findings

### Critical (must fix before merge)

**[C-1] XSS via unsanitized `dangerouslySetInnerHTML` — ForumPost processContent**

- File: `src/components/forums/ForumPost.tsx:237-248` (processContent definition) and `:543` (render site)
- Impact: Any authenticated forum user can inject arbitrary HTML/JS by crafting a forum post. The `processContent()` function takes raw user input and does string replacement to inject HTML tags (`<strong>`, `<em>`, `<code>`, `<pre>`, `<a href="$2">`, `<br>`). The `$2` capture group in the link regex inserts the raw URL without validation — an attacker submitting `[click me](javascript:alert(document.cookie))` gets an executable link. The processed HTML is also stored in Firestore (`htmlContent`) and rendered unsanitized from storage. Attack surface: any member who can post.
- Fix: Wrap `processContent()` output in `sanitizeHtml()` from `src/lib/validation/sanitization.ts`. The existing config already forbids `onclick`, `onerror`, `onload` and restricts `href` to `http/https/mailto`. Usage: `__html: sanitizeHtml(processContent(content))`.

**[C-2] XSS via `highlightText()` in ForumSearch — user-controlled content injected into regex and rendered unsanitized**

- File: `src/components/forums/ForumSearch.tsx:176-186` (definition), `:565-570`, `:576-581`, `:631-636` (render sites)
- Impact: `highlightText` builds `new RegExp(highlight)` from a user-controlled search term and wraps matches in `<mark>$1</mark>`. This output feeds directly into `dangerouslySetInnerHTML`. If a forum topic title or excerpt stored in Firestore contains `<img src=x onerror=alert(1)>`, it executes when search results are displayed. Additionally, `new RegExp(highlight)` with complex patterns is a ReDoS risk (catastrophic backtracking). Attack surface: all authenticated forum users who view search results.
- Fix: (1) Escape the search term before passing to `new RegExp()`: `highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. (2) Sanitize the `text` input and the output via `sanitizeHtml(..., { stripTags: true })` before wrapping in `<mark>`. Or replace `dangerouslySetInnerHTML` with a pure React component that splits on match tokens.

**[C-3] Stored XSS — BlogPost and NewsletterView render raw Firestore HTML without sanitization**

- File: `src/components/blog/BlogPost.tsx:173`, `src/components/newsletter/NewsletterView.tsx:107`
- Impact: `post.content` and `newsletter.content` come from Firestore and are passed directly to `dangerouslySetInnerHTML`. If any admin or content-author account is compromised, or if content is injected at the Firestore layer, all visitors to blog/newsletter pages execute the injected script.
- Fix: Apply `sanitizeHtml(post.content)` / `sanitizeHtml(newsletter.content)` before rendering. The existing `sanitizeHtml` config allows the appropriate structural tags for blog content (p, h1-h6, ul, ol, li, blockquote, code, pre, a, img).

**[C-4] Stored XSS — SpotlightDetail and HelpCenter render raw HTML without sanitization**

- File: `src/components/spotlight/SpotlightDetail.tsx:153`, `src/components/help/HelpCenter.tsx:388-391`
- Impact: Same class as C-3. HelpCenter additionally applies naive `string.replace()` to turn plain text into HTML (`/#{1,6}\s/g -> '<h3>'`) without escaping surrounding content first. An attacker who writes to the `articles` Firestore collection can inject arbitrary HTML into help pages visible to all users.
- Fix: SpotlightDetail: wrap in `sanitizeHtml(spotlight.story)`. HelpCenter: escape the full text with `preventXSS()` first, then apply structural replacements. Or use a proper Markdown renderer (marked + DOMPurify).

**[C-5] Payment amount manipulation — client can bypass server-side plan pricing**

- File: `src/pages/api/create-payment-intent.ts:33-38`
- Impact: The endpoint accepts a raw `body.amount` from the client. The server-side plan calculation only runs when `body.planId && !amount`. A client that sends `{ "planId": "pro", "amount": 1 }` bypasses plan pricing entirely and creates a Stripe payment intent for 1 cent for a plan priced at MXN 299+. The same authenticated user can then complete checkout at the wrong price.
- Fix: Remove `body.amount` from the accepted inputs entirely. Always derive the amount from `planId` server-side. If a custom amount path is needed (e.g., admin invoices), add an explicit admin role check before accepting a client-supplied amount.

### Warning (should fix)

**[W-1] SSRF — `fetch-logo.ts` constructs outbound fetch URL from user-supplied `domain` without allowlist validation**

- File: `src/pages/api/companies/fetch-logo.ts:77` (`https://img.logo.dev/${domain}...`) and `:92` (`https://www.google.com/s2/favicons?domain=${domain}`)
- Impact: An admin sending `{ "domain": "169.254.169.254", "companyId": "..." }` (AWS/GCP metadata service) or an internal hostname causes the Astro server to make an outbound HTTP request to an attacker-controlled address. The `domain` is validated as a non-empty string but not as a valid public hostname. Since this is admin-only, the direct attack surface is limited to compromised admin accounts, but defense-in-depth requires validation.
- Fix: Validate `domain` against a public hostname regex before constructing the URL: `/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i`. Explicitly reject bare IP addresses and RFC 1918 ranges. For the `domain=` query parameter in the Google URL, use `encodeURIComponent(domain)` to prevent parameter injection.

**[W-2] Host Header Injection + Open Redirect — LinkedIn OAuth callback**

- File: `functions/src/linkedin-auth.ts:15-21` (getCallbackUrl), `:218` (redirect with returnUrl)
- Impact — Part A: `getCallbackUrl()` trusts `x-forwarded-host` and `x-forwarded-proto` headers from the incoming request. A spoofed `x-forwarded-host: attacker.com` makes the function send `redirect_uri=https://attacker.com/linkedinAuthCallback` to LinkedIn. LinkedIn's OAuth validation rejects unregistered redirect URIs, but the server still leaks the OAuth code exchange attempt to the forged host. On Google Cloud Functions, these headers are set by the Cloud Load Balancer and cannot be spoofed by external callers in production — but this is an environment assumption that should be hardened with code.
- Impact — Part B: The `returnUrl` from the OAuth state is not validated as a relative path before being embedded in the final redirect: `?returnUrl=${encodeURIComponent(returnUrl)}`. An attacker who triggers the LinkedIn auth flow with `?returnUrl=https://evil.com` could cause the login page (once wired up) to redirect users after sign-in. The client-side `signInWithLinkedIn()` sends `window.location.pathname` (always relative), but no server-side validation enforces this invariant.
- Fix: (1) Harden `getCallbackUrl()`: use a `LINKEDIN_CALLBACK_URL` env variable instead of trusting headers. (2) Validate `returnUrl` is a relative path before embedding it: `if (/^https?:\/\//i.test(returnUrl) || returnUrl.startsWith('//')) returnUrl = '/'`.

**[W-3] Information disclosure — internal exception `.message` forwarded to API callers**

- File: `src/pages/api/create-payment-intent.ts:110-111`, `create-subscription.ts:92,157,171`, `create-invoice.ts:232,245,317`, `companies/index.ts:177`, `companies/fetch-logo.ts:147`
- Impact: Stripe SDK errors contain internal customer IDs, product names, and detailed error codes. Firestore errors contain collection paths and document IDs. These are returned verbatim to the caller, violating OWASP A05 and aiding reconnaissance.
- Fix: Map known error categories to safe generic messages. Log the full error server-side with a correlation ID; return only the correlation ID to the client. Example: `return jsonResponse({ error: 'Payment processing failed', correlationId: uuid() }, 500)`.

**[W-4] Placeholder API key literal hardcoded in layout**

- File: `src/layouts/BaseLayout.astro:203`
- Impact: `amplitude.getInstance().init('YOUR_AMPLITUDE_API_KEY')` is committed as a literal string. It appears in the built JS bundle, is visible in browser devtools, and causes Amplitude to silently fail to initialize in any production environment that uses this layout.
- Fix: Replace with `import.meta.env.PUBLIC_AMPLITUDE_API_KEY || ''` — matching the pattern used in `AdminLayout.astro:223` and `ModernLayout.astro:129`.

**[W-5] Firebase custom token transmitted as URL query parameter**

- File: `functions/src/linkedin-auth.ts:218`
- Impact: The Firebase custom token (a valid JWT for 1 hour) is appended to the redirect URL as `?linkedinToken=...`. Tokens in URLs appear in: server access logs, browser history, the `Referer` header on subsequent navigations, and any analytics tool capturing full URLs. No client-side handler currently reads this parameter (the `completeLinkedInSignIn()` export exists but is not wired to any login page), but it will create this exposure once integrated.
- Fix: Use `sessionStorage` instead of URL parameters. After the redirect, the login page reads `sessionStorage.getItem('linkedinToken')` and immediately clears it after calling `signInWithCustomToken()`. Alternatively, use a short-lived server-side nonce (stored in Firestore for 60 seconds) that the login page exchanges for the token.

### Suggestion (consider)

**[S-1] CSP includes `'unsafe-inline'` and `'unsafe-eval'` in `scriptSrc` in production**

- File: `src/middleware/security.ts:37-51`
- Comment: `'unsafe-eval'` is commented "Needed for development" but is present in the production CSP config, substantially weakening XSS protection. Consider using nonces for legitimate inline scripts and removing `'unsafe-eval'` from the production build.

**[S-2] Payment endpoints lack per-user rate limiting**

- File: `src/middleware/index.ts:140-157`
- Comment: The rate limiter applies a generic preset at the IP level. Payment endpoints have no per-user rate limit. Consider adding per-user limits (e.g., 10 payment intent creations per hour per authenticated user), analogous to the per-user rate limiting already in `parseLinkedInPdf`.

**[S-3] `cors: true` on Firebase Cloud Functions allows all origins**

- File: `functions/src/parse-linkedin-pdf.ts:38`, `functions/src/linkedin-auth.ts:35,68`
- Comment: Tighten to `cors: ['https://secid.mx', 'https://beta.secid.mx']` for consistency with the Astro API CORS policy.

**[S-4] `set:html={JSON.stringify(data)}` in structured data components does not escape `</script>`**

- File: `src/components/seo/SEOHead.astro:309`, `src/layouts/ModernLayout.astro:124`
- Comment: `JSON.stringify` does not escape `</script>` within string values. If a page title or description field from Firestore contains `</script><script>alert(1)</script>`, it breaks out of the JSON-LD block. Use a serializer that escapes `<`, `>`, and `&` to their Unicode equivalents (`\u003c`, `\u003e`, `\u0026`).

---

## OWASP Top 10 Systematic Assessment

| OWASP                         | Status   | Key Findings                                                                                                                                        |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control     | Partial  | Payment APIs authenticated (TD-010 resolved). Admin role check uses Firestore field correctly. No privilege escalation in new code.                 |
| A02 Cryptographic Failures    | Warning  | Custom token in URL query param (W-5). No hardcoded real secrets found.                                                                             |
| A03 Injection                 | Critical | XSS: C-1 through C-4 open. No NoSQL injection (Firestore SDK parameterizes). No command injection.                                                  |
| A04 Insecure Design           | Critical | Payment amount bypass (C-5). LinkedIn returnUrl not validated server-side (W-2).                                                                    |
| A05 Security Misconfiguration | Warning  | Placeholder key in layout (W-4). Error leakage (W-3). `'unsafe-eval'` in production CSP (S-1).                                                      |
| A06 Vulnerable Components     | Fail     | TD-001 (fast-xml-parser Critical) and TD-004 (jws High) in functions/ remain open. Run `cd functions && npm audit fix`.                             |
| A07 Auth Failures             | Pass     | All payment endpoints authenticated. LinkedIn custom token flow is server-side. Session middleware validates protected paths correctly.             |
| A08 Data Integrity            | Warning  | Forum htmlContent stored in Firestore without sanitization (C-1). Custom token in URL (W-5).                                                        |
| A09 Logging Failures          | Warning  | `console.error` used throughout API routes instead of `src/lib/logger.ts` (pre-existing TD-016). Sensitive error details returned to callers (W-3). |
| A10 SSRF                      | Warning  | User-controlled domain in outbound fetch (W-1). Host header injection in LinkedIn callback (W-2 part A).                                            |

---

## New Code Security Assessment (feature/hub additions)

| File                                               | Auth                           | Input Validation                                                               | Output Sanitization                                  | Notes                                                                               |
| -------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `functions/src/parse-linkedin-pdf.ts`              | Pass — requires `request.auth` | Pass — pdfData type check, size limit, magic bytes                             | N/A (returns parsed text)                            | Rate limiting correct. Error messages to caller are generic.                        |
| `functions/src/linkedin-auth.ts`                   | N/A (OAuth callback)           | Partial — state parsed with try/catch, but returnUrl not validated as relative | N/A                                                  | W-2 (host header + open redirect). W-5 (token in URL).                              |
| `src/components/profile/LinkedInImportModal.tsx`   | N/A (client component)         | Pass — 5MB client-side check before upload                                     | N/A (content goes to textarea, not rendered as HTML) | Clean. No dangerouslySetInnerHTML. `alert()` usage is acceptable for upload errors. |
| `src/lib/auth/provider-id-map.ts`                  | N/A (pure utility)             | N/A                                                                            | N/A                                                  | Clean. No security concerns.                                                        |
| `src/components/profile/tabs/CareerTab.tsx` (diff) | N/A (client component)         | Pass — deduplication before write                                              | N/A                                                  | Clean refactor. No security regressions.                                            |

---

## Dead Code Scan (new additions)

- No dead code in new files.
- `convertParsedToWorkExperience` correctly removed from `CareerTab.tsx` and moved into `LinkedInImportModal.tsx`.
- Pre-existing TD-015 (~50 orphan files) remains open.

---

## Verdict

**CHANGES REQUIRED**

Six critical/warning items block promotion to main:

| Priority     | Finding                         | File                                            | Action                                                 |
| ------------ | ------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| 1 (Critical) | C-1: Forum post XSS             | `ForumPost.tsx:543`                             | Apply `sanitizeHtml()` to `processContent()` output    |
| 2 (Critical) | C-2: Forum search XSS           | `ForumSearch.tsx:176-186`                       | Escape regex input + sanitize `highlightText()` output |
| 3 (Critical) | C-3: Blog/Newsletter stored XSS | `BlogPost.tsx:173`, `NewsletterView.tsx:107`    | Apply `sanitizeHtml()` before render                   |
| 4 (Critical) | C-4: Spotlight/HelpCenter XSS   | `SpotlightDetail.tsx:153`, `HelpCenter.tsx:388` | Apply `sanitizeHtml()` before render                   |
| 5 (Critical) | C-5: Payment amount bypass      | `create-payment-intent.ts:33-38`                | Remove `body.amount` from client input                 |
| 6 (Warning)  | W-2: LinkedIn open redirect     | `linkedin-auth.ts:85-88,218`                    | Validate returnUrl is relative-only                    |
| 7 (Warning)  | TD-001/TD-004                   | functions/package.json                          | `cd functions && npm audit fix`                        |

Items W-1, W-3, W-4, W-5 should be resolved before promoting feature/hub to main.
