import React, { useState, useEffect } from 'react';
import { useAuthContext} from '../../contexts/AuthContext';
import { useTranslations} from '../../hooks/useTranslations';
import type { MentorProfile, FormState, ValidationError  } from '@/types/mentorship';
import {
  getMentorProfile, 
  createMentorProfile, 
  updateMentorProfile,
  uploadProfileImage 
} from '../../lib/mentorship';

interface MentorProfileProps {
  userId?: string;
  mode: 'view' | 'edit' | 'create';
  onSave?: (profile: MentorProfile) => void;
  onCancel?: () => void;
}

interface MentorProfileForm {
  displayName: string;
  bio: string;
  expertiseAreas: string[];
  skills: string[];
  experience: {
    yearsInField: number;
    currentPosition: string;
    currentCompany: string;
    previousRoles: {
      title: string;
      company: string;
      duration: string;
    }[];
  };
  availability: {
    hoursPerWeek: number;
    preferredDays: string[];
    timezone: string;
    preferredMeetingTimes: string[];
  };
  mentorshipStyle: string[];
  maxMentees: number;
  languages: string[];
}

const EXPERTISE_AREAS = [
  'Machine Learning',
  'Data Engineering',
  'Data Visualization',
  'Statistical Analysis',
  'Deep Learning',
  'Natural Language Processing',
  'Computer Vision',
  'Business Intelligence',
  'Data Architecture',
  'Cloud Computing',
  'Python Programming',
  'R Programming',
  'SQL',
  'Big Data',
  'Analytics Strategy'
];

