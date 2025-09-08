import React, { useState, useEffect } from 'react';
import { useAuthContext} from '../../contexts/AuthContext';
import { useTranslations} from '../../hooks/useTranslations';
import type { 
  MentorshipSession, 
  MentorshipMatch,
  MentorProfile,
  MenteeProfile,
  FormState,
  ValidationError
} from '../../types';
import {
  getMentorshipSessions,
  createMentorshipSession,
  updateMentorshipSession,
  getUserMatches,
  getMentorProfile,
  getMenteeProfile
} from '../../lib/mentorship';

interface MentorshipSessionsProps {
  matchId?: string;
  sessionId?: string;
  mode: 'list' | 'create' | 'edit' | 'view';
  onSessionCreated?: (session: MentorshipSession) => void;
  onSessionUpdated?: (session: MentorshipSession) => void;
  onCancel?: () => void;
}

interface SessionFormData {
  title: string;
  description: string;
  scheduledAt: string; // ISO string
  duration: number;
  type: 'video' | 'voice' | 'in-person' | 'chat';
  meetingUrl: string;
  location: string;
  agenda: string[];
  notes: string;
  resources: {
    title: string;
    url: string;
    type: 'link' | 'document' | 'video' | 'other';
  }[];
  homework: {
    title: string;
    description: string;
    dueDate: string;
    completed: boolean;
  }[];
}

const SESSION_TYPES = [
  { value: 'video', icon: 'video', label: 'Video Call' },
  { value: 'voice', icon: 'phone', label: 'Voice Call' },
  { value: 'chat', icon: 'comments', label: 'Text Chat' },
  { value: 'in-person', icon: 'handshake', label: 'In Person' }
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }
];

const RESOURCE_TYPES = [
  { value: 'link', icon: 'link', label: 'Website/Link' },
  { value: 'document', icon: 'file-alt', label: 'Document' },
  { value: 'video', icon: 'play', label: 'Video' },
  { value: 'other', icon: 'paperclip', label: 'Other' }
];

