// Learning and course types for SECiD platform

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: CourseInstructor;
  thumbnail?: string;
  category: string;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  lessonsCount: number;
  enrollmentsCount: number;
  rating: number;
  reviewsCount: number;
  price: number;
  currency: string;
  isFree: boolean;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseInstructor {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  title: string;
  company?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  duration: number; // minutes
  order: number;
  content?: string;
  videoUrl?: string;
  attachments?: LessonAttachment[];
  isPreview: boolean;
}

export interface LessonAttachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress: number; // 0-100
  startedAt: Date;
  completedAt?: Date;
  lastAccessedAt?: Date;
  certificateId?: string;
}

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100 for videos
  completedAt?: Date;
  timeSpent: number; // seconds
  lastPosition?: number; // for videos
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  userName: string;
  issuedAt: Date;
  certificateUrl: string;
  verificationCode: string;
}
