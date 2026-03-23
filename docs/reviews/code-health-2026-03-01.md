# Code Health: Dependency Scan

**Date**: 2026-03-01
**Reviewer**: Centinela (QA Agent)
**Scope**: Root package.json + functions/package.json — dependency health only (no code scan requested)

## Summary

The project carries significant dependency drift across both the root and functions packages, with a combined 36 vulnerabilities (1 critical, 19 high, 15 moderate, 1 low). Multiple core framework dependencies (Astro, Vite, esbuild) have published CVE advisories against the currently installed versions. The functions package has one confirmed critical CVE in `fast-xml-parser`. No code scan was performed in this run — this report covers dependency health only.

---

## 1. ROOT PACKAGE — `npm outdated` Raw Output

```
Package                           Current    Wanted   Latest  Location
@astrojs/check                     0.5.10    0.5.10    0.9.6  node_modules/@astrojs/check
@astrojs/node                       8.3.4     8.3.4    9.5.4  node_modules/@astrojs/node
@astrojs/react                      3.6.3     3.6.3    4.4.2  node_modules/@astrojs/react
@astrojs/sitemap                    3.4.2     3.7.0    3.7.0  node_modules/@astrojs/sitemap
@astrojs/tailwind                   5.1.5     5.1.5    6.0.2  node_modules/@astrojs/tailwind
@faker-js/faker                     9.9.0     9.9.0   10.3.0  node_modules/@faker-js/faker
@headlessui/react                  1.7.19    1.7.19    2.2.9  node_modules/@headlessui/react
@hookform/resolvers                3.10.0    3.10.0    5.2.2  node_modules/@hookform/resolvers
@stripe/react-stripe-js             5.4.1     5.6.0    5.6.0  node_modules/@stripe/react-stripe-js
@stripe/stripe-js                   8.5.3     8.8.0    8.8.0  node_modules/@stripe/stripe-js
@tailwindcss/forms                 0.5.10    0.5.11   0.5.11  node_modules/@tailwindcss/forms
@tailwindcss/typography            0.5.16    0.5.19   0.5.19  node_modules/@tailwindcss/typography
@tanstack/react-query              5.84.1   5.90.21  5.90.21  node_modules/@tanstack/react-query
@testing-library/jest-dom           6.6.4     6.9.1    6.9.1  node_modules/@testing-library/jest-dom
@testing-library/react             14.3.1    14.3.1   16.3.2  node_modules/@testing-library/react
@types/node                       20.19.9  20.19.35   25.3.3  node_modules/@types/node
@types/react                      18.3.23   18.3.28  19.2.14  node_modules/@types/react
@types/react-dom                   18.3.7    18.3.7   19.2.3  node_modules/@types/react-dom
@typescript-eslint/eslint-plugin   6.21.0    6.21.0   8.56.1  node_modules/@typescript-eslint/eslint-plugin
@typescript-eslint/parser          6.21.0    6.21.0   8.56.1  node_modules/@typescript-eslint/parser
@vitejs/plugin-react                4.7.0     4.7.0    5.1.4  node_modules/@vitejs/plugin-react
@vitest/coverage-v8                 1.6.1     1.6.1   4.0.18  node_modules/@vitest/coverage-v8
@vitest/ui                          1.6.1     1.6.1   4.0.18  node_modules/@vitest/ui
astro                             4.16.19   4.16.19   5.18.0  node_modules/astro
astro-compress                      2.3.8     2.3.9    2.3.9  node_modules/astro-compress
autoprefixer                      10.4.21   10.4.27  10.4.27  node_modules/autoprefixer
concurrently                        9.2.0     9.2.1    9.2.1  node_modules/concurrently
date-fns                            3.6.0     3.6.0    4.1.0  node_modules/date-fns
eslint                             8.57.1    8.57.1   10.0.2  node_modules/eslint
eslint-config-prettier              9.1.2     9.1.2   10.1.8  node_modules/eslint-config-prettier
eslint-plugin-astro                0.31.4    0.31.4    1.6.0  node_modules/eslint-plugin-astro
eslint-plugin-react-hooks           4.6.2     4.6.2    7.0.1  node_modules/eslint-plugin-react-hooks
firebase                          11.10.0   11.10.0  12.10.0  node_modules/firebase
glob                               11.1.0    11.1.0   13.0.6  node_modules/glob
i18next                           23.16.8   23.16.8  25.8.13  node_modules/i18next
jsdom                              24.1.3    24.1.3   28.1.0  node_modules/jsdom
lint-staged                        15.5.2    15.5.2   16.3.0  node_modules/lint-staged
lucide-react                      0.323.0   0.323.0  0.575.0  node_modules/lucide-react
prettier                            3.6.2     3.8.1    3.8.1  node_modules/prettier
prettier-plugin-astro              0.13.0    0.13.0   0.14.1  node_modules/prettier-plugin-astro
prettier-plugin-tailwindcss        0.5.14    0.5.14    0.7.2  node_modules/prettier-plugin-tailwindcss
react                              18.3.1    18.3.1   19.2.4  node_modules/react
react-dom                          18.3.1    18.3.1   19.2.4  node_modules/react-dom
react-hook-form                    7.61.1    7.71.2   7.71.2  node_modules/react-hook-form
react-hot-toast                     2.5.2     2.6.0    2.6.0  node_modules/react-hot-toast
react-i18next                      14.1.3    14.1.3   16.5.4  node_modules/react-i18next
recharts                           2.15.4    2.15.4    3.7.0  node_modules/recharts
rimraf                             5.0.10    5.0.10    6.1.3  node_modules/rimraf
stripe                             18.4.0    18.5.0   20.4.0  node_modules/stripe
tailwind-merge                      2.6.0     2.6.1    3.5.0  node_modules/tailwind-merge
tailwindcss                        3.4.17    3.4.19    4.2.1  node_modules/tailwindcss
typescript                          5.9.2     5.9.3    5.9.3  node_modules/typescript
vite                               5.4.21    5.4.21    7.3.1  node_modules/vite
vitest                              1.6.1     1.6.1   4.0.18  node_modules/vitest
zod                               3.25.76   3.25.76    4.3.6  node_modules/zod
zustand                             4.5.7     4.5.7   5.0.11  node_modules/zustand
```

