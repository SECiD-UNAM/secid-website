# Security Audit: Infrastructure, Dependency Chain & Deployment

**Date**: 2026-03-23
**Reviewer**: Centinela (QA Agent)
**Scope**: CSP deep analysis, dependency chain, Firebase config, build/deployment security, service worker, HTTP headers, secrets in client bundle
**Previous audits**: security-audit-2026-03-23.md, security-audit-auth-2026-03-23.md, security-audit-salary-2026-03-23.md, security-audit-secrets-2026-03-23.md

---

## Summary

The infrastructure layer has four new findings that must be resolved before the next production release. The most impactful is that **non-PUBLIC\_ environment variables (Stripe secret key and price IDs) are evaluated in `stripe-client.ts`, which is imported by React components and therefore included in the client bundle** — in practice Vite/Astro will substitute `undefined` at build time, but the Stripe SDK is instantiated with that undefined key, and the constant `SUBSCRIPTION_PLANS` with embedded `import.meta.env.STRIPE_*_PRICE_ID` values is shipped to the browser. The CSP deep analysis confirms a previously documented shallow-merge defect that can produce a critically incomplete CSP in production. The CI/CD pipeline has a manually-triggerable test-bypass that allows deploying without any test gate.

---

## Findings

### Critical (must fix before merge)

- **[C-1] Stripe secret key and price IDs evaluated in client-bundled module**
  - File: `src/lib/stripe/stripe-client.ts:6,62,83,106`
  - Imported by: `src/components/payments/PricingPlans.tsx`, `src/components/payments/CheckoutForm.tsx`, and 7 commission dashboard components
  - Impact: `STRIPE_SECRET_KEY` and `STRIPE_*_PRICE_ID` are non-PUBLIC\_ variables. Vite replaces them with `undefined` in the client bundle rather than erroring. However, `SUBSCRIPTION_PLANS` contains `priceId: import.meta.env.STRIPE_BASIC_PRICE_ID` — that exact expression is evaluated in the module initializer, which runs in both server and client contexts. When Astro pre-renders a page with this import, the Stripe SDK is also instantiated with `stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY`. If the build environment is not hermetically sealed, the secret key value can bleed into SSR-rendered HTML or the pre-rendered bundle. Additionally, having `new Stripe(secretKey)` in a module that is imported by React components is a structural secret-exposure risk regardless of current bundle output.
  - Fix: Split `stripe-client.ts` into two files — `stripe-server.ts` (server-only: `stripe` instance, `createCustomer`, `createSubscription`, etc.) and `stripe-browser.ts` (client-safe: `stripePromise`, `SUBSCRIPTION_PLANS`, `COMMISSION_TYPES`, constants only). React components must import only from `stripe-browser.ts`. API routes import from `stripe-server.ts`. Add a lint rule enforcing no Stripe SDK imports in `src/components/**`.

- **[C-2] CSP shallow merge silently breaks production Content Security Policy**
  - File: `src/middleware/security.ts:153`
  - Status: Previously documented as TD-022 / W-1. Upgrading to Critical because the production CSP directive set is now confirmed incomplete.
  - Exact production CSP: `createSecurityMiddleware(productionSecurityConfig)` executes `{ ...defaultSecurityConfig, ...productionSecurityConfig }`. Since `productionSecurityConfig` has a top-level `csp` key, the spread replaces `defaultSecurityConfig.csp` entirely. The resulting `securityConfig.csp` contains only what `productionSecurityConfig.csp` defines: `scriptSrc` (no `unsafe-inline`, no `unsafe-eval` — which is correct but) — and nothing else. The `defaultSrc`, `styleSrc`, `imgSrc`, `connectSrc`, `fontSrc`, `objectSrc`, `mediaSrc`, `frameSrc`, `workerSrc`, `manifestSrc`, and `formAction` directives are all missing from the production header.
  - Impact: Without `defaultSrc`, browsers apply no fallback restriction. Without `styleSrc`, any inline or external stylesheet loads. Without `connectSrc`, Firebase, Stripe, Amplitude API calls may be blocked. The effective production CSP is functionally useless as a defense-in-depth control.
  - Fix: In `createSecurityMiddleware`, use deep merge: `const securityConfig = deepMerge(defaultSecurityConfig, config)`. Alternatively, make `productionSecurityConfig.csp` a complete object. Verify the resulting header value with `curl -I https://beta.secid.mx/ | grep Content-Security-Policy` before releasing.

