import React, { useState, useEffect } from 'react';
import {
  sendConnectionRequest,
  followMember,
  unfollowMember,
  hasPendingConnectionRequest,
  getVisibleFields,
} from '@/lib/members';
import { MessageModal } from './MessageModal';
import {
  MapPinIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  LinkIcon,
  StarIcon,
  CheckBadgeIcon,
  EyeIcon,
  UserPlusIcon,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  UsersIcon,
  HeartIcon,
  CameraIcon,
  PencilIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import type { MemberProfile as MemberProfileType } from '@/types/member';
import type { UserBasicInfo } from '@/types/user';

function maskDisplayName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p.length <= 1 ? p : p[0] + '*'.repeat(p.length - 1)))
    .join(' ');
}

interface MemberProfileProps {
  member: MemberProfileType;
  currentUser?: UserBasicInfo | null;
  lang?: 'es' | 'en';
  onEdit?: () => void;
}

export const MemberProfile: React.FC<MemberProfileProps> = ({
  member,
  currentUser,
  lang = 'es',
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<
    'about' | 'portfolio' | 'activity' | 'connections'
  >('about');
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'none' | 'pending' | 'connected'
  >('none');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.uid === member.uid;
  const visibility = getVisibleFields(member, currentUser?.uid);

  useEffect(() => {
    if (!currentUser || isOwnProfile) return;

    if (member.networking?.followers?.includes(currentUser.uid)) {
      setIsFollowing(true);
    }

    if (member.networking?.connections?.includes(currentUser.uid)) {
      setConnectionStatus('connected');
    } else {
      hasPendingConnectionRequest(currentUser.uid, member.uid)
        .then((pending: boolean) => {
          if (pending) setConnectionStatus('pending');
        })
        .catch(() => {});
    }
  }, [currentUser?.uid, member.uid]);

  const handleConnect = async () => {
    if (!currentUser || connectionStatus !== 'none') return;
    try {
      setConnectLoading(true);
      await sendConnectionRequest(currentUser.uid, member.uid);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Error sending connection request:', err);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) return;
    try {
      setFollowLoading(true);
      if (isFollowing) {
        await unfollowMember(currentUser.uid, member.uid);
      } else {
        await followMember(currentUser.uid, member.uid);
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatJoinDate = (date: Date): string => {
    return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getExperienceLevelLabel = (level: string): string => {
    const labels: Record<string, Record<string, string>> = {
      junior: { es: 'Junior', en: 'Junior' },
      mid: { es: 'Semi-Senior', en: 'Mid-level' },
      senior: { es: 'Senior', en: 'Senior' },
      lead: { es: 'Lead', en: 'Lead' },
      executive: { es: 'Ejecutivo', en: 'Executive' },
    };
    return labels[level]?.[lang] || level;
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: `${member.displayName} - SECiD`,
        text: `${lang === 'es' ? 'Conoce a' : 'Meet'} ${member.displayName}, ${member.profile.position} ${lang === 'es' ? 'en' : 'at'} ${member.profile.company}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadVCard = () => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${member.displayName}`];
    if (member.email) lines.push(`EMAIL:${member.email}`);
    if (member.profile.company) lines.push(`ORG:${member.profile.company}`);
    if (member.profile.position) lines.push(`TITLE:${member.profile.position}`);
    if (member.social?.linkedin) lines.push(`URL:${member.social.linkedin}`);
    lines.push('END:VCARD');

    const blob = new Blob([lines.join('\n')], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${member.displayName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document['body'].removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    {
      id: 'about' as const,
      label: lang === 'es' ? 'Acerca de' : 'About',
      icon: UsersIcon,
    },
    {
      id: 'portfolio' as const,
      label: lang === 'es' ? 'Portafolio' : 'Portfolio',
      icon: CodeBracketIcon,
    },
    {
      id: 'activity' as const,
      label: lang === 'es' ? 'Actividad' : 'Activity',
      icon: ChartBarIcon,
    },
    {
      id: 'connections' as const,
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UsersIcon,
    },
  ];

  // ── Private / restricted profile view ──────────────────────────────
  if (!visibility.canViewProfile) {
    return (
      <article
        className="mx-auto max-w-6xl"
        aria-label={lang === 'es' ? 'Perfil restringido' : 'Restricted profile'}
      >
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {/* Muted cover */}
          <div className="h-40 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900" />

          <div className="relative z-10 -mt-14 flex flex-col items-center px-6 pb-8 text-center">
            {/* Greyed-out avatar with initials */}
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gray-400 text-2xl font-bold text-white/80 shadow-lg dark:border-gray-800 dark:bg-gray-600"
              aria-hidden="true"
            >
              {member.initials}
            </div>

            {/* Masked name */}
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white md:text-2xl">
              {maskDisplayName(member.displayName)}
            </h1>

            {/* Lock badge */}
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Perfil restringido' : 'Restricted profile'}
            </span>

            <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {lang === 'es'
                ? 'Este miembro ha restringido la visibilidad de su perfil.'
                : 'This member has restricted their profile visibility.'}
            </p>

            {/* Context-aware CTA */}
            <div className="mt-6">
              {!currentUser ? (
                <a
                  href={`/${lang}/login`}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
                >
                  {lang === 'es' ? 'Inicia sesion' : 'Sign in'}
                </a>
              ) : (
                visibility.allowConnectionRequests &&
                !isOwnProfile &&
                connectionStatus === 'none' && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                  >
                    <UserPlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    {lang === 'es'
                      ? 'Enviar solicitud de conexion'
                      : 'Send connection request'}
                  </button>
                )
              )}
              {currentUser && connectionStatus === 'pending' && (
                <span className="inline-flex items-center rounded-lg bg-green-100 px-5 py-2.5 font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {lang === 'es' ? 'Solicitud enviada' : 'Request sent'}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ── Stats data (only non-zero) ─────────────────────────────────────
  const statsData = [
    {
      value: member.activity.totalConnections,
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UsersIcon,
      color: 'text-primary-600 dark:text-primary-400',
    },
    {
      value: member.activity.profileViews,
      label: lang === 'es' ? 'Vistas' : 'Views',
      icon: EyeIcon,
      color: 'text-secondary-600 dark:text-secondary-400',
    },
    {
      value: member.activity.reputation,
      label: lang === 'es' ? 'Reputacion' : 'Reputation',
      icon: StarIcon,
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      value: member.activity.postsCount,
      label: lang === 'es' ? 'Publicaciones' : 'Posts',
      icon: ChatBubbleLeftEllipsisIcon,
      color: 'text-pink-600 dark:text-pink-400',
    },
  ].filter((s) => s.value > 0);

  // ── Full profile view ──────────────────────────────────────────────
  return (
    <article
      className="mx-auto max-w-6xl space-y-6"
      aria-label={`${lang === 'es' ? 'Perfil de' : 'Profile of'} ${member.displayName}`}
    >
      {/* Header Section */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {/* Cover */}
        <div className="relative h-40 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500 md:h-48">
          {isOwnProfile && (
            <button
              type="button"
              className="absolute bottom-3 right-3 rounded-lg bg-black/20 p-2 text-white transition-colors hover:bg-black/30"
              aria-label={
                lang === 'es' ? 'Cambiar foto de portada' : 'Change cover photo'
              }
            >
              <CameraIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Profile info — fully on card background */}
        <div className="relative z-10 px-6 pb-6">
          {/* Avatar — overlaps the cover */}
          <div className="-mt-16 mb-4 flex items-end justify-between">
            <div className="relative shrink-0">
              {(member as any).photoURL ? (
                <img
                  src={(member as any).photoURL}
                  alt=""
                  loading="lazy"
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg ring-4 ring-primary-500/20 dark:border-gray-800 md:h-36 md:w-36"
                />
              ) : (
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-primary-500 to-secondary-500 text-3xl font-bold text-white shadow-lg ring-4 ring-primary-500/20 dark:border-gray-800 md:h-36 md:w-36 md:text-4xl"
                  aria-hidden="true"
                >
                  {member.initials}
                </div>
              )}
              {isOwnProfile && (
                <button
                  type="button"
                  className="absolute bottom-0 right-0 rounded-full bg-primary-600 p-1.5 text-white shadow transition-colors hover:bg-primary-700"
                  aria-label={
                    lang === 'es'
                      ? 'Cambiar foto de perfil'
                      : 'Change profile photo'
                  }
                >
                  <CameraIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Name, info, and actions — entirely on card background */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 text-center lg:text-left">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
                  {member.displayName}
                </h1>
                {member.role === 'collaborator' && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                    {lang === 'es' ? 'Colaborador' : 'Collaborator'}
                  </span>
                )}
                {member.isPremium && (
                  <StarIcon
                    className="h-5 w-5 fill-current text-yellow-500"
                    aria-label="Premium member"
                  />
                )}
                {member?.portfolio?.certifications.some((c) => c.verified) && (
                  <CheckBadgeIcon
                    className="h-5 w-5 text-blue-500"
                    aria-label={
                      lang === 'es'
                        ? 'Certificaciones verificadas'
                        : 'Verified certifications'
                    }
                  />
                )}
              </div>

              <p className="mb-1 text-lg text-gray-600 dark:text-gray-400">
                {member.profile.position}
              </p>
              {visibility.showCompany && (
                <p className="mb-2 text-gray-500 dark:text-gray-500">
                  {member.profile.company}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400 lg:justify-start">
                {visibility.showLocation && (
                  <span className="flex items-center">
                    <MapPinIcon
                      className="mr-1 h-4 w-4 text-primary-500"
                      aria-hidden="true"
                    />
                    {member.profile.location}
                  </span>
                )}
                <span className="flex items-center">
                  <CalendarIcon
                    className="mr-1 h-4 w-4 text-secondary-500"
                    aria-hidden="true"
                  />
                  <time dateTime={member.joinedAt.toISOString()}>
                    {lang === 'es' ? 'Miembro desde' : 'Member since'}{' '}
                    {formatJoinDate(member.joinedAt)}
                  </time>
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:mt-0 lg:justify-end">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
                >
                  <PencilIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
                </button>
              ) : (
                currentUser && (
                  <>
                    {visibility.allowConnectionRequests &&
                      connectionStatus !== 'connected' && (
                        <button
                          type="button"
                          onClick={handleConnect}
                          disabled={
                            connectLoading || connectionStatus === 'pending'
                          }
                          className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                            connectionStatus === 'pending'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          <UserPlusIcon
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                          />
                          {connectionStatus === 'pending'
                            ? lang === 'es'
                              ? 'Solicitud enviada'
                              : 'Request sent'
                            : lang === 'es'
                              ? 'Conectar'
                              : 'Connect'}
                        </button>
                      )}

                    {connectionStatus === 'connected' && (
                      <span className="flex items-center rounded-lg bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        {lang === 'es' ? 'Conectado' : 'Connected'}
                      </span>
                    )}

                    {visibility.allowMessages && (
                      <button
                        type="button"
                        onClick={() => setShowMessageModal(true)}
                        className="flex items-center rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-primary-900/20 dark:hover:text-primary-400"
                      >
                        <ChatBubbleLeftEllipsisIcon
                          className="mr-2 h-4 w-4"
                          aria-hidden="true"
                        />
                        {lang === 'es' ? 'Mensaje' : 'Message'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                        isFollowing
                          ? 'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/30'
                          : 'bg-gray-100 text-gray-700 hover:bg-pink-50 hover:text-pink-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-pink-900/10 dark:hover:text-pink-400'
                      }`}
                    >
                      {isFollowing ? (
                        <HeartSolidIcon
                          className="mr-1 h-4 w-4 text-pink-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <HeartIcon
                          className="mr-1 h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      {isFollowing
                        ? lang === 'es'
                          ? 'Siguiendo'
                          : 'Following'
                        : lang === 'es'
                          ? 'Seguir'
                          : 'Follow'}
                    </button>
                  </>
                )
              )}

              <button
                type="button"
                onClick={handleShare}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                aria-label={
                  copied
                    ? lang === 'es'
                      ? 'Enlace copiado'
                      : 'Link copied'
                    : lang === 'es'
                      ? 'Compartir perfil'
                      : 'Share profile'
                }
              >
                {copied ? (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {lang === 'es' ? 'Copiado!' : 'Copied!'}
                  </span>
                ) : (
                  <ShareIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={downloadVCard}
                className="rounded-lg bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                aria-label={
                  lang === 'es' ? 'Descargar contacto' : 'Download contact'
                }
              >
                <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
              </button>

              {member.cvVisibility !== 'private' && (
                <a
                  href={`/${lang}/members/${member.slug || member.uid}/cv`}
                  className="flex items-center rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
                >
                  <DocumentTextIcon
                    className="mr-1.5 h-4 w-4"
                    aria-hidden="true"
                  />
                  {lang === 'es' ? 'Ver CV' : 'View CV'}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          {statsData.length > 0 && (
            <div
              className={`mt-6 grid gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 ${
                statsData.length === 1
                  ? 'grid-cols-1'
                  : statsData.length === 2
                    ? 'grid-cols-2'
                    : statsData.length === 3
                      ? 'grid-cols-3'
                      : 'grid-cols-2 md:grid-cols-4'
              }`}
              aria-label={
                lang === 'es' ? 'Estadisticas del perfil' : 'Profile stats'
              }
            >
              {statsData.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900/50"
                  >
                    <Icon
                      className={`h-5 w-5 ${stat.color}`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <nav
        className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        aria-label={lang === 'es' ? 'Secciones del perfil' : 'Profile sections'}
      >
        <div className="flex space-x-1 p-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center rounded-lg px-4 py-2 transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 md:mr-2" aria-hidden="true" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="sr-only md:hidden">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <div
        className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-8">
            {/* Bio */}
            {member.profile.bio && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Acerca de' : 'About'}
                </h2>
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                  {member.profile.bio}
                </p>
              </section>
            )}

            {/* Education */}
            {(member.profile.graduationYear || member.profile.degree) && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Formacion Academica' : 'Education'}
                </h2>
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
                  <AcademicCapIcon
                    className="mt-0.5 h-6 w-6 shrink-0 text-primary-500"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.profile.degree ||
                        (lang === 'es'
                          ? 'Licenciatura en Ciencia de Datos'
                          : 'B.Sc. in Data Science')}
                    </p>
                    {member.profile.graduationYear && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gen. {member.profile.graduationYear}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Experience */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Experiencia' : 'Experience'}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <ClockIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                  {member.experience.years}{' '}
                  {lang === 'es'
                    ? 'anos de experiencia'
                    : 'years of experience'}
                </span>
                <span className="flex items-center">
                  <BuildingOfficeIcon
                    className="mr-1 h-4 w-4"
                    aria-hidden="true"
                  />
                  {getExperienceLevelLabel(member.experience.level)}
                </span>
              </div>
            </section>

            {/* Skills */}
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                {lang === 'es' ? 'Habilidades' : 'Skills'}
              </h2>
              <ul
                className="flex flex-wrap gap-2"
                aria-label={lang === 'es' ? 'Habilidades' : 'Skills'}
              >
                {member.profile.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>

            {/* Work Experience — gradient timeline */}
            {member.experience.previousRoles.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Experiencia Laboral' : 'Work Experience'}
                </h2>
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div
                    className="absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full bg-gradient-to-b from-primary-500 to-secondary-500"
                    aria-hidden="true"
                  />

                  <ol className="space-y-5">
                    {member.experience.previousRoles.map((role) => (
                      <li key={role.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-primary-500 bg-white dark:bg-gray-800"
                          aria-hidden="true"
                        />

                        <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/50">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {role.position}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {role.company}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                            <time dateTime={role.startDate.toISOString()}>
                              {role.startDate.toLocaleDateString(
                                lang === 'es' ? 'es-MX' : 'en-US'
                              )}
                            </time>
                            {' - '}
                            {role.current
                              ? lang === 'es'
                                ? 'Presente'
                                : 'Present'
                              : role?.endDate && (
                                  <time dateTime={role.endDate.toISOString()}>
                                    {role.endDate.toLocaleDateString(
                                      lang === 'es' ? 'es-MX' : 'en-US'
                                    )}
                                  </time>
                                )}
                          </p>
                          {role['description'] && (
                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                              {role['description']}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {/* Social Links — icon-button pills */}
            {(member.social.linkedin ||
              member.social.github ||
              member.social.portfolio) && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Enlaces' : 'Links'}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {member.social.linkedin && (
                    <li>
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[#0077b5]/10 px-4 py-2 text-sm font-medium text-[#0077b5] transition-colors hover:bg-[#0077b5]/20"
                      >
                        <LinkIcon className="h-4 w-4" aria-hidden="true" />
                        LinkedIn
                      </a>
                    </li>
                  )}
                  {member.social.github && (
                    <li>
                      <a
                        href={member.social.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        <CodeBracketIcon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        GitHub
                      </a>
                    </li>
                  )}
                  {member.social.portfolio && (
                    <li>
                      <a
                        href={member.social.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
                      >
                        <GlobeAltIcon className="h-4 w-4" aria-hidden="true" />
                        {lang === 'es' ? 'Portafolio' : 'Portfolio'}
                      </a>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Projects */}
            {member?.portfolio?.projects &&
              member.portfolio.projects.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Proyectos' : 'Projects'}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {member.portfolio.projects.map((project) => (
                      <div
                        key={project.id}
                        className="group overflow-hidden rounded-xl border border-gray-200 transition-shadow hover:shadow-lg dark:border-gray-700"
                      >
                        {project.imageUrl && (
                          <div className="overflow-hidden">
                            <img
                              src={project.imageUrl}
                              alt={project.title}
                              loading="lazy"
                              className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="mb-2 font-semibold text-gray-900 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                            {project.title}
                          </h3>
                          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                            {project['description']}
                          </p>
                          <ul
                            className="mb-3 flex flex-wrap gap-1.5"
                            aria-label={
                              lang === 'es' ? 'Tecnologias' : 'Technologies'
                            }
                          >
                            {project.technologies.map((tech) => (
                              <li
                                key={tech}
                                className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                              >
                                {tech}
                              </li>
                            ))}
                          </ul>
                          <div className="flex space-x-3">
                            {project.githubUrl && (
                              <a
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                              >
                                GitHub
                              </a>
                            )}
                            {project.liveUrl && (
                              <a
                                href={project.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                              >
                                {lang === 'es' ? 'Ver en vivo' : 'Live demo'}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Achievements */}
            {member?.portfolio?.achievements &&
              member.portfolio.achievements.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Logros' : 'Achievements'}
                  </h2>
                  <div className="space-y-3">
                    {member.portfolio.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-start space-x-3"
                      >
                        <TrophyIcon
                          className="mt-1 h-6 w-6 shrink-0 text-yellow-500"
                          aria-hidden="true"
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {achievement.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {achievement['description']}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            <time dateTime={achievement.earnedAt.toISOString()}>
                              {achievement.earnedAt.toLocaleDateString(
                                lang === 'es' ? 'es-MX' : 'en-US'
                              )}
                            </time>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Certifications */}
            {member?.portfolio?.certifications &&
              member.portfolio.certifications.length > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Certificaciones' : 'Certifications'}
                  </h2>
                  <div className="space-y-3">
                    {member.portfolio.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-start space-x-3">
                        <AcademicCapIcon
                          className="mt-1 h-6 w-6 shrink-0 text-blue-500"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="flex items-center font-semibold text-gray-900 dark:text-white">
                                {cert['name']}
                                {cert.verified && (
                                  <CheckBadgeIcon
                                    className="ml-1 h-4 w-4 shrink-0 text-blue-500"
                                    aria-label={
                                      lang === 'es' ? 'Verificada' : 'Verified'
                                    }
                                  />
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {cert.issuer}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                <time dateTime={cert.issueDate.toISOString()}>
                                  {cert.issueDate.toLocaleDateString(
                                    lang === 'es' ? 'es-MX' : 'en-US'
                                  )}
                                </time>
                                {cert.expiryDate && (
                                  <>
                                    {' - '}
                                    <time
                                      dateTime={cert.expiryDate.toISOString()}
                                    >
                                      {cert.expiryDate.toLocaleDateString(
                                        lang === 'es' ? 'es-MX' : 'en-US'
                                      )}
                                    </time>
                                  </>
                                )}
                              </p>
                            </div>
                            {cert.credentialUrl && (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                              >
                                {lang === 'es' ? 'Ver' : 'View'}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* Empty state */}
            {!member?.portfolio?.projects?.length &&
              !member?.portfolio?.achievements?.length &&
              !member?.portfolio?.certifications?.length && (
                <div className="py-8 text-center">
                  <CodeBracketIcon
                    className="mx-auto h-12 w-12 text-gray-400"
                    aria-hidden="true"
                  />
                  <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {lang === 'es' ? 'Sin portafolio' : 'No portfolio'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {lang === 'es'
                      ? 'Este miembro aun no ha agregado proyectos a su portafolio'
                      : "This member hasn't added any projects to their portfolio yet"}
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="py-8 text-center">
              <ChartBarIcon
                className="mx-auto h-12 w-12 text-gray-400"
                aria-hidden="true"
              />
              <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Actividad reciente' : 'Recent activity'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {lang === 'es'
                  ? 'La actividad del miembro se mostrara aqui'
                  : 'Member activity will be shown here'}
              </p>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            <div className="py-8 text-center">
              <UsersIcon
                className="mx-auto h-12 w-12 text-gray-400"
                aria-hidden="true"
              />
              <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Conexiones' : 'Connections'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {member.activity.totalConnections}{' '}
                {lang === 'es' ? 'conexiones' : 'connections'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && currentUser && (
        <MessageModal
          fromUid={currentUser.uid}
          toUid={member.uid}
          toName={member.displayName}
          lang={lang}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </article>
  );
};

export default MemberProfile;
