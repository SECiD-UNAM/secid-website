# Mobile Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public/member bottom nav with an auth-aware dashboard bottom nav that shows 5 member tabs (Home, Members, Jobs, Companies, More) with a bottom sheet menu — only for logged-in users on mobile/tablet.

**Architecture:** Single React component `DashboardBottomNav` renders nothing when logged out, renders a 5-tab bar + bottom sheet when logged in. CSS media queries removed — visibility managed entirely by React based on auth state + screen width. Navigation.astro just mounts the component.

**Tech Stack:** React 18, Firebase Auth, Tailwind-compatible CSS variables, Font Awesome icons

---

## File Structure

### New files

| File                                        | Responsibility                                    |
| ------------------------------------------- | ------------------------------------------------- |
| `src/components/nav/DashboardBottomNav.tsx` | Auth-aware 5-tab bottom nav + "More" bottom sheet |

### Modified files

| File                                     | Change                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/components/Navigation.astro`        | Replace `BottomNav` import with `DashboardBottomNav`, remove `<nav>` wrapper                                              |
| `public/assets/css/secid-components.css` | Remove `display: block` rules for `.secid-bottom-nav` in media queries; remove `body { padding-bottom }` in those queries |

### Deleted files

| File                                    | Reason                                 |
| --------------------------------------- | -------------------------------------- |
| `src/components/nav/BottomNav.tsx`      | Replaced by `DashboardBottomNav.tsx`   |
| `src/components/auth/BottomNavAuth.tsx` | Auth logic now in `DashboardBottomNav` |

---

## Task 1: Create DashboardBottomNav component

**Files:**

- Create: `src/components/nav/DashboardBottomNav.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/nav/DashboardBottomNav.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface Props {
  lang?: 'es' | 'en';
}

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

const BREAKPOINT = 768;

