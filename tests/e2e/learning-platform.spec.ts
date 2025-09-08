import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for learning platform
const learningTestData = {
  course: {
    title: 'Advanced Machine Learning with TensorFlow',
    description: 'Master deep learning concepts and TensorFlow implementation',
    duration: '8 weeks',
    level: 'Advanced',
    price: 1999,
    modules: [
      'Introduction to Deep Learning',
      'Neural Network Architectures',
      'Convolutional Neural Networks',
      'Recurrent Neural Networks',
      'Transformers and Attention',
      'Model Optimization',
      'Deployment Strategies',
      'Final Project',
    ],
  },
  learningPath: {
    title: 'From Data Analyst to ML Engineer',
    description: 'Complete roadmap for transitioning to ML engineering',
    courses: ['Python for Data Science', 'Statistics & Probability', 'Machine Learning Fundamentals', 'Advanced ML', 'MLOps'],
    estimatedTime: '6 months',
  },
  certification: {
    name: 'SECiD Certified Data Scientist',
    requirements: ['Complete 5 courses', 'Pass final assessment', 'Submit capstone project'],
    validityPeriod: '2 years',
  },
  quiz: {
    title: 'Python Data Structures Quiz',
    questions: [
      {
        question: 'What is the time complexity of list.append() in Python?',
        options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
        correct: 0,
      },
      {
        question: 'Which data structure uses LIFO principle?',
        options: ['Queue', 'Stack', 'Deque', 'Heap'],
        correct: 1,
      },
    ],
  },
};

class LearningPlatformFlow {
  constructor(private page: Page) {}

  // Course Navigation
  async navigateToCourses() {
    await this.page.goto('/es/dashboard/learning');
    await expect(this.page).toHaveURL('/es/dashboard/learning');
  }

  async browseCourses() {
    // Filter courses
    await this.page.selectOption('[data-testid="course-level"]', 'advanced');
    await this.page.selectOption('[data-testid="course-category"]', 'machine-learning');
    await this.page.fill('[data-testid="price-max"]', '2000');
    await this.page.click('[data-testid="apply-filters"]');
    
    // Wait for filtered results
    await this.page.waitForSelector('[data-testid="course-card"]');
    
    // Verify filters applied
    const courses = await this.page.locator('[data-testid="course-card"]').count();
    expect(courses).toBeGreaterThan(0);
  }

  async enrollInCourse(courseTitle: string) {
    // Search for specific course
    await this.page.fill('[data-testid="course-search"]', courseTitle);
    await this.page.click('[data-testid="search-courses"]');
    
    // Click on course
    await this.page.click(`[data-testid="course-card"]:has-text("${courseTitle}")`);
    
    // View course details
    await expect(this.page.locator('h1')).toContainText(courseTitle);
    await expect(this.page.locator('[data-testid="course-modules"]')).toBeVisible();
    
    // Enroll in course
    await this.page.click('[data-testid="enroll-course"]');
    
    // Handle payment if required
    if (await this.page.locator('[data-testid="payment-form"]').isVisible()) {
      await this.handleCoursePayment();
    }
    
    // Verify enrollment
    await expect(this.page.locator('[data-testid="enrollment-success"]')).toBeVisible();
  }

  async handleCoursePayment() {
    // Fill payment details
    await this.page.fill('[data-testid="card-number"]', '4242424242424242');
    await this.page.fill('[data-testid="card-expiry"]', '12/25');
    await this.page.fill('[data-testid="card-cvc"]', '123');
    await this.page.fill('[data-testid="card-name"]', 'Test User');
    
    // Apply discount code if available
    await this.page.fill('[data-testid="discount-code"]', 'SECID20');
    await this.page.click('[data-testid="apply-discount"]');
    
    // Complete payment
    await this.page.click('[data-testid="complete-payment"]');
    await this.page.waitForSelector('[data-testid="payment-success"]');
  }

  // Course Progress
  async startLearning() {
    // Navigate to my courses
    await this.page.click('[data-testid="my-courses"]');
    
    // Select a course
    await this.page.click('[data-testid="course-card"]:first-child [data-testid="continue-learning"]');
    
    // Start first module
    await this.page.click('[data-testid="module-1"] [data-testid="start-module"]');
  }

