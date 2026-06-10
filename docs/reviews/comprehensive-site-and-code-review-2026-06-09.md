# Comprehensive site and code review (2026-06-09)

This document consolidates a full review of the SECiD platform on branch
`feature/hub`: a live walkthrough of https://beta.secid.mx (desktop and
narrow viewport, Spanish and English locales, public pages and the member
dashboard) plus a five-track code review covering the API/security surface,
dashboard and admin components, feature components, shared libraries and
Cloud Functions, and pages/i18n/configuration/CI.

All items from the May 17, 2026 promotion triage that were marked remediated
were re-verified as fixed. Findings below are new, or note where a prior fix
was incomplete. Each code finding includes `file:line` and a suggested fix.
Live-site findings were observed directly in the browser; several
agent-reported claims were re-tested against the live site and corrected
(see "Corrected findings" at the end).

## Executive summary

The platform is in good shape overall — navigation works, no broken footer
links, the survey privacy triage from May is in place, and the visual system
(dark theme, orange brand) is consistent. The review still surfaced issues
worth fixing before promoting to production, the most important being:

1. **k-anonymity is bypassed for 5 of 12 public survey dimensions**
   (`functions/src/aggregate-survey.ts`) — exact counts published.
2. **Moderators can read the raw (uncensored) survey aggregates** —
   page and Firestore rule both allow `moderator`.
3. **Payment endpoints accept any `customerId` without ownership checks**
   (`create-invoice`, `create-payment-intent`, `create-subscription`) —
   IDOR; deferred risk while payments are off, blocking before they ship.
4. **`AdminDashboard.tsx` has a guaranteed infinite re-render loop**
   (`new Date()` in `useEffect` deps).
5. **`SignUpForm.tsx` survey step never renders** (undefined `user`
   variable hidden by `@ts-nocheck`).
6. **Checkout billing address is never saved** (`field.split('')` instead
   of `field.split('.')`).
7. **Production CI uploads the wrong directory** (`dist/` instead of
   `dist/client/`) to GitHub Pages.
8. **`robots.txt` points crawlers to `http://localhost:3000/sitemap.xml`**
   and does not disallow `/admin/` or dashboard trees.