### Warning (should fix)

- **[W-1] CI/CD pipeline allows test bypass via manual workflow dispatch**
  - File: `.github/workflows/cd.yml:9-13,26,51`
  - Details: The `workflow_dispatch` event exposes a `skip_tests` boolean input (default: `false`). Line 26: `if: ${{ github.event.inputs.skip_tests != 'true' }}` — when `skip_tests` is `true`, the `test` job is skipped. Line 51: `if: always() && (needs.test.result == 'success' || needs.test.result == 'skipped')` — the deploy job proceeds if the test job was skipped. Any repository collaborator can manually trigger a deployment with zero test coverage.
  - Impact: A bad actor with write access (or a compromised collaborator account) can deploy untested code to production. Even benign use normalizes the "skip tests" pattern.
  - Fix: Remove the `skip_tests` input entirely. If emergency deployments need a faster path, create a separate `hotfix-deploy.yml` workflow that requires two manual approvals and is restricted to protected branch pushes — not open to any `workflow_dispatch`. Alternatively, keep the input but gate it behind required environment approvals (`environment: production` with required reviewers).

- **[W-2] h3 path traversal vulnerability in production dependency chain**
  - Packages: `h3 <=1.15.5` via `astro@5.18.0 -> unstorage@1.17.4 -> h3`
  - CVEs: GHSA-wr4h-v87w-p3r7 (path traversal via percent-encoded dot segments), GHSA-72gr-qfp7-vwhw (double-encoding bypass), GHSA-4hxc-9384-m385 (SSE injection via CR), GHSA-22cc-p3c6-wpvm (SSE injection via newlines)
  - Impact: h3 is Astro's internal HTTP layer. The `serveStatic` path traversal allows reading arbitrary files from the server's filesystem via requests like `/assets/%252e%252e/etc/passwd`. This is exploitable on the `@astrojs/node` standalone server. Severity: HIGH.
  - Note: The vulnerability is in `unstorage`, which Astro uses for session/cache storage, not for serving static files directly. The serveStatic vector may not apply if Astro does not call `h3.serveStatic` in production deployments (Firebase Hosting serves statics). However, the SSE injection vectors apply to any streaming endpoint.
  - Fix: `npm update h3` — or wait for Astro to release a version that pins `unstorage` to a fixed h3. Track `astro` minor updates: this is likely fixed in the next patch.

- **[W-3] devalue prototype pollution in Astro SSR serialization**
  - Package: `devalue@5.6.3` via `astro@5.18.0`
  - CVEs: GHSA-cfw5-2vxh-hr84, GHSA-mwv9-gp5h-frr4 (prototype pollution in `devalue.parse` and `devalue.unflatten`)
  - Impact: devalue is used by Astro to serialize/deserialize SSR props between server and client. If attacker-controlled data reaches Astro's SSR serialization pipeline (e.g., via Firestore query results passed as SSR props), a crafted `__proto__` key can pollute the Node.js prototype chain, potentially leading to privilege escalation or DoS.
  - Fix: Wait for Astro to update its devalue dependency, or pin `devalue` in your package overrides to a patched version once available. In the interim, ensure Firestore data is never passed raw to Astro `getStaticPaths` or server-side data without JSON schema validation (Zod) that strips unknown keys including `__proto__`.

