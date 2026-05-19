# Mobile Navigation Redesign — Design Spec

## Problem

The mobile navigation treats logged-in members the same as public visitors. The bottom nav shows public tabs (Home, Jobs, Community, Login) regardless of auth state, forcing members to use the hamburger menu to access dashboard features like Members, Companies, Profile, Events, etc. This buries the member experience behind extra taps.

## Design Decisions

| Decision          | Choice                                        | Rationale                                                                     |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Logged-out nav    | Top navbar with hamburger only, no bottom nav | Public visitors need simple browsing; hamburger is sufficient for a few pages |
| Logged-in nav     | 5-tab bottom nav on ALL pages                 | Members need quick access to key features from anywhere                       |
| Bottom nav tabs   | Home, Members, Jobs, Companies, More          | Most-used member features based on product priorities                         |
| "More" menu style | Bottom sheet (half-screen overlay)            | Preserves context, faster dismissal, industry standard pattern                |
| Desktop behavior  | No change — keeps existing sidebar            | Bottom nav is mobile/tablet only                                              |
| Breakpoint        | Bottom nav shown below 768px when logged in   | Matches existing tablet/phone breakpoints                                     |

## Navigation States

### Logged Out (Public Visitor)

- **Top navbar**: Logo, nav links, hamburger menu
- **Hamburger menu**: All nav links + language selector + theme toggle + Login/Register buttons
- **Bottom nav**: None
- **No changes** from current public navigation (except removing the existing bottom nav)

### Logged In (Member)

- **Top navbar**: Logo + hamburger (for accessing public pages, language, theme)
- **Bottom nav** (fixed at bottom, all pages): 5 tabs

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  🏠      │  👥      │  💼      │  🏢      │  ☰       │
│  Inicio  │ Miembros │ Empleos  │ Empresas │   Más    │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

| Tab      | Route                       | Icon            |
| -------- | --------------------------- | --------------- |
| Inicio   | `/{lang}/dashboard`         | `fa-th-large`   |
| Miembros | `/{lang}/dashboard/members` | `fa-users`      |
| Empleos  | `/{lang}/dashboard/jobs`    | `fa-briefcase`  |
| Empresas | `/{lang}/companies`         | `fa-building`   |
| Más      | Opens bottom sheet          | `fa-ellipsis-h` |

Active tab highlighted with brand orange (`#f65425`). Current path matching uses `startsWith` for nested routes.

### "More" Bottom Sheet

Triggered by tapping the 5th tab. Slides up from bottom, dimmed backdrop, dismiss by tapping outside or swiping down.

```
┌─────────────────────────────────────┐
│           ─── (handle) ───          │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📷 Artemio Padilla          │    │
│  │    Ver perfil →              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ 📅 Eventos  │ │ 💬 Foros    │    │
│  └─────────────┘ └─────────────┘    │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ 🎓 Mentoría │ │ 📚 Recursos │    │
│  └─────────────┘ └─────────────┘    │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ ⚙️ Ajustes  │ │ 🚪 Salir   │    │
│  └─────────────┘ └─────────────┘    │
└─────────────────────────────────────┘
```

**Profile card**: User photo (or initials), display name, "Ver perfil →" link to `/{lang}/dashboard/profile/edit`.

**Menu items** (2-column grid):

| Item          | Route                            | Icon                         |
| ------------- | -------------------------------- | ---------------------------- |
| Eventos       | `/{lang}/dashboard/events`       | `fa-calendar-alt`            |
| Foros         | `/{lang}/dashboard/forums`       | `fa-comments`                |
| Mentoría      | `/{lang}/dashboard/mentorship`   | `fa-chalkboard-teacher`      |
| Recursos      | `/{lang}/dashboard/resources`    | `fa-book-open`               |
| Ajustes       | `/{lang}/dashboard/settings`     | `fa-cog`                     |
| Cerrar sesión | Sign out + redirect to `/{lang}` | `fa-sign-out-alt` (red text) |

## Component Architecture

### New files

| File                                        | Purpose                                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| `src/components/nav/DashboardBottomNav.tsx` | 5-tab bottom nav + bottom sheet (replaces BottomNav.tsx) |

### Modified files