  async completeLesson() {
    // Watch video content
    const video = this.page.locator('[data-testid="lesson-video"]');
    if (await video.isVisible()) {
      await this.page.click('[data-testid="play-video"]');
      // Simulate watching
      await this.page.waitForTimeout(2000);
    }
    
    // Read lesson content
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Complete lesson activities
    if (await this.page.locator('[data-testid="lesson-activity"]').isVisible()) {
      await this.page.fill('[data-testid="activity-answer"]', 'Sample answer for the activity');
      await this.page.click('[data-testid="submit-activity"]');
    }
    
    // Mark lesson as complete
    await this.page.click('[data-testid="mark-complete"]');
    
    // Verify progress updated
    await expect(this.page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', /[1-9]\d*/);
  }

  async takeQuiz(quiz: typeof learningTestData.quiz) {
    await this.page.click('[data-testid="start-quiz"]');
    
    // Answer questions
    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      await this.page.click(`[data-testid="question-${i}"] [data-testid="option-${question.correct}"]`);
      await this.page.click('[data-testid="next-question"]');
    }
    
    // Submit quiz
    await this.page.click('[data-testid="submit-quiz"]');
    
    // View results
    await expect(this.page.locator('[data-testid="quiz-score"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="quiz-feedback"]')).toBeVisible();
  }

  // Learning Paths
  async exploreLearningPaths() {
    await this.page.goto('/es/dashboard/learning/paths');
    
    // Browse available paths
    await expect(this.page.locator('[data-testid="learning-path-card"]')).toHaveCount(5);
    
    // Filter by career goal
    await this.page.selectOption('[data-testid="career-goal"]', 'ml-engineer');
    await this.page.click('[data-testid="filter-paths"]');
  }

  async enrollInLearningPath(pathTitle: string) {
    await this.page.click(`[data-testid="learning-path-card"]:has-text("${pathTitle}")`);
    
    // View path details
    await expect(this.page.locator('[data-testid="path-roadmap"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="path-courses"]')).toBeVisible();
    
    // Enroll in path
    await this.page.click('[data-testid="enroll-path"]');
    
    // Verify enrollment
    await expect(this.page.locator('[data-testid="path-progress"]')).toBeVisible();
  }

  // Certifications
  async viewCertifications() {
    await this.page.goto('/es/dashboard/learning/certifications');
    
    // Browse available certifications
    await expect(this.page.locator('[data-testid="certification-card"]')).toHaveCount(3);
  }

  async startCertification(certName: string) {
    await this.page.click(`[data-testid="certification-card"]:has-text("${certName}")`);
    
    // View requirements
    await expect(this.page.locator('[data-testid="cert-requirements"]')).toBeVisible();
    
    // Check eligibility
    await this.page.click('[data-testid="check-eligibility"]');
    
    // Start certification process
    if (await this.page.locator('[data-testid="eligible-status"]').isVisible()) {
      await this.page.click('[data-testid="start-certification"]');
    }
  }

  async takeAssessment() {
    // Start assessment
    await this.page.click('[data-testid="begin-assessment"]');
    
    // Answer assessment questions (simplified)
    for (let i = 0; i < 20; i++) {
      await this.page.click(`[data-testid="assessment-q-${i}"] [data-testid="option-0"]`);
      await this.page.click('[data-testid="next-assessment-question"]');
    }
    
    // Submit assessment
    await this.page.click('[data-testid="submit-assessment"]');
    
    // Wait for results
    await this.page.waitForSelector('[data-testid="assessment-results"]');
  }

  // Interactive Features
  async participateInDiscussion() {
    // Navigate to course discussions
    await this.page.click('[data-testid="course-discussions"]');
    
    // Create new discussion
    await this.page.click('[data-testid="new-discussion"]');
    await this.page.fill('[data-testid="discussion-title"]', 'Question about neural network initialization');
    await this.page.fill('[data-testid="discussion-body"]', 'Can someone explain the benefits of Xavier initialization?');
    await this.page.click('[data-testid="post-discussion"]');
    
    // Reply to existing discussion
    await this.page.click('[data-testid="discussion-thread"]:first-child');
    await this.page.fill('[data-testid="reply-input"]', 'Great question! Xavier initialization helps with...');
    await this.page.click('[data-testid="post-reply"]');
  }

