import { 
import { 
import { db, storage} from './firebase';

  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import type { 
  Course, 
  LearningPath, 
  CourseEnrollment, 
  CourseProgress,
  LessonProgress,
  QuizAttempt,
  Certificate,
  CourseCategory 
} from '../types';

// Collection references
const coursesRef = collection(db, 'courses');
const learningPathsRef = collection(db, 'learningPaths');
const enrollmentsRef = collection(db, 'enrollments');
const certificatesRef = collection(db, 'certificates');
const quizAttemptsRef = collection(db, 'quizAttempts');

// Course Functions
export const getCourses = async (filters?: {
  category?: CourseCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isPremium?: boolean;
  limit?: number;
}): Promise<Course[]> => {
  try {
    let coursesQuery = query(
      coursesRef,
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc')
    );

    if (filters?.category) {
      coursesQuery = query(coursesQuery, where('category', '==', filters.category));
    }

    if (filters?.difficulty) {
      coursesQuery = query(coursesQuery, where('difficulty', '==', filters.difficulty));
    }

    if (filters?.isPremium !== undefined) {
      coursesQuery = query(coursesQuery, where('isPremium', '==', filters.isPremium));
    }

    if (filters?.limit) {
      coursesQuery = query(coursesQuery, limit(filters.limit));
    }

    const snapshot = await getDocs(coursesQuery);
    return snapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Course[];
  } catch (error) {
    console.error('Error getting courses:', error);
    throw new Error('Failed to get courses');
  }
};

export const getCourse = async (courseId: string): Promise<Course> => {
  try {
    const courseDoc = await getDoc(doc(coursesRef, courseId));
    
    if (!courseDoc.exists()) {
      throw new Error('Course not found');
    }

    return {
      id: courseDoc['id'],
      ...courseDoc.data(),
      createdAt: courseDoc['data']().createdAt?.toDate() || new Date(),
      updatedAt: courseDoc.data().updatedAt?.toDate() || new Date()
    } as Course;
  } catch (error) {
    console.error('Error getting course:', error);
    throw new Error('Failed to get course');
  }
};

export const createCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> => {
  try {
    const courseDoc = {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(coursesRef, courseDoc);

    return {
      id: docRef['id'],
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating course:', error);
    throw new Error('Failed to create course');
  }
};

export const updateCourse = async (courseId: string, updates: Partial<Course>): Promise<void> => {
  try {
    const courseDocRef = doc(coursesRef, courseId);
    await updateDoc(courseDocRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating course:', error);
    throw new Error('Failed to update course');
  }
};

// Learning Path Functions
export const getLearningPaths = async (filters?: {
  category?: CourseCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isRecommended?: boolean;
}): Promise<LearningPath[]> => {
  try {
    let pathsQuery = query(
      learningPathsRef,
      orderBy('enrollmentCount', 'desc')
    );

    if (filters?.category) {
      pathsQuery = query(pathsQuery, where('category', '==', filters.category));
    }

    if (filters?.difficulty) {
      pathsQuery = query(pathsQuery, where('difficulty', '==', filters.difficulty));
    }

    if (filters?.isRecommended !== undefined) {
      pathsQuery = query(pathsQuery, where('isRecommended', '==', filters.isRecommended));
    }

    const snapshot = await getDocs(pathsQuery);
    return snapshot.docs.map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as LearningPath[];
  } catch (error) {
    console.error('Error getting learning paths:', error);
    throw new Error('Failed to get learning paths');
  }
};

export const getRecommendedPaths = async (userId: string): Promise<LearningPath[]> => {
  try {
    // Get user's enrollments to understand their interests
    const userEnrollments = await getUserEnrollments(userId);
    const enrolledCategories = new Set<CourseCategory>();
    
    for (const enrollment of userEnrollments) {
      const course = await getCourse(enrollment.courseId);
      enrolledCategories.add(course.category);
    }

    // Get recommended paths based on user's interests
    let pathsQuery = query(
      learningPathsRef,
      where('isRecommended', '==', true),
      orderBy('enrollmentCount', 'desc'),
      limit(6)
    );

    const snapshot = await getDocs(pathsQuery);
    let paths = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      createdAt: doc['data']().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as LearningPath[];

    // Prioritize paths in categories the user has shown interest in
    paths.sort((a, b) => {
      const aInUserInterest = enrolledCategories.has(a.category) ? 1 : 0;
      const bInUserInterest = enrolledCategories.has(b.category) ? 1 : 0;
      
      if (aInUserInterest !== bInUserInterest) {
        return bInUserInterest - aInUserInterest;
      }
      
      return b.enrollmentCount - a.enrollmentCount;
    });

    return paths.slice(0, 3); // Return top 3 recommendations
  } catch (error) {
    console.error('Error getting recommended paths:', error);
    return [];
  }
};

// Enrollment Functions
export const enrollInCourse = async (userId: string, courseId: string): Promise<CourseEnrollment> => {
  try {
    // Check if already enrolled
    const existingEnrollmentQuery = query(
      enrollmentsRef,
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    
    const existingSnapshot = await getDocs(existingEnrollmentQuery);
    
    if (!existingSnapshot.empty) {
      const existingEnrollment = existingSnapshot.docs?.[0];
      return {
        id: existingEnrollment['id'],
        ...existingEnrollment.data(),
        enrolledAt: existingEnrollment['data']().enrolledAt?.toDate() || new Date(),
        completedAt: existingEnrollment.data().completedAt?.toDate(),
        lastAccessedAt: existingEnrollment['data']().lastAccessedAt?.toDate() || new Date(),
        progress: {
          ...existingEnrollment.data().progress,
          lastActivity: existingEnrollment['data']().progress?.lastActivity?.toDate() || new Date(),
          updatedAt: existingEnrollment.data().progress['updatedAt']?.toDate() || new Date()
        }
      } as CourseEnrollment;
    }

    // Get course details
    const course = await getCourse(courseId);

    // Create initial progress
    const initialProgress: CourseProgress = {
      courseId,
      userId,
      completedLessons: [],
      currentLesson: course.lessons.length > 0 ? course.lessons?.[0].id : undefined,
      totalProgress: 0,
      lessonProgress: {},
      quizScores: {},
      timeSpent: 0,
      lastActivity: new Date(),
      streak: 0,
      updatedAt: new Date()
    };

    // Create enrollment
    const enrollmentData = {
      courseId,
      userId,
      enrolledAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp(),
      progress: {
        ...initialProgress,
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      status: 'active'
    };

    const docRef = await addDoc(enrollmentsRef, enrollmentData);

    // Update course enrollment count
    const courseDocRef = doc(coursesRef, courseId);
    await updateDoc(courseDocRef, {
      totalEnrollments: increment(1),
      updatedAt: serverTimestamp()
    });

    return {
      id: docRef['id'],
      ...enrollmentData,
      enrolledAt: new Date(),
      lastAccessedAt: new Date(),
      progress: initialProgress
    } as CourseEnrollment;
  } catch (error) {
    console.error('Error enrolling in course:', error);
    throw new Error('Failed to enroll in course');
  }
};

export const getUserEnrollments = async (userId: string): Promise<CourseEnrollment[]> => {
  try {
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('userId', '==', userId),
      orderBy('lastAccessedAt', 'desc')
    );

    const snapshot = await getDocs(enrollmentsQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      enrolledAt: doc['data']().enrolledAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
      lastAccessedAt: doc['data']().lastAccessedAt?.toDate() || new Date(),
      progress: {
        ...doc.data().progress,
        lastActivity: doc['data']().progress?.lastActivity?.toDate() || new Date(),
        updatedAt: doc.data().progress['updatedAt']?.toDate() || new Date()
      }
    })) as CourseEnrollment[];
  } catch (error) {
    console.error('Error getting user enrollments:', error);
    throw new Error('Failed to get user enrollments');
  }
};

export const getUserEnrollment = async (userId: string, courseId: string): Promise<CourseEnrollment | null> => {
  try {
    const enrollmentQuery = query(
      enrollmentsRef,
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );

    const snapshot = await getDocs(enrollmentQuery);
    
    if (snapshot['empty']) {
      return null;
    }

    const doc = snapshot['docs'][0];
    return {
      id: doc['id'],
      ...doc['data'](),
      enrolledAt: doc['data']().enrolledAt?.toDate() || new Date(),
      completedAt: doc['data']().completedAt?.toDate(),
      lastAccessedAt: doc.data().lastAccessedAt?.toDate() || new Date(),
      progress: {
        ...doc['data']().progress,
        lastActivity: doc.data().progress?.lastActivity?.toDate() || new Date(),
        updatedAt: doc['data']().progress['updatedAt']?.toDate() || new Date()
      }
    } as CourseEnrollment;
  } catch (error) {
    console.error('Error getting user enrollment:', error);
    throw new Error('Failed to get user enrollment');
  }
};

// Progress Functions
export const updateLessonProgress = async (
  enrollmentId: string, 
  lessonId: string, 
  progress: number
): Promise<void> => {
  try {
    const enrollmentDocRef = doc(enrollmentsRef, enrollmentId);
    const enrollmentDoc = await getDoc(enrollmentDocRef);
    
    if (!enrollmentDoc.exists()) {
      throw new Error('Enrollment not found');
    }

    const enrollmentData = enrollmentDoc['data']();
    const currentProgress = enrollmentData.progress;

    // Update lesson progress
    const updatedLessonProgress: LessonProgress = {
      lessonId,
      status: progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started',
      progress: Math.min(100, Math.max(0, progress)),
      timeSpent: (currentProgress.lessonProgress[lessonId]?.timeSpent || 0) + 5, // Add 5 minutes
      completedAt: progress >= 100 ? new Date() : undefined,
      lastAccessedAt: new Date()
    };

    // Update completed lessons array
    const completedLessons = new Set(currentProgress.completedLessons);
    if (progress >= 100) {
      completedLessons.add(lessonId);
    }

    // Get course to calculate total progress
    const course = await getCourse(enrollmentData.courseId);
    const totalProgress = (completedLessons.size / course.lessons.length) * 100;

    // Check if course is completed
    const isCompleted = totalProgress >= 100;

    const updates: any = {
      'progress.lessonProgress': {
        ...currentProgress.lessonProgress,
        [lessonId]: {
          ...updatedLessonProgress,
          completedAt: updatedLessonProgress.completedAt ? Timestamp.fromDate(updatedLessonProgress.completedAt) : null,
          lastAccessedAt: Timestamp.fromDate(updatedLessonProgress.lastAccessedAt)
        }
      },
      'progress.completedLessons': Array.from(completedLessons),
      'progress.totalProgress': totalProgress,
      'progress.timeSpent': currentProgress.timeSpent + 5,
      'progress.lastActivity': serverTimestamp(),
      'progress['updatedAt']': serverTimestamp(),
      lastAccessedAt: serverTimestamp()
    };

    if (isCompleted && enrollmentData['status'] !== 'completed') {
      updates['status'] = 'completed';
      updates.completedAt = serverTimestamp();
    }

    await updateDoc(enrollmentDocRef, updates);

    // Generate certificate if course is completed and has certificate enabled
    if (isCompleted && course.certificate.enabled) {
      await generateCertificate(enrollmentData['userId'], enrollmentData.courseId, enrollmentId);
    }
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    throw new Error('Failed to update lesson progress');
  }
};

export const submitQuizAttempt = async (
  enrollmentId: string,
  lessonId: string,
  attempt: Omit<QuizAttempt, 'id'>
): Promise<QuizAttempt> => {
  try {
    const attemptData = {
      ...attempt,
      enrollmentId,
      lessonId,
      completedAt: serverTimestamp()
    };

    const docRef = await addDoc(quizAttemptsRef, attemptData);

    // Update enrollment with quiz score
    const enrollmentDocRef = doc(enrollmentsRef, enrollmentId);
    const enrollmentDoc = await getDoc(enrollmentDocRef);
    
    if (enrollmentDoc.exists()) {
      const currentProgress = enrollmentDoc.data().progress;
      const existingScores = currentProgress.quizScores[lessonId] || [];
      
      await updateDoc(enrollmentDocRef, {
        [`progress.quizScores.${lessonId}`]: [
          ...existingScores,
          {
            id: docRef['id'],
            ...attempt,
            completedAt: Timestamp.fromDate(attempt.completedAt)
          }
        ],
        'progress.lastActivity': serverTimestamp(),
        'progress['updatedAt']': serverTimestamp()
      });
    }

    return {
      id: docRef['id'],
      ...attempt
    };
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw new Error('Failed to submit quiz attempt');
  }
};

// Certificate Functions
export const generateCertificate = async (
  userId: string, 
  courseId: string, 
  enrollmentId: string
): Promise<Certificate> => {
  try {
    const course = await getCourse(courseId);
    const enrollment = await getUserEnrollment(userId, courseId);
    
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check if certificate already exists
    const existingCertQuery = query(
      certificatesRef,
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    
    const existingSnapshot = await getDocs(existingCertQuery);
    
    if (!existingSnapshot.empty) {
      const existingCert = existingSnapshot.docs?.[0];
      return {
        id: existingCert['id'],
        ...existingCert.data(),
        issuedAt: existingCert['data']().issuedAt?.toDate() || new Date(),
        expiresAt: existingCert.data().expiresAt?.toDate()
      } as Certificate;
    }

    // Generate verification code
    const verificationCode = `SECID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const certificateData = {
      userId,
      courseId,
      type: 'course' as const,
      title: `Certificate of Completion - ${course.title}`,
      description: `This certifies that the recipient has successfully completed the course "${course.title}" and demonstrated proficiency in the subject matter.`,
      issuer: 'SECiD - Sociedad de Egresados en Ciencia de Datos',
      issuedAt: serverTimestamp(),
      expiresAt: null, // Course certificates don't expire
      credentialUrl: `${window.location.origin}/certificates/${verificationCode}`,
      pdfUrl: '', // Would be generated by a certificate service
      verificationCode,
      metadata: {
        finalScore: calculateFinalScore(enrollment),
        completionTime: enrollment.progress.timeSpent / 60, // Convert to hours
        achievements: getAchievements(enrollment)
      }
    };

    const docRef = await addDoc(certificatesRef, certificateData);

    // Update enrollment with certificate ID
    const enrollmentDocRef = doc(enrollmentsRef, enrollmentId);
    await updateDoc(enrollmentDocRef, {
      certificateId: docRef['id']
    });

    return {
      id: docRef['id'],
      ...certificateData,
      issuedAt: new Date(),
      expiresAt: undefined
    } as Certificate;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw new Error('Failed to generate certificate');
  }
};

export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  try {
    const certificatesQuery = query(
      certificatesRef,
      where('userId', '==', userId),
      orderBy('issuedAt', 'desc')
    );

    const snapshot = await getDocs(certificatesQuery);
    return snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      issuedAt: doc['data']().issuedAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate()
    })) as Certificate[];
  } catch (error) {
    console.error('Error getting user certificates:', error);
    throw new Error('Failed to get user certificates');
  }
};

// Helper Functions
const calculateFinalScore = (enrollment: CourseEnrollment): number => {
  const quizScores = Object.values(enrollment.progress.quizScores).flat();
  if (quizScores.length === 0) return 100; // If no quizzes, assume perfect score
  
  const totalScore = quizScores.reduce((sum, attempt) => sum + attempt.score, 0);
  return Math.round(totalScore / quizScores.length);
};

const getAchievements = (enrollment: CourseEnrollment): string[] => {
  const achievements: string[] = [];
  
  if (enrollment.progress.streak >= 7) {
    achievements.push('Week Streak');
  }
  
  if (enrollment.progress.streak >= 30) {
    achievements.push('Month Streak');
  }
  
  if (enrollment.progress.timeSpent >= 600) { // 10 hours
    achievements.push('Time Champion');
  }
  
  const quizScores = Object.values(enrollment.progress.quizScores).flat();
  const averageQuizScore = quizScores.length > 0 
    ? quizScores.reduce((sum, attempt) => sum + attempt.score, 0) / quizScores.length
    : 0;
  
  if (averageQuizScore >= 90) {
    achievements.push('Quiz Master');
  }
  
  if (enrollment.progress.totalProgress === 100) {
    achievements.push('Course Completed');
  }
  
  return achievements;
};

// Search Functions
export const searchCourses = async (query: string, filters?: {
  category?: CourseCategory;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isPremium?: boolean;
}): Promise<Course[]> => {
  try {
    // Get all courses (in a real app, you'd use full-text search)
    const courses = await getCourses(filters);
    
    // Client-side filtering by search query
    const searchTerm = query.toLowerCase();
    return courses.filter(course => 
      course.title.toLowerCase().includes(searchTerm) ||
      course.description.toLowerCase().includes(searchTerm) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      course.learningObjectives.some(objective => objective.toLowerCase().includes(searchTerm))
    );
  } catch (error) {
    console.error('Error searching courses:', error);
    throw new Error('Failed to search courses');
  }
};

// Analytics Functions
export const getCourseAnalytics = async (courseId: string): Promise<{
  totalEnrollments: number;
  completionRate: number;
  averageRating: number;
  averageCompletionTime: number;
  popularLessons: Array<{ lessonId: string; completionRate: number }>;
}> => {
  try {
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('courseId', '==', courseId)
    );

    const snapshot = await getDocs(enrollmentsQuery);
    const enrollments = snapshot['docs'].map(doc => ({
      id: doc['id'],
      ...doc.data(),
      enrolledAt: doc['data']().enrolledAt?.toDate() || new Date(),
      completedAt: doc.data().completedAt?.toDate(),
      lastAccessedAt: doc['data']().lastAccessedAt?.toDate() || new Date(),
      progress: {
        ...doc.data().progress,
        lastActivity: doc['data']().progress?.lastActivity?.toDate() || new Date(),
        updatedAt: doc.data().progress['updatedAt']?.toDate() || new Date()
      }
    })) as CourseEnrollment[];

    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e['status'] === 'completed');
    const completionRate = totalEnrollments > 0 ? (completedEnrollments.length / totalEnrollments) * 100 : 0;
    
    const averageCompletionTime = completedEnrollments.length > 0
      ? completedEnrollments.reduce((sum, e) => sum + e.progress.timeSpent, 0) / completedEnrollments.length / 60 // Convert to hours
      : 0;

    // Calculate lesson popularity
    const course = await getCourse(courseId);
    const lessonCompletions: Record<string, number> = {};
    
    enrollments.forEach(enrollment => {
      enrollment.progress.completedLessons.forEach(lessonId => {
        lessonCompletions[lessonId] = (lessonCompletions[lessonId] || 0) + 1;
      });
    });

    const popularLessons = course.lessons.map(lesson => ({
      lessonId: lesson['id'],
      completionRate: totalEnrollments > 0 ? ((lessonCompletions[lesson['id']] || 0) / totalEnrollments) * 100 : 0
    })).sort((a, b) => b.completionRate - a.completionRate);

    return {
      totalEnrollments,
      completionRate,
      averageRating: course.averageRating,
      averageCompletionTime,
      popularLessons
    };
  } catch (error) {
    console.error('Error getting course analytics:', error);
    throw new Error('Failed to get course analytics');
  }
};