9. **React hydration errors (#418/#423/#425) fire on every dashboard load**
   in production.
10. **Assessments pages ship a hardcoded `userId="user123"`** — all users
    share one phantom record.

---

## Part I — Live site review (beta.secid.mx)

### Global / layout

- **Footer copyright is stale**: "© 2024 SECiD" on every page. Use the
  build year or current year (we are in 2026).
- **"Why join" grid leaves an orphan card**: 4 feature cards in a
  3-column grid put "Comunidad Sólida" alone on a second row. Use a
  4-column layout at `xl`, or 2×2.
- **Logged-in state not reflected in CTAs**: with an active session the
  home still shows "Únete a SECiD"/"Registrarse", and the jobs page shows
  a "¿Eres miembro de SECiD? Inicia sesión" banner with login/register
  buttons. These blocks should swap to "Ir a mi panel" (or hide) when
  authenticated. Likely the same root cause as the hydration mismatch
  (server HTML assumes signed-out).
- **Hero sections are oversized**: `jobs`, `contact`, `about-us` heroes
  fill nearly the whole first viewport with a gradient and two lines of
  text; the actual content (job list, contact form) starts below the
  fold. Halving hero height would put content on screen.
- **Floating hamburger button overlaps content** at narrow widths
  (~980px): the sidebar/menu toggle renders on top of the dashboard
  title and card content (seen over "Bienvenido al Panel de Miembros"
  and the "Publicar Empleo" card, and over the 404 page text).
- **Chat widget badge is inconsistent**: the unread badge alternated
  between 3 and 4 across pages in the same session without any new
  messages.
- **Twitter icon is the legacy bird-era glyph**; consider the X logo or
  dropping the network if the account is inactive.
- **Beta banner takes two lines on narrow viewports** and pushes the
  header down; consider a single-line compact variant.

### Page-by-page

- **Home (`/es/`)**: hero paragraph is long and dense (9 lines); tighten
  to 2–3 lines and move the detail to About. "Ver Empleos" secondary
  button has low contrast (muted blue-gray on near-black).
- **Jobs (`/es/jobs`)**: empty state says "Intenta ajustar tus filtros o
  términos de búsqueda" even when the board has zero jobs and the user
  applied no filter. Show a first-class "Aún no hay vacantes — publica
  la primera" state with the public job-posting CTA instead.
- **Events (`/es/events`)**: edit and delete (trash) icons render
  directly on public event cards for admins — easy to fat-finger on a
  public page; move destructive actions into the detail/admin view or
  add a confirm. Event capacity renders "0/0 asistentes" when
  `maxAttendees` is unset — hide the denominator when there is no cap.
- **Members (`/es/members`)**: the company wall ("¿Dónde trabajan los
  miembros de SECiD?") with stats (23 empresas, 9 industrias) is a
  strong section. Stat "UNAM / Ciencia de datos" reads like a label, not
  a stat — consider replacing with member count.
- **Mentorship (`/es/mentorship`)**: multiple missing accents:
  "Proximamente" → "Próximamente", "mentoria esta en desarrollo" →
  "mentoría está en desarrollo", "Registrate" → "Regístrate",
  "Contactanos" → "Contáctanos", "cuando este disponible" → "cuando esté
  disponible".
- **Resources (`/es/resources`)**: empty state ("No se encontraron
  recursos") with filter-adjustment copy, same issue as jobs. An empty
  module at launch undermines the "Recursos" nav item; either seed
  content or hide the nav entry until populated.
- **Blog (`/es/blog`)**: list is empty; the newsletter CTA section is
  good. Same "hide or seed before launch" consideration.
- **Calendar (`/es/calendar`)**: solid page. Two issues: month view
  opens on the current month showing "Sin eventos este mes" while the
  list shows activities months away — auto-advance to the first month
  with events; and date formatting capitalizes every word ("Junio De
  2026", "Viernes, 21 De Agosto De 2026") — Spanish convention is
  lowercase "de" (likely a CSS `capitalize` on a `toLocaleDateString`
  string).
- **404 page**: works, Spanish-only (English users get Spanish copy),
  and the "Directorio de miembros" secondary button renders in a
  disabled-looking gray that suggests it is not clickable.
- **Dashboard (`/es/dashboard`)**: stats cards (Aplicaciones, Eventos,
  Conexiones) render fine; "Actividad Reciente" is an empty stub
  (matches `RecentActivity.tsx` TODO). React errors #425/#418/#423
  (hydration text mismatch) fire on load — see code findings.
- **Signup (`/es/signup`, `/es/join`)**: the three-persona selector
  (Egresado / Colaborador / Reclutador) and the "publica una vacante sin
  registrarte" escape hatch are good UX.

### i18n and copy

- EN pages link several CTAs to `/registro`, which redirects to
  `/es/join` — English users get dropped into the Spanish flow. Point EN
  CTAs at `/en/join`.
- `/es/register` 404s while `/en/register` exists (redirect to signup);
  add the ES counterpart or drop both.
- Date capitalization bug across calendar/events (see above).
- Mentorship dashboard tabs, `ProtectedRoute` error screens, and
  `MentorBrowseTab` render hardcoded English even in the ES locale (see
  code findings for files/lines).

### Console / runtime

- React minified errors **#425, #418, #423** (hydration mismatches) on
  `/es/dashboard` — server-rendered text differs from client render.
  Date formatting and auth-dependent branches are the usual suspects;
  reproduce with a dev build to get full messages.
- No console errors on the public home page.
- `/es/forums` returns 404 although the forums module exists in the
  codebase — either route it or remove forum entry points.

## Part II — Product/feature suggestions

- **Empty-state strategy for launch**: jobs, resources, and blog are
  empty. Each should get a tailored zero-state with a CTA (post a job,
  suggest a resource, subscribe) instead of the generic "adjust your
  filters" message.
- **Auth-aware navigation**: a persistent "Mi panel" entry in the public
  header when signed in (the avatar is there but the page CTAs ignore
  session state).
- **Calendar export**: the calendar page lists Journal Club and
  Knowledge Exchange sessions; an "Add to Google Calendar / .ics" button
  per event would be cheap and high-value.
- **Event registration feedback**: cards show "Registrarse" with
  "0/0 asistentes"; after the capacity fix, show remaining spots and a
  registered-state ("Ya estás registrado").
- **Search**: the jobs search input exists but with no content it is
  untestable; consider wiring the same universal-listing search into
  members and resources for consistency.
- **Surface the dashboard "Más" menu items** (bottom nav) in a single
  overflow sheet; at 980px the bottom nav plus hamburger plus header is
  three competing navigation systems.
- **Status page link** in the footer points to `status.secid.mx` —
  verify it resolves before launch (it is an external dependency users
  will click when something breaks).

---

## Part III — Code findings

Severity is the consolidated judgment across the five review tracks;
duplicate findings from different tracks were merged.

### Critical

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                   | Location                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **k-anonymity bypass in public survey aggregates.** `publicPayload` passes `byGeneration`, `byWorkMode`, `byMentorship`, `byOpenToOpportunities`, `byAcademicLevel` through raw (no `applyKAnonymity`), and publishes `totalRespondents`/`totalFallbackUsers`, which lets readers infer suppressed bucket sizes. Same gap in the seed script. Fix: apply k-anonymity to all 12 dimensions; drop `totalFallbackUsers` from the public doc. | `functions/src/aggregate-survey.ts:161-176`, `scripts/seed-survey-aggregates.mjs:133-142`                                                 |
| C2  | **Raw survey aggregates exposed to moderators.** The admin aggregates doc rule allows `role in ['admin','moderator']` and the survey admin pages use `requireRole={['admin','moderator']}`, so moderators get the uncensored dataset, defeating the k-anonymity model. Fix: `admin` only at both layers.                                                                                                                                  | `firestore.rules` (survey_aggregates), `src/pages/{es,en}/dashboard/admin/survey/index.astro`, `src/components/admin/SurveyAdminPage.tsx` |
| C3  | **Infinite re-render loop in AdminDashboard.** `new Date()` values created in the component body are listed in `useEffect` deps; every effect run re-renders and re-triggers the effect. Fix: `useRef`/`useMemo` and remove from deps.                                                                                                                                                                                                    | `src/components/admin/AdminDashboard.tsx:84-85,248`                                                                                       |
| C4  | **Signup survey step never renders.** JSX checks `step === 'survey' && user`, but `user` is never declared (suppressed by `@ts-nocheck`); the post-signup survey is invisible to all users. Fix: state from the auth listener, then remove `@ts-nocheck`.                                                                                                                                                                                 | `src/components/auth/SignUpForm.tsx:~1278`                                                                                                |
| C5  | **Checkout billing address never saves.** `field.split('')` splits into characters instead of on `.`; all `address.*` updates write garbage keys. Fix: `field.split('.')`.                                                                                                                                                                                                                                                                | `src/components/payments/CheckoutForm.tsx:245`                                                                                            |
| C6  | **Message-edit saves the wrong textarea.** Save uses `document.querySelector('textarea')` (first textarea in the document). Fix: dedicated ref.                                                                                                                                                                                                                                                                                           | `src/components/messaging/Conversation.tsx:333`                                                                                           |
| C7  | **Prod CI deploys the wrong directory.** `cd.yml` uploads `dist/` to GitHub Pages but the node adapter outputs static files to `dist/client/` (as `firebase.json` correctly uses). Fix: `path: dist/client` or drop the adapter.                                                                                                                                                                                                          | `.github/workflows/cd.yml:65`                                                                                                             |
| C8  | **robots.txt sitemap points to localhost** (`http://localhost:3000/sitemap.xml`) and `/admin/`, `/es/dashboard/`, `/en/dashboard/` are not disallowed. Fix: real sitemap URL + disallow rules.                                                                                                                                                                                                                                            | `public/robots.txt`                                                                                                                       |
| C9  | **Company creation race inside a transaction that doesn't use the transaction.** Queries run via `db.get()` inside `runTransaction`, so concurrent recruiter registrations create duplicate companies. Fix: deterministic company doc ID + `transaction.get`.                                                                                                                                                                             | `functions/src/complete-registration.ts:140-146`                                                                                          |
| C10 | **`@ts-nocheck` on financial code.** `stripe-server.ts` retains `@ts-nocheck`, disabling type checking on all payment functions.                                                                                                                                                                                                                                                                                                          | `src/lib/stripe/stripe-server.ts:1`                                                                                                       |

### High

**Security / authorization**

- **Payment IDOR — no `customerId` ownership checks.** POST handlers
  accept `customerId` from the body and act on it; verify
  `customer.metadata.firebaseUid === auth.userId` or derive server-side.
  `src/pages/api/create-invoice.ts:52-267`,
  `src/pages/api/create-payment-intent.ts:81-86`,
  `src/pages/api/create-subscription.ts:115-126`.
- **`isVerified !== false` passes when the field is absent** — users
  whose profile lacks the flag pass the admin-area membership guard.
  Fix: `=== true`. `src/components/admin/AdminAuthGuard.tsx:49`.
- **Firestore rules OR-semantics bypass on `users.networking`** — the
  owner self-update allowlist includes `networking` without
  `isActive()`, so a banned user can still edit their own
  connections/blocked lists. Remove `networking` from the owner
  allowlist. `firestore.rules:154-176`.
- **LinkedIn OAuth callback URL built from `X-Forwarded-Host`** —
  currently unexported, but hardcode from `APP_URL` before enabling.
  `functions/src/linkedin-auth.ts:17-25`.
- **`CompanyManagement` has no role check** (any authenticated user if
  routed). `src/components/dashboard/admin/CompanyManagement.tsx`.
- **Security manager init swallows errors** and logs the raw error
  (possible env leakage); rethrow in production.
  `src/middleware/index.ts:17-24`.

**Correctness**

- **Hardcoded `userId="user123"`** in all four assessments pages — all
  users read/write a shared phantom record. Resolve the UID client-side
  from auth context. `src/pages/{en,es}/dashboard/assessments/*.astro:13`.
- **ES assessments nav points at nonexistent routes**
  (`/es/dashboard/evaluaciones/historial` 404s — verified live; real
  route is `/es/dashboard/assessments/historial`). Also
  `evaluaciones/realizar`, `evaluaciones/certificados`.
  `src/pages/es/dashboard/assessments/index.astro:18`.
- **firebase.json wildcard rewrite shadows history pages** —
  `/en/dashboard/assessments/*` → `assessments/detail` catches
  `/history` before the specific page. Order specific rewrites first.
  `firebase.json` rewrites.
- **`fetchSimilarJobs` runs against a stale null `job`** — query is
  always `where('company','==','')`; pass the company after
  `fetchJobDetails`. `src/components/jobs/JobDetail.tsx:209-229`.
- **Mock data rendered on Firestore errors** — `JobDetail` and
  `EventDetail` show fabricated listings on permission/network errors;
  the mock event even exposes `virtualLink`/password to non-registered
  users. Show an error/not-found state.
  `src/components/jobs/JobDetail.tsx:118-125`,
  `src/components/events/EventDetail.tsx:148-157`.
- **Attendee counter can go negative** — `increment(-1)` without floor
  or registration check. `src/components/events/EventDetail.tsx:307-310`.
- **DirectMessages with `selectedUserId` never creates the conversation
  when the user has zero existing conversations** (guard requires
  `conversations.length > 0`); also racy with `loadConversations`.
  `src/components/messaging/DirectMessages.tsx:49-63`.
- **`ForumPost.handleSubmit` dereferences optional `currentUser`**
  without a guard. `src/components/forums/ForumPost.tsx:167-228`.
- **`getOrCreateConversation` TOCTOU** — concurrent sends create
  duplicate conversations; use a deterministic `uid1_uid2` doc ID.
  `src/lib/members/mutations.ts:201-226`.
- **Stripe webhooks use the client Firebase SDK in server context** —
  writes will be rejected by rules in production; use `firebase-admin`.
  `src/lib/stripe/stripe-webhooks.ts:4-18`. Also no idempotency: webhook
  retries duplicate subscription/transaction docs
  (`stripe-webhooks.ts:181-245`).
- **`gcp-services.ts` calls `getFunctions()` at module load** — breaks
  SSR/build when imported server-side; wrap in lazy factories.
  `src/lib/gcp-services.ts:8-12`.
- **`completeRegistration` is not atomic** (double user read, no
  transaction around idempotency check + update).
  `functions/src/complete-registration.ts:44-49,115-118`.
- **React hydration errors on dashboard** (#418/#423/#425 observed live
  on `/es/dashboard`) — server/client text mismatch; audit
  date/locale/auth-dependent rendering in dashboard islands.

**Cost / performance**

- **`matchJobsForUser` reads all active jobs on every user write**
  (no limit, no changed-fields gate). `functions/src/index.ts:157-162`.
- **`onNewJobPosted` sends up to 100 emails sequentially** without
  idempotency (duplicates on retry). `functions/src/index.ts:286-323`.
- **`onGroupWrite` RBAC fan-out** can touch every member with default
  60s timeout; set `timeoutSeconds: 540` or move to Cloud Tasks.
  `functions/src/rbac/resolvePermissions.ts:113-160`.
- **Full `users` collection scans from the client** in
  `getMemberStats`/`getMemberStatistics`/`getDirectoryStatsData`;
  pre-compute into a `/stats/members` doc.
  `src/lib/members/queries.ts:292-294,348-350,475-476`.
- **`MemberDashboard` eagerly loads 200 profiles on mount** with
  client-side filtering; move into `MembersTab` with server pagination.
  `src/components/dashboard/members/MemberDashboard.tsx:52`.
- **`ContentModeration` re-subscribes listeners on every filter
  keystroke** (`filters` in deps). `src/components/admin/ContentModeration.tsx:200`.
- **Forum N+1s** — `AdminDashboard` reads each forum's posts
  subcollection (`AdminDashboard.tsx:166-174`); `ForumTopic` fetches
  votes sequentially per post (`ForumTopic.tsx:152-165`).
- **`DashboardStats` queries without `limit()`**.
  `src/components/dashboard/DashboardStats.tsx:38-52`.
- **`JobMatches` and `UpcomingEvents` bypass the universal listing
  system** (direct `getDocs`, no cancellation/caching).

**Layouts / assets**

- **`BaseLayout` ships a placeholder Amplitude key**
  (`'YOUR_AMPLITUDE_API_KEY'`) and loads five `/assets/js/*.js` files
  that do not exist (jQuery et al.); `AdminLayout` loads a nonexistent
  `/assets/js/admin.js` and contains a dead `<script type="module">`
  importing `/src/*.tsx` paths in the browser. No page currently uses
  `BaseLayout` — deprecate/delete it and strip the AdminLayout dead
  code. `src/layouts/BaseLayout.astro:203,216-220`,
  `src/layouts/AdminLayout.astro:182-213,291`.
- **Duplicate conflicting PWA manifests** — `manifest.json`
  (`lang:"en"`, `#2c3e50`, references missing shortcut icons) vs
  `site.webmanifest` (`es-MX`, `#f65425`). Consolidate on
  `site.webmanifest`. `public/manifest.json`, `public/site.webmanifest`.

### Medium

- **No enforced CSP in production** — `firebase.json` only sets
  `Content-Security-Policy-Report-Only` (with `unsafe-inline` and
  `unsafe-eval`); the middleware CSP only applies in dev SSR. Add an
  enforced header. `firebase.json:205`, `src/middleware/security.ts:37-50`.
- **`conversations` update rule missing `isActive()`** — banned
  participants can still update conversation metadata.
  `firestore.rules:520-522`.
- **`fetch-logo.ts` has no fetch timeout** and stores the upstream
  `contentType` unvalidated (could persist `text/html` in Storage). Add
  `AbortController` + `image/*` validation.
  `src/pages/api/companies/fetch-logo.ts:87-119`.
- **Public profile reads return the whole user doc** (acknowledged
  tradeoff; includes `numeroCuenta`, verification doc URL). Decide
  before launch; a `users_public` projection is the clean fix.
  `firestore.rules:139-144`.
- **Non-atomic rate limits** in `public-forms.ts:52-71` and
  `alternate-email.ts:65-83` (TOCTOU; `public-job-submit.ts` shows the
  correct transactional pattern).
- **Survey aggregate role filter has inverted semantics** —
  `if (data.role && data.role !== 'member') continue` folds
  `role: undefined` users into member stats and inflates
  `totalFallbackUsers`. Use an explicit allowlist.
  `functions/src/aggregate-survey.ts:104-109`.
- **Seed script writes straight to prod** — `seed-survey-aggregates.mjs`
  hardcodes `projectId: 'secid-org'` with no `--commit` guard (the
  legacy importer has one). `scripts/seed-survey-aggregates.mjs:17-18`.
- **Merge engine overwrites target docs** — `set()` without
  `{merge:true}` destroys the target's mentor/mentee data.
  `functions/src/merge-engine.ts:483-484`.
- **Redis cache managers instantiated at module load** — build/SSR
  breakage risk without `REDIS_URL`; lazy-init.
  `src/lib/cache/cache-manager.ts:501-507`.
- **`@ts-nocheck` files**: `src/lib/security-config.ts`,
  `src/components/profile/tabs/PrivacyTab.tsx`,
  `src/components/admin/DirectoryManagement.tsx`,
  `src/components/auth/AuthGuard.tsx`, `src/components/auth/SignUpForm.tsx`.
  Remove and fix surfaced errors (C4 hid behind one of these).
- **Hardcoded admin badge counts** — bell always shows "3";
  Moderation/Content Queue/Reports badges are static mock numbers.
  `src/components/admin/AdminNavigation.tsx:49,89,98,101`.
- **`AudioContext` leak on the admin-mode long-press** (created per
  press, never closed; browser cap ~6).
  `src/components/dashboard/DashboardSidebar.tsx:86-126`.
- **`AdminLayout` session-timeout uses `confirm()`/`alert()`** —
  blocking, poor a11y. Replace with a modal/toast.
  `src/layouts/AdminLayout.astro:124-140`.
- **`CheckoutForm` recreates payment intents on re-render**
  (`taxCalculation` not memoized) — orphaned PaymentIntents.
  `src/components/payments/CheckoutForm.tsx:76-120`.
- **`EventList` client adapter downloads up to 100 docs** then filters
  by time client-side; push `startDate >= now` into the query.
  `src/components/events/EventList.tsx:245-320`.
- **`SITE_URL` fallback to `secid.mx`** in job emails — beta emails link
  to prod. Use `getAppUrl()`. `functions/src/index.ts:285`.
- **Domain inconsistency**: `public/CNAME` = `secid.mx`,
  `DEPLOYMENT.md` says prod is `secid.org`, `astro.config.mjs` falls
  back to `secid.mx`, and CORS allowlists disagree
  (`functions/src/get-salary-stats.ts:15-22` vs `public-forms.ts:14`).
  Pick the canonical prod domain and align all four.
- **`api-docs.astro`** documents a nonexistent REST API
  (`api.secid.org`), is public, indexed, EN-only. `noIndex` or remove.
- **Dependency hygiene**: Sentry v7 (EOL; `@sentry/integrations`/
  `@sentry/tracing` are dead packages → migrate to `@sentry/browser@^8`);
  `eslint-plugin-astro@0.31` and `vitest@1.x` are behind the Astro
  version in use.
- **`RecentActivity` is a TODO stub** rendering a permanent empty
  state on the dashboard home.
- **i18n gaps (hardcoded English)**: `ProtectedRoute.tsx:72-165`,
  `MentorshipDashboard.tsx:31-37` (and unused `t`),
  `MentorBrowseTab.tsx:38-50`, `MembersTab.tsx:600` ("Links"),
  `SearchContext.useSearchTranslations` (Spanish-only stub,
  `src/contexts/SearchContext.tsx:442-449`).

### Low

- `src/lib/validation/sanitization.ts:229-247` — `sanitizeUrl` prepends
  `https://` to any dotted string; reject invalid URLs instead.
- `firebase.json` dashboard SPA rewrites serve admin HTML shells to
  anonymous users (info disclosure; accepted tradeoff — document it).
- In-memory rate-limit store (`src/lib/rate-limiter.ts:66-75`) — fine
  for the static deploy; swap before any SSR migration.
- `public/service-worker.js:26-33` — offline precache lists nonexistent
  routes (`/es/empleos`, `/es/eventos`, `/es/miembros`; verified 404).
  Use `/es/jobs`, `/es/events`, `/es/members`.
- `public/assets/sass/` ships raw SCSS sources publicly with immutable
  cache headers; move out of `public/`.
- `404.astro` is Spanish-only; add locale detection or per-locale copy.
- `src/pages/{en,es}/about-us.astro` — `const t = getTranslations(...)`
  unused; strings hardcoded.
- `functions/src/index.ts:217-238` — `onUserDelete` still on Functions
  v1; migrate to v2 `beforeUserDeleted`.
- `scripts/import-legacy-survey.mjs:200-213` — silent overwrite on
  duplicate full names in the name-matching fallback; log collisions.
- `src/components/dashboard/RecentActivity.tsx` — `user` missing from
  effect deps (harmless while a stub).
- `src/components/admin/UserManagement.tsx:569` — `columns` memo missing
  `handleUserAction` dep (stale callback).
- `src/components/admin/Analytics.tsx:131` — `loadAnalyticsData` not in
  effect deps; language/role changes don't reload data.
- `src/components/survey/SurveyForm.tsx:191-209` — signup scope silently
  defaults visibility to aggregate-only; add a one-line disclosure.
- Additional inline role checks to fold into RBAC (beyond the known
  `DashboardBottomNav`/`SalaryInsights`): `DashboardSidebar.tsx`,
  `AdminDashboard.tsx:89,296`, `UserManagement.tsx:580-596`,
  `Analytics.tsx:233-249`, `ContentModeration.tsx:103`,
  `QuickActions.tsx:120`.

## Corrected findings (verified live)

- A reviewer flagged 11 `/registro` links as 404s. **Incorrect**:
  `src/pages/registro.astro` exists and meta-redirects to `/es/join`.
  The real (smaller) issue is that EN pages route users into the
  Spanish join flow.
- `/es/dashboard/assessments/historial` returns 200 via the hosting
  wildcard rewrite (it serves the detail page — the M2 shadowing issue —
  not a 404).
- `/es/register` 404 and `/es/empleos` (service-worker path) 404 were
  both confirmed live.
- `/es/forums` 404s on beta even though forum components exist —
  confirm whether forums are intentionally unrouted for launch.

## Suggested priorities

1. **Privacy (pre-launch, same day)**: C1 + C2 (survey k-anonymity and
   moderator access) and the M-item on inverted role filtering — these
   leak real member data today on beta.
2. **Launch blockers**: C3 (admin loop), C4 (signup survey), C7/C8
   (prod deploy + robots), hydration errors, `user123` assessments,
   `AdminAuthGuard` `isVerified`.
3. **Before enabling payments**: C5, C10, the payment IDOR set, webhook
   admin-SDK + idempotency.
4. **Cost hardening (first weeks)**: the Functions fan-outs and
   full-collection client scans.
5. **Polish**: copy/accents, date capitalization, empty states,
   logged-in CTAs, footer year, i18n gaps.
