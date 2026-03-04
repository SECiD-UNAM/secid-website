import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MemberProfile } from '@/components/directory/MemberProfile';
import { getMemberProfile } from '@/lib/members';
import type { MemberProfile as MemberProfileType } from '@/types/member';
import type { UserBasicInfo } from '@/types/user';

interface Props {
  memberId?: string;
  lang?: 'es' | 'en';
}

/** Extract member ID from the URL path (e.g. /es/members/{uid}) */
function extractMemberIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const membersIdx = segments.indexOf('members');
  if (membersIdx >= 0 && membersIdx + 1 < segments.length) {
    const id = segments[membersIdx + 1];
    if (id && id !== 'profile') return id;
  }
  return null;
}

function MemberProfileInner({ memberId: propMemberId, lang = 'es' }: Props) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [member, setMember] = useState<MemberProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberId = useMemo(
    () => propMemberId || extractMemberIdFromUrl(),
    [propMemberId]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!memberId) {
      setLoading(false);
      setError(lang === 'es' ? 'Miembro no encontrado' : 'Member not found');
      return;
    }

    let cancelled = false;

    async function fetchMember() {
      try {
        setLoading(true);
        setError(null);
        const profile = await getMemberProfile(memberId!);
        if (cancelled) return;
        if (profile) {
          setMember(profile);
        } else {
          setError(lang === 'es' ? 'Miembro no encontrado' : 'Member not found');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching member profile:', err);
        setError(
          lang === 'es'
            ? 'Error al cargar el perfil del miembro'
            : 'Error loading member profile'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMember();

    return () => { cancelled = true; };
  }, [memberId, lang, authLoading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es' ? 'Cargando perfil...' : 'Loading profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">:(</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || (lang === 'es' ? 'Miembro no encontrado' : 'Member not found')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'es'
              ? 'El perfil que buscas no existe o no esta disponible.'
              : 'The profile you are looking for does not exist or is not available.'}
          </p>
          <a
            href={`/${lang}/members`}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {lang === 'es' ? 'Volver al directorio' : 'Back to directory'}
          </a>
        </div>
      </div>
    );
  }

  const currentUser: UserBasicInfo | null = user && userProfile
    ? {
        uid: user.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        role: userProfile.role,
      }
    : null;

  return (
    <MemberProfile
      member={member}
      currentUser={currentUser}
      lang={lang}
    />
  );
}

export default function MemberProfilePage({ memberId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberProfileInner memberId={memberId} lang={lang} />
    </AuthProvider>
  );
}
