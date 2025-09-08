import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for community features
const communityTestData = {
  forumPost: {
    title: 'Best practices for machine learning in production',
    content: 'I wanted to share some insights from deploying ML models at scale. Here are key considerations...',
    category: 'machine-learning',
    tags: ['ml-ops', 'production', 'best-practices'],
  },
  blogPost: {
    title: 'Data Science Career Transition: My Journey',
    excerpt: 'How I transitioned from engineering to data science...',
    content: 'After 5 years in software engineering, I decided to make the leap into data science. Here\'s my story...',
    tags: ['career', 'transition', 'personal-story'],
  },
  resourceShare: {
    title: 'Comprehensive Python for Data Science Cheatsheet',
    description: 'A complete reference guide for Python data science libraries',
    url: 'https://github.com/example/python-ds-cheatsheet',
    category: 'learning-resources',
    tags: ['python', 'cheatsheet', 'pandas', 'numpy'],
  },
  mentorshipRequest: {
    topic: 'Career guidance in ML engineering',
    description: 'Looking for guidance on transitioning from data analyst to ML engineer role',
    preferredSchedule: 'Weekends',
    goals: ['Technical skill development', 'Interview preparation', 'Career roadmap'],
  },
};

class CommunityFeaturesFlow {
  constructor(private page: Page) {}

  // Forum Features
  async navigateToForum() {
    await this.page.goto('/es/foro');
    await expect(this.page).toHaveURL('/es/foro');
  }

  async createForumPost(post: typeof communityTestData.forumPost) {
    await this.page.click('[data-testid="create-new-topic"]');
    
    // Fill post details
    await this.page.fill('[data-testid="post-title"]', post.title);
    await this.page.fill('[data-testid="post-content"]', post.content);
    
    // Select category
    await this.page.selectOption('[data-testid="post-category"]', post.category);
    
    // Add tags
    for (const tag of post.tags) {
      await this.page.fill('[data-testid="tag-input"]', tag);
      await this.page.press('[data-testid="tag-input"]', 'Enter');
    }
    
    // Submit post
    await this.page.click('[data-testid="submit-post"]');
    
    // Verify post created
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText('Publicación creada exitosamente');
  }

  async interactWithForumPost() {
    // Navigate to a post
    await this.page.click('[data-testid="forum-post-link"]:first-child');
    
    // Like the post
    await this.page.click('[data-testid="like-post"]');
    await expect(this.page.locator('[data-testid="like-count"]')).toHaveText('1');
    
    // Add a comment
    await this.page.fill('[data-testid="comment-input"]', 'Great insights! Thanks for sharing.');
    await this.page.click('[data-testid="submit-comment"]');
    
    // Verify comment added
    await expect(this.page.locator('[data-testid="comment-list"] [data-testid="comment"]')).toHaveCount(1);
    
    // Follow the author
    await this.page.click('[data-testid="follow-author"]');
    await expect(this.page.locator('[data-testid="follow-button"]')).toContainText('Siguiendo');
  }

  async searchForumPosts(query: string) {
    await this.page.fill('[data-testid="forum-search"]', query);
    await this.page.click('[data-testid="search-submit"]');
    
    // Wait for results
    await this.page.waitForSelector('[data-testid="search-results"]');
    
    // Verify results contain search term
    const results = await this.page.locator('[data-testid="forum-post-title"]').allTextContents();
    expect(results.some(title => title.toLowerCase().includes(query.toLowerCase()))).toBeTruthy();
  }

  // Blog Features
  async navigateToBlog() {
    await this.page.goto('/es/blog');
    await expect(this.page).toHaveURL('/es/blog');
  }

