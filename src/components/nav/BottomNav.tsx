import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User, type Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface Props {
  lang?: 'es' | 'en';
  communityLinks: { href: string; label: string; icon: string }[];
}

interface NavItem {
  href?: string;
  label: string;
  icon: string;
  action?: 'community';
}

export default function BottomNav({ lang = 'es', communityLinks }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    auth.authStateReady().then(() => {
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const isActive = useCallback(
    (href: string) => currentPath === href || currentPath.startsWith(href + '/'),
    [currentPath]
  );

  // Close community drawer on outside click
  useEffect(() => {
    if (!communityOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.secid-bottom-nav')) {
        setCommunityOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [communityOpen]);

  const publicItems: NavItem[] = [
    { href: `/${lang}/`, label: lang === 'es' ? 'Inicio' : 'Home', icon: 'fas fa-home' },
    { href: `/${lang}/jobs`, label: lang === 'es' ? 'Empleos' : 'Jobs', icon: 'fas fa-briefcase' },
    { label: lang === 'es' ? 'Comunidad' : 'Community', icon: 'fas fa-users', action: 'community' },
  ];

  const memberItems: NavItem[] = [
    { href: `/${lang}/dashboard`, label: 'Dashboard', icon: 'fas fa-th-large' },
    { href: `/${lang}/dashboard/members`, label: lang === 'es' ? 'Miembros' : 'Members', icon: 'fas fa-users' },
    { href: `/${lang}/companies`, label: lang === 'es' ? 'Empresas' : 'Companies', icon: 'fas fa-building' },
  ];

  const items = user ? memberItems : publicItems;

  const renderItem = (item: NavItem, index: number) => {
    if (item.action === 'community') {
      return (
        <button
          key={index}
          className={`secid-bottom-nav__item ${communityOpen ? 'secid-bottom-nav__item--active' : ''}`}
          onClick={() => setCommunityOpen(!communityOpen)}
        >
          <i className={`secid-bottom-nav__icon ${item.icon}`} />
          <span className="secid-bottom-nav__label">{item.label}</span>
        </button>
      );
    }
    return (
      <a
        key={index}
        href={item.href}
        className={`secid-bottom-nav__item ${item.href && isActive(item.href) ? 'secid-bottom-nav__item--active' : ''}`}
      >
        <i className={`secid-bottom-nav__icon ${item.icon}`} />
        <span className="secid-bottom-nav__label">{item.label}</span>
      </a>
    );
  };

  const renderAuthItem = () => {
    if (!ready) {
      return (
        <a
          href={`/${lang}/login`}
          className="secid-bottom-nav__item"
        >
          <i className="secid-bottom-nav__icon fas fa-user" />
          <span className="secid-bottom-nav__label">
            {lang === 'es' ? 'Entrar' : 'Login'}
          </span>
        </a>
      );
    }

    if (user) {
      return (
        <a
          href={`/${lang}/dashboard/profile`}
          className={`secid-bottom-nav__item ${isActive(`/${lang}/dashboard/profile`) ? 'secid-bottom-nav__item--active' : ''}`}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="secid-bottom-nav__icon"
              style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <i className="secid-bottom-nav__icon fas fa-user-circle" />
          )}
          <span className="secid-bottom-nav__label">
            {lang === 'es' ? 'Perfil' : 'Profile'}
          </span>
        </a>
      );
    }

    return (
      <a
        href={`/${lang}/login`}
        className="secid-bottom-nav__item"
      >
        <i className="secid-bottom-nav__icon fas fa-sign-in-alt" />
        <span className="secid-bottom-nav__label">
          {lang === 'es' ? 'Entrar' : 'Login'}
        </span>
      </a>
    );
  };

  return (
    <>
      <div className="secid-bottom-nav__container">
        {items.map(renderItem)}
        {renderAuthItem()}
      </div>

      {/* Community drawer */}
      {communityOpen && (
        <div className="secid-bottom-nav__drawer" data-open>
          <div className="secid-bottom-nav__drawer-header">
            <span>{lang === 'es' ? 'Comunidad' : 'Community'}</span>
            <button onClick={() => setCommunityOpen(false)} aria-label={lang === 'es' ? 'Cerrar' : 'Close'}>
              <i className="fas fa-times" />
            </button>
          </div>
          <div className="secid-bottom-nav__drawer-links">
            {communityLinks.map((link, i) => (
              <a key={i} href={link.href} className="secid-bottom-nav__drawer-link">
                <i className={link.icon} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
