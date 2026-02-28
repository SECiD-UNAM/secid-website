import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User, type Unsubscribe } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthNavButtonsProps {
  lang?: 'es' | 'en';
  loginLabel?: string;
  registerLabel?: string;
  dashboardLabel?: string;
}

export default function AuthNavButtons({
  lang = 'es',
  loginLabel = lang === 'es' ? 'Iniciar Sesión' : 'Login',
  registerLabel = lang === 'es' ? 'Registrarse' : 'Register',
  dashboardLabel = 'Dashboard',
}: AuthNavButtonsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

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

  if (!ready) return null;

  if (user) {
    return (
      <a
        href={`/${lang}/dashboard`}
        className="secid-button secid-button--primary secid-button--sm"
      >
        {dashboardLabel}
      </a>
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