---

## 2. ROOT PACKAGE — `npm audit` Raw Output

```
# npm audit report

@astrojs/node  <=9.5.3
Severity: moderate
@astrojs/node's trailing slash handling causes open redirect issue - https://github.com/advisories/GHSA-9x9c-ghc5-jhw9
Astro allows unauthorized third-party images in _image endpoint - https://github.com/advisories/GHSA-xf8x-j4p2-f749
Astro has Full-Read SSRF in error rendering via Host: header injection - https://github.com/advisories/GHSA-qq67-mvv5-fw3g
Depends on vulnerable versions of astro
fix available via `npm audit fix --force`
Will install @astrojs/node@9.5.4, which is a breaking change

astro  <=5.15.8
Severity: high
Astro's `X-Forwarded-Host` is reflected without validation - GHSA-5ff5-9fcw-vg88
Astro vulnerable to URL manipulation via headers, leading to middleware and CVE-2025-61925 bypass - GHSA-hr2q-hp5q-x767
Astro vulnerable to reflected XSS via the server islands feature - GHSA-wrwg-2hg8-v723
Astro Development Server has Arbitrary Local File Read - GHSA-x3h8-62x9-952g
Astro Cloudflare adapter has Stored Cross-site Scripting vulnerability in /_image endpoint - GHSA-fvmw-cj7j-j39q
Astro's middleware authentication checks based on url.pathname can be bypassed via url encoded values - GHSA-ggxq-hp9w-j794
Astro has an Authentication Bypass via Double URL Encoding, a bypass for CVE-2025-64765 - GHSA-whqg-ppgf-wp8c
Depends on vulnerable versions of esbuild
Depends on vulnerable versions of vite
fix available via `npm audit fix --force`
Will install astro@5.18.0, which is a breaking change

esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - GHSA-67mh-4wv8-2f99
fix available via `npm audit fix --force`
Will install vite@7.3.1, which is a breaking change

vite  0.11.0 - 6.1.6
Depends on vulnerable versions of esbuild
  @astrojs/react  3.6.3-beta.0 - 3.7.0-beta.1
  Depends on vulnerable versions of vite
  vite-node  <=2.2.0-beta.2
  Depends on vulnerable versions of vite
    vitest  (chain: @vitest/coverage-v8, @vitest/ui)
    Depends on vulnerable versions of vite + vite-node

lodash  4.0.0 - 4.17.21
Severity: moderate
Prototype Pollution in _.unset and _.omit - GHSA-xxjr-mmjv-4gpg
(via yaml-language-server -> volar-service-yaml -> @astrojs/language-server)

minimatch  <=3.1.3 || 9.0.0 - 9.0.6 || 10.0.0 - 10.2.2
Severity: high
Multiple ReDoS vulnerabilities - GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74
(via @typescript-eslint/typescript-estree and others)

rollup  4.0.0 - 4.58.0
Severity: high
Arbitrary File Write via Path Traversal - GHSA-mw96-cpmx-2vgc

20 vulnerabilities (12 moderate, 8 high)
```

