import React, { useState, useEffect } from 'react';
import { useAuthContext} from '../../contexts/AuthContext';
import { useTranslations} from '../../hooks/useTranslations';
import type { import type { 
  MentorProfile, 
  MenteeProfile, 
  MentorshipRequest,
  FormState,
  ValidationError
 } from '@/types/174174;
  getMentorProfile,
  getMenteeProfile,
  createMentorshipRequest,
  updateMentorshipRequest,
  getMentorshipRequests
} from '../../lib/mentorship';

interface MentorshipRequestProps {
  mentorId?: string;
  requestId?: string;
  mode: 'create' | 'view' | 'respond';
  onSubmit?: (request: MentorshipRequest) => void;
  onCancel?: () => void;
}

interface RequestFormData {
  message: string;
  goals: string[];
  expectedDuration: string;
  meetingFrequency: 'weekly' | 'biweekly' | 'monthly';
  communicationPreference: 'video' | 'voice' | 'chat' | 'in-person';
  specificAreas: string[];
  timeCommitment: string;
  previousExperience: string;
  expectations: string;
}

const DURATION_OPTIONS = [
  '1-3 months',
  '3-6 months', 
  '6-12 months',
  '1+ year',
  'Ongoing'
];

const COMMUNICATION_OPTIONS = [
  { value: 'video', icon: 'video', label: 'Video Calls' },
  { value: 'voice', icon: 'phone', label: 'Voice Calls' },
  { value: 'chat', icon: 'comments', label: 'Text/Chat' },
  { value: 'in-person', icon: 'handshake', label: 'In Person' }
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' }, 
  { value: 'monthly', label: 'Monthly' }
];