  async createBlogPost(post: typeof communityTestData.blogPost) {
    await this.page.click('[data-testid="write-blog-post"]');
    
    // Fill blog post details
    await this.page.fill('[data-testid="blog-title"]', post.title);
    await this.page.fill('[data-testid="blog-excerpt"]', post.excerpt);
    
    // Use rich text editor
    await this.page.click('[data-testid="blog-editor"]');
    await this.page.type('[data-testid="blog-editor"]', post.content);
    
    // Add tags
    for (const tag of post.tags) {
      await this.page.fill('[data-testid="blog-tag-input"]', tag);
      await this.page.press('[data-testid="blog-tag-input"]', 'Enter');
    }
    
    // Add featured image
    await this.page.setInputFiles('[data-testid="featured-image-upload"]', 'tests/fixtures/test-image.jpg');
    
    // Publish
    await this.page.click('[data-testid="publish-blog"]');
    
    // Verify published
    await expect(this.page).toHaveURL(/\/es\/blog\/[\w-]+/);
  }

  async subscribeToBlogAuthor() {
    await this.page.click('[data-testid="blog-post"]:first-child');
    await this.page.click('[data-testid="subscribe-author"]');
    
    // Verify subscription
    await expect(this.page.locator('[data-testid="subscription-status"]')).toContainText('Suscrito');
  }

  // Resource Sharing
  async navigateToResources() {
    await this.page.goto('/es/recursos');
    await expect(this.page).toHaveURL('/es/recursos');
  }

  async shareResource(resource: typeof communityTestData.resourceShare) {
    await this.page.click('[data-testid="share-resource"]');
    
    // Fill resource details
    await this.page.fill('[data-testid="resource-title"]', resource.title);
    await this.page.fill('[data-testid="resource-description"]', resource.description);
    await this.page.fill('[data-testid="resource-url"]', resource.url);
    
    // Select category
    await this.page.selectOption('[data-testid="resource-category"]', resource.category);
    
    // Add tags
    for (const tag of resource.tags) {
      await this.page.fill('[data-testid="resource-tag-input"]', tag);
      await this.page.press('[data-testid="resource-tag-input"]', 'Enter');
    }
    
    // Submit
    await this.page.click('[data-testid="submit-resource"]');
    
    // Verify resource added
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText('Recurso compartido exitosamente');
  }

  async rateResource() {
    await this.page.click('[data-testid="resource-card"]:first-child');
    
    // Rate the resource
    await this.page.click('[data-testid="star-rating"] [data-testid="star-5"]');
    
    // Add review
    await this.page.fill('[data-testid="review-text"]', 'Excellent resource! Very comprehensive and well-organized.');
    await this.page.click('[data-testid="submit-review"]');
    
    // Verify review added
    await expect(this.page.locator('[data-testid="review-list"] [data-testid="review"]')).toHaveCount(1);
  }

  // Mentorship Features
  async navigateToMentorship() {
    await this.page.goto('/es/dashboard/mentorship');
    await expect(this.page).toHaveURL('/es/dashboard/mentorship');
  }

  async requestMentorship(request: typeof communityTestData.mentorshipRequest) {
    await this.page.click('[data-testid="find-mentor"]');
    
    // Search for mentors
    await this.page.fill('[data-testid="mentor-search"]', request.topic);
    await this.page.click('[data-testid="search-mentors"]');
    
    // Select a mentor
    await this.page.click('[data-testid="mentor-card"]:first-child [data-testid="request-mentorship"]');
    
    // Fill request details
    await this.page.fill('[data-testid="mentorship-topic"]', request.topic);
    await this.page.fill('[data-testid="mentorship-description"]', request.description);
    await this.page.selectOption('[data-testid="preferred-schedule"]', request.preferredSchedule);
    
    // Select goals
    for (const goal of request.goals) {
      await this.page.check(`[data-testid="goal-${goal.toLowerCase().replace(/\s+/g, '-')}"]`);
    }
    
    // Submit request
    await this.page.click('[data-testid="submit-mentorship-request"]');
    
    // Verify request sent
    await expect(this.page.locator('[data-testid="success-message"]')).toContainText('Solicitud de mentoría enviada');
  }

