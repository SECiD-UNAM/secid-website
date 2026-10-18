/**
 * Assessment System Type Definitions
 */

export type QuestionType =
  | 'multiple_choice'
  | 'single_choice'
  | 'true_false'
  | 'coding_challenge'
  | 'practical_scenario'
  | 'drag_drop'
  | 'fill_blank'
  | 'essay'
  | 'code_review'
  | 'sql_query';

export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type SkillCategory =
  | 'python'
  | 'sql'
  | 'machine_learning'
  | 'statistics'
  | 'data_visualization'
  | 'big_data'
  | 'deep_learning'
  | 'data_engineering'
  | 'business_intelligence'
  | 'excel'
  | 'r'
  | 'tableau'
  | 'power_bi'
  | 'spark'
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'docker'
  | 'git'
  | 'linux'
  | 'apis'
  | 'etl'
  | 'databases'
  | 'mongodb'
  | 'hadoop';

export type AssessmentMode = 'practice' | 'certification';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface CodingChallenge {
  starterCode: string;
  language: 'python' | 'sql' | 'r' | 'javascript';
  testCases: TestCase[];
  expectedOutput?: string;
  timeLimit?: number; // in minutes
}

export interface TestCase {
  input: any;
  expectedOutput: any;
  description: string;
  isVisible: boolean; // Some test cases are hidden
}

export interface Question {
  id: string;
  type: QuestionType;
  category: SkillCategory;
  difficulty: DifficultyLevel;
  title: string;
  description: string;
  points: number;
  timeLimit?: number; // in seconds

  // Question content based on type
  options?: QuestionOption[]; // For multiple choice
  correctAnswer?: string | boolean; // For single choice, true/false
  codingChallenge?: CodingChallenge;
  fillBlanks?: string[]; // For fill in the blank
  dragDropItems?: DragDropItem[];

  // Explanations and resources
  explanation: string;
  resources?: Resource[];

  // Metadata
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  successRate: number;

  // Peer review for subjective questions
  requiresPeerReview?: boolean;
  reviewCriteria?: string[];
}

export interface DragDropItem {
  id: string;
  content: string;
  category: string;
  correctPosition?: number;
}

export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'book' | 'course' | 'documentation';
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  category: SkillCategory;
  difficulty: DifficultyLevel;
  mode: AssessmentMode;

  // Configuration
  questionIds: string[];
  totalQuestions: number;
  timeLimit: number; // in minutes
  passingScore: number; // percentage
  maxAttempts?: number;
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  allowReviewAnswers: boolean;

  // Adaptive difficulty
  isAdaptive: boolean;
  difficultyAdjustmentRules?: DifficultyRule[];

  // Certification
  certificateTemplate?: string;
  skillBadge?: SkillBadge;

  // Prerequisites
  prerequisites?: string[]; // Assessment IDs
  requiredSkillLevel?: number;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags: string[];

  // Analytics
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
}

export interface DifficultyRule {
  condition:
    | 'correct_streak'
    | 'incorrect_streak'
    | 'time_remaining'
    | 'overall_score';
  threshold: number;
  action: 'increase_difficulty' | 'decrease_difficulty' | 'skip_question';
}

export interface SkillBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  color: string;
  level: number;
  requirements: BadgeRequirement[];
}

export interface BadgeRequirement {
  type: 'min_score' | 'streak' | 'time_limit' | 'attempts';
  value: number;
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  assessmentId: string;
  startedAt: Date;
  completedAt?: Date;
  submittedAt?: Date;

  // Current state
  status: 'in_progress' | 'paused' | 'completed' | 'submitted' | 'expired';
  currentQuestionIndex: number;
  timeRemaining: number; // in seconds

  // Answers and results
  answers: UserAnswer[];
  score: number;
  percentage: number;
  passed: boolean;

  // Performance analytics
  timeSpent: number; // total time in seconds
  questionTimings: QuestionTiming[];
  difficultyProgression: DifficultyLevel[];

  // Certification
  certificateId?: string;
  badgesEarned: string[];

  // Review and feedback
  needsReview: boolean;
  reviewAssignments?: PeerReview[];
  feedback?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedAnswer?: string | string[] | boolean;
  codeSubmission?: string;
  textAnswer?: string;
  dragDropAnswer?: Record<string, number>;
  fillBlankAnswers?: string[];

  // Metadata
  timeSpent: number; // in seconds
  isCorrect: boolean;
  pointsEarned: number;
  submittedAt: Date;

  // Code execution results (for coding challenges)
  executionResults?: CodeExecutionResult[];
  compilationError?: string;
}

export interface CodeExecutionResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: any;
  executionTime: number;
  memoryUsed?: number;
  error?: string;
}

export interface QuestionTiming {
  questionId: string;
  timeSpent: number;
  skipped: boolean;
  changedAnswer: boolean;
  flaggedForReview: boolean;
}

export interface PeerReview {
  id: string;
  questionId: string;
  reviewerId: string;
  revieweeId: string;
  attemptId: string;

  status: 'pending' | 'in_progress' | 'completed';
  assignedAt: Date;
  completedAt?: Date;

  criteria: ReviewCriterion[];
  overallScore: number;
  feedback: string;
  isAnonymous: boolean;
}