export default function MentorshipRequest({ 
  mentorId, 
  requestId, 
  mode = 'create',
  onSubmit,
  onCancel 
}: MentorshipRequestProps) {
  const { user } = useAuthContext();
  const t = useTranslations();
  
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [mentee, setMentee] = useState<MenteeProfile | null>(null);
  const [existingRequest, setExistingRequest] = useState<MentorshipRequest | null>(null);
  
  const [formData, setFormData] = useState<RequestFormData>({
    message: '',
    goals: [],
    expectedDuration: '',
    meetingFrequency: 'biweekly',
    communicationPreference: 'video',
    specificAreas: [],
    timeCommitment: '',
    previousExperience: '',
    expectations: ''
  });
  
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    errors: [],
    success: false
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [newGoal, setNewGoal] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseAction, setResponseAction] = useState<'accept' | 'reject' | null>(null);

  const totalSteps = mode === 'create' ? 4 : 1;

  useEffect(() => {
    loadData();
  }, [mentorId, requestId, user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load mentee profile (current user for create mode)
      if (mode === 'create') {
        const menteeData = await getMenteeProfile(user.uid);
        setMentee(menteeData);
        
        // Pre-fill goals from mentee profile
        if(menteeData) {
          setFormData(prev => ({
            ...prev,
            goals: [...menteeData.goals]
          }));
        }
      }
      
      // Load mentor profile
      if(mentorId) {
        const mentorData = await getMentorProfile(mentorId);
        setMentor(mentorData);
      }
      
      // Load existing request for view/respond modes
      if(requestId) {
        const requests = await getMentorshipRequests({ requestId });
        if (requests.length > 0) {
          const request = requests?.[0];
          setExistingRequest(request);
          
          // Load mentor and mentee data
          const [mentorData, menteeData] = await Promise.all([
            getMentorProfile(request.mentorId),
            getMenteeProfile(request.menteeId)
          ]);
          
          setMentor(mentorData);
          setMentee(menteeData);
          
          // Pre-fill form for editing
          if (mode === 'view') {
            setFormData({
              message: request['message'],
              goals: request.goals,
              expectedDuration: request.expectedDuration,
              meetingFrequency: request.meetingFrequency,
              communicationPreference: request.communicationPreference,
              specificAreas: [],
              timeCommitment: '',
              previousExperience: '',
              expectations: ''
            });
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading request data:', error);
      setFormState(prev => ({
        ...prev,
        errors: [{ field: 'general', message: t.mentorship.request.errorLoading }]
      }));
    }
  };

  const validateStep = (step: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    switch(step) {
      case 1:
        if (!formData.message.trim() || formData['message'].length < 50) {
          errors.push({ 
            field: 'message', 
            message: t.mentorship.request.validation.messageMinLength 
          });
        }
        if (formData.goals.length === 0) {
          errors.push({ 
            field: 'goals', 
            message: t.mentorship.request.validation.goalsRequired 
          });
        }
        break;
        
      case 2:
        if (!formData.expectedDuration) {
          errors.push({ 
            field: 'expectedDuration', 
            message: t.mentorship.request.validation.durationRequired 
          });
        }
        break;
        
      case 3:
        if (!formData.timeCommitment.trim()) {
          errors.push({ 
            field: 'timeCommitment', 
            message: t.mentorship.request.validation.timeCommitmentRequired 
          });
        }
        break;
        
      case 4:
        if (!formData.expectations.trim()) {
          errors.push({ 
            field: 'expectations', 
            message: t.mentorship.request.validation.expectationsRequired 
          });
        }
        break;
    }
    
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setFormState(prev => ({ ...prev, errors }));
      return;
    }
    
    setFormState(prev => ({ ...prev, errors: [] }));
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmitRequest = async () => {
    if (!user || !mentorId || !mentee) return;
    
    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [], success: false }));
    
    // Validate all steps
    const allErrors: ValidationError[] = [];
    for (let step = 1; step <= totalSteps; step++) {
      allErrors.push(...validateStep(step));
    }
    
    if (allErrors.length > 0) {
      setFormState(prev => ({ ...prev, errors: allErrors, isSubmitting: false }));
      return;
    }
    
    try {
      const requestData: Omit<MentorshipRequest, 'id' | 'createdAt' | 'respondedAt'> = {
        mentorId,
        menteeId: user.uid,
        message: formData.message,
        goals: formData.goals,
        expectedDuration: formData.expectedDuration,
        meetingFrequency: formData.meetingFrequency,
        communicationPreference: formData.communicationPreference,
        status: 'pending'
      };
      
      const savedRequest = await createMentorshipRequest(requestData);
      
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        success: true,
        errors: []
      }));
      
      if(onSubmit) {
        onSubmit(savedRequest);
      }
      
    } catch (error) {
      console.error('Error submitting request:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: [{ field: 'general', message: t.mentorship.request.errorSubmitting }]
      }));
    }
  };

  const handleRespondToRequest = async (action: 'accept' | 'reject') => {
    if (!existingRequest || !user) return;
    
    setFormState(prev => ({ ...prev, isSubmitting: true, errors: [], success: false }));
    
    try {
      const updatedRequest = await updateMentorshipRequest(existingRequest.id, {
        status: action === 'accept' ? 'accepted' : 'rejected',
        responseMessage: responseMessage.trim() || undefined,
        respondedAt: new Date()
      });
      
      setFormState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        success: true,
        errors: []
      }));
      
      if(onSubmit) {
        onSubmit(updatedRequest);
      }
      
    } catch (error) {
      console.error('Error responding to request:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: [{ field: 'general', message: t.mentorship.request.errorResponding }]
      }));
    }
  };

  const addGoal = () => {
    if (newGoal.trim() && !formData.goals.includes(newGoal.trim())) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()]
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g !== goal)
    }));
  };

  // View mode for existing request
  if (mode === 'view' && existingRequest) {
    return (
      <div className="mentorship-request-view">
        <div className="request-header">
          <h1>{t.mentorship.request.viewTitle}</h1>
          <span className={`status-badge ${existingRequest['status']}`}>
            {t.mentorship.request.status[existingRequest['status']]}
          </span>
        </div>
        
        <div className="request-content">
          <div className="participants">
            <div className="participant mentee">
              <div className="participant-avatar">
                {mentee?.profileImage ? (
                  <img src={mentee.profileImage} alt={mentee.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div className="participant-info">
                <h3>{mentee?.displayName}</h3>
                <p>{t.mentorship.request.mentee}</p>
              </div>
            </div>
            
            <div className="connection-arrow">
              <i className="fas fa-arrow-right"></i>
            </div>
            
            <div className="participant mentor">
              <div className="participant-avatar">
                {mentor?.profileImage ? (
                  <img src={mentor.profileImage} alt={mentor.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                )}
              </div>
              <div className="participant-info">
                <h3>{mentor?.displayName}</h3>
                <p>{t.mentorship.request.mentor}</p>
              </div>
            </div>
          </div>
          
          <div className="request-details">
            <section className="detail-section">
              <h2>{t.mentorship.request.message}</h2>
              <p className="request-message">{existingRequest['message']}</p>
            </section>
            
            <section className="detail-section">
              <h2>{t.mentorship.request.goals}</h2>
              <ul className="goals-list">
                {existingRequest.goals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </section>
            
            <section className="detail-section">
              <h2>{t.mentorship.request.preferences}</h2>
              <div className="preferences-grid">
                <div className="preference-item">
                  <i className="fas fa-clock"></i>
                  <span>{t.mentorship.request.duration}: {existingRequest.expectedDuration}</span>
                </div>
                <div className="preference-item">
                  <i className="fas fa-calendar"></i>
                  <span>{t.mentorship.request.frequency}: {t.mentorship.frequency[existingRequest.meetingFrequency]}</span>
                </div>
                <div className="preference-item">
                  <i className="fas fa-comments"></i>
                  <span>{t.mentorship.request.communication}: {t.mentorship.communication[existingRequest.communicationPreference]}</span>
                </div>
              </div>
            </section>
            
            {existingRequest.responseMessage && (
              <section className="detail-section">
                <h2>{t.mentorship.request.response}</h2>
                <p className="response-message">{existingRequest.responseMessage}</p>
              </section>
            )}
          </div>
          
          <div className="request-timeline">
            <div className="timeline-item">
              <i className="fas fa-paper-plane"></i>
              <span>{t.mentorship.request.submitted}: {new Date(existingRequest.createdAt).toLocaleDateString()}</span>
            </div>
            {existingRequest.respondedAt && (
              <div className="timeline-item">
                <i className={`fas fa-${existingRequest['status'] === 'accepted' ? 'check' : 'times'}`}></i>
                <span>
                  {existingRequest['status'] === 'accepted' 
                    ? t.mentorship.request.accepted 
                    : t.mentorship.request.rejected
                  }: {new Date(existingRequest.respondedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Respond mode for mentors
  if (mode === 'respond' && existingRequest) {
    return (
      <div className="mentorship-request-respond">
        <div className="respond-header">
          <h1>{t.mentorship.request.respondTitle}</h1>
          <p>{t.mentorship.request.respondDescription}</p>
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
              {t.mentorship.request.responseSubmitted}
            </p>
          </div>
        )}
        
        {/* Show request details first */}
        <div className="request-summary">
          <div className="mentee-info">
            <div className="mentee-avatar">
              {mentee?.profileImage ? (
                <img src={mentee.profileImage} alt={mentee.displayName} />
              ) : (
                <div className="avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
            <div className="mentee-details">
              <h3>{mentee?.displayName}</h3>
              <p>{t.mentorship.level[mentee?.currentLevel || 'beginner']} - {mentee?.background.yearsOfExperience} {t.mentorship.request.yearsExperience}</p>
            </div>
          </div>
          
          <div className="request-highlights">
            <h4>{t.mentorship.request.theirMessage}</h4>
            <p className="message-preview">{existingRequest['message']}</p>
            
            <h4>{t.mentorship.request.theirGoals}</h4>
            <ul className="goals-preview">
              {existingRequest.goals.slice(0, 3).map((goal, index) => (
                <li key={index}>{goal}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Response form */}
        <div className="response-form">
          <h2>{t.mentorship.request.yourResponse}</h2>
          
          <div className="response-actions">
            <button 
              className={`response-option accept ${responseAction === 'accept' ? 'selected' : ''}`}
              onClick={() => setResponseAction('accept')}
            >
              <i className="fas fa-check"></i>
              <span>{t.mentorship.request.acceptRequest}</span>
            </button>
            
            <button 
              className={`response-option reject ${responseAction === 'reject' ? 'selected' : ''}`}
              onClick={() => setResponseAction('reject')}
            >
              <i className="fas fa-times"></i>
              <span>{t.mentorship.request.rejectRequest}</span>
            </button>
          </div>
          
          {responseAction && (
            <div className="response-message-section">
              <label htmlFor="responseMessage">
                {responseAction === 'accept' 
                  ? t.mentorship.request.acceptanceMessage
                  : t.mentorship.request.rejectionMessage
                }
              </label>
              <textarea
                id="responseMessage"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder={
                  responseAction === 'accept'
                    ? t.mentorship.request.acceptancePlaceholder
                    : t.mentorship.request.rejectionPlaceholder
                }
                rows={4}
              />
              
              <div className="form-actions">
                <button 
                  className="btn btn-outline"
                  onClick={onCancel}
                  disabled={formState.isSubmitting}
                >
                  {t.common.cancel}
                </button>
                
                <button 
                  className={`btn ${responseAction === 'accept' ? 'btn-primary' : 'btn-danger'}`}
                  onClick={() => handleRespondToRequest(responseAction)}
                  disabled={formState.isSubmitting || !responseAction}
                >
                  {formState.isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      {t.common.submitting}
                    </>
                  ) : (
                    <>
                      <i className={`fas fa-${responseAction === 'accept' ? 'check' : 'times'}`}></i>
                      {responseAction === 'accept' 
                        ? t.mentorship.request.confirmAccept
                        : t.mentorship.request.confirmReject
                      }
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create mode - multi-step form
  return (
    <div className="mentorship-request-form">
      <div className="form-header">
        <h1>{t.mentorship.request.createTitle}</h1>
        {mentor && (
          <div className="mentor-preview">
            <div className="mentor-avatar">
              {mentor.profileImage ? (
                <img src={mentor.profileImage} alt={mentor.displayName} />
              ) : (
                <div className="avatar-placeholder">
                  <i className="fas fa-user"></i>
                </div>
              )}
            </div>
            <div className="mentor-info">
              <h3>{mentor.displayName}</h3>
              <p>{mentor.experience.currentPosition} at {mentor.experience.currentCompany}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Progress indicator */}
      <div className="form-progress">
        <div className="progress-steps">
          {[1, 2, 3, 4].map(step => (
            <div 
              key={step}
              className={`progress-step ${step === currentStep ? 'active' : step < currentStep ? 'completed' : ''}`}
            >
              <span className="step-number">{step}</span>
              <span className="step-label">
                {step === 1 && t.mentorship.request.steps.introduction}
                {step === 2 && t.mentorship.request.steps.preferences}
                {step === 3 && t.mentorship.request.steps.commitment}
                {step === 4 && t.mentorship.request.steps.expectations}
              </span>
            </div>
          ))}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
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
            {t.mentorship.request.submitSuccess}
          </p>
        </div>
      )}
      
      <div className="form-content">
        {/* Step 1: Introduction & Goals */}
        {currentStep === 1 && (
          <div className="form-step">
            <h2>{t.mentorship.request.steps.introduction}</h2>
            <p>{t.mentorship.request.introDescription}</p>
            
            <div className="form-group">
              <label htmlFor="message">
                {t.mentorship.request.personalMessage} *
              </label>
              <textarea
                id="message"
                value={formData['message']}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  message: e.target.value 
                }))}
                placeholder={t.mentorship.request.messagePlaceholder}
                rows={5}
                minLength={50}
                required
              />
              <small>
                {formData.message.length}/500 {t.mentorship.request.characters}
                {formData['message'].length < 50 && (
                  <span className="text-warning"> - {t.mentorship.request.minimumCharacters}</span>
                )}
              </small>
            </div>
            
            <div className="form-group">
              <label>{t.mentorship.request.yourGoals} *</label>
              
              {formData.goals.length > 0 && (
                <div className="goals-list">
                  {formData.goals.map((goal, index) => (
                    <div key={index} className="goal-item">
                      <span>{goal}</span>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal)}
                        className="remove-goal"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="add-goal-form">
                <input
                  type="text"
                  placeholder={t.mentorship.request.addGoalPlaceholder}
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addGoal}
                  disabled={!newGoal.trim()}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
              
              <small>{t.mentorship.request.goalsHelp}</small>
            </div>
          </div>
        )}
        
        {/* Step 2: Preferences */}
        {currentStep === 2 && (
          <div className="form-step">
            <h2>{t.mentorship.request.steps.preferences}</h2>
            <p>{t.mentorship.request.preferencesDescription}</p>
            
            <div className="form-group">
              <label>{t.mentorship.request.expectedDuration} *</label>
              <div className="radio-group">
                {DURATION_OPTIONS.map(duration => (
                  <label key={duration} className="radio-item">
                    <input
                      type="radio"
                      name="duration"
                      value={duration}
                      checked={formData.expectedDuration === duration}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        expectedDuration: e.target.value 
                      }))}
                    />
                    <span>{duration}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>{t.mentorship.request.meetingFrequency}</label>
              <div className="radio-group horizontal">
                {FREQUENCY_OPTIONS.map(freq => (
                  <label key={freq.value} className="radio-item">
                    <input
                      type="radio"
                      name="frequency"
                      value={freq.value}
                      checked={formData.meetingFrequency === freq.value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        meetingFrequency: e.target.value as RequestFormData.meetingFrequency
                      }))}
                    />
                    <span>{freq.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>{t.mentorship.request.communicationPreference}</label>
              <div className="communication-options">
                {COMMUNICATION_OPTIONS.map(option => (
                  <label key={option.value} className="communication-item">
                    <input
                      type="radio"
                      name="communication"
                      value={option.value}
                      checked={formData.communicationPreference === option.value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        communicationPreference: e.target.value as RequestFormData.communicationPreference
                      }))}
                    />
                    <div className="communication-content">
                      <i className={`fas fa-${option.icon}`}></i>
                      <span>{option.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Commitment */}
        {currentStep === 3 && (
          <div className="form-step">
            <h2>{t.mentorship.request.steps.commitment}</h2>
            <p>{t.mentorship.request.commitmentDescription}</p>
            
            <div className="form-group">
              <label htmlFor="timeCommitment">
                {t.mentorship.request.timeCommitment} *
              </label>
              <textarea
                id="timeCommitment"
                value={formData.timeCommitment}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  timeCommitment: e.target.value 
                }))}
                placeholder={t.mentorship.request.timeCommitmentPlaceholder}
                rows={3}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="previousExperience">
                {t.mentorship.request.previousExperience}
              </label>
              <textarea
                id="previousExperience"
                value={formData.previousExperience}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  previousExperience: e.target.value 
                }))}
                placeholder={t.mentorship.request.previousExperiencePlaceholder}
                rows={3}
              />
            </div>
          </div>
        )}
        
        {/* Step 4: Expectations */}
        {currentStep === 4 && (
          <div className="form-step">
            <h2>{t.mentorship.request.steps.expectations}</h2>
            <p>{t.mentorship.request.expectationsDescription}</p>
            
            <div className="form-group">
              <label htmlFor="expectations">
                {t.mentorship.request.expectations} *
              </label>
              <textarea
                id="expectations"
                value={formData.expectations}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  expectations: e.target.value 
                }))}
                placeholder={t.mentorship.request.expectationsPlaceholder}
                rows={4}
                required
              />
            </div>
            
            {/* Summary */}
            <div className="request-summary">
              <h3>{t.mentorship.request.summary}</h3>
              <div className="summary-item">
                <strong>{t.mentorship.request.goals}:</strong>
                <span>{formData.goals.join(', ')}</span>
              </div>
              <div className="summary-item">
                <strong>{t.mentorship.request.duration}:</strong>
                <span>{formData.expectedDuration}</span>
              </div>
              <div className="summary-item">
                <strong>{t.mentorship.request.frequency}:</strong>
                <span>{FREQUENCY_OPTIONS.find(f => f.value === formData.meetingFrequency)?.label}</span>
              </div>
              <div className="summary-item">
                <strong>{t.mentorship.request.communication}:</strong>
                <span>{COMMUNICATION_OPTIONS.find(c => c.value === formData.communicationPreference)?.label}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Form navigation */}
      <div className="form-navigation">
        <div className="nav-left">
          {currentStep > 1 && (
            <button 
              type="button"
              className="btn btn-outline"
              onClick={handlePrevious}
              disabled={formState.isSubmitting}
            >
              <i className="fas fa-arrow-left"></i>
              {t.mentorship.request.previous}
            </button>
          )}
        </div>
        
        <div className="nav-right">
          <button 
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={formState.isSubmitting}
          >
            {t.common.cancel}
          </button>
          
          {currentStep < totalSteps ? (
            <button 
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={formState.isSubmitting}
            >
              {t.mentorship.request.next}
              <i className="fas fa-arrow-right"></i>
            </button>
          ) : (
            <button 
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitRequest}
              disabled={formState.isSubmitting}
            >
              {formState.isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {t.common.submitting}
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  {t.mentorship.request.submitRequest}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}