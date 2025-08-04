import {
import { db, isUsingMockAPI} from './firebase';

/**
 * Assessment System Firebase Functions
 */

  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import type {
  Assessment,
  AssessmentAttempt,
  Question,
  AssessmentResult,
  AssessmentProgress,
  Leaderboard,
  QuestionBank,
  AssessmentAnalytics,
  Certificate,
  PeerReview,
  SkillCategory,
  DifficultyLevel,
  AssessmentMode,
  QuestionType,
  UserAnswer,
  AssessmentFilters,
  AssessmentSearchResult,
} from '../types/assessment';

// Collections
const ASSESSMENTS_COLLECTION = 'assessments';
const QUESTIONS_COLLECTION = 'questions';
const ATTEMPTS_COLLECTION = 'assessment_attempts';
const RESULTS_COLLECTION = 'assessment_results';
const CERTIFICATES_COLLECTION = 'certificates';
const LEADERBOARDS_COLLECTION = 'leaderboards';
const QUESTION_BANKS_COLLECTION = 'question_banks';
const PEER_REVIEWS_COLLECTION = 'peer_reviews';

// Assessment Management
export async function createAssessment(assessment: Omit<Assessment, 'id'>): Promise<string> {
  if (isUsingMockAPI()) {
    const mockId = `assessment_${Date.now()}`;
    console.log('Mock: Created assessment', mockId);
    return mockId;
  }

  try {
    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), {
      ...assessment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      totalAttempts: 0,
      averageScore: 0,
      completionRate: 0,
    });
    return docRef['id'];
  } catch (error) {
    console.error('Error creating assessment:', error);
    throw error;
  }
}

export async function getAssessment(assessmentId: string): Promise<Assessment | null> {
  if (isUsingMockAPI()) {
    return {
      id: assessmentId,
      title: 'Python Fundamentals Assessment',
      description: 'Test your Python programming skills',
      category: 'python',
      difficulty: 'intermediate',
      mode: 'certification',
      questionIds: ['q1', 'q2', 'q3'],
      totalQuestions: 3,
      timeLimit: 60,
      passingScore: 70,
      shuffleQuestions: true,
      showResultsImmediately: true,
      allowReviewAnswers: true,
      isAdaptive: false,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      tags: ['python', 'programming', 'fundamentals'],
      totalAttempts: 150,
      averageScore: 75.5,
      completionRate: 85.2,
    } as Assessment;
  }

  try {
    const docSnap = await getDoc(doc(db, ASSESSMENTS_COLLECTION, assessmentId));
    if (docSnap.exists()) {
      return { id: docSnap['id'], ...docSnap.data() } as Assessment;
    }
    return null;
  } catch (error) {
    console.error('Error getting assessment:', error);
    throw error;
  }
}

export async function getAssessments(filters?: AssessmentFilters): Promise<Assessment[]> {
  if (isUsingMockAPI()) {
    return [
      {
        id: 'assessment1',
        title: 'Python Fundamentals',
        description: 'Basic Python programming concepts',
        category: 'python',
        difficulty: 'beginner',
        mode: 'practice',
        questionIds: ['q1', 'q2'],
        totalQuestions: 2,
        timeLimit: 30,
        passingScore: 60,
        shuffleQuestions: false,
        showResultsImmediately: true,
        allowReviewAnswers: true,
        isAdaptive: false,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        tags: ['python', 'basics'],
        totalAttempts: 100,
        averageScore: 72.3,
        completionRate: 88.5,
      },
      {
        id: 'assessment2',
        title: 'SQL Advanced Queries',
        description: 'Complex SQL operations and optimization',
        category: 'sql',
        difficulty: 'advanced',
        mode: 'certification',
        questionIds: ['q3', 'q4', 'q5'],
        totalQuestions: 3,
        timeLimit: 90,
        passingScore: 80,
        shuffleQuestions: true,
        showResultsImmediately: false,
        allowReviewAnswers: true,
        isAdaptive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        tags: ['sql', 'database', 'advanced'],
        totalAttempts: 75,
        averageScore: 68.7,
        completionRate: 72.0,
      },
    ] as Assessment[];
  }

  try {
    const constraints: QueryConstraint[] = [where('isActive', '==', true)];
    
    if (filters?.categories?.length) {
      constraints.push(where('category', 'in', filters.categories));
    }
    
    if (filters?.difficulties?.length) {
      constraints.push(where('difficulty', 'in', filters.difficulties));
    }
    
    if (filters?.modes?.length) {
      constraints.push(where('mode', 'in', filters.modes));
    }

    const q = query(collection(db, ASSESSMENTS_COLLECTION), ...constraints, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc['data']()
    })) as Assessment[];
  } catch (error) {
    console.error('Error getting assessments:', error);
    throw error;
  }
}

