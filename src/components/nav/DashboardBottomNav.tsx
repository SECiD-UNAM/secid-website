import { useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { usePermissions } from '@/lib/rbac/hooks';

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
  const [userRole, setUserRole] = useState<string>('member');
  const { can, loading: rbacLoading } = usePermissions();

  // Secret admin mode: synced with sidebar via sessionStorage
  const [adminMode, setAdminMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('secid-admin-mode') === 'true';
  });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSettingsPointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setAdminMode((prev) => {
        const next = !prev;
        sessionStorage.setItem('secid-admin-mode', String(next));
        return next;
      });
    }, 5000);
  }, []);

  const onSettingsPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch user role from Firestore as fallback when RBAC claims aren't set
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) setUserRole(snap.data().role || 'member');
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (ready && user && isMobile) {
      document.body.style.paddingBottom = '4.5rem';
    } else {
      document.body.style.paddingBottom = '';
    }
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [ready, user, isMobile]);

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const isActive = useCallback(
    (href: string) =>
      currentPath === href || currentPath.startsWith(href + '/'),
    [currentPath]
  );

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
      href: `/${lang}/dashboard/companies`,
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
      href: `/${lang}/dashboard/salary-insights`,
      label: lang === 'es' ? 'Salarios' : 'Salary Insights',
      icon: 'fas fa-chart-line',
    },
    {
      href: `/${lang}/dashboard/settings`,
      label: lang === 'es' ? 'Ajustes' : 'Settings',
      icon: 'fas fa-cog',
    },
  ];

  // Dual-mode: use RBAC claims if available, fall back to role-based check
  const isAdminOrMod = userRole === 'admin' || userRole === 'moderator';
  const isAdminRole = userRole === 'admin';
  const hasRBAC = !rbacLoading && can('groups', 'view'); // if this works, RBAC claims exist

  const canViewSettings = hasRBAC ? can('settings', 'view') : isAdminRole;
  const canManageUsers = hasRBAC ? can('users', 'edit') : isAdminOrMod;
  const canManageCompanies = hasRBAC ? can('companies', 'edit') : isAdminOrMod;
  const canManageGroups = hasRBAC ? can('groups', 'view') : isAdminRole;
  const canViewReports = hasRBAC ? can('reports', 'view') : isAdminOrMod;
  const canManageJournalClub = hasRBAC ? can('journal-club', 'view') : isAdminOrMod;
  const canManageNewsletter = hasRBAC ? can('newsletter', 'view') : isAdminOrMod;
  const canManageSpotlights = hasRBAC ? can('spotlights', 'view') : isAdminOrMod;
  const showAdminSection = canViewSettings || canManageUsers || canManageCompanies || canManageGroups || canViewReports;
  const showContentSection = canManageJournalClub || canManageNewsletter || canManageSpotlights;

  const contentManagementItems = showContentSection
    ? [
        ...(canManageJournalClub
          ? [{ href: `/${lang}/dashboard/journal-club`, label: 'Journal Club', icon: 'fas fa-book-reader' }]
          : []),
        ...(canManageNewsletter
          ? [{ href: `/${lang}/dashboard/newsletter`, label: 'Newsletter', icon: 'fas fa-newspaper' }]
          : []),
        ...(canManageSpotlights
          ? [{ href: `/${lang}/dashboard/spotlights`, label: lang === 'es' ? 'Destacados' : 'Spotlights', icon: 'fas fa-star' }]
          : []),
      ]
    : [];

  const adminItems = showAdminSection
    ? [
        ...(canViewSettings
          ? [{ href: `/${lang}/dashboard/admin`, label: 'Admin Panel', icon: 'fas fa-shield-alt' }]
          : []),
        ...(canManageUsers
          ? [{ href: `/${lang}/dashboard/admin/members`, label: lang === 'es' ? 'Gestionar Miembros' : 'Manage Members', icon: 'fas fa-user-cog' }]
          : []),
        ...(canManageCompanies
          ? [{ href: `/${lang}/dashboard/admin/companies`, label: lang === 'es' ? 'Gestionar Empresas' : 'Manage Companies', icon: 'fas fa-building' }]
          : []),
        ...(canManageGroups
          ? [{ href: `/${lang}/dashboard/admin/groups`, label: lang === 'es' ? 'Grupos' : 'Groups', icon: 'fas fa-layer-group' }]
          : []),
        ...(canViewSettings
          ? [{ href: `/${lang}/dashboard/admin/salary`, label: lang === 'es' ? 'Salarios (Admin)' : 'Salary Data', icon: 'fas fa-dollar-sign' }]
          : []),
        ...(canViewReports
          ? [{ href: `/${lang}/dashboard/admin/reports`, label: lang === 'es' ? 'Reportes' : 'Reports', icon: 'fas fa-chart-bar' }]
          : []),
      ]
    : [];

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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
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
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #94a3b8)' }}>
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
          {sheetItems.map((item) => {
            const isSettings = item.href.includes('/settings');
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setSheetOpen(false)}
                onPointerDown={isSettings ? onSettingsPointerDown : undefined}
                onPointerUp={isSettings ? onSettingsPointerUp : undefined}
                onPointerLeave={isSettings ? onSettingsPointerUp : undefined}
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
                <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 14 }} />
                {item.label}
                {isSettings && adminMode && (
                  <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                )}
              </a>
            );
          })}
        </div>

        {/* Content management section */}
        {adminMode && contentManagementItems.length > 0 && (
          <>
            <div
              style={{
                padding: '4px 16px 8px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-secondary, #64748b)',
              }}
            >
              {lang === 'es' ? 'Contenido' : 'Content'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '0 16px 12px',
              }}
            >
              {contentManagementItems.map((item) => (
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
                  <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 14 }} />
                  {item.label}
                </a>
              ))}
            </div>
          </>
        )}

        {/* Admin section */}
        {adminMode && adminItems.length > 0 && (
          <>
            <div
              style={{
                padding: '4px 16px 8px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--color-text-secondary, #64748b)',
              }}
            >
              {lang === 'es' ? 'Administración' : 'Administration'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '0 16px 12px',
              }}
            >
              {adminItems.map((item) => (
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
                  <i className={item.icon} style={{ width: 18, textAlign: 'center', fontSize: 14 }} />
                  {item.label}
                </a>
              ))}
            </div>
          </>
        )}

        {/* Sign out */}
        <div
          style={{
            padding: '0 16px 12px',
          }}
        >
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
            <i className="fas fa-sign-out-alt" style={{ width: 18, textAlign: 'center', fontSize: 14 }} />
            {lang === 'es' ? 'Cerrar sesión' : 'Sign out'}
          </button>
        </div>
      </div>
    </>
  );
}
