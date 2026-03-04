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
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'activity' | 'connections'>('about');
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
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
        .then((pending: boolean) => { if (pending) setConnectionStatus('pending'); })
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
      month: 'long'
    });
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (member.isOnline) {
      return lang === 'es' ? 'En linea ahora' : 'Online now';
    } else if (hours < 24) {
      return lang === 'es' ? `Activo hace ${hours} horas` : `Active ${hours} hours ago`;
    } else if (days < 7) {
      return lang === 'es' ? `Activo hace ${days} dias` : `Active ${days} days ago`;
    } else {
      return lang === 'es' ? `Ultimo acceso ${formatJoinDate(date)}` : `Last seen ${formatJoinDate(date)}`;
    }
  };

  const getExperienceLevelLabel = (level: string): string => {
    const labels: Record<string, Record<string, string>> = {
      junior: { es: 'Junior', en: 'Junior' },
      mid: { es: 'Semi-Senior', en: 'Mid-level' },
      senior: { es: 'Senior', en: 'Senior' },
      lead: { es: 'Lead', en: 'Lead' },
      executive: { es: 'Ejecutivo', en: 'Executive' }
    };
    return labels[level]?.[lang] || level;
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: `${member.displayName} - SECiD`,
        text: `${lang === 'es' ? 'Conoce a' : 'Meet'} ${member.displayName}, ${member.profile.position} ${lang === 'es' ? 'en' : 'at'} ${member.profile.company}`,
        url
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
      icon: UsersIcon
    },
    {
      id: 'portfolio' as const,
      label: lang === 'es' ? 'Portafolio' : 'Portfolio',
      icon: CodeBracketIcon
    },
    {
      id: 'activity' as const,
      label: lang === 'es' ? 'Actividad' : 'Activity',
      icon: ChartBarIcon
    },
    {
      id: 'connections' as const,
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UsersIcon
    }
  ];

  // ── Private / restricted profile view ──────────────────────────────
  if (!visibility.canViewProfile) {
    return (
      <article className="max-w-6xl mx-auto" aria-label={lang === 'es' ? 'Perfil restringido' : 'Restricted profile'}>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Muted cover */}
          <div className="h-40 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900" />

          <div className="relative z-10 px-6 pb-8 -mt-14 flex flex-col items-center text-center">
            {/* Greyed-out avatar with initials */}
            <div
              className="h-28 w-28 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center text-white/80 font-bold text-2xl border-4 border-white dark:border-gray-800 shadow-lg"
              aria-hidden="true"
            >
              {member.initials}
            </div>

            {/* Masked name */}
            <h1 className="mt-4 text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {maskDisplayName(member.displayName)}
            </h1>

            {/* Lock badge */}
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
              <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
              {lang === 'es' ? 'Perfil restringido' : 'Restricted profile'}
            </span>

            <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400 text-sm">
              {lang === 'es'
                ? 'Este miembro ha restringido la visibilidad de su perfil.'
                : 'This member has restricted their profile visibility.'}
            </p>

            {/* Context-aware CTA */}
            <div className="mt-6">
              {!currentUser ? (
                <a
                  href={`/${lang}/login`}
                  className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  {lang === 'es' ? 'Inicia sesion' : 'Sign in'}
                </a>
              ) : (
                visibility.allowConnectionRequests && !isOwnProfile && connectionStatus === 'none' && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                    {lang === 'es' ? 'Enviar solicitud de conexion' : 'Send connection request'}
                  </button>
                )
              )}
              {currentUser && connectionStatus === 'pending' && (
                <span className="inline-flex items-center px-5 py-2.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg font-medium">
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
    <article className="max-w-6xl mx-auto space-y-6" aria-label={`${lang === 'es' ? 'Perfil de' : 'Profile of'} ${member.displayName}`}>
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Cover */}
        <div className="h-48 md:h-56 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500" aria-hidden="true">
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.15),transparent_70%)]" />
        </div>

        {/* Profile info — relative + z-10 so it renders above the cover gradient */}
        <div className="relative z-10 px-6 pb-6">
          {isOwnProfile && (
            <button
              type="button"
              className="absolute -top-12 right-6 p-2 bg-black/20 text-white rounded-lg hover:bg-black/30 transition-colors"
              aria-label={lang === 'es' ? 'Cambiar foto de portada' : 'Change cover photo'}
            >
              <CameraIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between -mt-16">
            {/* Avatar and basic info */}
            <div className="flex flex-col lg:flex-row lg:items-end space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="relative shrink-0">
                {(member as any).photoURL ? (
                  <img
                    src={(member as any).photoURL}
                    alt=""
                    loading="lazy"
                    className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg ring-4 ring-primary-500/20"
                  />
                ) : (
                  <div
                    className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl md:text-4xl border-4 border-white dark:border-gray-800 shadow-lg ring-4 ring-primary-500/20"
                    aria-hidden="true"
                  >
                    {member.initials}
                  </div>
                )}
                {visibility.showOnlineStatus && (
                  <span
                    className={`absolute bottom-2 right-2 h-5 w-5 md:h-6 md:w-6 rounded-full border-[3px] border-white dark:border-gray-800 ${
                      member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    role="status"
                    aria-label={member.isOnline ? (lang === 'es' ? 'En linea' : 'Online') : (lang === 'es' ? 'Desconectado' : 'Offline')}
                  />
                )}
                {isOwnProfile && (
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors shadow"
                    aria-label={lang === 'es' ? 'Cambiar foto de perfil' : 'Change profile photo'}
                  >
                    <CameraIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="text-center lg:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {member.displayName}
                  </h1>
                  {member.role === 'collaborator' && (
                    <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                      {lang === 'es' ? 'Colaborador' : 'Collaborator'}
                    </span>
                  )}
                  {member.isPremium && (
                    <StarIcon className="h-5 w-5 text-yellow-500 fill-current" aria-label="Premium member" />
                  )}
                  {member?.portfolio?.certifications.some(c => c.verified) && (
                    <CheckBadgeIcon className="h-5 w-5 text-blue-500" aria-label={lang === 'es' ? 'Certificaciones verificadas' : 'Verified certifications'} />
                  )}
                </div>

                <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
                  {member.profile.position}
                </p>
                {visibility.showCompany && (
                  <p className="text-gray-500 dark:text-gray-500 mb-2">
                    {member.profile.company}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                  {visibility.showLocation && (
                    <span className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1 text-primary-500" aria-hidden="true" />
                      {member.profile.location}
                    </span>
                  )}
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-secondary-500" aria-hidden="true" />
                    <time dateTime={member.joinedAt.toISOString()}>
                      {lang === 'es' ? 'Miembro desde' : 'Member since'} {formatJoinDate(member.joinedAt)}
                    </time>
                  </span>
                  {visibility.showLastSeen && (
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1 text-green-500" aria-hidden="true" />
                      {formatLastSeen(member.lastSeen)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4 lg:mt-0 justify-center lg:justify-end">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                  {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
                </button>
              ) : currentUser && (
                <>
                  {visibility.allowConnectionRequests && connectionStatus !== 'connected' && (
                    <button
                      type="button"
                      onClick={handleConnect}
                      disabled={connectLoading || connectionStatus === 'pending'}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        connectionStatus === 'pending'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      <UserPlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      {connectionStatus === 'pending'
                        ? (lang === 'es' ? 'Solicitud enviada' : 'Request sent')
                        : (lang === 'es' ? 'Conectar' : 'Connect')}
                    </button>
                  )}

                  {connectionStatus === 'connected' && (
                    <span className="flex items-center px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                      {lang === 'es' ? 'Conectado' : 'Connected'}
                    </span>
                  )}

                  {visibility.allowMessages && (
                    <button
                      type="button"
                      onClick={() => setShowMessageModal(true)}
                      className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                    >
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                      {lang === 'es' ? 'Mensaje' : 'Message'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isFollowing
                        ? 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600 dark:hover:text-pink-400'
                    }`}
                  >
                    {isFollowing ? (
                      <HeartSolidIcon className="h-4 w-4 mr-1 text-pink-500" aria-hidden="true" />
                    ) : (
                      <HeartIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                    )}
                    {isFollowing
                      ? (lang === 'es' ? 'Siguiendo' : 'Following')
                      : (lang === 'es' ? 'Seguir' : 'Follow')}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={copied ? (lang === 'es' ? 'Enlace copiado' : 'Link copied') : (lang === 'es' ? 'Compartir perfil' : 'Share profile')}
              >
                {copied ? (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">{lang === 'es' ? 'Copiado!' : 'Copied!'}</span>
                ) : (
                  <ShareIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={downloadVCard}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={lang === 'es' ? 'Descargar contacto' : 'Download contact'}
              >
                <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Stats */}
          {statsData.length > 0 && (
            <div
              className={`grid gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 ${
                statsData.length === 1 ? 'grid-cols-1' :
                statsData.length === 2 ? 'grid-cols-2' :
                statsData.length === 3 ? 'grid-cols-3' :
                'grid-cols-2 md:grid-cols-4'
              }`}
              aria-label={lang === 'es' ? 'Estadisticas del perfil' : 'Profile stats'}
            >
              {statsData.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3"
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
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
      <nav className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" aria-label={lang === 'es' ? 'Secciones del perfil' : 'Profile sections'}>
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
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
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
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Acerca de' : 'About'}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {member.profile.bio}
                </p>
              </section>
            )}

            {/* Education */}
            {(member.profile.graduationYear || member.profile.degree) && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Formacion Academica' : 'Education'}
                </h2>
                <div className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
                  <AcademicCapIcon className="h-6 w-6 text-primary-500 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.profile.degree || (lang === 'es' ? 'Licenciatura en Ciencia de Datos' : 'B.Sc. in Data Science')}
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {lang === 'es' ? 'Experiencia' : 'Experience'}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                  {member.experience.years} {lang === 'es' ? 'anos de experiencia' : 'years of experience'}
                </span>
                <span className="flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" aria-hidden="true" />
                  {getExperienceLevelLabel(member.experience.level)}
                </span>
              </div>
            </section>

            {/* Skills */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {lang === 'es' ? 'Habilidades' : 'Skills'}
              </h2>
              <ul className="flex flex-wrap gap-2" aria-label={lang === 'es' ? 'Habilidades' : 'Skills'}>
                {member.profile.skills.map(skill => (
                  <li
                    key={skill}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>

            {/* Work Experience — gradient timeline */}
            {member.experience.previousRoles.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Experiencia Laboral' : 'Work Experience'}
                </h2>
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary-500 to-secondary-500 rounded-full" aria-hidden="true" />

                  <ol className="space-y-5">
                    {member.experience.previousRoles.map(role => (
                      <li key={role.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-primary-500 bg-white dark:bg-gray-800" aria-hidden="true" />

                        <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {role.position}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {role.company}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            <time dateTime={role.startDate.toISOString()}>
                              {role.startDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                            </time>
                            {' - '}
                            {role.current
                              ? (lang === 'es' ? 'Presente' : 'Present')
                              : role?.endDate && (
                                  <time dateTime={role.endDate.toISOString()}>
                                    {role.endDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                                  </time>
                                )
                            }
                          </p>
                          {role['description'] && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
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
            {(member.social.linkedin || member.social.github || member.social.portfolio) && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Enlaces' : 'Links'}
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {member.social.linkedin && (
                    <li>
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-[#0077b5]/10 px-4 py-2 text-sm font-medium text-[#0077b5] hover:bg-[#0077b5]/20 transition-colors"
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
                        className="inline-flex items-center gap-2 rounded-full bg-gray-200 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <CodeBracketIcon className="h-4 w-4" aria-hidden="true" />
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
                        className="inline-flex items-center gap-2 rounded-full bg-primary-100 dark:bg-primary-900/20 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/30 transition-colors"
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
            {member?.portfolio?.projects && member.portfolio.projects.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Proyectos' : 'Projects'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {member.portfolio.projects.map(project => (
                    <div
                      key={project.id}
                      className="group border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {project.imageUrl && (
                        <div className="overflow-hidden">
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            loading="lazy"
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {project['description']}
                        </p>
                        <ul className="flex flex-wrap gap-1.5 mb-3" aria-label={lang === 'es' ? 'Tecnologias' : 'Technologies'}>
                          {project.technologies.map(tech => (
                            <li
                              key={tech}
                              className="px-2.5 py-0.5 text-xs rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
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
                              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              GitHub
                            </a>
                          )}
                          {project.liveUrl && (
                            <a
                              href={project.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
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
            {member?.portfolio?.achievements && member.portfolio.achievements.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Logros' : 'Achievements'}
                </h2>
                <div className="space-y-3">
                  {member.portfolio.achievements.map(achievement => (
                    <div key={achievement.id} className="flex items-start space-x-3">
                      <TrophyIcon className="h-6 w-6 text-yellow-500 mt-1 shrink-0" aria-hidden="true" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {achievement['description']}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          <time dateTime={achievement.earnedAt.toISOString()}>
                            {achievement.earnedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                          </time>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications */}
            {member?.portfolio?.certifications && member.portfolio.certifications.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Certificaciones' : 'Certifications'}
                </h2>
                <div className="space-y-3">
                  {member.portfolio.certifications.map(cert => (
                    <div key={cert.id} className="flex items-start space-x-3">
                      <AcademicCapIcon className="h-6 w-6 text-blue-500 mt-1 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              {cert['name']}
                              {cert.verified && (
                                <CheckBadgeIcon className="h-4 w-4 text-blue-500 ml-1 shrink-0" aria-label={lang === 'es' ? 'Verificada' : 'Verified'} />
                              )}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {cert.issuer}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              <time dateTime={cert.issueDate.toISOString()}>
                                {cert.issueDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                              </time>
                              {cert.expiryDate && (
                                <>
                                  {' - '}
                                  <time dateTime={cert.expiryDate.toISOString()}>
                                    {cert.expiryDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
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
                              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 shrink-0"
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
            {(!member?.portfolio?.projects?.length && !member?.portfolio?.achievements?.length && !member?.portfolio?.certifications?.length) && (
              <div className="text-center py-8">
                <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin portafolio' : 'No portfolio'}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Este miembro aun no ha agregado proyectos a su portafolio'
                    : 'This member hasn\'t added any projects to their portfolio yet'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Actividad reciente' : 'Recent activity'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {lang === 'es'
                  ? 'La actividad del miembro se mostrara aqui'
                  : 'Member activity will be shown here'
                }
              </p>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Conexiones' : 'Connections'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {member.activity.totalConnections} {lang === 'es' ? 'conexiones' : 'connections'}
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