| File                                     | Change                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/components/Navigation.astro`        | Remove old `BottomNav` import, add `DashboardBottomNav` with `client:only="react"`                    |
| `public/assets/css/secid-components.css` | Remove public bottom nav display rules; bottom nav only shows when React component mounts (logged in) |

### Removed files

| File                                    | Reason                                                   |
| --------------------------------------- | -------------------------------------------------------- |
| `src/components/nav/BottomNav.tsx`      | Replaced by `DashboardBottomNav.tsx`                     |
| `src/components/auth/BottomNavAuth.tsx` | No longer needed — auth logic is in `DashboardBottomNav` |

## Component: DashboardBottomNav

Single React component that handles everything:

1. **Auth check**: Uses Firebase `onAuthStateChanged`. If not authenticated, renders nothing (no bottom nav for public visitors).
2. **Tab bar**: 5 fixed tabs with active state detection via `window.location.pathname`.
3. **Bottom sheet**: Managed via local state (`sheetOpen`). Renders a portal or inline overlay.
4. **Profile data**: Reads from Firebase `auth.currentUser` for photo and display name. No Firestore query needed.
5. **Sign out**: Calls `signOut(auth)` and redirects to `/{lang}`.

### Bottom Sheet Behavior

- **Open**: Set `sheetOpen = true`, render overlay + sheet
- **Close**: Tap backdrop, swipe down, tap a menu item, or tap the "More" tab again
- **Animation**: CSS transition `transform: translateY(100%)` → `translateY(0)` with 200ms ease
- **Backdrop**: Fixed overlay with `background: rgba(0,0,0,0.4)`, click to dismiss
- **Handle**: Visual drag handle at top (decorative, not functional swipe — keep it simple)
- **Body scroll lock**: Set `document.body.style.overflow = 'hidden'` when open, restore on close

### CSS

Bottom nav container:

- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 50`
- `background: var(--navbar-bg-solid)` with `backdrop-filter: blur(20px)`
- `border-top: 1px solid var(--color-border-subtle)`
- `display: none` by default — React component sets `display: flex` on mount (only when authenticated)
- `body` gets `padding-bottom: 4.5rem` when bottom nav is visible

Tab items:

- `min-height: 3.5rem` (56px touch target)
- `flex: 1; flex-direction: column; align-items: center; justify-content: center`
- Active: `color: var(--secid-primary)` with subtle `translateY(-2px)`
- Inactive: `color: var(--color-text-secondary)`
- Icon: 18px, label: 10px

Bottom sheet:

- Sheet: `background: var(--card-bg); border-radius: 16px 16px 0 0; max-height: 70vh`
- Profile card: `background: var(--color-surface-alt); border-radius: 10px; padding: 12px`
- Menu grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 8px`
- Menu items: `padding: 12px; border-radius: 8px; background: var(--color-background)`
- Sign out: `color: var(--color-error)` (red)

### Responsive

- `< 768px`: Bottom nav visible (when authenticated)
- `>= 768px`: Bottom nav hidden, desktop sidebar takes over

## Navigation.astro Changes

```astro
<!-- Remove old BottomNav import, add new one -->import DashboardBottomNav from
'./nav/DashboardBottomNav';

<!-- Bottom nav: only renders when logged in (React handles auth check) -->
<DashboardBottomNav client:only="react" lang={lang} />
```

The `<nav class="secid-bottom-nav">` wrapper is removed — the React component manages its own container since it conditionally renders based on auth state.

## CSS Changes

Remove these rules from `secid-components.css`:

- `@media (max-width: 480px) { .secid-bottom-nav { display: block; } }` — no longer needed
- `@media (min-width: 481px) and (max-width: 768px) { .secid-bottom-nav { display: block; } }` — no longer needed
- `body { padding-bottom: 5rem; }` in those media queries — React component handles this dynamically

The `.secid-bottom-nav` base styles stay (position, background, etc.) but `display` is managed by the React component.

## Verification

1. **Logged out, phone**: No bottom nav. Hamburger menu shows login/register.
2. **Logged in, phone**: 5-tab bottom nav visible. Tabs navigate correctly.
3. **Logged in, any page** (`/es/companies`, `/es/dashboard/jobs`, etc.): Bottom nav visible with correct active tab.
4. **Tap "More"**: Bottom sheet slides up with profile card + 6 menu items.
5. **Tap backdrop**: Sheet closes.
6. **Tap menu item**: Navigates to route, sheet closes.
7. **Tap "Sign out"**: Signs out, redirects to homepage, bottom nav disappears.
8. **Desktop (> 768px)**: No bottom nav regardless of auth state.
9. **Dark mode**: All elements use CSS variables, render correctly.
10. **Body padding**: Page content not hidden behind bottom nav.
