import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User, type Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface Props {
  lang?: 'es' | 'en';
}

export default function BottomNavAuth({ lang = 'es' }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <a
        href={`/${lang}/login`}
        className="secid-bottom-nav__item"
        aria-label={lang === 'es' ? 'Iniciar Sesión' : 'Login'}
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
        href={`/${lang}/dashboard`}
        className="secid-bottom-nav__item"
        aria-label="Dashboard"
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
          {lang === 'es' ? 'Mi cuenta' : 'Account'}
        </span>
      </a>
    );
  }

  return (
    <a
      href={`/${lang}/login`}
      className="secid-bottom-nav__item"
      aria-label={lang === 'es' ? 'Iniciar Sesión' : 'Login'}
    >
      <i className="secid-bottom-nav__icon fas fa-sign-in-alt" />
      <span className="secid-bottom-nav__label">
        {lang === 'es' ? 'Entrar' : 'Login'}
      </span>
    </a>
  );
}