---

## 3. FUNCTIONS PACKAGE — `npm outdated` Raw Output

```
Package                           Current   Wanted   Latest  Location
@typescript-eslint/eslint-plugin   6.21.0   6.21.0   8.56.1  functions
@typescript-eslint/parser          6.21.0   6.21.0   8.56.1  functions
eslint                             8.57.1   8.57.1   10.0.2  functions
firebase-admin                     12.7.0   12.7.0   13.7.0  functions
firebase-functions                  7.0.0    7.0.6    7.0.6  functions
googleapis                        144.0.0  144.0.0  171.4.0  functions
typescript                          5.9.2    5.9.3    5.9.3  functions
```

---

## 4. FUNCTIONS PACKAGE — `npm audit` Raw Output

```
# npm audit report

ajv  <6.14.0
Severity: moderate
ajv has ReDoS when using `$data` option - GHSA-2g4f-4pwh-qvx6
fix available via `npm audit fix`

fast-xml-parser  <=5.3.7
Severity: CRITICAL
- Stack overflow in XMLBuilder with preserveOrder - GHSA-fj3w-jwp8-x2g3
- Entity encoding bypass via regex injection in DOCTYPE entity names - GHSA-m7jm-9gc2-mpf2
- DoS through entity expansion in DOCTYPE (no expansion limit) - GHSA-jmr7-xgp7-cmfj
(via @google-cloud/storage which is a dep of firebase-admin)
fix available via `npm audit fix`

js-yaml  <3.14.2 || >=4.0.0 <4.1.1
Severity: moderate
Prototype pollution in merge (<<) - GHSA-mh29-5h37-fv8m
fix available via `npm audit fix`

jws  =4.0.0 || <3.2.3
Severity: high
Improperly Verifies HMAC Signature - GHSA-869p-cjfg-cm3x
(via jsonwebtoken -> jws)
fix available via `npm audit fix`

lodash  4.0.0 - 4.17.21
Severity: moderate
Prototype Pollution in _.unset and _.omit - GHSA-xxjr-mmjv-4gpg
fix available via `npm audit fix`

minimatch  <=3.1.3 || 9.0.0 - 9.0.6
Severity: high
Multiple ReDoS vulnerabilities - GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74
fix available via `npm audit fix --force`

node-forge  <=1.3.1
Severity: high
ASN.1 Unbounded Recursion - GHSA-554w-wpv2-vw27
Interpretation Conflict via ASN.1 Validator Desynchronization - GHSA-5gfm-wpxj-wjgq
ASN.1 OID Integer Truncation - GHSA-65ch-62r8-g69g
fix available via `npm audit fix`

qs  <=6.14.1
Severity: high
arrayLimit bypass allows DoS via memory exhaustion - GHSA-6rw7-vpxm-498p
arrayLimit bypass in comma parsing allows DoS - GHSA-w7fw-mjwx-w883
(via body-parser -> express)
fix available via `npm audit fix`

16 vulnerabilities (1 low, 3 moderate, 11 high, 1 critical)
```

---

## Findings Analysis

### Critical (must fix before any production release)

- **[C-1] fast-xml-parser Critical CVE in functions/ (GHSA-fj3w-jwp8-x2g3, GHSA-m7jm-9gc2-mpf2, GHSA-jmr7-xgp7-cmfj)**
  - Location: `functions/node_modules/fast-xml-parser` (transitive via `firebase-admin` -> `@google-cloud/storage`)
  - Impact: Stack overflow, entity encoding bypass, DoS via DOCTYPE entity expansion. Affects Cloud Functions runtime.
  - Fix: Run `cd functions && npm audit fix`. This should auto-resolve without breaking changes.