export default function MentorshipSessions({ 
  matchId, 
  sessionId, 
  mode = 'list',
  onSessionCreated,
  onSessionUpdated,
  onCancel 
}: MentorshipSessionsProps) {
  const { user } = useAuthContext();
  const t = useTranslations();
  
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [currentSession, setCurrentSession] = useState<MentorshipSession | null>(null);
  const [matches, setMatches] = useState<MentorshipMatch[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<Map<string, MentorProfile>>(new Map());
  const [menteeProfiles, setMenteeProfiles] = useState<Map<string, MenteeProfile>>(new Map());
  
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    type: 'video',
    meetingUrl: '',
    location: '',
    agenda: [],
    notes: '',
    resources: [],
    homework: []
  });
  
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false
  });
  
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'match' | 'status'>('date');
  const [newAgendaItem, setNewAgendaItem] = useState('');
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    type: 'link' as const
  });
  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    dueDate: '',
    completed: false
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, matchId, sessionId]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load user's matches
      const userMatches = await getUserMatches(user.uid);
      setMatches(userMatches.filter(m => m.status === 'active'));
      
      // Load sessions
      let sessionsData: MentorshipSession[] = [];
      if(matchId) {
        sessionsData = await getMentorshipSessions({ matchId });
      } else if(sessionId) {
        sessionsData = await getMentorshipSessions({ sessionId });
        if (sessionsData.length > 0) {
          setCurrentSession(sessionsData?.[0]);
          populateForm(sessionsData?.[0]);
        }
      } else {
        sessionsData = await getMentorshipSessions({ userId: user.uid });
      }
      setSessions(sessionsData);
      
      // Load mentor and mentee profiles
      const mentorIds = new Set<string>();
      const menteeIds = new Set<string>();
      
      [...userMatches, ...sessionsData].forEach(item => {
        if ('mentorId' in item) {
          mentorIds.add(item.mentorId);
          menteeIds.add(item.menteeId);
        }
      });
      
      // Load profiles
      const mentorProfilesMap = new Map<string, MentorProfile>();
      const menteeProfilesMap = new Map<string, MenteeProfile>();
      
      await Promise.all([
        ...Array.from(mentorIds).map(async (id) => {
          try {
            const profile = await getMentorProfile(id);
            if (profile) mentorProfilesMap.set(id, profile);
          } catch (error) {
            console.error(`Error loading mentor profile ${id}:`, error);
          }
        }),
        ...Array.from(menteeIds).map(async (id) => {
          try {
            const profile = await getMenteeProfile(id);
            if (profile) menteeProfilesMap.set(id, profile);
          } catch (error) {
            console.error(`Error loading mentee profile ${id}:`, error);
          }
        })
      ]);
      
      setMentorProfiles(mentorProfilesMap);
      setMenteeProfiles(menteeProfilesMap);
      
    } catch (error) {
      console.error('Error loading sessions data:', error);
      setFormState(prev => ({
        ...prev,
        errors: [{ field: 'general', message: t.mentorship.sessions.errorLoading }]
      }));
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (session: MentorshipSession) => {
    setFormData({
      title: session.title,
      description: session.description || '',
      scheduledAt: new Date(session.scheduledAt).toISOString().slice(0, 16),
      duration: session.duration,
      type: session.type,
      meetingUrl: session.meetingUrl || '',
      location: session.location || '',
      agenda: session.agenda || [],
      notes: session.notes || '',
      resources: session.resources || [],
      homework: session.homework || []
    });
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!formData.title.trim()) {
      errors.push({ field: 'title', message: t.mentorship.sessions.validation.titleRequired });
    }
    
    if (!formData.scheduledAt) {
      errors.push({ field: 'scheduledAt', message: t.mentorship.sessions.validation.dateRequired });
    } else {
      const scheduledDate = new Date(formData.scheduledAt);
      if (scheduledDate <= new Date()) {
        errors.push({ field: 'scheduledAt', message: t.mentorship.sessions.validation.dateInFuture });
      }
    }
    
    if (formData.duration < 15) {
      errors.push({ field: 'duration', message: t.mentorship.sessions.validation.durationMinimum });
    }
    
    if (formData.type === 'video' && !formData.meetingUrl.trim()) {
      errors.push({ field: 'meetingUrl', message: t.mentorship.sessions.validation.urlRequired });
    }
    
    if (formData.type === 'in-person' && !formData.location.trim()) {
      errors.push({ field: 'location', message: t.mentorship.sessions.validation.locationRequired });
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !matchId) return;
    
    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [], success: false }));
    
    const errors = validateForm();
    if (errors.length > 0) {
      setFormState(prev => ({ ...prev, errors, isSubmitting: false }));
      return;
    }
    
    try {
      const sessionData: Partial<MentorshipSession> = {
        matchId: matchId,
        mentorId: '', // Will be filled from match data
        menteeId: '', // Will be filled from match data
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt: new Date(formData.scheduledAt),
        duration: formData.duration,
        type: formData['type'],
        meetingUrl: formData.meetingUrl || undefined,
        location: formData.location || undefined,
        agenda: formData.agenda.length > 0 ? formData.agenda : undefined,
        notes: formData.notes || undefined,
        resources: formData.resources.length > 0 ? formData.resources : undefined,
        homework: formData.homework.length > 0 ? formData.homework : undefined,
        status: 'scheduled',
        updatedAt: new Date()
      };
      
      let savedSession: MentorshipSession;
      
      if (mode === 'edit' && currentSession) {
        savedSession = await updateMentorshipSession(currentSession.id, sessionData);
        if(onSessionUpdated) {
          onSessionUpdated(savedSession);
        }
      } else {
        savedSession = await createMentorshipSession({
          ...sessionData,
          id: '', // Will be set by Firebase
          createdAt: new Date()
        } as MentorshipSession);
        if(onSessionCreated) {
          onSessionCreated(savedSession);
        }
      }
      
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        success: true,
        errors: []
      }));
      
      // Reload sessions
      await loadData();
      
    } catch (error) {
      console.error('Error saving session:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: [{ field: 'general', message: t.mentorship.sessions.errorSaving }]
      }));
    }
  };

  const addAgendaItem = () => {
    if (newAgendaItem.trim() && !formData.agenda.includes(newAgendaItem.trim())) {
      setFormData(prev => ({
        ...prev,
        agenda: [...prev.agenda, newAgendaItem.trim()]
      }));
      setNewAgendaItem('');
    }
  };

  const removeAgendaItem = (item: string) => {
    setFormData(prev => ({
      ...prev,
      agenda: prev.agenda.filter(a => a !== item)
    }));
  };

  const addResource = () => {
    if (newResource.title.trim() && newResource.url.trim()) {
      setFormData(prev => ({
        ...prev,
        resources: [...prev.resources, { ...newResource }]
      }));
      setNewResource({ title: '', url: '', type: 'link' });
    }
  };

  const removeResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const addHomework = () => {
    if (newHomework.title.trim() && newHomework.description.trim()) {
      setFormData(prev => ({
        ...prev,
        homework: [...prev.homework, { ...newHomework }]
      }));
      setNewHomework({ title: '', description: '', dueDate: '', completed: false });
    }
  };

  const removeHomework = (index: number) => {
    setFormData(prev => ({
      ...prev,
      homework: prev.homework.filter((_, i) => i !== index)
    }));
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];
    
    // Apply filter
    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(session => {
        switch(filter) {
          case 'upcoming':
            return session['status'] === 'scheduled' && new Date(session.scheduledAt) > now;
          case 'completed':
            return session['status'] === 'completed';
          case 'cancelled':
            return session['status'] === 'cancelled';
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date':
          return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
        case 'match':
          return a.matchId.localeCompare(b.matchId);
        case 'status':
          return a['status'].localeCompare(b['status']);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const getParticipantName = (session: MentorshipSession, role: 'mentor' | 'mentee') => {
    const profileId = role === 'mentor' ? session.mentorId : session.menteeId;
    const profile = role === 'mentor' 
      ? mentorProfiles.get(profileId)
      : menteeProfiles.get(profileId);
    
    return profile?.displayName || t.mentorship.sessions.unknownUser;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isUpcoming = (date: Date) => new Date(date) > new Date();

  if(loading) {
    return (
      <div className="mentorship-sessions loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>{t.mentorship.sessions.loading}</p>
        </div>
      </div>
    );
  }

  // Create/Edit form
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="session-form">
        <div className="form-header">
          <h1>
            {mode === 'create' 
              ? t.mentorship.sessions.createSession
              : t.mentorship.sessions.editSession
            }
          </h1>
        </div>
        
        {formState.errors.length > 0 && (
          <div className="form-errors">
            {formState.errors.map((error, index) => (
              <p key={index} className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                {error['message']}
              </p>
            ))}
          </div>
        )}
        
        {formState.success && (
          <div className="form-success">
            <p>
              <i className="fas fa-check-circle"></i>
              {mode === 'create' 
                ? t.mentorship.sessions.createSuccess
                : t.mentorship.sessions.updateSuccess
              }
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="session-form-content">
          {/* Basic Information */}
          <section className="form-section">
            <h2>{t.mentorship.sessions.basicInfo}</h2>
            
            <div className="form-group">
              <label htmlFor="title">
                {t.mentorship.sessions.title} *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  title: e.target.value 
                }))}
                placeholder={t.mentorship.sessions.titlePlaceholder}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">
                {t.mentorship.sessions.description}
              </label>
              <textarea
                id="description"
                value={formData['description']}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  description: e.target.value 
                }))}
                placeholder={t.mentorship.sessions.descriptionPlaceholder}
                rows={3}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="scheduledAt">
                  {t.mentorship.sessions.dateTime} *
                </label>
                <input
                  type="datetime-local"
                  id="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    scheduledAt: e.target.value 
                  }))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="duration">
                  {t.mentorship.sessions.duration} *
                </label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value) 
                  }))}
                  required
                >
                  {DURATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
          
          {/* Session Type */}
          <section className="form-section">
            <h2>{t.mentorship.sessions.sessionType}</h2>
            
            <div className="form-group">
              <label>{t.mentorship.sessions.meetingType} *</label>
              <div className="session-type-options">
                {SESSION_TYPES.map(type => (
                  <label key={type.value} className="session-type-item">
                    <input
                      type="radio"
                      name="sessionType"
                      value={type.value}
                      checked={formData['type'] === type.value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        type: e.target.value as SessionFormData['type']
                      }))}
                    />
                    <div className="session-type-content">
                      <i className={`fas fa-${type.icon}`}></i>
                      <span>{type.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {formData['type'] === 'video' && (
              <div className="form-group">
                <label htmlFor="meetingUrl">
                  {t.mentorship.sessions.meetingUrl} *
                </label>
                <input
                  type="url"
                  id="meetingUrl"
                  value={formData.meetingUrl}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    meetingUrl: e.target.value 
                  }))}
                  placeholder="https://zoom.us/j/123456789"
                  required={formData['type'] === 'video'}
                />
                <small>{t.mentorship.sessions.meetingUrlHelp}</small>
              </div>
            )}
            
            {formData.type === 'in-person' && (
              <div className="form-group">
                <label htmlFor="location">
                  {t.mentorship.sessions.location} *
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    location: e.target.value 
                  }))}
                  placeholder={t.mentorship.sessions.locationPlaceholder}
                  required={formData['type'] === 'in-person'}
                />
              </div>
            )}
          </section>
          
          {/* Agenda */}
          <section className="form-section">
            <h2>{t.mentorship.sessions.agenda}</h2>
            
            {formData.agenda.length > 0 && (
              <div className="agenda-list">
                {formData.agenda.map((item, index) => (
                  <div key={index} className="agenda-item">
                    <span className="item-number">{index + 1}.</span>
                    <span className="item-text">{item}</span>
                    <button
                      type="button"
                      onClick={() => removeAgendaItem(item)}
                      className="remove-item"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="add-agenda-form">
              <input
                type="text"
                placeholder={t.mentorship.sessions.addAgendaItem}
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAgendaItem())}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={addAgendaItem}
                disabled={!newAgendaItem.trim()}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </section>
          
          {/* Resources */}
          <section className="form-section">
            <h2>{t.mentorship.sessions.resources}</h2>
            
            {formData.resources.length > 0 && (
              <div className="resources-list">
                {formData.resources.map((resource, index) => (
                  <div key={index} className="resource-item">
                    <div className="resource-info">
                      <i className={`fas fa-${RESOURCE_TYPES.find(t => t.value === resource.type)?.icon}`}></i>
                      <span className="resource-title">{resource.title}</span>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="resource-url">
                        {resource.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeResource(index)}
                      className="remove-item"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="add-resource-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder={t.mentorship.sessions.resourceTitle}
                  value={newResource.title}
                  onChange={(e) => setNewResource(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                />
                <input
                  type="url"
                  placeholder={t.mentorship.sessions.resourceUrl}
                  value={newResource.url}
                  onChange={(e) => setNewResource(prev => ({ 
                    ...prev, 
                    url: e.target.value 
                  }))}
                />
                <select
                  value={newResource['type']}
                  onChange={(e) => setNewResource(prev => ({ 
                    ...prev, 
                    type: e.target.value as typeof newResource['type']
                  }))}
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addResource}
                  disabled={!newResource.title.trim() || !newResource.url.trim()}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </section>
          
          {/* Notes */}
          <section className="form-section">
            <h2>{t.mentorship.sessions.notes}</h2>
            
            <div className="form-group">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  notes: e.target.value 
                }))}
                placeholder={t.mentorship.sessions.notesPlaceholder}
                rows={4}
              />
            </div>
          </section>
          
          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={formState.isSubmitting}
            >
              {t.common.cancel}
            </button>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {t.common.saving}
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  {mode === 'create' ? t.common.create : t.common.save}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Sessions list view
  return (
    <div className="mentorship-sessions">
      <div className="sessions-header">
        <div className="header-content">
          <h1>{t.mentorship.sessions.title}</h1>
          <p>{t.mentorship.sessions.description}</p>
        </div>
        
        <div className="header-actions">
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i>
            {t.mentorship.sessions.scheduleNew}
          </button>
        </div>
      </div>
      
      {/* Filters and Controls */}
      <div className="sessions-controls">
        <div className="filters">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="all">{t.mentorship.sessions.allSessions}</option>
            <option value="upcoming">{t.mentorship.sessions.upcoming}</option>
            <option value="completed">{t.mentorship.sessions.completed}</option>
            <option value="cancelled">{t.mentorship.sessions.cancelled}</option>
          </select>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="date">{t.mentorship.sessions.sortByDate}</option>
            <option value="match">{t.mentorship.sessions.sortByMatch}</option>
            <option value="status">{t.mentorship.sessions.sortByStatus}</option>
          </select>
        </div>
        
        <div className="view-stats">
          <span>{t.mentorship.sessions.showing} {getFilteredSessions().length} {t.mentorship.sessions.sessions}</span>
        </div>
      </div>
      
      {/* Sessions List */}
      <div className="sessions-list">
        {getFilteredSessions().length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar fa-3x"></i>
            <h3>{t.mentorship.sessions.noSessions}</h3>
            <p>{t.mentorship.sessions.noSessionsDescription}</p>
            <button className="btn btn-primary">
              <i className="fas fa-plus"></i>
              {t.mentorship.sessions.scheduleFirst}
            </button>
          </div>
        ) : (
          getFilteredSessions().map(session => (
            <div key={session.id} className={`session-card ${session.status}`}>
              <div className="session-header">
                <div className="session-info">
                  <h3>{session.title}</h3>
                  <span className={`session-status ${session['status']}`}>
                    {t.mentorship.sessions.status[session['status']]}
                  </span>
                </div>
                
                <div className="session-actions">
                  {isUpcoming(session.scheduledAt) && session['status'] === 'scheduled' && (
                    <button className="btn btn-primary btn-sm">
                      <i className="fas fa-play"></i>
                      {t.mentorship.sessions.join}
                    </button>
                  )}
                  
                  <button className="btn btn-outline btn-sm">
                    <i className="fas fa-edit"></i>
                    {t.mentorship.sessions.edit}
                  </button>
                  
                  <button className="btn btn-ghost btn-sm">
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                </div>
              </div>
              
              <div className="session-details">
                <div className="session-time">
                  <i className="fas fa-clock"></i>
                  <span>{new Date(session.scheduledAt).toLocaleString()}</span>
                  <span className="duration">({formatDuration(session.duration)})</span>
                </div>
                
                <div className="session-participants">
                  <span className="mentor">
                    <i className="fas fa-user-tie"></i>
                    {getParticipantName(session, 'mentor')}
                  </span>
                  <span className="mentee">
                    <i className="fas fa-user-graduate"></i>
                    {getParticipantName(session, 'mentee')}
                  </span>
                </div>
                
                <div className="session-type">
                  <i className={`fas fa-${SESSION_TYPES.find(t => t.value === session['type'])?.icon}`}></i>
                  <span>{SESSION_TYPES.find(t => t.value === session.type)?.label}</span>
                </div>
                
                {session['description'] && (
                  <p className="session-description">{session['description']}</p>
                )}
                
                {session.agenda && session.agenda.length > 0 && (
                  <div className="session-agenda">
                    <h4>{t.mentorship.sessions.agenda}</h4>
                    <ul>
                      {session.agenda.slice(0, 3).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                      {session.agenda.length > 3 && (
                        <li className="agenda-more">+{session.agenda.length - 3} {t.mentorship.sessions.moreItems}</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {session.resources && session.resources.length > 0 && (
                  <div className="session-resources">
                    <h4>{t.mentorship.sessions.resources}</h4>
                    <div className="resources-preview">
                      {session.resources.slice(0, 2).map((resource, index) => (
                        <a 
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resource-link"
                        >
                          <i className={`fas fa-${RESOURCE_TYPES.find(t => t.value === resource.type)?.icon}`}></i>
                          {resource.title}
                        </a>
                      ))}
                      {session.resources.length > 2 && (
                        <span className="resources-more">+{session.resources.length - 2} {t.mentorship.sessions.more}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {session.homework && session.homework.length > 0 && (
                  <div className="session-homework">
                    <h4>{t.mentorship.sessions.homework}</h4>
                    <div className="homework-preview">
                      {session.homework.slice(0, 2).map((hw, index) => (
                        <div key={index} className={`homework-item ${hw.completed ? 'completed' : ''}`}>
                          <i className={`fas fa-${hw.completed ? 'check-circle' : 'circle'}`}></i>
                          <span>{hw.title}</span>
                        </div>
                      ))}
                      {session.homework.length > 2 && (
                        <span className="homework-more">+{session.homework.length - 2} {t.mentorship.sessions.more}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}