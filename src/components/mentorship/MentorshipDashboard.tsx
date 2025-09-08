import React, { useState, useEffect } from 'react';
import { useAuthContext} from '../../contexts/AuthContext';
import { useTranslations} from '../../hooks/useTranslations';
import type { 
  MentorProfile, 
  MenteeProfile, 
  MentorshipMatch, 
  MentorshipSession,
  MentorshipStats,
  User
} from '../../types';
import {
  getMentorProfile, 
  getMenteeProfile, 
  getUserMatches, 
  getUpcomingSessions,
  getMentorshipStats 
} from '../../lib/mentorship';

interface MentorshipDashboardProps {
  userRole: 'mentor' | 'mentee' | 'both';
}

interface DashboardStats {
  activeMatches: number;
  completedSessions: number;
  upcomingSessions: number;
  averageRating: number;
}

export default function MentorshipDashboard({ userRole }: MentorshipDashboardProps) {
  const { user } = useAuthContext();
  const t = useTranslations();
  
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null);
  const [menteeProfile, setMenteeProfile] = useState<MenteeProfile | null>(null);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<MentorshipSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeMatches: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    averageRating: 0
  });
  const [globalStats, setGlobalStats] = useState<MentorshipStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'sessions' | 'profile'>('overview');

  useEffect(() => {
    if (!user) return;
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load profiles based on user role
        const promises: Promise<any>[] = [];
        
        if (userRole === 'mentor' || userRole === 'both') {
          promises.push(getMentorProfile(user.uid));
        }
        
        if (userRole === 'mentee' || userRole === 'both') {
          promises.push(getMenteeProfile(user.uid));
        }
        
        promises.push(getUserMatches(user.uid));
        promises.push(getUpcomingSessions(user.uid));
        promises.push(getMentorshipStats());
        
        const results = await Promise.all(promises);
        
        let resultIndex = 0;
        
        if (userRole === 'mentor' || userRole === 'both') {
          setMentorProfile(results[resultIndex] || null);
          resultIndex++;
        }
        
        if (userRole === 'mentee' || userRole === 'both') {
          setMenteeProfile(results[resultIndex] || null);
          resultIndex++;
        }
        
        const userMatches = results[resultIndex] || [];
        const sessions = results[resultIndex + 1] || [];
        const globalStatsData = results[resultIndex + 2] || null;
        
        setMatches(userMatches);
        setUpcomingSessions(sessions);
        setGlobalStats(globalStatsData);
        
        // Calculate user stats
        const activeMatches = userMatches.filter((m: MentorshipMatch) => m.status === 'active').length;
        const completedSessions = userMatches.reduce((total: number, match: MentorshipMatch) => {
          // This would be calculated from actual session data
          return total;
        }, 0);
        
        setStats({
          activeMatches,
          completedSessions,
          upcomingSessions: sessions.length,
          averageRating: userRole === 'mentor' ? (mentorProfile?.rating || 0) : 0
        });
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user, userRole]);

  if(loading) {
    return (
      <div className="mentorship-dashboard loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mentorship-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>{t.mentorship.dashboard.title}</h1>
          <p>{t.mentorship.dashboard.welcome}</p>
        </div>
        
        {/* Quick Actions */}
        <div className="quick-actions">
          {userRole === 'mentee' || userRole === 'both' ? (
            <button 
              className="btn btn-primary"
              onClick={() => setActiveTab('matches')}
            >
              <i className="fas fa-search"></i>
              {t.mentorship.dashboard.findMentor}
            </button>
          ) : null}
          
          {userRole === 'mentor' || userRole === 'both' ? (
            <button 
              className="btn btn-secondary"
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user-edit"></i>
              {t.mentorship.dashboard.editProfile}
            </button>
          ) : null}
          
          <button 
            className="btn btn-outline"
            onClick={() => setActiveTab('sessions')}
          >
            <i className="fas fa-calendar-plus"></i>
            {t.mentorship.dashboard.scheduleSession}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-line"></i>
          {t.mentorship.dashboard.overview}
        </button>
        
        <button 
          className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <i className="fas fa-users"></i>
          {t.mentorship.dashboard.matches}
          {matches.filter(m => m['status'] === 'pending').length > 0 && (
            <span className="badge">{matches.filter(m => m['status'] === 'pending').length}</span>
          )}
        </button>
        
        <button 
          className={`nav-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <i className="fas fa-calendar"></i>
          {t.mentorship.dashboard.sessions}
          {upcomingSessions.length > 0 && (
            <span className="badge">{upcomingSessions.length}</span>
          )}
        </button>
        
        <button 
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user"></i>
          {t.mentorship.dashboard.profile}
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-handshake"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.activeMatches}</h3>
                  <p>{t.mentorship.dashboard.activeMatches}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-video"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.completedSessions}</h3>
                  <p>{t.mentorship.dashboard.completedSessions}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="stat-content">
                  <h3>{stats.upcomingSessions}</h3>
                  <p>{t.mentorship.dashboard.upcomingSessions}</p>
                </div>
              </div>
              
              {userRole === 'mentor' && (
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-star"></i>
                  </div>
                  <div className="stat-content">
                    <h3>{stats.averageRating.toFixed(1)}</h3>
                    <p>{t.mentorship.dashboard.averageRating}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="recent-activity">
              <h2>{t.mentorship.dashboard.recentActivity}</h2>
              
              {/* Pending Matches */}
              {matches.filter(m => m['status'] === 'pending').length > 0 && (
                <div className="activity-section">
                  <h3>{t.mentorship.dashboard.pendingRequests}</h3>
                  <div className="activity-list">
                    {matches
                      .filter(m => m['status'] === 'pending')
                      .slice(0, 3)
                      .map(match => (
                        <div key={match.id} className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-clock"></i>
                          </div>
                          <div className="activity-content">
                            <p>
                              {userRole === 'mentor' 
                                ? t.mentorship.dashboard.newMenteeRequest
                                : t.mentorship.dashboard.mentorRequestPending
                              }
                            </p>
                            <span className="activity-time">
                              {new Date(match['createdAt']).toLocaleDateString()}
                            </span>
                          </div>
                          <button className="btn btn-sm btn-primary">
                            {t.mentorship.dashboard.view}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Upcoming Sessions */}
              {upcomingSessions.length > 0 && (
                <div className="activity-section">
                  <h3>{t.mentorship.dashboard.upcomingSessions}</h3>
                  <div className="activity-list">
                    {upcomingSessions.slice(0, 3).map(session => (
                      <div key={session.id} className="activity-item">
                        <div className="activity-icon">
                          <i className="fas fa-video"></i>
                        </div>
                        <div className="activity-content">
                          <p>{session.title}</p>
                          <span className="activity-time">
                            {new Date(session.scheduledAt).toLocaleString()}
                          </span>
                        </div>
                        <button className="btn btn-sm btn-outline">
                          {t.mentorship.dashboard.join}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Global Statistics */}
            {globalStats && (
              <div className="global-stats">
                <h2>{t.mentorship.dashboard.programStats}</h2>
                <div className="stats-grid">
                  <div className="stat-card secondary">
                    <h3>{globalStats.totalMentors}</h3>
                    <p>{t.mentorship.dashboard.totalMentors}</p>
                  </div>
                  <div className="stat-card secondary">
                    <h3>{globalStats.totalMentees}</h3>
                    <p>{t.mentorship.dashboard.totalMentees}</p>
                  </div>
                  <div className="stat-card secondary">
                    <h3>{globalStats.activeMatches}</h3>
                    <p>{t.mentorship.dashboard.globalActiveMatches}</p>
                  </div>
                  <div className="stat-card secondary">
                    <h3>{(globalStats.successRate * 100).toFixed(1)}%</h3>
                    <p>{t.mentorship.dashboard.successRate}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="matches-section">
            <h2>{t.mentorship.dashboard.yourMatches}</h2>
            
            {matches.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-users fa-3x"></i>
                <h3>{t.mentorship.dashboard.noMatches}</h3>
                <p>{t.mentorship.dashboard.noMatchesDescription}</p>
                <button className="btn btn-primary">
                  {userRole === 'mentee' 
                    ? t.mentorship.dashboard.findMentor
                    : t.mentorship.dashboard.becomeMentor
                  }
                </button>
              </div>
            ) : (
              <div className="matches-list">
                {matches.map(match => (
                  <div key={match.id} className={`match-card ${match.status}`}>
                    <div className="match-header">
                      <div className="match-info">
                        <h3>
                          {userRole === 'mentor' 
                            ? t.mentorship.dashboard.menteeMatch
                            : t.mentorship.dashboard.mentorMatch
                          }
                        </h3>
                        <span className={`status-badge ${match.status}`}>
                          {t.mentorship.status[match['status']]}
                        </span>
                      </div>
                      <div className="match-score">
                        <span className="score">{Math.round(match.matchScore * 100)}%</span>
                        <span className="label">{t.mentorship.dashboard.compatibility}</span>
                      </div>
                    </div>
                    
                    <div className="match-content">
                      <div className="match-goals">
                        <h4>{t.mentorship.dashboard.goals}</h4>
                        <ul>
                          {match.goals.slice(0, 3).map((goal, index) => (
                            <li key={index}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="match-frequency">
                        <span>
                          <i className="fas fa-clock"></i>
                          {t.mentorship.frequency[match.meetingFrequency]}
                        </span>
                        <span>
                          <i className="fas fa-comments"></i>
                          {t.mentorship.communication[match.communicationPreference]}
                        </span>
                      </div>
                    </div>
                    
                    <div className="match-actions">
                      {match['status'] === 'pending' && (
                        <>
                          <button className="btn btn-primary">
                            {userRole === 'mentor' 
                              ? t.mentorship.dashboard.acceptRequest
                              : t.mentorship.dashboard.viewRequest
                            }
                          </button>
                          {userRole === 'mentor' && (
                            <button className="btn btn-outline">
                              {t.mentorship.dashboard.declineRequest}
                            </button>
                          )}
                        </>
                      )}
                      
                      {match['status'] === 'active' && (
                        <>
                          <button className="btn btn-primary">
                            {t.mentorship.dashboard.scheduleSession}
                          </button>
                          <button className="btn btn-outline">
                            {t.mentorship.dashboard.sendMessage}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <h2>{t.mentorship.dashboard.upcomingSessions}</h2>
            
            {upcomingSessions.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-calendar fa-3x"></i>
                <h3>{t.mentorship.dashboard.noSessions}</h3>
                <p>{t.mentorship.dashboard.noSessionsDescription}</p>
                <button className="btn btn-primary">
                  {t.mentorship.dashboard.scheduleSession}
                </button>
              </div>
            ) : (
              <div className="sessions-list">
                {upcomingSessions.map(session => (
                  <div key={session.id} className="session-card">
                    <div className="session-header">
                      <h3>{session.title}</h3>
                      <span className={`session-type ${session['type']}`}>
                        <i className={`fas fa-${session['type'] === 'video' ? 'video' : 
                          session['type'] === 'voice' ? 'phone' : 
                          session['type'] === 'chat' ? 'comments' : 'map-marker'}`}></i>
                        {t.mentorship.sessionType[session['type']]}
                      </span>
                    </div>
                    
                    <div className="session-details">
                      <div className="session-time">
                        <i className="fas fa-clock"></i>
                        <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                        <span className="duration">({session.duration} {t.mentorship.dashboard.minutes})</span>
                      </div>
                      
                      {session.description && (
                        <p className="session-description">{session['description']}</p>
                      )}
                      
                      {session.agenda && session.agenda.length > 0 && (
                        <div className="session-agenda">
                          <h4>{t.mentorship.dashboard.agenda}</h4>
                          <ul>
                            {session.agenda.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="session-actions">
                      <button className="btn btn-primary">
                        <i className="fas fa-play"></i>
                        {t.mentorship.dashboard.joinSession}
                      </button>
                      <button className="btn btn-outline">
                        <i className="fas fa-edit"></i>
                        {t.mentorship.dashboard.editSession}
                      </button>
                      <button className="btn btn-ghost">
                        <i className="fas fa-times"></i>
                        {t.mentorship.dashboard.cancelSession}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>{t.mentorship.dashboard.yourProfile}</h2>
            
            {(userRole === 'mentor' || userRole === 'both') && mentorProfile && (
              <div className="profile-card mentor">
                <div className="profile-header">
                  <h3>{t.mentorship.dashboard.mentorProfile}</h3>
                  <button className="btn btn-outline">
                    <i className="fas fa-edit"></i>
                    {t.mentorship.dashboard.editProfile}
                  </button>
                </div>
                
                <div className="profile-content">
                  <div className="profile-avatar">
                    {mentorProfile.profileImage ? (
                      <img src={mentorProfile.profileImage} alt={mentorProfile.displayName} />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>
                  
                  <div className="profile-details">
                    <h4>{mentorProfile.displayName}</h4>
                    <p className="profile-title">
                      {mentorProfile.experience.currentPosition} at {mentorProfile.experience.currentCompany}
                    </p>
                    <p className="profile-bio">{mentorProfile.bio}</p>
                    
                    <div className="profile-stats">
                      <div className="stat">
                        <span className="value">{mentorProfile.rating.toFixed(1)}</span>
                        <span className="label">{t.mentorship.dashboard.rating}</span>
                      </div>
                      <div className="stat">
                        <span className="value">{mentorProfile.totalSessions}</span>
                        <span className="label">{t.mentorship.dashboard.sessions}</span>
                      </div>
                      <div className="stat">
                        <span className="value">{mentorProfile.currentMentees}/{mentorProfile.maxMentees}</span>
                        <span className="label">{t.mentorship.dashboard.mentees}</span>
                      </div>
                    </div>
                    
                    <div className="profile-skills">
                      <h5>{t.mentorship.dashboard.expertise}</h5>
                      <div className="skills-list">
                        {mentorProfile.expertiseAreas.slice(0, 5).map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {(userRole === 'mentee' || userRole === 'both') && menteeProfile && (
              <div className="profile-card mentee">
                <div className="profile-header">
                  <h3>{t.mentorship.dashboard.menteeProfile}</h3>
                  <button className="btn btn-outline">
                    <i className="fas fa-edit"></i>
                    {t.mentorship.dashboard.editProfile}
                  </button>
                </div>
                
                <div className="profile-content">
                  <div className="profile-avatar">
                    {menteeProfile.profileImage ? (
                      <img src={menteeProfile.profileImage} alt={menteeProfile.displayName} />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>
                  
                  <div className="profile-details">
                    <h4>{menteeProfile.displayName}</h4>
                    <p className="profile-level">
                      {t.mentorship.level[menteeProfile.currentLevel]} - {menteeProfile.background.yearsOfExperience} {t.mentorship.dashboard.yearsExperience}
                    </p>
                    <p className="profile-bio">{menteeProfile.bio}</p>
                    
                    <div className="profile-goals">
                      <h5>{t.mentorship.dashboard.goals}</h5>
                      <ul>
                        {menteeProfile.goals.slice(0, 3).map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="profile-interests">
                      <h5>{t.mentorship.dashboard.interests}</h5>
                      <div className="interests-list">
                        {menteeProfile.interests.slice(0, 5).map((interest, index) => (
                          <span key={index} className="interest-tag">{interest}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!mentorProfile && !menteeProfile && (
              <div className="empty-state">
                <i className="fas fa-user-plus fa-3x"></i>
                <h3>{t.mentorship.dashboard.noProfile}</h3>
                <p>{t.mentorship.dashboard.noProfileDescription}</p>
                <div className="profile-actions">
                  <button className="btn btn-primary">
                    {t.mentorship.dashboard.createMentorProfile}
                  </button>
                  <button className="btn btn-secondary">
                    {t.mentorship.dashboard.createMenteeProfile}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}