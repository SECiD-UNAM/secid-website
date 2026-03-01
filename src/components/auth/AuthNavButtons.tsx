import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User, type Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthNavButtonsProps {
  lang?: 'es' | 'en';
  loginLabel?: string;
  registerLabel?: string;
}

function getInitials(user: User): string {
  if (user.displayName) {
    return user.displayName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  if (user.email && user.email.length > 0) {
    return user.email.charAt(0).toUpperCase();
  }
  return '?';
}

export default function AuthNavButtons({
  lang = 'es',
  loginLabel = lang === 'es' ? 'Iniciar Sesión' : 'Login',
  registerLabel = lang === 'es' ? 'Registrarse' : 'Register',
}: AuthNavButtonsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    auth.authStateReady().then(() => {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setReady(true);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    await firebaseSignOut(auth);
    window.location.href = `/${lang}`;
  };

  if (!ready) return null;

  if (user) {
    const initials = getInitials(user);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label={lang === 'es' ? 'Menú de usuario' : 'User menu'}
          aria-expanded={open}
          aria-haspopup="true"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
              {initials}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <a
              href={`/${lang}/dashboard`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <i className="fas fa-columns mr-2 w-4 text-center text-xs" aria-hidden="true"></i>
              Dashboard
            </a>
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <i className="fas fa-sign-out-alt mr-2 w-4 text-center text-xs" aria-hidden="true"></i>
              {lang === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <a
        href={`/${lang}/login`}
        className="secid-button secid-button--outline secid-button--sm"
      >
        {loginLabel}
      </a>
      <a
        href={`/${lang}/signup`}
        className="secid-button secid-button--primary secid-button--sm"
      >
        {registerLabel}
      </a>
    </>
  );
}
