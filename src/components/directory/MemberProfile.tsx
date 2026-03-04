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
  PencilIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import type { MemberProfile as MemberProfileType, ProjectShowcase, Achievement, Certification } from '@/types/member';
import type { UserBasicInfo } from '@/types/user';

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
      return lang === 'es' ? 'En línea ahora' : 'Online now';
    } else if (hours < 24) {
      return lang === 'es' ? `Activo hace ${hours} horas` : `Active ${hours} hours ago`;
    } else if (days < 7) {
      return lang === 'es' ? `Activo hace ${days} días` : `Active ${days} days ago`;
    } else {
      return lang === 'es' ? `Último acceso ${formatJoinDate(date)}` : `Last seen ${formatJoinDate(date)}`;
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
      id: 'about', 
      label: lang === 'es' ? 'Acerca de' : 'About',
      icon: UsersIcon
    },
    { 
      id: 'portfolio', 
      label: lang === 'es' ? 'Portafolio' : 'Portfolio',
      icon: CodeBracketIcon
    },
    { 
      id: 'activity', 
      label: lang === 'es' ? 'Actividad' : 'Activity',
      icon: ChartBarIcon
    },
    { 
      id: 'connections', 
      label: lang === 'es' ? 'Conexiones' : 'Connections',
      icon: UsersIcon
    }
  ];

  if (!visibility.canViewProfile) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {lang === 'es' ? 'Perfil privado' : 'Private profile'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {lang === 'es'
              ? 'Este miembro ha restringido la visibilidad de su perfil.'
              : 'This member has restricted their profile visibility.'}
          </p>
          {visibility.allowConnectionRequests && currentUser && !isOwnProfile && connectionStatus === 'none' && (
            <button
              onClick={handleConnect}
              disabled={connectLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <UserPlusIcon className="h-4 w-4 mr-2 inline" />
              {lang === 'es' ? 'Enviar solicitud de conexion' : 'Send connection request'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Cover photo area */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-secondary-500 relative">
          {isOwnProfile && (
            <button className="absolute top-4 right-4 p-2 bg-black/20 text-white rounded-lg hover:bg-black/30 transition-colors">
              <CameraIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between -mt-16">
            {/* Avatar and basic info */}
            <div className="flex flex-col lg:flex-row lg:items-end space-y-4 lg:space-y-0 lg:space-x-6">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-3xl border-4 border-white dark:border-gray-800">
                  {member.initials}
                </div>
                {visibility.showOnlineStatus && (
                  <div className={`absolute bottom-2 right-2 h-8 w-8 rounded-full border-4 border-white dark:border-gray-800 ${
                    member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                )}
                {isOwnProfile && (
                  <button className="absolute bottom-0 right-0 p-1 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
                    <CameraIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {member.displayName}
                  </h1>
                  {member.role === 'collaborator' && (
                    <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                      {lang === 'es' ? 'Colaborador' : 'Collaborator'}
                    </span>
                  )}
                  {member.isPremium && (
                    <StarIcon className="h-6 w-6 text-yellow-500 fill-current" title="Premium member" />
                  )}
                  {member?.portfolio?.certifications.some(c => c.verified) && (
                    <CheckBadgeIcon className="h-6 w-6 text-blue-500" title="Verified certifications" />
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

                <div className="flex flex-wrap items-center justify-center lg:justify-start space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {visibility.showLocation && (
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {member.profile.location}
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {lang === 'es' ? 'Miembro desde' : 'Member since'} {formatJoinDate(member.joinedAt)}
                  </div>
                  {visibility.showLastSeen && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatLastSeen(member.lastSeen)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col space-y-2 mt-4 lg:mt-0">
              {isOwnProfile ? (
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {lang === 'es' ? 'Editar perfil' : 'Edit profile'}
                </button>
              ) : currentUser && (
                <div className="flex space-x-2">
                  {visibility.allowConnectionRequests && connectionStatus !== 'connected' && (
                    <button
                      onClick={handleConnect}
                      disabled={connectLoading || connectionStatus === 'pending'}
                      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        connectionStatus === 'pending'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                    >
                      <UserPlusIcon className="h-4 w-4 mr-2" />
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
                      onClick={() => setShowMessageModal(true)}
                      className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
                    >
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-2" />
                      {lang === 'es' ? 'Mensaje' : 'Message'}
                    </button>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isFollowing
                        ? 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/30'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600 dark:hover:text-pink-400'
                    }`}
                  >
                    {isFollowing ? (
                      <HeartSolidIcon className="h-4 w-4 mr-1 text-pink-500" />
                    ) : (
                      <HeartIcon className="h-4 w-4 mr-1" />
                    )}
                    {isFollowing
                      ? (lang === 'es' ? 'Dejar de seguir' : 'Unfollow')
                      : (lang === 'es' ? 'Seguir' : 'Follow')}
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={copied ? (lang === 'es' ? 'Copiado!' : 'Copied!') : (lang === 'es' ? 'Compartir perfil' : 'Share profile')}
                >
                  {copied ? (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">{lang === 'es' ? 'Copiado!' : 'Copied!'}</span>
                  ) : (
                    <ShareIcon className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={downloadVCard}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title={lang === 'es' ? 'Descargar contacto' : 'Download contact'}
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats — only show if any are non-zero */}
          {(member.activity.totalConnections > 0 || member.activity.profileViews > 0 || member.activity.reputation > 0 || member.activity.postsCount > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {member.activity.totalConnections}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Conexiones' : 'Connections'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {member.activity.profileViews}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Vistas del perfil' : 'Profile views'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {member.activity.reputation}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Reputacion' : 'Reputation'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {member.activity.postsCount}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? 'Publicaciones' : 'Posts'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* Bio */}
            {member.profile.bio && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Acerca de' : 'About'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {member.profile.bio}
                </p>
              </div>
            )}

            {/* Education */}
            {(member.profile.graduationYear || member.profile.degree) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Formacion Academica' : 'Education'}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <AcademicCapIcon className="h-5 w-5 text-primary-500" />
                  <span>
                    {member.profile.graduationYear && `Gen. ${member.profile.graduationYear}`}
                    {member.profile.graduationYear && member.profile.degree && ' — '}
                    {member.profile.degree}
                  </span>
                </div>
              </div>
            )}

            {/* Experience */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {lang === 'es' ? 'Experiencia' : 'Experience'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {member.experience.years} {lang === 'es' ? 'años de experiencia' : 'years of experience'}
                </div>
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                  {getExperienceLevelLabel(member.experience.level)}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {lang === 'es' ? 'Habilidades' : 'Skills'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {member.profile.skills.map(skill => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Work Experience */}
            {member.experience.previousRoles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Experiencia Laboral' : 'Work Experience'}
                </h3>
                <div className="space-y-4">
                  {member.experience.previousRoles.map(role => (
                    <div key={role.id} className="border-l-2 border-primary-200 dark:border-primary-800 pl-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {role.position}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        {role.company}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {role.startDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')} - {
                          role.current 
                            ? (lang === 'es' ? 'Presente' : 'Present')
                            : role?.endDate?.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')
                        }
                      </p>
                      {role['description'] && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {role['description']}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {(member.social.linkedin || member.social.github || member.social.portfolio) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {lang === 'es' ? 'Enlaces' : 'Links'}
                </h3>
                <div className="space-y-2">
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  )}
                  {member.social.github && (
                    <a
                      href={member.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <CodeBracketIcon className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  )}
                  {member.social.portfolio && (
                    <a
                      href={member.social.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-2" />
                      {lang === 'es' ? 'Portafolio' : 'Portfolio'}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            {/* Projects */}
            {member?.portfolio?.projects && member.portfolio.projects.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Proyectos' : 'Projects'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {member.portfolio.projects.map(project => (
                    <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      {project.imageUrl && (
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {project.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {project['description']}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.technologies.map(tech => (
                          <span
                            key={tech}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          >
                            GitHub
                          </a>
                        )}
                        {project.liveUrl && (
                          <a
                            href={project.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                          >
                            {lang === 'es' ? 'Ver en vivo' : 'Live demo'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {member?.portfolio?.achievements && member.portfolio.achievements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Logros' : 'Achievements'}
                </h3>
                <div className="space-y-3">
                  {member.portfolio.achievements.map(achievement => (
                    <div key={achievement.id} className="flex items-start space-x-3">
                      <TrophyIcon className="h-6 w-6 text-yellow-500 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {achievement.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {achievement['description']}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {achievement.earnedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {member?.portfolio?.certifications && member.portfolio.certifications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {lang === 'es' ? 'Certificaciones' : 'Certifications'}
                </h3>
                <div className="space-y-3">
                  {member.portfolio.certifications.map(cert => (
                    <div key={cert.id} className="flex items-start space-x-3">
                      <AcademicCapIcon className="h-6 w-6 text-blue-500 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              {cert['name']}
                              {cert.verified && (
                                <CheckBadgeIcon className="h-4 w-4 text-blue-500 ml-1" />
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {cert.issuer}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {cert.issueDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                              {cert.expiryDate && (
                                <> - {cert.expiryDate.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}</>
                              )}
                            </p>
                          </div>
                          {cert.credentialUrl && (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                            >
                              {lang === 'es' ? 'Ver' : 'View'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!member?.portfolio?.projects?.length && !member?.portfolio?.achievements?.length && !member?.portfolio?.certifications?.length) && (
              <div className="text-center py-8">
                <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Sin portafolio' : 'No portfolio'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Este miembro aún no ha agregado proyectos a su portafolio'
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
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Actividad reciente' : 'Recent activity'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {lang === 'es' 
                  ? 'La actividad del miembro se mostrará aquí'
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
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {lang === 'es' ? 'Conexiones' : 'Connections'}
              </h3>
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
    </div>
  );
};

export default MemberProfile;