- **[W-4] flatted prototype pollution in ESLint/Vitest toolchain**
  - Package: `flatted@3.3.3` via `eslint` and `@vitest/ui`
  - CVEs: GHSA-rf6f-7fwh-wjgh (prototype pollution in `parse()`), GHSA-25h7-pfq9-p65f (unbounded recursion DoS)
  - Impact: `flatted` is only used by devDependencies (eslint, vitest). Not present in production. Risk is limited to CI/CD pipeline and local developer machines. A malicious package or configuration file containing crafted JSON could trigger prototype pollution in a dev/test environment.
  - Fix: `npm audit fix` — fixable without breaking changes. Low urgency for production but should be cleaned up in the next maintenance pass.

- **[W-5] functions/ has 15 unresolved vulnerabilities including 6 HIGH**
  - File: `functions/package.json`
  - HIGH findings: `@tootallnate/once` (incorrect control flow via proxy-agent in firebase-admin), `minimatch` (3 separate ReDoS CVEs via `@typescript-eslint/parser`)
  - Impact: The `minimatch` ReDoS vulnerabilities affect the `@typescript-eslint/parser` used in the functions build toolchain. If any CI/CD step runs eslint on attacker-controlled TypeScript files with pathological glob patterns, it could cause unbounded CPU consumption.
  - Fix: `cd functions && npm audit fix --force` (will install `@typescript-eslint/parser@8.57.2` — breaking change for ESLint config). Alternatively, pin `minimatch` override in `functions/package.json` to `>=9.0.0`.

- **[W-6] Service worker caches authenticated API responses without auth context validation**
  - File: `public/service-worker.js:36-41,244-296`
  - Details: `API_ENDPOINTS = ['/api/jobs', '/api/events', '/api/members', '/api/user/profile']`. The service worker caches responses from these endpoints using `cache.put(request, response.clone())` (line 258). The cache key is the URL only — it does not include the `Authorization` or `Cookie` header. If user A logs out and user B logs in on the same device, user B's requests to `/api/user/profile` may return user A's cached profile until the cache expires.
  - Impact: PII data leakage between users sharing a device. Severity is moderate because it requires same-device multi-user session (unusual but plausible in shared computer scenarios like a library).
  - Fix: Exclude authenticated endpoints from SW caching, or vary the cache key by including a hash of the auth token. At minimum, add `/api/user/profile` to the exclusion list (user-specific PII). Add a `cache.delete()` call for all `/api/user/**` entries on `auth/signout` events via SW message passing.

- **[W-7] Service worker background sync replays POST requests without CSRF validation**
  - File: `public/service-worker.js:140-178,363-398`
  - Details: `handlePostRequest` captures failed POST requests and queues them in IndexedDB for replay during background sync. The stored request body includes headers (line 339: `Object.fromEntries(request.headers.entries())`). When `processQueuedRequests` replays these requests, it reconstructs them from stored data. A malicious script on the same origin could inject crafted POST data into the IndexedDB queue (`secid-sw-db/requests`) before the SW processes them.
  - Impact: An XSS-to-CSRF escalation vector. If any of the existing stored XSS vulnerabilities (TD-019) are triggered, the attacker can persist malicious POST payloads for replay after the XSS session ends.
  - Fix: Scope background sync to non-mutating or idempotent operations only. Never replay payment or auth POST requests via background sync. Add an allowlist of safe-to-replay endpoints.

- **[W-8] deploy-beta.yml has no test gate — deploys directly to beta on any push to feature/hub**
  - File: `.github/workflows/deploy-beta.yml`
  - Details: The entire workflow is a single job (`deploy-beta`) that runs `npx astro build` and deploys to `beta.secid.mx` with zero test step. Any push to `feature/hub` triggers a live deployment.
  - Impact: Regressions can reach beta users immediately. Currently, `feature/hub` is the main development branch for the current sprint; it sees frequent pushes.
  - Fix: Add a `test` job as a prerequisite (matching the structure in `cd.yml`). At minimum, run `npm run build` type-checking and `npm test` before deploying.