- **[C-2] Astro Authentication Bypass CVEs (GHSA-ggxq-hp9w-j794, GHSA-whqg-ppgf-wp8c)**
  - Location: `node_modules/astro` (current: 4.16.19, fixed: 5.18.0)
  - Impact: Middleware authentication checks via `url.pathname` can be bypassed via URL encoding. This is exploitable if middleware guards are in use.
  - Fix: Requires major version upgrade `astro@5.18.0` — breaking change. Coordinate with Forja.

### Warning (high severity, should fix before release)

- **[W-1] Astro Reflected XSS via server islands (GHSA-wrwg-2hg8-v723)**
  - Location: `node_modules/astro` <=5.15.8
  - Fix: Upgrade astro to 5.18.0

- **[W-2] Astro SSRF via Host header injection (GHSA-qq67-mvv5-fw3g, GHSA-5ff5-9fcw-vg88)**
  - Location: `node_modules/astro` and `@astrojs/node`
  - Fix: Upgrade astro + @astrojs/node

- **[W-3] Rollup Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc)**
  - Location: `node_modules/rollup` (transitive via vite)
  - Fix: `npm audit fix` — no breaking change

- **[W-4] jws Improper HMAC Signature Verification in functions/ (GHSA-869p-cjfg-cm3x)**
  - Location: `functions/node_modules/jws` (via jsonwebtoken)
  - Impact: Signature verification bypass could allow forged JWT tokens in Cloud Functions.
  - Fix: `cd functions && npm audit fix`

- **[W-5] node-forge ASN.1 vulnerabilities in functions/ (GHSA-554w-wpv2-vw27 et al.)**
  - Location: `functions/node_modules/node-forge`
  - Fix: `cd functions && npm audit fix`

- **[W-6] qs DoS via arrayLimit bypass in functions/ (GHSA-6rw7-vpxm-498p, GHSA-w7fw-mjwx-w883)**
  - Location: `functions/node_modules/qs` (via express)
  - Fix: `cd functions && npm audit fix`

- **[W-7] minimatch ReDoS in both packages**
  - Location: Root and functions node_modules
  - Fix: Root requires `--force` (breaks @typescript-eslint). Functions: `npm audit fix --force`.

### Outdated Dependencies of Note

The following packages are significantly behind their latest versions (major version gaps):

| Package                    | Current | Latest  | Gap          |
| -------------------------- | ------- | ------- | ------------ |
| astro                      | 4.16.19 | 5.18.0  | Major + CVEs |
| @astrojs/node              | 8.3.4   | 9.5.4   | Major + CVEs |
| @astrojs/react             | 3.6.3   | 4.4.2   | Major        |
| react / react-dom          | 18.3.1  | 19.2.4  | Major        |
| firebase (client)          | 11.10.0 | 12.10.0 | Major        |
| firebase-admin (functions) | 12.7.0  | 13.7.0  | Major        |
| vite                       | 5.4.21  | 7.3.1   | 2 majors     |
| vitest                     | 1.6.1   | 4.0.18  | 3 majors     |
| zod                        | 3.25.76 | 4.3.6   | Major        |
| eslint                     | 8.57.1  | 10.0.2  | 2 majors     |
| stripe                     | 18.4.0  | 20.4.0  | 2 majors     |
| @headlessui/react          | 1.7.19  | 2.2.9   | Major        |
| tailwindcss                | 3.4.17  | 4.2.1   | Major        |

---

## Recommended Fix Sequence

**Immediate (no breaking changes):**

```bash
cd /path/to/project && npm audit fix
cd functions && npm audit fix
```

**Planned (breaking changes — coordinate with Forja):**

1. Upgrade `astro` 4.x -> 5.x (fixes most CVEs, requires migration)
2. Upgrade `vite` 5.x -> 7.x (transitive fix via astro upgrade)
3. Upgrade `@typescript-eslint` 6.x -> 8.x (fixes minimatch ReDoS)
4. Upgrade `firebase` 11.x -> 12.x
5. Evaluate React 19, Zod 4, Tailwind 4 — each is a major migration

---

## Verdict

**CHANGES REQUIRED** — The functions package carries a confirmed critical CVE (`fast-xml-parser`) fixable without breaking changes. The root Astro package carries authentication bypass CVEs. Neither package should be promoted to production without addressing at minimum the critical and high-severity findings.