export async function updateAssessment(assessmentId: string, updates: Partial<Assessment>): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updated assessment', assessmentId, updates);
    return;
  }

  try {
    await updateDoc(doc(db, ASSESSMENTS_COLLECTION, assessmentId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
}

// Question Management
export async function createQuestion(question: Omit<Question, 'id'>): Promise<string> {
  if (isUsingMockAPI()) {
    const mockId = `question_${Date.now()}`;
    console.log('Mock: Created question', mockId);
    return mockId;
  }

  try {
    const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
      ...question,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usageCount: 0,
      successRate: 0,
    });
    return docRef['id'];
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

export async function getQuestion(questionId: string): Promise<Question | null> {
  if (isUsingMockAPI()) {
    return {
      id: questionId,
      type: 'multiple_choice',
      category: 'python',
      difficulty: 'intermediate',
      title: 'Python Data Types',
      description: 'Which of the following is a mutable data type in Python?',
      points: 10,
      timeLimit: 60,
      options: [
        { id: 'a', text: 'Tuple', isCorrect: false, explanation: 'Tuples are immutable' },
        { id: 'b', text: 'String', isCorrect: false, explanation: 'Strings are immutable' },
        { id: 'c', text: 'List', isCorrect: true, explanation: 'Lists are mutable' },
        { id: 'd', text: 'Integer', isCorrect: false, explanation: 'Integers are immutable' },
      ],
      explanation: 'Lists in Python are mutable, meaning their contents can be changed after creation.',
      resources: [
        {
          title: 'Python Data Types Documentation',
          url: 'https://docs.python.org/3/library/stdtypes.html',
          type: 'documentation',
        },
      ],
      tags: ['data-types', 'mutability'],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 50,
      successRate: 78.5,
    } as Question;
  }

  try {
    const docSnap = await getDoc(doc(db, QUESTIONS_COLLECTION, questionId));
    if (docSnap.exists()) {
      return { id: docSnap['id'], ...docSnap.data() } as Question;
    }
    return null;
  } catch (error) {
    console.error('Error getting question:', error);
    throw error;
  }
}

export async function getQuestions(questionIds: string[]): Promise<Question[]> {
  if (isUsingMockAPI()) {
    return questionIds.map((id, index) => ({
      id,
      type: 'multiple_choice' as QuestionType,
      category: 'python' as SkillCategory,
      difficulty: 'intermediate' as DifficultyLevel,
      title: `Question ${index + 1}`,
      description: `This is question ${index + 1}`,
      points: 10,
      options: [
        { id: 'a', text: 'Option A', isCorrect: index === 0 },
        { id: 'b', text: 'Option B', isCorrect: index === 1 },
        { id: 'c', text: 'Option C', isCorrect: index === 2 },
        { id: 'd', text: 'Option D', isCorrect: index === 3 },
      ],
      explanation: 'This is the explanation for the question.',
      tags: ['sample'],
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 10,
      successRate: 75,
    }));
  }

  try {
    const questions: Question[] = [];
    for (const questionId of questionIds) {
      const question = await getQuestion(questionId);
      if(question) {
        questions.push(question);
      }
    }
    return questions;
  } catch (error) {
    console.error('Error getting questions:', error);
    throw error;
  }
}

// Assessment Attempts
export async function startAssessment(userId: string, assessmentId: string): Promise<string> {
  if (isUsingMockAPI()) {
    const mockId = `attempt_${Date.now()}`;
    console.log('Mock: Started assessment attempt', mockId);
    return mockId;
  }

  try {
    const assessment = await getAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const attempt: Omit<AssessmentAttempt, 'id'> = {
      userId,
      assessmentId,
      startedAt: new Date(),
      status: 'in_progress',
      currentQuestionIndex: 0,
      timeRemaining: assessment.timeLimit * 60, // Convert to seconds
      answers: [],
      score: 0,
      percentage: 0,
      passed: false,
      timeSpent: 0,
      questionTimings: [],
      difficultyProgression: [],
      needsReview: false,
      badgesEarned: [],
    };

    const docRef = await addDoc(collection(db, ATTEMPTS_COLLECTION), {
      ...attempt,
      startedAt: serverTimestamp(),
    });

    return docRef['id'];
  } catch (error) {
    console.error('Error starting assessment:', error);
    throw error;
  }
}

export async function getAssessmentAttempt(attemptId: string): Promise<AssessmentAttempt | null> {
  if (isUsingMockAPI()) {
    return {
      id: attemptId,
      userId: 'user123',
      assessmentId: 'assessment123',
      startedAt: new Date(),
      status: 'in_progress',
      currentQuestionIndex: 1,
      timeRemaining: 3000,
      answers: [],
      score: 0,
      percentage: 0,
      passed: false,
      timeSpent: 300,
      questionTimings: [],
      difficultyProgression: ['intermediate'],
      needsReview: false,
      badgesEarned: [],
    } as AssessmentAttempt;
  }

  try {
    const docSnap = await getDoc(doc(db, ATTEMPTS_COLLECTION, attemptId));
    if (docSnap.exists()) {
      return { id: docSnap['id'], ...docSnap['data']() } as AssessmentAttempt;
    }
    return null;
  } catch (error) {
    console.error('Error getting assessment attempt:', error);
    throw error;
  }
}

export async function saveAnswer(attemptId: string, answer: UserAnswer): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Saved answer for attempt', attemptId, answer);
    return;
  }

  try {
    const attemptRef = doc(db, ATTEMPTS_COLLECTION, attemptId);
    await updateDoc(attemptRef, {
      answers: arrayUnion(answer),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving answer:', error);
    throw error;
  }
}

export async function updateAttemptProgress(
  attemptId: string, 
  updates: Partial<AssessmentAttempt>
): Promise<void> {
  if (isUsingMockAPI()) {
    console.log('Mock: Updated attempt progress', attemptId, updates);
    return;
  }

  try {
    await updateDoc(doc(db, ATTEMPTS_COLLECTION, attemptId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating attempt progress:', error);
    throw error;
  }
}

export async function submitAssessment(attemptId: string): Promise<AssessmentResult> {
  if (isUsingMockAPI()) {
    return {
      attemptId,
      userId: 'user123',
      assessmentId: 'assessment123',
      score: 85,
      percentage: 85,
      passed: true,
      completedAt: new Date(),
      categoryScores: [
        { category: 'python', score: 85, totalQuestions: 10, correctAnswers: 8 },
      ],
      difficultyScores: [
        { difficulty: 'intermediate', score: 85, totalQuestions: 10, correctAnswers: 8 },
      ],
      questionResults: [],
      percentileRank: 75,
      strengths: ['Python basics', 'Data structures'],
      weaknesses: ['Advanced concepts'],
      recommendations: [
        {
          type: 'study_material',
          title: 'Advanced Python Course',
          description: 'Improve your advanced Python skills',
          priority: 'high',
        },
      ],
      badges: [],
      skillLevelUpdates: [],
    } as AssessmentResult;
  }

  try {
    // This would be handled by a Cloud Function for complex scoring
    const attempt = await getAssessmentAttempt(attemptId);
    if (!attempt) {
      throw new Error('Assessment attempt not found');
    }

    // Calculate scores (simplified)
    const totalQuestions = attempt.answers.length;
    const correctAnswers = attempt.answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const result: Omit<AssessmentResult, 'attemptId'> = {
      userId: attempt['userId'],
      assessmentId: attempt.assessmentId,
      score: score,
      percentage: score,
      passed: score >= 70, // Assuming 70% passing score
      completedAt: new Date(),
      categoryScores: [],
      difficultyScores: [],
      questionResults: [],
      percentileRank: 50, // This would be calculated based on all results
      strengths: [],
      weaknesses: [],
      recommendations: [],
      badges: [],
      skillLevelUpdates: [],
    };

    // Update attempt status
    await updateAttemptProgress(attemptId, {
      status: 'completed',
      completedAt: new Date(),
      submittedAt: new Date(),
      score: score,
      percentage: score,
      passed: result.passed,
    });

    // Save result
    const resultRef = await addDoc(collection(db, RESULTS_COLLECTION), {
      ...result,
      attemptId,
      createdAt: serverTimestamp(),
    });

    return { ...result, attemptId };
  } catch (error) {
    console.error('Error submitting assessment:', error);
    throw error;
  }
}

// Progress and Analytics
export async function getUserProgress(userId: string): Promise<AssessmentProgress> {
  if (isUsingMockAPI()) {
    return {
      userId,
      totalAssessments: 25,
      completedAssessments: 18,
      certificatesEarned: 5,
      badgesEarned: 12,
      skillLevels: {
        python: 85,
        sql: 72,
        machine_learning: 45,
        statistics: 68,
        data_visualization: 55,
      } as Record<SkillCategory, number>,
      verifiedSkills: ['python', 'sql'],
      recentAttempts: [],
      upcomingAssessments: [],
      averageScore: 78.5,
      totalTimeSpent: 18000, // 5 hours in seconds
      streakDays: 7,
      lastActivity: new Date(),
    } as AssessmentProgress;
  }

  try {
    // This would aggregate data from multiple collections
    const attemptsQuery = query(
      collection(db, ATTEMPTS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc'),
      limit(10)
    );

    const attempts = await getDocs(attemptsQuery);
    const recentAttempts = attempts.docs.map(doc => ({
      id: doc['id'],
      ...doc['data']()
    })) as AssessmentAttempt[];

    // Calculate statistics
    const totalScore = recentAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const averageScore = recentAttempts.length > 0 ? totalScore / recentAttempts.length : 0;

    return {
      userId,
      totalAssessments: 0,
      completedAssessments: recentAttempts.length,
      certificatesEarned: 0,
      badgesEarned: 0,
      skillLevels: {} as Record<SkillCategory, number>,
      verifiedSkills: [],
      recentAttempts,
      upcomingAssessments: [],
      averageScore,
      totalTimeSpent: 0,
      streakDays: 0,
      lastActivity: new Date(),
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    throw error;
  }
}

export async function getLeaderboard(type: 'global' | 'category' | 'monthly' | 'weekly', category?: SkillCategory): Promise<Leaderboard> {
  if (isUsingMockAPI()) {
    return {
      id: `${type}_${category || 'global'}`,
      type,
      category,
      entries: [
        {
          rank: 1,
          userId: 'user1',
          displayName: 'Ana García',
          score: 2450,
          assessmentsCompleted: 15,
          badges: 8,
          certificates: 3,
          streak: 12,
        },
        {
          rank: 2,
          userId: 'user2',
          displayName: 'Carlos López',
          score: 2380,
          assessmentsCompleted: 14,
          badges: 7,
          certificates: 2,
          streak: 8,
        },
        {
          rank: 3,
          userId: 'user3',
          displayName: 'María Rodríguez',
          score: 2290,
          assessmentsCompleted: 12,
          badges: 6,
          certificates: 2,
          streak: 5,
        },
      ],
      lastUpdated: new Date(),
      totalParticipants: 156,
    } as Leaderboard;
  }

  try {
    // This would be generated by a Cloud Function and cached
    const leaderboardId = `${type}_${category || 'global'}`;
    const docSnap = await getDoc(doc(db, LEADERBOARDS_COLLECTION, leaderboardId));
    
    if (docSnap.exists()) {
      return { id: docSnap['id'], ...docSnap.data() } as Leaderboard;
    }

    // Return empty leaderboard if not found
    return {
      id: leaderboardId,
      type,
      category,
      entries: [],
      lastUpdated: new Date(),
      totalParticipants: 0,
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

// Certificate Management
export async function generateCertificate(
  userId: string, 
  assessmentId: string, 
  attemptId: string
): Promise<Certificate> {
  if (isUsingMockAPI()) {
    return {
      id: `cert_${Date.now()}`,
      templateId: 'template_basic',
      userId,
      assessmentId,
      title: 'Python Fundamentals Certificate',
      description: 'Certified completion of Python Fundamentals Assessment',
      issuedAt: new Date(),
      verificationCode: 'SEC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      score: 85,
      level: 'intermediate',
      skills: ['python'],
      isPublic: true,
      shareableUrl: `https://secid.mx/certificates/cert_${Date.now()}`,
    } as Certificate;
  }

  try {
    const result = await getDoc(doc(db, RESULTS_COLLECTION, attemptId));
    if (!result.exists()) {
      throw new Error('Assessment result not found');
    }

    const resultData = result['data']() as AssessmentResult;
    const assessment = await getAssessment(assessmentId);
    
    if (!assessment || !resultData.passed) {
      throw new Error('Certificate cannot be generated - assessment not passed');
    }

    const certificate: Omit<Certificate, 'id'> = {
      templateId: 'template_basic',
      userId,
      assessmentId,
      title: `${assessment.title} Certificate`,
      description: `Certified completion of ${assessment.title}`,
      issuedAt: new Date(),
      verificationCode: 'SEC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      score: resultData.score,
      level: assessment.difficulty,
      skills: [assessment.category],
      isPublic: true,
    };

    const docRef = await addDoc(collection(db, CERTIFICATES_COLLECTION), {
      ...certificate,
      issuedAt: serverTimestamp(),
    });

    return { id: docRef['id'], ...certificate };
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

export async function getUserCertificates(userId: string): Promise<Certificate[]> {
  if (isUsingMockAPI()) {
    return [
      {
        id: 'cert1',
        templateId: 'template_basic',
        userId,
        assessmentId: 'assessment1',
        title: 'Python Fundamentals Certificate',
        description: 'Certified completion of Python Fundamentals Assessment',
        issuedAt: new Date(),
        verificationCode: 'SEC-ABC123',
        score: 85,
        level: 'intermediate',
        skills: ['python'],
        isPublic: true,
      },
    ] as Certificate[];
  }

  try {
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where('userId', '==', userId),
      orderBy('issuedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc['data']()
    })) as Certificate[];
  } catch (error) {
    console.error('Error getting user certificates:', error);
    throw error;
  }
}

// Search and Discovery
export async function searchAssessments(searchTerm: string, filters?: AssessmentFilters): Promise<AssessmentSearchResult[]> {
  if (isUsingMockAPI()) {
    const mockAssessments = await getAssessments(filters);
    return mockAssessments
      .filter(assessment => 
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .map(assessment => ({
        assessment,
        relevanceScore: Math.random() * 100,
        matchedFields: ['title'],
        prerequisites: [],
      }));
  }

  try {
    // This would use Algolia or similar for full-text search
    // For now, implement basic filtering
    const assessments = await getAssessments(filters);
    const searchLower = searchTerm.toLowerCase();
    
    return assessments
      .filter(assessment => 
        assessment.title.toLowerCase().includes(searchLower) ||
        assessment.description.toLowerCase().includes(searchLower) ||
        assessment.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
      .map(assessment => ({
        assessment,
        relevanceScore: calculateRelevanceScore(assessment, searchTerm),
        matchedFields: getMatchedFields(assessment, searchTerm),
        prerequisites: [],
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  } catch (error) {
    console.error('Error searching assessments:', error);
    throw error;
  }
}

// Helper functions
function calculateRelevanceScore(assessment: Assessment, searchTerm: string): number {
  const searchLower = searchTerm.toLowerCase();
  let score = 0;
  
  if (assessment.title.toLowerCase().includes(searchLower)) score += 50;
  if (assessment.description.toLowerCase().includes(searchLower)) score += 30;
  if (assessment.tags.some(tag => tag.toLowerCase().includes(searchLower))) score += 20;
  
  return score;
}

function getMatchedFields(assessment: Assessment, searchTerm: string): string[] {
  const searchLower = searchTerm.toLowerCase();
  const fields: string[] = [];
  
  if (assessment.title.toLowerCase().includes(searchLower)) fields['push']('title');
  if (assessment['description'].toLowerCase().includes(searchLower)) fields['push']('description');
  if (assessment.tags.some(tag => tag.toLowerCase().includes(searchLower))) fields['push']('tags');
  
  return fields;
}

// Real-time subscriptions
export function subscribeToAttempt(attemptId: string, callback: (attempt: AssessmentAttempt) => void): () => void {
  if (isUsingMockAPI()) {
    console.log('Mock: Subscribed to attempt', attemptId);
    return () => console.log('Mock: Unsubscribed from attempt', attemptId);
  }

  return onSnapshot(doc(db, ATTEMPTS_COLLECTION, attemptId), (doc) => {
    if (doc['exists']()) {
      callback({ id: doc['id'], ...doc.data() } as AssessmentAttempt);
    }
  });
}

export function subscribeToLeaderboard(
  type: 'global' | 'category' | 'monthly' | 'weekly',
  category: SkillCategory | undefined,
  callback: (leaderboard: Leaderboard) => void
): () => void {
  if (isUsingMockAPI()) {
    console.log('Mock: Subscribed to leaderboard', type, category);
    return () => console.log('Mock: Unsubscribed from leaderboard');
  }

  const leaderboardId = `${type}_${category || 'global'}`;
  return onSnapshot(doc(db, LEADERBOARDS_COLLECTION, leaderboardId), (doc) => {
    if (doc['exists']()) {
      callback({ id: doc['id'], ...doc['data']() } as Leaderboard);
    }
  });
}