### Suggestion (consider)

- **[S-1] `X-DNS-Prefetch-Control` header not set**
  - File: `src/middleware/security.ts`
  - Details: The security middleware does not set `X-DNS-Prefetch-Control: off`. DNS prefetching can leak information about third-party resource URLs to DNS observers.
  - Fix: Add `newResponse.headers.set('X-DNS-Prefetch-Control', 'off')`.

- **[S-2] Cross-Origin-Embedder-Policy is set to `unsafe-none` — weakens isolation**
  - File: `src/middleware/security.ts:207`
  - Details: COEP is explicitly set to `unsafe-none` (the default). While this is necessary if the app embeds cross-origin resources (Firebase, Amplitude, Google fonts), it prevents the app from enabling `SharedArrayBuffer` and high-resolution timers. This is intentional but worth documenting.
  - Fix: No immediate action. Document the COEP/COOP/CORP triad as intentional in the file comment.

- **[S-3] Security scanning workflow only runs on `main` and `develop` — not on `feature/hub`**
  - File: `.github/workflows/security.yml:4-6`
  - Details: `on.push.branches: [main, develop]`. The active development branch `feature/hub` is not covered by scheduled or push-triggered security scans.
  - Fix: Add `feature/hub` to the security scanning workflow trigger, or replace branch-specific triggers with `pull_request: [main]` so any PR to main triggers security scans.

- **[S-4] `@ts-nocheck` suppresses type checking in stripe-client.ts**
  - File: `src/lib/stripe/stripe-client.ts:1`
  - Details: The entire file is excluded from TypeScript checking via `@ts-nocheck`. This allows the `STRIPE_SECRET_KEY` bundle risk (C-1) and other type errors to be silently ignored.
  - Fix: Remove `@ts-nocheck`, fix type errors, then address C-1.

- **[S-5] `devalue` prototype pollution mitigation: validate all SSR props with Zod**
  - Context for W-3.
  - Fix: Before passing any Firestore document data to Astro SSR responses, run it through a Zod schema with `.strict()` so unknown keys (including `__proto__`) are stripped.

---

## CSP Deep Analysis

### Exact production CSP header (as shipped)

Due to the shallow merge defect in `createSecurityMiddleware` (C-2), the actual production CSP is:

```
script-src 'self' https://cdn.amplitude.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://analytics.google.com https://firebase.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://www.recaptcha.net
```

The `hsts` key in `productionSecurityConfig` is also a top-level override, but it's correctly structured.

