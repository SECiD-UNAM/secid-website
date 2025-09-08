import React, { useState, useEffect } from 'react';
import { useAuthContext} from '../../contexts/AuthContext';
import { useTranslations} from '../../hooks/useTranslations';
import type { 
  MentorProfile, 
  MenteeProfile, 
  MentorshipMatch,
  MentorshipRequest
} from '../../types';
import {
  getMentorProfiles, 
  getMenteeProfile, 
  calculateMatchScore,
  createMentorshipRequest,
  getMentorshipRequests
} from '../../lib/mentorship';

interface MatchResult {
  mentor: MentorProfile;
  score: number;
  reasons: string[];
  compatibility: {
    skills: number;
    availability: number;
    style: number;
    language: number;
    experience: number;
  };
}

interface FilterOptions {
  minRating: number;
  expertiseAreas: string[];
  mentorshipStyles: string[];
  languages: string[];
  availability: {
    hoursPerWeek: number;
    preferredDays: string[];
  };
  experienceLevel: 'any' | 'junior' | 'mid' | 'senior';
}

export default function MentorshipMatcher() {
  const { user } = useAuthContext();
  const t = useTranslations();
  
  const [menteeProfile, setMenteeProfile] = useState<MenteeProfile | null>(null);
  const [allMentors, setAllMentors] = useState<MentorProfile[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<MatchResult[]>([]);
  const [existingRequests, setExistingRequests] = useState<MentorshipRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    minRating: 0,
    expertiseAreas: [],
    mentorshipStyles: [],
    languages: [],
    availability: {
      hoursPerWeek: 1,
      preferredDays: []
    },
    experienceLevel: 'any'
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'rating' | 'experience'>('score');
  const [selectedMentor, setSelectedMentor] = useState<MentorProfile | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [menteeData, mentorsData, requestsData] = await Promise.all([
          getMenteeProfile(user.uid),
          getMentorProfiles(),
          getMentorshipRequests({ menteeId: user.uid })
        ]);
        
        if (!menteeData) {
          // Redirect to create mentee profile
          return;
        }
        
        setMenteeProfile(menteeData);
        setAllMentors(mentorsData.filter(m => m.isActive && m.currentMentees < m.maxMentees));
        setExistingRequests(requestsData);
        
        // Calculate initial matches
        await calculateMatches(menteeData, mentorsData.filter(m => m.isActive && m.currentMentees < m.maxMentees));
        
      } catch (error) {
        console.error('Error loading matcher data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [filters, matchResults]);

  const calculateMatches = async (mentee: MenteeProfile, mentors: MentorProfile[]) => {
    setCalculating(true);
    
    try {
      const results: MatchResult[] = [];
      
      for (const mentor of mentors) {
        const matchData = await calculateMatchScore(mentee, mentor);
        
        results.push({
          mentor,
          score: matchData.score,
          reasons: matchData.reasons,
          compatibility: matchData.compatibility
        });
      }
      
      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      
      setMatchResults(results);
      setFilteredResults(results);
      
    } catch (error) {
      console.error('Error calculating matches:', error);
    } finally {
      setCalculating(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...matchResults];
    
    // Filter by minimum rating
    if (filters.minRating > 0) {
      filtered = filtered.filter(result => result?.mentor?.rating >= filters.minRating);
    }
    
    // Filter by expertise areas
    if (filters.expertiseAreas.length > 0) {
      filtered = filtered.filter(result => 
        filters.expertiseAreas.some(area => 
          result?.mentor?.expertiseAreas.includes(area)
        )
      );
    }
    
    // Filter by mentorship styles
    if (filters.mentorshipStyles.length > 0) {
      filtered = filtered.filter(result => 
        filters.mentorshipStyles.some(style => 
          result?.mentor?.mentorshipStyle.includes(style)
        )
      );
    }
    
    // Filter by languages
    if (filters.languages.length > 0) {
      filtered = filtered.filter(result => 
        filters.languages.some(lang => 
          result?.mentor?.languages.includes(lang)
        )
      );
    }
    
    // Filter by availability
    if (filters.availability.hoursPerWeek > 1) {
      filtered = filtered.filter(result => 
        result?.mentor?.availability.hoursPerWeek >= filters.availability.hoursPerWeek
      );
    }
    
    if (filters.availability.preferredDays.length > 0) {
      filtered = filtered.filter(result => 
        filters.availability.preferredDays.some(day => 
          result?.mentor?.availability.preferredDays.includes(day)
        )
      );
    }
    
    // Filter by experience level
    if (filters.experienceLevel !== 'any') {
      const experienceMap = {
        junior: [1, 3],
        mid: [3, 7],
        senior: [7, 50]
      };
      
      const [minYears, maxYears] = experienceMap[filters.experienceLevel];
      filtered = filtered.filter(result => 
        result?.mentor?.experience.yearsInField >= minYears && 
        result?.mentor?.experience.yearsInField <= maxYears
      );
    }
    
    // Apply sorting
    if (sortBy === 'rating') {
      filtered.sort((a, b) => b.mentor.rating - a.mentor.rating);
    } else if (sortBy === 'experience') {
      filtered.sort((a, b) => b.mentor.experience.yearsInField - a.mentor.experience.yearsInField);
    } else {
      filtered.sort((a, b) => b.score - a.score);
    }
    
    setFilteredResults(filtered);
  };

  const hasExistingRequest = (mentorId: string) => {
    return existingRequests.some(req => 
      req.mentorId === mentorId && req.status === 'pending'
    );
  };

  const handleRequestMentorship = (mentor: MentorProfile) => {
    setSelectedMentor(mentor);
    setShowRequestModal(true);
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.9) return t.mentorship.matcher.excellent;
    if (score >= 0.75) return t.mentorship.matcher.veryGood;
    if (score >= 0.6) return t.mentorship.matcher.good;
    if (score >= 0.4) return t.mentorship.matcher.fair;
    return t.mentorship.matcher.poor;
  };

  if(loading) {
    return (
      <div className="mentorship-matcher loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>{t.mentorship.matcher.loading}</p>
        </div>
      </div>
    );
  }

  if (!menteeProfile) {
    return (
      <div className="mentorship-matcher no-profile">
        <div className="empty-state">
          <i className="fas fa-user-plus fa-3x"></i>
          <h2>{t.mentorship.matcher.createProfile}</h2>
          <p>{t.mentorship.matcher.createProfileDescription}</p>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i>
            {t.mentorship.matcher.createMenteeProfile}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mentorship-matcher">
      {/* Header */}
      <div className="matcher-header">
        <div className="header-content">
          <h1>{t.mentorship.matcher.title}</h1>
          <p>{t.mentorship.matcher.description}</p>
        </div>
        
        <div className="header-stats">
          <div className="stat">
            <span className="value">{allMentors.length}</span>
            <span className="label">{t.mentorship.matcher.availableMentors}</span>
          </div>
          <div className="stat">
            <span className="value">{filteredResults.length}</span>
            <span className="label">{t.mentorship.matcher.matches}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="matcher-controls">
        <div className="controls-left">
          <button 
            className={`btn btn-outline ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-filter"></i>
            {t.mentorship.matcher.filters}
          </button>
          
          <div className="sort-control">
            <label htmlFor="sortBy">{t.mentorship.matcher.sortBy}:</label>
            <select 
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="score">{t.mentorship.matcher.compatibility}</option>
              <option value="rating">{t.mentorship.matcher.rating}</option>
              <option value="experience">{t.mentorship.matcher.experience}</option>
            </select>
          </div>
        </div>
        
        <div className="controls-right">
          <button 
            className="btn btn-ghost"
            onClick={() => calculateMatches(menteeProfile, allMentors)}
            disabled={calculating}
          >
            {calculating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {t.mentorship.matcher.calculating}
              </>
            ) : (
              <>
                <i className="fas fa-sync"></i>
                {t.mentorship.matcher.recalculate}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-content">
            <h3>{t.mentorship.matcher.filterOptions}</h3>
            
            <div className="filter-group">
              <label>{t.mentorship.matcher.minimumRating}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  minRating: parseFloat(e.target.value) 
                }))}
              />
              <span>{filters.minRating} {t.mentorship.matcher.stars}</span>
            </div>
            
            <div className="filter-group">
              <label>{t.mentorship.matcher.experienceLevel}</label>
              <select
                value={filters.experienceLevel}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  experienceLevel: e.target.value as FilterOptions.experienceLevel
                }))}
              >
                <option value="any">{t.mentorship.matcher.anyExperience}</option>
                <option value="junior">{t.mentorship.matcher.juniorLevel}</option>
                <option value="mid">{t.mentorship.matcher.midLevel}</option>
                <option value="senior">{t.mentorship.matcher.seniorLevel}</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>{t.mentorship.matcher.minimumHours}</label>
              <input
                type="number"
                min="1"
                max="20"
                value={filters.availability.hoursPerWeek}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  availability: {
                    ...prev.availability,
                    hoursPerWeek: parseInt(e.target.value) || 1
                  }
                }))}
              />
              <span>{t.mentorship.matcher.hoursPerWeek}</span>
            </div>
            
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setFilters({
                minRating: 0,
                expertiseAreas: [],
                mentorshipStyles: [],
                languages: [],
                availability: {
                  hoursPerWeek: 1,
                  preferredDays: []
                },
                experienceLevel: 'any'
              })}
            >
              {t.mentorship.matcher.clearFilters}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="matcher-results">
        {calculating ? (
          <div className="calculating-matches">
            <div className="calculating-animation">
              <i className="fas fa-brain fa-2x"></i>
              <div className="calculating-text">
                <h3>{t.mentorship.matcher.analyzingProfiles}</h3>
                <p>{t.mentorship.matcher.calculatingCompatibility}</p>
              </div>
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="no-matches">
            <i className="fas fa-search fa-3x"></i>
            <h3>{t.mentorship.matcher.noMatches}</h3>
            <p>{t.mentorship.matcher.noMatchesDescription}</p>
            <button 
              className="btn btn-outline"
              onClick={() => setShowFilters(true)}
            >
              {t.mentorship.matcher.adjustFilters}
            </button>
          </div>
        ) : (
          <div className="matches-list">
            {filteredResults.map((result, index) => (
              <div key={result?.mentor?.id} className="match-card">
                {/* Match Ranking */}
                <div className="match-ranking">
                  <span className="rank">#{index + 1}</span>
                  <div className={`compatibility-score ${getCompatibilityColor(result.score)}`}>
                    <span className="score">{Math.round(result.score * 100)}%</span>
                    <span className="label">{getScoreLabel(result.score)}</span>
                  </div>
                </div>
                
                {/* Mentor Info */}
                <div className="mentor-info">
                  <div className="mentor-avatar">
                    {result?.mentor?.profileImage ? (
                      <img src={result?.mentor?.profileImage} alt={result?.mentor?.displayName} />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className="fas fa-user"></i>
                      </div>
                    )}
                  </div>
                  
                  <div className="mentor-details">
                    <h3>{result?.mentor?.displayName}</h3>
                    <p className="mentor-title">
                      {result?.mentor?.experience.currentPosition} at {result?.mentor?.experience.currentCompany}
                    </p>
                    <p className="mentor-experience">
                      {result?.mentor?.experience.yearsInField} {t.mentorship.matcher.yearsExperience}
                    </p>
                    
                    <div className="mentor-stats">
                      <div className="stat">
                        <span className="value">{result?.mentor?.rating.toFixed(1)}</span>
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map(star => (
                            <i 
                              key={star}
                              className={`fas fa-star ${star <= result?.mentor?.rating ? 'filled' : ''}`}
                            ></i>
                          ))}
                        </div>
                      </div>
                      <div className="stat">
                        <span className="value">{result?.mentor?.totalSessions}</span>
                        <span className="label">{t.mentorship.matcher.sessions}</span>
                      </div>
                      <div className="stat">
                        <span className="value">{result?.mentor?.currentMentees}/{result?.mentor?.maxMentees}</span>
                        <span className="label">{t.mentorship.matcher.mentees}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Compatibility Breakdown */}
                <div className="compatibility-breakdown">
                  <h4>{t.mentorship.matcher.compatibilityBreakdown}</h4>
                  <div className="compatibility-bars">
                    <div className="compatibility-item">
                      <span className="label">{t.mentorship.matcher.skills}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${result?.compatibility?.skills * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{Math.round(result?.compatibility?.skills * 100)}%</span>
                    </div>
                    
                    <div className="compatibility-item">
                      <span className="label">{t.mentorship.matcher.availability}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${result?.compatibility?.availability * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{Math.round(result?.compatibility?.availability * 100)}%</span>
                    </div>
                    
                    <div className="compatibility-item">
                      <span className="label">{t.mentorship.matcher.style}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${result?.compatibility?.style * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{Math.round(result?.compatibility?.style * 100)}%</span>
                    </div>
                    
                    <div className="compatibility-item">
                      <span className="label">{t.mentorship.matcher.language}</span>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${result?.compatibility?.language * 100}%` }}
                        ></div>
                      </div>
                      <span className="value">{Math.round(result?.compatibility?.language * 100)}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Match Reasons */}
                <div className="match-reasons">
                  <h4>{t.mentorship.matcher.whyThisMatch}</h4>
                  <ul>
                    {result?.reasons?.slice(0, 3).map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
                
                {/* Expertise Preview */}
                <div className="expertise-preview">
                  <h4>{t.mentorship.matcher.expertise}</h4>
                  <div className="tags-list">
                    {result?.mentor?.expertiseAreas.slice(0, 4).map((area, idx) => (
                      <span key={idx} className="tag">{area}</span>
                    ))}
                    {result?.mentor?.expertiseAreas.length > 4 && (
                      <span className="tag more">+{result?.mentor?.expertiseAreas.length - 4}</span>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="match-actions">
                  <button className="btn btn-outline">
                    <i className="fas fa-eye"></i>
                    {t.mentorship.matcher.viewProfile}
                  </button>
                  
                  {hasExistingRequest(result?.mentor?.id) ? (
                    <button className="btn btn-disabled" disabled>
                      <i className="fas fa-clock"></i>
                      {t.mentorship.matcher.requestPending}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleRequestMentorship(result.mentor)}
                    >
                      <i className="fas fa-paper-plane"></i>
                      {t.mentorship.matcher.requestMentorship}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showRequestModal && selectedMentor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t.mentorship.matcher.requestMentorship}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRequestModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="selected-mentor-info">
                <div className="mentor-avatar">
                  {selectedMentor.profileImage ? (
                    <img src={selectedMentor.profileImage} alt={selectedMentor.displayName} />
                  ) : (
                    <div className="avatar-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                </div>
                <div className="mentor-details">
                  <h3>{selectedMentor.displayName}</h3>
                  <p>{selectedMentor.experience.currentPosition} at {selectedMentor.experience.currentCompany}</p>
                </div>
              </div>
              
              <p>{t.mentorship.matcher.requestModalDescription}</p>
              
              <div className="request-preview">
                <h4>{t.mentorship.matcher.yourGoals}</h4>
                <ul>
                  {menteeProfile.goals.slice(0, 3).map((goal, idx) => (
                    <li key={idx}>{goal}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-outline"
                onClick={() => setShowRequestModal(false)}
              >
                {t.common.cancel}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // This would open the full request form
                  setShowRequestModal(false);
                }}
              >
                <i className="fas fa-arrow-right"></i>
                {t.mentorship.matcher.continueRequest}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}