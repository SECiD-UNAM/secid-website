# feature/hub Promotion — Triage Verdict (2026-05-17)

Triage of the automated review findings: real vs by-design vs false
positive, verified against current code. No fixes implemented yet.

## CONFIRMED REAL BLOCKERS (verified in code)

| #   | Issue                               | Evidence                                                                                                                                                                                                                               | Effort                                                                                  |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **Fake DOMPurify → stored XSS**     | `src/lib/validation/sanitization.ts:13-22` stub returns the _full_ tag match incl. `onerror=`/`javascript:` for allowed tags; used via `dangerouslySetInnerHTML` in 8 components (blog, forums, newsletter, spotlight, help, learning) | M — swap to real `dompurify` (SSR-guarded) or server-side purify before Firestore write |
| 2   | **Stripe secret in browser bundle** | `src/lib/stripe/stripe-client.ts` (`@ts-nocheck`, module-level `new Stripe(secret)`) is imported by client islands `components/payments/CheckoutForm.tsx` & `PricingPlans.tsx`                                                         | M — split `stripe-client.server.ts` / `.browser.ts`, fix imports, drop `@ts-nocheck`    |
| 3   | **Forgeable auth token**            | `src/lib/auth/verify-request.ts:16-50` decodes JWT, never verifies RS256 signature; `verifyRequest()` is the auth used by `create-invoice/-payment-intent/-subscription`, `companies/*`                                                | M — verify via Admin SDK / cached Google keys, or remove fallback                       |
| 4   | **Invoice IDOR (tax data)**         | `src/pages/api/create-invoice.ts:269-300` GET `?id=` → `stripe.invoices.retrieve()` with no owner check, returns RFC/amounts                                                                                                           | S — match `invoice.customer` to caller's Stripe customer                                |
| 5   | **Stripe webhook bypass**           | `stripe-webhooks.ts:19,158` `constructEvent(_,_,undefined)` when `STRIPE_WEBHOOK_SECRET` unset → forged events                                                                                                                         | S — fail-fast guard on missing secret                                                   |

## REAL — HIGH (fix before/just after, not strictly day-1 blocker)

| Issue                                                                     | Evidence                                                                                                                               | Effort                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `securityManager` fails open                                              | `middleware/index.ts:17-24` catch→null; guards `return next()`. Triggers only on env misconfig (W-SEC-3 now throws if secrets missing) | S — fail closed (503) |
| captcha token bug                                                         | `lib/captcha.ts:713` `body.captcha - token` (NaN)                                                                                      | XS                    |
| Duplicate txn records                                                     | `stripe-webhooks.ts` ~670 & ~783 both `addDoc` for Checkout payment                                                                    | S                     |
| `networking` field open                                                   | `firestore.rules:138-140` any auth'd user writes any user's networking                                                                 | S — add `isActive()`  |
| connectionRequests/conversations/messages no `isActive`                   | `firestore.rules:465,482,497`                                                                                                          | S                     |
| `submitPublicJob` no rate-limit/CAPTCHA                                   | `functions/src/public-job-submit.ts:120`                                                                                               | M                     |
| `archived_users` write gated on `us:v` not `us:d`                         | `firestore.rules:929`                                                                                                                  | XS                    |
| Storage forum uploads: no size/type limit; event images use legacy `role` | `storage.rules:25-35`                                                                                                                  | S                     |

## NEEDS PRODUCT-OWNER DECISION (can't resolve from code alone)

- **Beta messaging leaking to prod** (`MemberCard.tsx`, `NetworkingHub.tsx`
  have no `BetaGate`/`isFeatureEnabled('messaging')`; flag `messaging:true`
  = beta-only). Real _iff_ messaging is intended beta-only. **Q: ship
  messaging in prod, or gate it?**
- **Storage: company logos writable by any auth'd user**
  (`storage.rules:17-22`). **Q: are company logos community-editable by
  design, or owner/RBAC-only?**
- **Annual billing bug** (`stripe-client.ts:230-233`
  `billing_cycle_anchor` misuse → ~1yr free trial). Real _iff_ annual
  plans are sold. **Q: are yearly subscriptions offered at launch?**
- **`rbac_groups` own-scope write** (`firestore.rules:943`): currently
  only `super-admin` holds `gr:*`, so theoretical until a non-superadmin
  is granted `gr:c.o`. Hardening, not active exploit.

## FALSE POSITIVES (dropped)

- **CORS "wrong domain"** — review assumed prod = `secid.org`. Prod is
  **`secid.mx`** (`public/CNAME`, `cd.yml`, `src/lib/beta.ts`). The
  middleware allowlist `['https://secid.mx','https://beta.secid.mx']` is
  **correct**. (Only `functions/get-salary-stats.ts` references the stale
  `secid.org` — separate minor cleanup, not a promotion blocker.)

## Rough remediation estimate

- 5 confirmed blockers: ~2 M + 2 S + 1 S → ~1–1.5 focused days
- HIGH batch: mostly S/XS rule + guard tweaks → ~0.5 day
- Pending product answers gate: messaging, logos, annual plans

Pre-existing debt (not hub regressions): #1, #2, #3 (flagged in March
audits). PR #1 remains DRAFT until blockers cleared.