  async becomeMentor() {
    await this.page.click('[data-testid="become-mentor"]');
    
    // Fill mentor profile
    await this.page.fill('[data-testid="expertise-areas"]', 'Machine Learning, Data Engineering, Career Development');
    await this.page.fill('[data-testid="mentorship-bio"]', 'Experienced data scientist with 10+ years in the field...');
    await this.page.selectOption('[data-testid="availability"]', 'weekends');
    await this.page.fill('[data-testid="hourly-rate"]', '0'); // Free mentorship
    
    // Set mentorship preferences
    await this.page.check('[data-testid="mentorship-type-career"]');
    await this.page.check('[data-testid="mentorship-type-technical"]');
    
    // Submit application
    await this.page.click('[data-testid="submit-mentor-application"]');
    
    // Verify application submitted
    await expect(this.page.locator('[data-testid="mentor-status"]')).toContainText('Solicitud en revisión');
  }

  // Community Engagement Features
  async checkActivityFeed() {
    await this.page.goto('/es/dashboard');
    
    // Verify activity feed is visible
    await expect(this.page.locator('[data-testid="activity-feed"]')).toBeVisible();
    
    // Check different activity types
    const activityTypes = [
      'new-member',
      'forum-post',
      'blog-published',
      'resource-shared',
      'event-created',
      'job-posted',
    ];
    
    for (const type of activityTypes) {
      const activity = this.page.locator(`[data-testid="activity-${type}"]`);
      if (await activity.isVisible()) {
        // Interact with activity
        await activity.hover();
        await expect(activity.locator('[data-testid="activity-actions"]')).toBeVisible();
      }
    }
  }

  async testNotifications() {
    // Check notification bell
    await expect(this.page.locator('[data-testid="notification-bell"]')).toBeVisible();
    
    // Open notifications
    await this.page.click('[data-testid="notification-bell"]');
    await expect(this.page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
    
    // Mark as read
    await this.page.click('[data-testid="mark-all-read"]');
    await expect(this.page.locator('[data-testid="notification-count"]')).toHaveText('0');
  }

  async testMessaging() {
    await this.page.goto('/es/dashboard/messages');
    
    // Start new conversation
    await this.page.click('[data-testid="new-message"]');
    await this.page.fill('[data-testid="recipient-search"]', 'Test User');
    await this.page.click('[data-testid="recipient-suggestion"]:first-child');
    
    // Send message
    await this.page.fill('[data-testid="message-input"]', 'Hi! I saw your post about ML deployment. Would love to connect!');
    await this.page.click('[data-testid="send-message"]');
    
    // Verify message sent
    await expect(this.page.locator('[data-testid="message-list"] [data-testid="message"]')).toHaveCount(1);
  }
}

test.describe('Community Features', () => {
  let page: Page;
  let communityFlow: CommunityFeaturesFlow;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    communityFlow = new CommunityFeaturesFlow(page);
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('authToken', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUsers.regularUser));
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Forum participation flow', async () => {
    await communityFlow.navigateToForum();
    await communityFlow.createForumPost(communityTestData.forumPost);
    await communityFlow.interactWithForumPost();
    await communityFlow.searchForumPosts('machine learning');
  });

  test('Blog creation and subscription', async () => {
    await communityFlow.navigateToBlog();
    await communityFlow.createBlogPost(communityTestData.blogPost);
    await communityFlow.subscribeToBlogAuthor();
  });

  test('Resource sharing and rating', async () => {
    await communityFlow.navigateToResources();
    await communityFlow.shareResource(communityTestData.resourceShare);
    await communityFlow.rateResource();
  });

  test('Mentorship request flow', async () => {
    await communityFlow.navigateToMentorship();
    await communityFlow.requestMentorship(communityTestData.mentorshipRequest);
  });

  test('Become a mentor flow', async () => {
    await communityFlow.navigateToMentorship();
    await communityFlow.becomeMentor();
  });

  test('Community engagement features', async () => {
    await communityFlow.checkActivityFeed();
    await communityFlow.testNotifications();
    await communityFlow.testMessaging();
  });

  test('Mobile community features', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test mobile-specific community features
    await communityFlow.navigateToForum();
    
    // Verify mobile UI adaptations
    await expect(page.locator('[data-testid="mobile-forum-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
    
    // Test swipe gestures for navigation
    const forumList = page.locator('[data-testid="forum-list"]');
    await forumList.swipe({ direction: 'left' });
    await expect(page.locator('[data-testid="next-page"]')).toBeVisible();
  });
});