export interface ReviewCriterion {
  name: string;
  description: string;
  score: number; // 1-5 scale
  feedback: string;
}

export interface AssessmentResult {
  attemptId: string;
  userId: string;
  assessmentId: string;

  // Overall results
  score: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;

  // Performance breakdown
  categoryScores: CategoryScore[];
  difficultyScores: DifficultyScore[];
  questionResults: QuestionResult[];

  // Ranking and percentiles
  percentileRank: number;
  globalRank?: number;
  categoryRank?: number;

  // Recommendations
  strengths: string[];
  weaknesses: string[];
  recommendations: Recommendation[];

  // Certification
  certificate?: Certificate;
  badges: SkillBadge[];
  skillLevelUpdates: SkillLevelUpdate[];
}

export interface CategoryScore {
  category: SkillCategory;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface DifficultyScore {
  difficulty: DifficultyLevel;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
  difficulty: DifficultyLevel;
  userAnswer: any;
  explanation: string;
  resources: Resource[];
}

export interface Recommendation {
  type: 'study_material' | 'practice_assessment' | 'course' | 'mentorship';
  title: string;
  description: string;
  url?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Certificate {
  id: string;
  templateId: string;
  userId: string;
  assessmentId: string;

  title: string;
  description: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationCode: string;

  // Certificate data
  score: number;
  level: DifficultyLevel;
  skills: SkillCategory[];

  // Sharing and verification
  pdfUrl?: string;
  isPublic: boolean;
  shareableUrl?: string;
  blockchainHash?: string; // For blockchain verification
}

export interface SkillLevelUpdate {
  skill: SkillCategory;
  previousLevel: number;
  newLevel: number;
  experience: number;
  verificationMethod: 'assessment' | 'peer_review' | 'project' | 'manual';
}

export interface AssessmentProgress {
  userId: string;
  totalAssessments: number;
  completedAssessments: number;
  certificatesEarned: number;
  badgesEarned: number;

  // Skill levels (0-100)
  skillLevels: Record<SkillCategory, number>;
  verifiedSkills: SkillCategory[];

  // Recent activity
  recentAttempts: AssessmentAttempt[];
  upcomingAssessments: string[];

  // Statistics
  averageScore: number;
  totalTimeSpent: number;
  streakDays: number;
  lastActivity: Date;
}

export interface Leaderboard {
  id: string;
  type: 'global' | 'category' | 'monthly' | 'weekly';
  category?: SkillCategory;

  entries: LeaderboardEntry[];
  lastUpdated: Date;
  totalParticipants: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatar?: string;
  score: number;
  assessmentsCompleted: number;
  badges: number;
  certificates: number;
  streak: number;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;

  questionIds: string[];
  totalQuestions: number;

  // Filtering and organization
  difficulties: DifficultyLevel[];
  questionTypes: QuestionType[];
  tags: string[];

  // Access control
  isPublic: boolean;
  maintainers: string[];

  // Quality metrics
  averageRating: number;
  usageCount: number;
  lastUpdated: Date;
}

export interface AssessmentAnalytics {
  assessmentId: string;

  // Participation metrics
  totalAttempts: number;
  uniqueUsers: number;
  completionRate: number;
  averageScore: number;

  // Performance distribution
  scoreDistribution: ScoreDistribution[];
  difficultyAnalysis: DifficultyAnalysis[];

  // Question analytics
  questionPerformance: QuestionPerformance[];
  timeAnalysis: TimeAnalysis;

  // Trends
  monthlyTrends: MonthlyTrend[];
  categoryTrends: CategoryTrend[];
}

export interface ScoreDistribution {
  range: string; // "0-10", "11-20", etc.
  count: number;
  percentage: number;
}

export interface DifficultyAnalysis {
  difficulty: DifficultyLevel;
  averageScore: number;
  completionRate: number;
  averageTime: number;
}

export interface QuestionPerformance {
  questionId: string;
  successRate: number;
  averageTime: number;
  skipRate: number;
  flaggedCount: number;
}

export interface TimeAnalysis {
  averageTimeToComplete: number;
  medianTime: number;
  fastestCompletion: number;
  slowestCompletion: number;
  timeoutRate: number;
}

export interface MonthlyTrend {
  month: string;
  attempts: number;
  averageScore: number;
  completionRate: number;
}

export interface CategoryTrend {
  category: SkillCategory;
  attempts: number;
  averageScore: number;
  growth: number; // percentage change
}

// UI State Types
export interface AssessmentUIState {
  currentAssessment?: Assessment;
  currentAttempt?: AssessmentAttempt;
  currentQuestionIndex: number;
  showExplanation: boolean;
  isTimerPaused: boolean;
  flaggedQuestions: string[];
  reviewMode: boolean;
}

// Filter and Search Types
export interface AssessmentFilters {
  categories: SkillCategory[];
  difficulties: DifficultyLevel[];
  modes: AssessmentMode[];
  duration: [number, number]; // min, max in minutes
  minRating: number;
  hasPrerequisites: boolean;
  showCompleted: boolean;
}

export interface AssessmentSearchResult {
  assessment: Assessment;
  relevanceScore: number;
  matchedFields: string[];
  prerequisites: Assessment[];
}
