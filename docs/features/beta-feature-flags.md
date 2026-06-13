# Beta Feature Flags

## Overview

The SECiD platform supports beta feature flagging via hostname detection. The same build artifact is deployed to both `secid.mx` (production) and `beta.secid.mx` (beta). Features flagged as beta are only visible on the beta domain.

A warning banner is displayed at the top of the page on `beta.secid.mx` to inform users they are in a beta environment.

## How It Works

1. An inline script in `<head>` checks `window.location.hostname` on page load
2. If the hostname is `beta.secid.mx` (or `beta.localhost` for local dev), it sets `data-beta="true"` on the `<html>` element
3. CSS uses `[data-beta="true"]` to show the beta banner
4. React components use the `useBeta()` hook or `isFeatureEnabled()` to gate features

Since the site is statically built, there is no server-side detection -- everything happens client-side.

## Key Files

| File                                 | Purpose                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `src/lib/beta.ts`                    | Feature registry, `isBetaEnvironment()`, `isFeatureEnabled()` |
| `src/hooks/useBeta.ts`               | React hooks: `useBeta()`, `useFeatureFlag()`                  |
| `src/components/common/BetaGate.tsx` | Wrapper component for gating React content                    |
| `src/layouts/ModernLayout.astro`     | Inline detection script + banner HTML                         |
| `src/styles/tailwind.css`            | Banner CSS + layout offsets for fixed navbar                  |

## Adding a Beta Feature

### 1. Register the feature

In `src/lib/beta.ts`, add an entry to `BETA_FEATURES`:

```typescript
export const BETA_FEATURES = {
  hub: true, // existing beta feature
  myFeature: true, // new beta feature
} as const;
```

### 2. Gate a sidebar menu item

In `src/components/dashboard/DashboardSidebar.tsx`, add `requireBeta` to the menu item:

```typescript
{
  name: 'My Feature',
  href: `/${lang}/dashboard/my-feature`,
  icon: SomeIcon,
  requireBeta: 'myFeature',
}
```

The item will only appear on `beta.secid.mx` and will display a "Beta" badge.

### 3. Gate arbitrary React content

Use the `<BetaGate>` component:

```tsx
import { BetaGate } from '@/components/common/BetaGate';

<BetaGate feature="myFeature" fallback={<p>Coming soon</p>}>
  <MyFeatureWidget />
</BetaGate>;
```

### 4. Use hooks directly

```tsx
import { useBeta, useFeatureFlag } from '@/hooks/useBeta';

const isBeta = useBeta(); // true on beta domain
const isEnabled = useFeatureFlag('myFeature'); // true if feature is available
```

## Graduating a Feature to Production

When a beta feature is ready for all users:

1. In `src/lib/beta.ts`, set the feature to `false` or remove it:
   ```typescript
   export const BETA_FEATURES = {
     hub: false, // now visible on production
   } as const;
   ```
2. Remove `requireBeta` from any menu items in `DashboardSidebar.tsx`
3. Remove `<BetaGate>` wrappers (or leave them -- they'll render children on both domains)
4. Deploy

## Local Development

To test beta behavior locally:

1. Add to `/etc/hosts`:
   ```
   127.0.0.1 beta.localhost
   ```
2. Run `npm run dev`
3. Visit `http://beta.localhost:4321` to see the beta banner and beta features
4. Visit `http://localhost:4321` to see the production experience

## Beta Banner

The banner is a fixed amber bar at the top of the page that:

- Appears instantly on first paint (no flash -- uses CSS driven by `data-beta` attribute)
- Shows localized text (Spanish on `/es/`, English on `/en/`)
- Can be dismissed (removes `data-beta`, restoring normal layout)
- Pushes the fixed navbar and body content down by 2rem

## Infrastructure

- **CORS**: The middleware in `src/middleware/index.ts` allows both `https://secid.mx` and `https://beta.secid.mx` origins
- **Firebase Hosting**: Both domains are served from the same hosting site with a single deploy
- **Firebase Auth**: `beta.secid.mx` must be added as an authorized domain in Firebase Console > Authentication > Settings
