# feature/hub → main Promotion Review (2026-05-17)

Automated multi-agent review of the promotion delta (`origin/main...feature/hub`),
scoped to prod-blocking, high-confidence issues. **Verdict: NOT promotable as-is.**

## BLOCKERS (must fix before first prod deploy)

### Secrets / Payments

- **Stripe secret key bundled to browser** — `src/lib/stripe/stripe-client.ts:1,26`
  `@ts-nocheck` + module-level `new Stripe(STRIPE_SECRET_KEY)` alongside
  `loadStripe`. Astro bundles it into client chunks. (Previously flagged
  C-1 in security-audit-infrastructure-2026-03-23.) Fix: split
  `.server.ts` / `.browser.ts`, remove `@ts-nocheck`.
- **Stripe webhook signature bypass** — `src/lib/stripe/stripe-webhooks.ts:19,158`
  `constructEvent(payload, sig, undefined)` when `STRIPE_WEBHOOK_SECRET`
  unset → forged webhooks (self-grant subscription). Fix: fail-fast guard.
- **Invoice IDOR** — `src/pages/api/create-invoice.ts:267-336` GET `?id=`
  returns any invoice (RFC/tax data) with no owner check.

### Auth

- **Security manager init swallowed** — `src/middleware/index.ts:17-24`
  try/catch nulls `securityManager`; every guard does
  `if (!securityManager) return next()` → all rate-limit/session/CAPTCHA
  enforcement silently off if env misconfigured. Fix: fail closed.
- **Unverified JWT** — `src/lib/auth/verify-request.ts:17-52` decodes but
  does not verify RS256 signature → forge any UID. Fix: Admin SDK
  `verifyIdToken` or remove fallback.
- **CORS wrong domain** — `src/middleware/index.ts:96-100` allowlist
  `secid.mx` but prod is `secid.org` → all prod API calls blocked day 1.

### Backend rules

- **Storage world-writable** — `storage.rules`: company logos (17-22),
  forum attachments (32-35, no type/size), event images via legacy `role`
  (25-29). Any auth'd user can overwrite/upload.
- **`networking` field open** — `firestore.rules:138-140` any auth'd user
  can write `networking` (connections/followers/blocked) on ANY user.
- **`rbac_groups` own-scope write** — `firestore.rules:943-948` uses
  `hasRBACAllow` not `hasRBACAllowAll` on the collection that defines RBAC.

### Frontend

- **Fake DOMPurify** — `src/lib/validation/sanitization.ts:4-22` stub only
  checks tag names, ignores `FORBID_ATTR`/`ALLOWED_URI_REGEXP` → stored XSS
  via forums/blog/newsletter/spotlights `dangerouslySetInnerHTML`.
  Confidence 100.
- **Beta messaging leaks to prod** — `src/components/directory/MemberCard.tsx`
  (362,599,697), `NetworkingHub.tsx` (Messages tab) write to Firestore
  `messages` with no `BetaGate`/`isFeatureEnabled('messaging')`.

## HIGH (fix before or immediately after)

- captcha token arithmetic bug `src/lib/captcha.ts:713` (`body.captcha - token`)
- duplicate transaction records on Checkout payments (stripe-webhooks ~783/670)
- yearly subscription `billing_cycle_anchor` misuse → ~1yr free trial
- `connectionRequests` / `conversations` / `messages` create lack
  `isActive()`/`isVerified()` (firestore.rules 465,482,497)
- `submitPublicJob` callable: no rate limit / CAPTCHA
- `archived_users` write gated on `us:v` instead of `us:d` (firestore.rules:929)

## Notes / verified clean

- W-SEC-3 fix, global firebase test stub: sound (not re-flagged).
- `hub: false` correctly graduated; beta route middleware sound;
  gamification/learning have no prod pages; SSR beta defaults safe.

## Next

These need triage (confirm real vs by-design) then fixes before the
first prod deploy. Several are pre-existing (Stripe bundling, DOMPurify,
verify-request) and predate hub work. PR #1 kept in DRAFT.