### Expected production CSP (intended by the default config)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' [+ external CDNs];
style-src 'self' 'unsafe-inline' [fonts];
img-src 'self' data: https: [Firebase, Google];
connect-src 'self' [Firebase, Amplitude, analytics];
font-src 'self' [gstatic, jsdelivr];
object-src 'none';
media-src 'self' [Firebase Storage];
frame-src 'self' [Google, reCAPTCHA];
worker-src 'self' blob:;
manifest-src 'self';
form-action 'self' https://docs.google.com
```

### CSP bypass vectors

1. **`unsafe-inline` on scriptSrc** (default config, line 38): Allows any inline `<script>` tag. Combined with TD-019's stored XSS via `dangerouslySetInnerHTML`, this means CSP provides zero protection against XSS attacks. Fix: Use CSP nonces (Astro supports this via middleware) instead of `unsafe-inline`.

2. **`unsafe-eval` on scriptSrc** (default config, line 39, comment says "Needed for development"): This must not appear in production. The comment acknowledges this, but `unsafe-eval` appears in `defaultSecurityConfig`, not just `developmentSecurityConfig`. Since production uses a partial override (C-2) that replaces `defaultSecurityConfig.csp`, the production `scriptSrc` currently does NOT include `unsafe-eval` (by accident). Once C-2 is fixed with deep merge, `unsafe-eval` will reappear in production unless it is explicitly removed from `productionSecurityConfig.scriptSrc`.

3. **`img-src: https:`** (default config, line 61): A wildcard allowing any image from any HTTPS source. This is a weak image restriction — it permits data exfiltration via CSS image loading techniques. Narrow to specific domains once C-2 is fixed.

4. **`img-src: data:`** (default config, line 61): Allows `data:` URIs in images. Combined with `unsafe-inline`, this can be used as an XSS vector in some browser configurations.

### CSP application scope

The middleware applies CSP only to `text/html` responses (line 159-161: `if (!contentType.includes('text/html')) return response`). This is correct — CSP headers on JSON API responses are redundant. Firebase Hosting serves static assets with its own headers (no CSP set there per `firebase.json` headers config), which is also correct since static assets are not HTML documents.

---

## HTTP Security Headers Completeness

| Header                       | Status                | Value                                                             | Notes                                       |
| ---------------------------- | --------------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| Content-Security-Policy      | BROKEN                | See above                                                         | Shallow merge defect (C-2)                  |
| Strict-Transport-Security    | SET                   | `max-age=63072000; includeSubDomains; preload`                    | Correct. 2-year HSTS with preload.          |
| X-Frame-Options              | SET                   | `DENY`                                                            | Correct.                                    |
| X-Content-Type-Options       | SET                   | `nosniff`                                                         | Correct.                                    |
| X-XSS-Protection             | SET                   | `1; mode=block`                                                   | Legacy header. Retained for older browsers. |
| Referrer-Policy              | SET                   | `strict-origin-when-cross-origin`                                 | Correct.                                    |
| Permissions-Policy           | SET                   | camera, mic, geo, payment, display-capture, fullscreen, web-share | Good coverage.                              |
| Cross-Origin-Embedder-Policy | SET                   | `unsafe-none`                                                     | Intentional (see S-2).                      |
| Cross-Origin-Opener-Policy   | SET                   | `same-origin-allow-popups`                                        | Allows OAuth popup windows. Correct.        |
| Cross-Origin-Resource-Policy | SET                   | `cross-origin`                                                    | Intentional for CDN-hosted assets.          |
| X-DNS-Prefetch-Control       | MISSING               | —                                                                 | See S-1.                                    |
| Cache-Control (HTML)         | SET via firebase.json | `public, max-age=0, must-revalidate`                              | Correct for HTML.                           |
| Server / X-Powered-By        | REMOVED               | —                                                                 | Correct.                                    |

### HSTS assessment

`max-age=63072000; includeSubDomains; preload` — the HSTS header is correct and production-ready:

- 2-year max-age exceeds the HSTS preload list minimum of 31536000
- `includeSubDomains` is set
- `preload` directive is set
- Note: For preload list inclusion, submit to hstspreload.org. This is not automatic.

---

## Dependency Chain Analysis

### Root (npm audit: 21 vulnerabilities — 11 moderate, 10 high, 0 critical)

| Package                | Severity | CVE                                      | Runtime?                         | Fix                   |
| ---------------------- | -------- | ---------------------------------------- | -------------------------------- | --------------------- |
| `h3 <=1.15.5`          | HIGH     | GHSA-wr4h-v87w-p3r7, -72gr, -4hxc, -22cc | YES (Astro SSR)                  | `npm update`          |
| `devalue 5.6.3`        | HIGH     | GHSA-cfw5-2vxh-hr84, -mwv9               | YES (Astro SSR serialization)    | Wait for Astro update |
| `flatted 3.3.3`        | HIGH     | GHSA-rf6f, -25h7                         | NO (devDep only)                 | `npm audit fix`       |
| `minimatch <=9.0.4`    | HIGH     | GHSA-3ppc, -7r86, -23c5                  | NO (devDep: @typescript-eslint)  | `npm audit fix`       |
| `svgo <=3.2.0`         | HIGH     | —                                        | NO (devDep: astro-compress)      | Pin via overrides     |
| `@typescript-eslint/*` | HIGH     | via minimatch                            | NO                               | `npm audit fix`       |
| `lodash 4.17.21`       | MODERATE | —                                        | NO (devDep: recharts transitive) | Acceptable risk       |

**Prototype pollution check (lodash)**: `lodash@4.17.21` is present transitively via recharts, @testing-library, concurrently. All are devDependencies or non-SSR production code. lodash 4.17.21 has GHSA-p6mc-m468-83gw (prototype pollution in `zipObjectDeep`). recharts' use of lodash does not call `zipObjectDeep`. Risk: Low in production context.

**ReDoS check (qs)**: `qs@6.15.0` is used by stripe SDK and express. `qs 6.15.0` is current and has no known ReDoS CVEs. No risk.

**ReDoS check (minimatch)**: Three separate ReDoS CVEs in minimatch. Only affects build/lint toolchain — not invoked on user input. Risk: Low (CI pipeline resource exhaustion only).

### Functions (npm audit: 15 vulnerabilities — 9 low, 6 high, 0 critical)

| Package             | Severity | CVE          | Runtime?                   | Fix                                |
| ------------------- | -------- | ------------ | -------------------------- | ---------------------------------- |
| `@tootallnate/once` | HIGH     | GHSA-vpq2    | YES (firebase-admin proxy) | `npm audit fix --force` (breaking) |
| `minimatch`         | HIGH     | 3 ReDoS CVEs | NO (build toolchain only)  | `npm audit fix --force`            |

The `@tootallnate/once` vulnerability (incorrect control flow scoping) is in `proxy-agent` via `firebase-admin`. Firebase Admin SDK uses `proxy-agent` for HTTP proxying in Cloud Functions. The vulnerability involves incorrect handling of once-registered event listeners, which could cause double-invocation of callbacks. This does not affect functions that don't use HTTP proxy configuration (which is the default). Risk: Low in practice, but the fix is available via `npm audit fix --force` (installs `firebase-admin@10.3.0` — a major version downgrade, which may break API surface). Recommended: wait for `firebase-admin@12.x` to resolve this transitively, or pin `@tootallnate/once` in overrides.

---

## Firebase Configuration Security

### firebase.json assessment

**Hosting rewrites**: 6 rewrites are defined, all mapping dynamic URL segments to static index files:

```
/es/members/*/cv → /es/cv/index.html
/en/members/*/cv → /en/cv/index.html
/es/members/* → /es/members/profile/index.html
/en/members/* → /en/members/profile/index.html
/es/companies/* → /es/companies/profile/index.html
/en/companies/* → /en/companies/profile/index.html
```

**Open redirect analysis**: None of these rewrites redirect to external URLs. All destinations are relative paths to static HTML files. No open redirect risk.

**Emulator config exposure**: The `emulators` block in `firebase.json` defines ports (9099, 5001, 8088, 9199, 4000). This is standard and does not affect production — Firebase Hosting ignores the emulators block when deploying. The emulator UI is enabled (port 4000) — this is only active during local development. No production risk.

**Functions predeploy**: The predeploy scripts run `lint` and `build`. Both are required — lint catches TypeScript errors, build produces the compiled JS. There is no `test` step in the functions predeploy. Adding `npm run test` would be defensive but functions currently has no test suite defined.

**Missing: `hosting.headers` does not include security headers**. Firebase Hosting can set headers at the CDN level. Currently only cache control headers are set. The Astro middleware sets CSP and other headers, but only for SSR-rendered routes. For purely static pages served directly by Firebase Hosting (no Astro SSR), the middleware never runs — those pages receive no CSP headers. This is a gap if any static pages exist without SSR.

---

## Build and Deployment Security

### Source maps

`astro.config.mjs` does not configure `vite.build.sourcemap`. Vite defaults to `false` for production builds (sourcemaps are disabled). No source maps are shipped to production. Confirmed: `dist/**/*.js.map` search returns no files.

### .env file leakage

`.gitignore` correctly excludes `.env`, `.env.local`, `.env.test`, `.env.*.local`. Confirmed by `git ls-files .env.test` returning empty — the file is not tracked.

`.env.test` is present on disk (not in git). It contains `TEST_USER_PASSWORD=TestPassword123!`, `ADMIN_PASSWORD=AdminPassword123!`, etc. These are test credentials; their presence on the developer's machine is acceptable. They are NOT in the repository.

**One concern**: `package-lock.json` is also in `.gitignore` (line 117: `package-lock.json`). This is non-standard — lock files should be committed to ensure reproducible builds. Without it, `npm ci` in CI/CD cannot guarantee the same dependency tree as the developer's machine. This is a supply chain risk: a CI run that executes `npm install` (without lock file) could pull in a newly-published malicious package version.

### API keys in client bundle

PUBLIC\_ variables that ship in the client bundle (by design):

- `PUBLIC_FIREBASE_API_KEY` — Firebase Web API key. Acceptable: Firebase API keys are not secrets, they identify the project. Security is enforced by Firestore rules and Auth domain restrictions.
- `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_STORAGE_BUCKET`, `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `PUBLIC_FIREBASE_APP_ID` — Firebase config. All acceptable.
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key. Acceptable: designed for client-side use.
- `PUBLIC_AMPLITUDE_API_KEY` — Currently `YOUR_AMPLITUDE_API_KEY` literal placeholder in `src/layouts/BaseLayout.astro:203`. Ships this literal to production HTML (S-3 from previous audit, still unresolved).
- `PUBLIC_DEBUG_MODE`, `PUBLIC_USE_EMULATORS`, feature flags — acceptable.