  async submitAssignment() {
    // Navigate to assignments
    await this.page.click('[data-testid="course-assignments"]');
    
    // Select assignment
    await this.page.click('[data-testid="assignment-card"]:first-child');
    
    // Upload solution
    await this.page.setInputFiles('[data-testid="assignment-upload"]', 'tests/fixtures/assignment-solution.ipynb');
    
    // Add description
    await this.page.fill('[data-testid="assignment-description"]', 'Implemented the CNN model as requested with 95% accuracy');
    
    // Submit
    await this.page.click('[data-testid="submit-assignment"]');
    
    // Verify submission
    await expect(this.page.locator('[data-testid="submission-status"]')).toContainText('Enviado');
  }

  async downloadCertificate() {
    await this.page.goto('/es/dashboard/learning/certificates');
    
    // Find completed certificate
    const certificateCard = this.page.locator('[data-testid="completed-certificate"]:first-child');
    await expect(certificateCard).toBeVisible();
    
    // Download certificate
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      certificateCard.locator('[data-testid="download-certificate"]').click(),
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('certificate');
  }

  // Progress Tracking
  async viewLearningAnalytics() {
    await this.page.goto('/es/dashboard/learning/analytics');
    
    // Check various metrics
    await expect(this.page.locator('[data-testid="learning-streak"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="courses-completed"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="certificates-earned"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="total-learning-hours"]')).toBeVisible();
    
    // View detailed progress
    await this.page.click('[data-testid="view-detailed-progress"]');
    await expect(this.page.locator('[data-testid="progress-chart"]')).toBeVisible();
  }

  async setLearningGoals() {
    await this.page.click('[data-testid="set-goals"]');
    
    // Set weekly learning goal
    await this.page.fill('[data-testid="weekly-hours-goal"]', '10');
    
    // Set completion targets
    await this.page.fill('[data-testid="courses-per-month"]', '2');
    
    // Set skill targets
    await this.page.check('[data-testid="skill-python"]');
    await this.page.check('[data-testid="skill-ml"]');
    await this.page.check('[data-testid="skill-deep-learning"]');
    
    // Save goals
    await this.page.click('[data-testid="save-goals"]');
    
    // Verify goals saved
    await expect(this.page.locator('[data-testid="goals-saved"]')).toBeVisible();
  }
}

test.describe('Learning Platform', () => {
  let page: Page;
  let learningFlow: LearningPlatformFlow;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    learningFlow = new LearningPlatformFlow(page);
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUsers.regularUser));
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Course enrollment and payment flow', async () => {
    await learningFlow.navigateToCourses();
    await learningFlow.browseCourses();
    await learningFlow.enrollInCourse(learningTestData.course.title);
  });

  test('Course learning experience', async () => {
    await learningFlow.navigateToCourses();
    await learningFlow.startLearning();
    await learningFlow.completeLesson();
    await learningFlow.takeQuiz(learningTestData.quiz);
  });

  test('Learning path enrollment', async () => {
    await learningFlow.exploreLearningPaths();
    await learningFlow.enrollInLearningPath(learningTestData.learningPath.title);
  });

  test('Certification process', async () => {
    await learningFlow.viewCertifications();
    await learningFlow.startCertification(learningTestData.certification.name);
    await learningFlow.takeAssessment();
  });

  test('Interactive learning features', async () => {
    await learningFlow.navigateToCourses();
    await learningFlow.startLearning();
    await learningFlow.participateInDiscussion();
    await learningFlow.submitAssignment();
  });

  test('Progress tracking and analytics', async () => {
    await learningFlow.viewLearningAnalytics();
    await learningFlow.setLearningGoals();
  });

  test('Certificate download', async () => {
    await learningFlow.downloadCertificate();
  });

  test('Mobile learning experience', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await learningFlow.navigateToCourses();
    
    // Verify mobile adaptations
    await expect(page.locator('[data-testid="mobile-course-nav"]')).toBeVisible();
    
    // Test swipe navigation for lessons
    await learningFlow.startLearning();
    const lessonContent = page.locator('[data-testid="lesson-content"]');
    await lessonContent.swipe({ direction: 'left' });
    await expect(page.locator('[data-testid="next-lesson"]')).toBeVisible();
  });
});