function getInitials(user: User): string {
  if (user.displayName) {
    return user.displayName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return user.email?.charAt(0).toUpperCase() || '?';
}

export default function DashboardBottomNav({ lang = 'es' }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Auth listener
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    auth.authStateReady().then(() => {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Body padding when visible
  useEffect(() => {
    if (ready && user && isMobile) {
      document.body.style.paddingBottom = '4.5rem';
      return () => {
        document.body.style.paddingBottom = '';
      };
    }
  }, [ready, user, isMobile]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [sheetOpen]);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const isActive = useCallback(
    (href: string) =>
      currentPath === href || currentPath.startsWith(href + '/'),
    [currentPath]
  );

  // Don't render: not ready, not logged in, or not mobile
  if (!ready || !user || !isMobile) return null;

  const tabs: TabItem[] = [
    {
      href: `/${lang}/dashboard`,
      label: lang === 'es' ? 'Inicio' : 'Home',
      icon: 'fas fa-th-large',
    },
    {
      href: `/${lang}/dashboard/members`,
      label: lang === 'es' ? 'Miembros' : 'Members',
      icon: 'fas fa-users',
    },
    {
      href: `/${lang}/dashboard/jobs`,
      label: lang === 'es' ? 'Empleos' : 'Jobs',
      icon: 'fas fa-briefcase',
    },
    {
      href: `/${lang}/companies`,
      label: lang === 'es' ? 'Empresas' : 'Companies',
      icon: 'fas fa-building',
    },
  ];

  const sheetItems = [
    {
      href: `/${lang}/dashboard/events`,
      label: lang === 'es' ? 'Eventos' : 'Events',
      icon: 'fas fa-calendar-alt',
    },
    {
      href: `/${lang}/dashboard/forums`,
      label: lang === 'es' ? 'Foros' : 'Forums',
      icon: 'fas fa-comments',
    },
    {
      href: `/${lang}/dashboard/mentorship`,
      label: lang === 'es' ? 'Mentoría' : 'Mentorship',
      icon: 'fas fa-chalkboard-teacher',
    },
    {
      href: `/${lang}/dashboard/resources`,
      label: lang === 'es' ? 'Recursos' : 'Resources',
      icon: 'fas fa-book-open',
    },
    {
      href: `/${lang}/dashboard/settings`,
      label: lang === 'es' ? 'Ajustes' : 'Settings',
      icon: 'fas fa-cog',
    },
  ];

  const handleSignOut = async () => {
    setSheetOpen(false);
    await firebaseSignOut(auth);
    window.location.href = `/${lang}`;
  };

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav
        className="secid-bottom-nav"
        style={{ display: 'block' }}
        aria-label={lang === 'es' ? 'Navegación móvil' : 'Mobile navigation'}
      >
        <div className="secid-bottom-nav__container">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={`secid-bottom-nav__item ${isActive(tab.href) ? 'secid-bottom-nav__item--active' : ''}`}
            >
              <i className={`secid-bottom-nav__icon ${tab.icon}`} />
              <span className="secid-bottom-nav__label">{tab.label}</span>
            </a>
          ))}
          <button
            className={`secid-bottom-nav__item ${sheetOpen ? 'secid-bottom-nav__item--active' : ''}`}
            onClick={() => setSheetOpen(!sheetOpen)}
            aria-label={lang === 'es' ? 'Más opciones' : 'More options'}
            aria-expanded={sheetOpen}
          >
            <i className="secid-bottom-nav__icon fas fa-ellipsis-h" />
            <span className="secid-bottom-nav__label">
              {lang === 'es' ? 'Más' : 'More'}
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet Overlay */}
      {sheetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 200ms ease',
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '10px 0 4px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 4,
              background: 'var(--color-border, #475569)',
            }}
          />
        </div>

        {/* Profile card */}
        <div style={{ padding: '8px 16px 12px' }}>
          <a
            href={`/${lang}/dashboard/profile/edit`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 10,
              background: 'var(--color-surface-alt, #334155)',
              textDecoration: 'none',
              color: 'inherit',
            }}
            onClick={() => setSheetOpen(false)}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--secid-primary, #f65425)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {getInitials(user)}
              </div>
            )}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--color-text-primary, #f8fafc)',
                }}
              >
                {user.displayName || user.email}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary, #94a3b8)',
                }}
              >
                {lang === 'es' ? 'Ver perfil →' : 'View profile →'}
              </div>
            </div>
          </a>
        </div>

        {/* Menu grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            padding: '0 16px 12px',
          }}
        >
          {sheetItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setSheetOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 8,
                background: 'var(--color-background, #0f172a)',
                textDecoration: 'none',
                color: 'var(--color-text-primary, #e2e8f0)',
                fontSize: 13,
              }}
            >
              <i
                className={item.icon}
                style={{ width: 18, textAlign: 'center', fontSize: 14 }}
              />
              {item.label}
            </a>
          ))}
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 12,
              borderRadius: 8,
              background: 'var(--color-background, #0f172a)',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <i
              className="fas fa-sign-out-alt"
              style={{ width: 18, textAlign: 'center', fontSize: 14 }}
            />
            {lang === 'es' ? 'Cerrar sesión' : 'Sign out'}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/DashboardBottomNav.tsx
git commit -m "feat(nav): add DashboardBottomNav with 5-tab bar and bottom sheet"
```

---

## Task 2: Wire into Navigation.astro and clean up

**Files:**

- Modify: `src/components/Navigation.astro`
- Modify: `public/assets/css/secid-components.css`
- Delete: `src/components/nav/BottomNav.tsx`
- Delete: `src/components/auth/BottomNavAuth.tsx`

- [ ] **Step 1: Update Navigation.astro**

Replace the `BottomNav` import and usage:

```diff
- import BottomNav from './nav/BottomNav';
+ import DashboardBottomNav from './nav/DashboardBottomNav';
```

Replace the bottom nav section (around lines 373-384):

```diff
- <!-- Bottom Navigation (for mobile/tablet) -->
- <nav
-   class="secid-bottom-nav"
-   aria-label={lang === 'es' ? 'Navegación móvil' : 'Mobile navigation'}
-   role="navigation"
- >
-   <BottomNav
-     client:only="react"
-     lang={lang}
-     communityLinks={communityLinks}
-   />
- </nav>
+ <!-- Bottom Navigation: only renders for logged-in members on mobile/tablet -->
+ <DashboardBottomNav client:only="react" lang={lang} />
```

- [ ] **Step 2: Remove CSS display rules for bottom nav in media queries**

In `public/assets/css/secid-components.css`:

In the `@media (max-width: 480px)` block (~line 892), remove:

```css
.secid-bottom-nav {
  display: block;
}

/* Add bottom padding to body to account for fixed bottom nav */
body {
  padding-bottom: 5rem;
}
```

In the `@media (min-width: 481px) and (max-width: 768px)` block (~line 952), remove:

```css
.secid-bottom-nav {
  display: block;
}

body {
  padding-bottom: 5rem;
}
```

Keep the base `.secid-bottom-nav` styles (position, background, etc.) — they're still used by the React component which sets `display: block` inline.

- [ ] **Step 3: Delete old files**

```bash
rm src/components/nav/BottomNav.tsx
rm src/components/auth/BottomNavAuth.tsx
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(nav): wire DashboardBottomNav, remove old bottom nav components and CSS rules"
```

---

## Task 3: Verify with dev server

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test logged-out state**

Open `http://localhost:4321/es/` at 375px width.
Expected: No bottom nav. Hamburger menu in top navbar. Login/Register in hamburger.

- [ ] **Step 3: Test logged-in state on phone**

Log in, navigate to `/es/dashboard` at 375px width.
Expected: 5-tab bottom nav (Inicio, Miembros, Empleos, Empresas, Más). Active tab highlighted orange.

- [ ] **Step 4: Test "More" bottom sheet**

Tap "Más" tab.
Expected: Bottom sheet slides up with profile card (photo + name + "Ver perfil →"), 2-column grid (Eventos, Foros, Mentoría, Recursos, Ajustes, Cerrar sesión). Tap backdrop dismisses.

- [ ] **Step 5: Test on public page when logged in**

Navigate to `/es/companies` while logged in at 375px.
Expected: Bottom nav still visible. "Empresas" tab highlighted.

- [ ] **Step 6: Test desktop**

Resize to 1024px.
Expected: No bottom nav. Desktop sidebar visible.

- [ ] **Step 7: Test sign out**

Tap "Más" → "Cerrar sesión".
Expected: Signs out, redirects to `/es/`, bottom nav disappears.

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix(nav): address verification feedback"
```