Non-PUBLIC\_ variables evaluated in client-importable code (risk):

- `STRIPE_SECRET_KEY` in `stripe-client.ts:6` — see C-1
- `STRIPE_BASIC_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID` in `stripe-client.ts:62,83,106` — these are non-secret price IDs but they are non-PUBLIC\_ variables evaluated in a client-bundled file. In the CI/CD build, these would be `undefined` (not injected per `cd.yml`), so `SUBSCRIPTION_PLANS.BASIC.priceId` is `undefined` in the browser. This causes checkout failures when clients attempt to initiate a subscription.
- `LOGO_DEV_API_TOKEN` in `src/pages/api/companies/fetch-logo.ts:92` — non-PUBLIC\_ variable used in an API route (server-only). Correct.

### astro.config.mjs security review

- `output: 'static'` — correct. Pages with `export const prerender = false` remain server-rendered.
- `adapter: node({ mode: 'standalone' })` — correct for Firebase Hosting + Cloud Run deployment pattern.
- `vite.ssr.external: ['firebase', 'firebase-admin']` — correct. Prevents Firebase SDKs from being bundled into the SSR output.
- `vite.optimizeDeps.exclude: ['firebase', ...]` — correct. Prevents Vite from pre-bundling Firebase for client-side.
- No `define` block that could inject secrets into the bundle.
- `minifyJS: true` in `astro-compress` — minified output makes source reconstruction harder but is not a security control.