const MENTORSHIP_STYLES = [
  'Structured Learning',
  'Project-Based',
  'Career Guidance',
  'Technical Deep-Dives',
  'Problem Solving',
  'Industry Insights',
  'Skill Development',
  'Leadership Development'
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const MEETING_TIMES = [
  'Early Morning (6-9 AM)',
  'Morning (9-12 PM)',
  'Afternoon (12-5 PM)',
  'Evening (5-8 PM)',
  'Night (8-11 PM)'
];

const LANGUAGES = [
  'Spanish',
  'English',
  'Portuguese',
  'French',
  'German',
  'Italian',
  'Chinese',
  'Japanese'
];

export default function MentorProfile({ 
  userId, 
  mode = 'view', 
  onSave, 
  onCancel 
}: MentorProfileProps) {
  const { user } = useAuthContext();
  const t = useTranslations();
  
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [formData, setFormData] = useState<MentorProfileForm>({
    displayName: '',
    bio: '',
    expertiseAreas: [],
    skills: [],
    experience: {
      yearsInField: 0,
      currentPosition: '',
      currentCompany: '',
      previousRoles: []
    },
    availability: {
      hoursPerWeek: 2,
      preferredDays: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferredMeetingTimes: []
    },
    mentorshipStyle: [],
    maxMentees: 3,
    languages: ['Spanish']
  });
  
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false
  });
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState({
    title: '',
    company: '',
    duration: ''
  });

  const targetUserId = userId || user?.uid;

  useEffect(() => {
    if (targetUserId && mode !== 'create') {
      loadProfile();
    }
  }, [targetUserId, mode]);

  const loadProfile = async () => {
    if (!targetUserId) return;
    
    try {
      const profileData = await getMentorProfile(targetUserId);
      if(profileData) {
        setProfile(profileData);
        setFormData({
          displayName: profileData.displayName,
          bio: profileData.bio,
          expertiseAreas: profileData.expertiseAreas,
          skills: profileData.skills,
          experience: profileData.experience,
          availability: profileData.availability,
          mentorshipStyle: profileData.mentorshipStyle,
          maxMentees: profileData.maxMentees,
          languages: profileData.languages
        });
        setImagePreview(profileData.profileImage || '');
      }
    } catch (error) {
      console.error('Error loading mentor profile:', error);
      setFormState(prev => ({
        ...prev,
        errors: [{ field: 'general', message: t.mentorship.errors.loadProfile }]
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e?.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!formData.displayName.trim()) {
      errors.push({ field: 'displayName', message: t.mentorship.validation.displayNameRequired });
    }
    
    if (!formData.bio.trim() || formData.bio.length < 50) {
      errors.push({ field: 'bio', message: t.mentorship.validation.bioMinLength });
    }
    
    if (formData.expertiseAreas.length === 0) {
      errors.push({ field: 'expertiseAreas', message: t.mentorship.validation.expertiseRequired });
    }
    
    if (!formData.experience.currentPosition.trim()) {
      errors.push({ field: 'currentPosition', message: t.mentorship.validation.positionRequired });
    }
    
    if (!formData.experience.currentCompany.trim()) {
      errors.push({ field: 'currentCompany', message: t.mentorship.validation.companyRequired });
    }
    
    if (formData.experience.yearsInField < 1) {
      errors.push({ field: 'yearsInField', message: t.mentorship.validation.experienceMinimum });
    }
    
    if (formData.availability.hoursPerWeek < 1) {
      errors.push({ field: 'hoursPerWeek', message: t.mentorship.validation.hoursMinimum });
    }
    
    if (formData.availability.preferredDays.length === 0) {
      errors.push({ field: 'preferredDays', message: t.mentorship.validation.daysRequired });
    }
    
    if (formData.mentorshipStyle.length === 0) {
      errors.push({ field: 'mentorshipStyle', message: t.mentorship.validation.styleRequired });
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUserId) return;
    
    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [], success: false }));
    
    const errors = validateForm();
    if (errors.length > 0) {
      setFormState(prev => ({ ...prev, errors, isSubmitting: false }));
      return;
    }
    
    try {
      let profileImageUrl = profile?.profileImage || '';
      
      // Upload new image if selected
      if(profileImage) {
        profileImageUrl = await uploadProfileImage(targetUserId, profileImage);
      }
      
      const profileData: Partial<MentorProfile> = {
        ...formData,
        userId: targetUserId,
        email: user?.email || '',
        profileImage: profileImageUrl,
        isActive: true,
        updatedAt: new Date()
      };
      
      let savedProfile: MentorProfile;
      
      if (mode === 'create') {
        savedProfile = await createMentorProfile({
          ...profileData,
          id: '', // Will be set by Firebase
          rating: 0,
          totalSessions: 0,
          currentMentees: 0,
          joinedAt: new Date()
        } as MentorProfile);
      } else {
        savedProfile = await updateMentorProfile(targetUserId, profileData);
      }
      
      setProfile(savedProfile);
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        success: true,
        errors: []
      }));
      
      if(onSave) {
        onSave(savedProfile);
      }
      
    } catch (error) {
      console.error('Error saving mentor profile:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: [{ field: 'general', message: t.mentorship.errors.saveProfile }]
      }));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addPreviousRole = () => {
    if (newRole.title.trim() && newRole.company.trim()) {
      setFormData(prev => ({
        ...prev,
        experience: {
          ...prev.experience,
          previousRoles: [...prev.experience.previousRoles, { ...newRole }]
        }
      }));
      setNewRole({ title: '', company: '', duration: '' });
    }
  };

  const removePreviousRole = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        previousRoles: prev.experience.previousRoles.filter((_, i) => i !== index)
      }
    }));
  };

  const toggleArrayValue = (array: string[], value: string, setter: (newArray: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(item => item !== value));
    } else {
      setter([...array, value]);
    }
  };

  if (mode === 'view' && profile) {
    return (
      <div className="mentor-profile-view">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile.profileImage ? (
              <img src={profile.profileImage} alt={profile.displayName} />
            ) : (
              <div className="avatar-placeholder">
                <i className="fas fa-user"></i>
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h1>{profile.displayName}</h1>
            <p className="profile-title">
              {profile?.experience?.currentPosition} at {profile?.experience?.currentCompany}
            </p>
            <p className="profile-experience">
              {profile?.experience?.yearsInField} {t.mentorship.profile.yearsExperience}
            </p>
            
            <div className="profile-stats">
              <div className="stat">
                <span className="value">{profile?.rating?.toFixed(1)}</span>
                <span className="label">{t.mentorship.profile.rating}</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map(star => (
                    <i 
                      key={star}
                      className={`fas fa-star ${star <= profile.rating ? 'filled' : ''}`}
                    ></i>
                  ))}
                </div>
              </div>
              <div className="stat">
                <span className="value">{profile.totalSessions}</span>
                <span className="label">{t.mentorship.profile.totalSessions}</span>
              </div>
              <div className="stat">
                <span className="value">{profile.currentMentees}/{profile.maxMentees}</span>
                <span className="label">{t.mentorship.profile.mentees}</span>
              </div>
            </div>
          </div>
          
          <div className="profile-actions">
            <button className="btn btn-primary">
              <i className="fas fa-paper-plane"></i>
              {t.mentorship.profile.requestMentorship}
            </button>
            <button className="btn btn-outline">
              <i className="fas fa-envelope"></i>
              {t.mentorship.profile.sendMessage}
            </button>
          </div>
        </div>
        
        <div className="profile-content">
          <section className="profile-section">
            <h2>{t.mentorship.profile.about}</h2>
            <p className="profile-bio">{profile.bio}</p>
          </section>
          
          <section className="profile-section">
            <h2>{t.mentorship.profile.expertise}</h2>
            <div className="tags-list">
              {profile?.expertiseAreas?.map((area, index) => (
                <span key={index} className="tag expertise">{area}</span>
              ))}
            </div>
          </section>
          
          <section className="profile-section">
            <h2>{t.mentorship.profile.skills}</h2>
            <div className="tags-list">
              {profile?.skills?.map((skill, index) => (
                <span key={index} className="tag skill">{skill}</span>
              ))}
            </div>
          </section>
          
          <section className="profile-section">
            <h2>{t.mentorship.profile.mentorshipStyle}</h2>
            <div className="tags-list">
              {profile?.mentorshipStyle?.map((style, index) => (
                <span key={index} className="tag style">{style}</span>
              ))}
            </div>
          </section>
          
          <section className="profile-section">
            <h2>{t.mentorship.profile.availability}</h2>
            <div className="availability-info">
              <div className="availability-item">
                <i className="fas fa-clock"></i>
                <span>{profile?.availability?.hoursPerWeek} {t.mentorship.profile.hoursPerWeek}</span>
              </div>
              <div className="availability-item">
                <i className="fas fa-calendar"></i>
                <span>{profile?.availability?.preferredDays.join(', ')}</span>
              </div>
              <div className="availability-item">
                <i className="fas fa-globe"></i>
                <span>{profile?.availability?.timezone}</span>
              </div>
              <div className="availability-item">
                <i className="fas fa-clock"></i>
                <span>{profile?.availability?.preferredMeetingTimes.join(', ')}</span>
              </div>
            </div>
          </section>
          
          {profile?.experience?.previousRoles.length > 0 && (
            <section className="profile-section">
              <h2>{t.mentorship.profile.experience}</h2>
              <div className="experience-list">
                <div className="experience-item current">
                  <h3>{profile?.experience?.currentPosition}</h3>
                  <p>{profile?.experience?.currentCompany}</p>
                  <span className="duration">{t.mentorship.profile.current}</span>
                </div>
                {profile?.experience?.previousRoles.map((role, index) => (
                  <div key={index} className="experience-item">
                    <h3>{role.title}</h3>
                    <p>{role.company}</p>
                    <span className="duration">{role.duration}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <section className="profile-section">
            <h2>{t.mentorship.profile.languages}</h2>
            <div className="tags-list">
              {profile?.languages?.map((language, index) => (
                <span key={index} className="tag language">{language}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="mentor-profile-form">
      <div className="form-header">
        <h1>
          {mode === 'create' 
            ? t.mentorship.profile.createProfile
            : t.mentorship.profile.editProfile
          }
        </h1>
        <p>{t.mentorship.profile.formDescription}</p>
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
            {t.mentorship.profile.saveSuccess}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="profile-form">
        {/* Basic Information */}
        <section className="form-section">
          <h2>{t.mentorship.profile.basicInfo}</h2>
          
          {/* Profile Image */}
          <div className="form-group">
            <label>{t.mentorship.profile.profileImage}</label>
            <div className="image-upload-section">
              <div className="current-image">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile preview" />
                ) : (
                  <div className="image-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div className="image-upload-controls">
                <button 
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                >
                  <i className="fas fa-camera"></i>
                  {t.mentorship.profile.changeImage}
                </button>
                {showImageUpload && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Display Name */}
          <div className="form-group">
            <label htmlFor="displayName">
              {t.mentorship.profile.displayName} *
            </label>
            <input
              type="text"
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                displayName: e.target.value 
              }))}
              placeholder={t.mentorship.profile.displayNamePlaceholder}
              required
            />
          </div>
          
          {/* Bio */}
          <div className="form-group">
            <label htmlFor="bio">
              {t.mentorship.profile.bio} *
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                bio: e.target.value 
              }))}
              placeholder={t.mentorship.profile.bioPlaceholder}
              rows={4}
              minLength={50}
              required
            />
            <small>{formData.bio.length}/500 {t.mentorship.profile.characters}</small>
          </div>
        </section>
        
        {/* Experience */}
        <section className="form-section">
          <h2>{t.mentorship.profile.experience}</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="currentPosition">
                {t.mentorship.profile.currentPosition} *
              </label>
              <input
                type="text"
                id="currentPosition"
                value={formData.experience.currentPosition}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  experience: { 
                    ...prev.experience, 
                    currentPosition: e.target.value 
                  }
                }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="currentCompany">
                {t.mentorship.profile.currentCompany} *
              </label>
              <input
                type="text"
                id="currentCompany"
                value={formData.experience.currentCompany}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  experience: { 
                    ...prev.experience, 
                    currentCompany: e.target.value 
                  }
                }))}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="yearsInField">
              {t.mentorship.profile.yearsInField} *
            </label>
            <input
              type="number"
              id="yearsInField"
              min="1"
              max="50"
              value={formData.experience.yearsInField}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                experience: { 
                  ...prev.experience, 
                  yearsInField: parseInt(e.target.value) || 0
                }
              }))}
              required
            />
          </div>
          
          {/* Previous Roles */}
          <div className="form-group">
            <label>{t.mentorship.profile.previousRoles}</label>
            
            {formData.experience.previousRoles.map((role, index) => (
              <div key={index} className="previous-role-item">
                <div className="role-info">
                  <strong>{role.title}</strong> at {role.company}
                  {role.duration && <span> ({role.duration})</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removePreviousRole(index)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            
            <div className="add-role-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder={t.mentorship.profile.jobTitle}
                  value={newRole.title}
                  onChange={(e) => setNewRole(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                />
                <input
                  type="text"
                  placeholder={t.mentorship.profile.company}
                  value={newRole.company}
                  onChange={(e) => setNewRole(prev => ({ 
                    ...prev, 
                    company: e.target.value 
                  }))}
                />
                <input
                  type="text"
                  placeholder={t.mentorship.profile.duration}
                  value={newRole.duration}
                  onChange={(e) => setNewRole(prev => ({ 
                    ...prev, 
                    duration: e.target.value 
                  }))}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addPreviousRole}
                  disabled={!newRole.title.trim() || !newRole.company.trim()}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Expertise */}
        <section className="form-section">
          <h2>{t.mentorship.profile.expertise}</h2>
          
          <div className="form-group">
            <label>{t.mentorship.profile.expertiseAreas} *</label>
            <div className="checkbox-grid">
              {EXPERTISE_AREAS.map(area => (
                <label key={area} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.expertiseAreas.includes(area)}
                    onChange={() => toggleArrayValue(
                      formData.expertiseAreas,
                      area,
                      (newAreas) => setFormData(prev => ({ 
                        ...prev, 
                        expertiseAreas: newAreas 
                      }))
                    )}
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>{t.mentorship.profile.additionalSkills}</label>
            
            {formData.skills.length > 0 && (
              <div className="skills-list">
                {formData.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="remove-skill"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="add-skill-form">
              <input
                type="text"
                placeholder={t.mentorship.profile.addSkillPlaceholder}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={addSkill}
                disabled={!newSkill.trim()}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </section>
        
        {/* Mentorship Style */}
        <section className="form-section">
          <h2>{t.mentorship.profile.mentorshipStyle}</h2>
          
          <div className="form-group">
            <label>{t.mentorship.profile.preferredStyle} *</label>
            <div className="checkbox-grid">
              {MENTORSHIP_STYLES.map(style => (
                <label key={style} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.mentorshipStyle.includes(style)}
                    onChange={() => toggleArrayValue(
                      formData.mentorshipStyle,
                      style,
                      (newStyles) => setFormData(prev => ({ 
                        ...prev, 
                        mentorshipStyle: newStyles 
                      }))
                    )}
                  />
                  <span>{style}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="maxMentees">
              {t.mentorship.profile.maxMentees}
            </label>
            <input
              type="number"
              id="maxMentees"
              min="1"
              max="10"
              value={formData.maxMentees}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                maxMentees: parseInt(e.target.value) || 1
              }))}
            />
            <small>{t.mentorship.profile.maxMenteesHelp}</small>
          </div>
        </section>
        
        {/* Availability */}
        <section className="form-section">
          <h2>{t.mentorship.profile.availability}</h2>
          
          <div className="form-group">
            <label htmlFor="hoursPerWeek">
              {t.mentorship.profile.hoursPerWeek} *
            </label>
            <input
              type="number"
              id="hoursPerWeek"
              min="1"
              max="20"
              value={formData.availability.hoursPerWeek}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                availability: { 
                  ...prev.availability, 
                  hoursPerWeek: parseInt(e.target.value) || 1
                }
              }))}
              required
            />
          </div>
          
          <div className="form-group">
            <label>{t.mentorship.profile.preferredDays} *</label>
            <div className="checkbox-grid">
              {DAYS_OF_WEEK.map(day => (
                <label key={day} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.availability.preferredDays.includes(day)}
                    onChange={() => toggleArrayValue(
                      formData.availability.preferredDays,
                      day,
                      (newDays) => setFormData(prev => ({ 
                        ...prev, 
                        availability: { 
                          ...prev.availability, 
                          preferredDays: newDays 
                        }
                      }))
                    )}
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="timezone">
              {t.mentorship.profile.timezone}
            </label>
            <input
              type="text"
              id="timezone"
              value={formData.availability.timezone}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                availability: { 
                  ...prev.availability, 
                  timezone: e.target.value 
                }
              }))}
              placeholder="UTC-6, EST, PST, etc."
            />
          </div>
          
          <div className="form-group">
            <label>{t.mentorship.profile.preferredMeetingTimes}</label>
            <div className="checkbox-grid">
              {MEETING_TIMES.map(time => (
                <label key={time} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.availability.preferredMeetingTimes.includes(time)}
                    onChange={() => toggleArrayValue(
                      formData.availability.preferredMeetingTimes,
                      time,
                      (newTimes) => setFormData(prev => ({ 
                        ...prev, 
                        availability: { 
                          ...prev.availability, 
                          preferredMeetingTimes: newTimes 
                        }
                      }))
                    )}
                  />
                  <span>{time}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
        
        {/* Languages */}
        <section className="form-section">
          <h2>{t.mentorship.profile.languages}</h2>
          
          <div className="form-group">
            <label>{t.mentorship.profile.spokenLanguages}</label>
            <div className="checkbox-grid">
              {LANGUAGES.map(language => (
                <label key={language} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(language)}
                    onChange={() => toggleArrayValue(
                      formData.languages,
                      language,
                      (newLanguages) => setFormData(prev => ({ 
                        ...prev, 
                        languages: newLanguages 
                      }))
                    )}
                  />
                  <span>{language}</span>
                </label>
              ))}
            </div>
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