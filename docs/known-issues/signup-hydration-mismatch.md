# Known issue: signup page React hydration mismatch (prod build only)

**Status:** Open — pre-existing, non-blocking (React auto-recovers).
**Severity:** Low. The signup form renders and works; this is a
correctness/perf wart (double render / possible flash), not a broken
flow.

## Symptom

On the **production build** of `/es/signup` (and `/en/signup`), the
browser console logs minified React errors on load:

- `#425` — "Text content does not match server-rendered HTML"
- `#418` ×2 — "Hydration failed: initial UI does not match server"
- `#423` — "error while hydrating; recovered via client render"

React recovers by discarding SSR markup and re-rendering on the client,
so the form is functional.

## Investigation (what was ruled out)

- The only SSR'd island on the page is `SignUpForm` (`client:load`).
  `AuthNavButtons` and `DashboardBottomNav` are `client:only` and cannot
  cause an SSR mismatch.
- `SignUpForm`'s render is deterministic: no `Date.now()`/`Math.random()`/
  `crypto`/`Math`/`toLocale` in render, no `import.meta.env`/`typeof
window`/`navigator` in render. `window.location.search` is read inside
  a post-mount `useEffect` (cannot cause a hydration mismatch). State
  initializers are static; `useTranslations('es')` is pure.
- Does **not** reproduce under `astro dev` (SSR-on-demand) — only in the
  static `astro build` prerender → client path.
- NOT caused by the missing-deps bug (fixed separately); the mismatch
  persists after that fix. Pre-dates all recent branch work.

## Next steps to root-cause

Needs either a non-minified production React build (to get the exact
mismatched text + component stack) or bisecting `SignUpForm`'s 1297-line
`@ts-nocheck` render tree / a child (`Button`, `lucide-react`, step
components). Likely a child component or library rendering content that
differs between build-time prerender and client first paint.

## Repro

```
npm run build && npx astro preview --port 4330
# load http://localhost:4330/es/signup, watch console for React #425/#418/#423
```