---

## Service Worker Security

### Cache poisoning risk

The service worker uses `cache.put(request, response.clone())` without validating response headers. An attacker who can perform a man-in-the-middle attack (unlikely given HSTS) or exploit a response injection vulnerability could poison the cache with malicious HTML. This is a theoretical risk given HSTS is correctly set.

### Sensitive routes cached

`/api/user/profile` is in the explicit `API_ENDPOINTS` cache list (line 40) and in `shouldCacheApiResponse` (line 468). User profile data (name, email, role, etc.) is cached in the `API_CACHE` store. This creates the user data leakage risk described in W-6.

### Mixed content

The service worker correctly checks `url.origin !== location.origin` (line 104) and skips cross-origin requests. No mixed content issues.

### HTTPS handling

The SW does not need to enforce HTTPS — that is handled by the `Strict-Transport-Security` header and Firebase Hosting's automatic HTTPS redirect. The SW only runs once HTTPS is established. No issues.

### SW versioning

Cache names are hardcoded as `secid-platform-v1`, `secid-static-v1`, etc. (lines 4-7). The activate handler purges caches not matching the current name constants. This is correct. However, when the SW is updated, `CACHE_NAME = 'secid-platform-v1'` must be bumped to force cache invalidation. If the constant is not changed between deployments, stale cached responses will persist indefinitely.

### Background sync IndexedDB

The `openDB()` function creates an IndexedDB store with auto-increment IDs. The store has no origin check beyond what the browser enforces. An XSS payload on the same origin can write arbitrary request data to this store, which the SW will then replay. This is the W-7 finding.

---

## Architecture Compliance (Security-Relevant)

### Dependency direction violations

`src/lib/stripe/stripe-client.ts` is structured as a shared module imported by both API routes (server-only) and React components (client-side). This is an architecture violation: server-side SDK initialization (Stripe Node.js SDK, secret key access) must not exist in the same module boundary as client-side UI components. The module attempts to handle both contexts but Vite's client/server boundary detection does not split it automatically without explicit `server:` or `client:` directives.

### Layer separation

Firebase initialization in `src/lib/firebase.ts` correctly handles the SSR/client split via `typeof window === 'undefined'` check. The Stripe module does not implement a comparable check — it initializes `new Stripe(secretKey)` unconditionally at module load time, which runs on the server (safe) but also in the client bundle if imported by a React component (risk).

---

## Security Verification Checklist (DO-CONFIRM)

- [x] No hardcoded secrets, API keys, or credentials in code — `.env.test` confirmed not tracked. No `sk_live_*` keys found. Emergency password (TD-017) is a pre-existing finding. STRIPE_SECRET_KEY is not hardcoded but is accessed in a client-bundled file (C-1).
- [x] All user input validated — h3 path traversal is a dependency vuln, not an input validation gap in app code. SSRF in fetch-logo.ts (TD-022) is a pre-existing finding.
- [x] Database queries parameterized — Firebase SDK handles parameterization. No SQL injection vectors.
- [x] Authentication enforced on all protected endpoints — CI/CD test bypass (W-1) allows deploying without auth testing. API auth is two-layer per previous audit.
- [ ] Dependencies have no known critical CVEs — h3 HIGH path traversal in production dependency (W-2). Functions has 6 HIGH CVEs (W-5). FAIL on "no critical CVEs" if HIGH is included.

**Security Verification result**: FAIL — W-2 (h3 HIGH path traversal in production runtime), C-1 (Stripe SDK in client bundle).

---

## Verdict

**CHANGES REQUIRED**

### Required before next production release:

1. **C-1**: Split `stripe-client.ts` into server/browser modules. React components must not import the Stripe Node.js SDK or access non-PUBLIC* env vars. The `STRIPE*\*_PRICE_ID` values must be either PUBLIC_ variables or fetched from an API endpoint. Fix required before any Stripe checkout can function correctly (price IDs are `undefined` in the browser per current CI/CD env config).

2. **C-2**: Fix the CSP shallow merge in `createSecurityMiddleware`. Use deep merge. Verify production CSP header with `curl -I https://beta.secid.mx/`. The current production CSP is `script-src` only — all other directives are missing.

3. **W-1**: Remove `skip_tests` bypass from `cd.yml`, or gate it behind environment approval requirements.

### Required before next sprint ends:

4. **W-2**: Update h3 dependency (watch for Astro 5.x patch that bumps unstorage/h3).
5. **W-6**: Remove `/api/user/profile` from service worker cache list.
6. **W-8**: Add test gate to `deploy-beta.yml`.
7. **W-5**: `cd functions && npm audit fix` for low-risk fixes; track the breaking-change firebase-admin fix separately.
