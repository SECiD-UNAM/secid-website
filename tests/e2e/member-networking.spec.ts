import { test, expect, Page } from '@playwright/test';
import { mockUsers } from '../fixtures/users';

// Test data for networking features
const testNetworkingData = {
  searchQuery: 'Machine Learning',
  filters: {
    location: 'Mexico City',
    graduationYear: '2020-2022',
    skills: ['Python', 'Data Science'],
    industry: 'Technology',
    company: 'Google',
  },
  connectionMessage: 'Hi! I saw your profile and would love to connect. We have similar interests in machine learning and I think we could have great discussions about the field.',
  groupMessage: 'Excited to be part of this group! Looking forward to learning from everyone.',
  eventMessage: 'Great event! Thanks for organizing. Looking forward to the next one.',
};

class MemberNetworkingFlow {
  constructor(private page: Page) {}

  async navigateToMemberDirectory() {
    await this.page.goto('/');
    await this.page.click('a[href="/es/members"]');
    await expect(this.page).toHaveURL('/es/members');
  }

  async searchMembers(query: string) {
    const searchInput = this.page.locator('input[data-testid="member-search-input"]');
    await searchInput.fill(query);
    await this.page.click('button[data-testid="search-members"]');
    
    // Wait for search results to load
    await this.page.waitForSelector('[data-testid="member-card"]', { timeout: 5000 });
  }

  async applyMemberFilters() {
    // Open filters panel
    await this.page.click('button[data-testid="open-member-filters"]');
    
    // Apply location filter
    await this.page.fill('input[data-testid="location-filter"]', testNetworkingData.filters.location);
    
    // Apply graduation year range
    await this.page.selectOption('select[data-testid="graduation-year-start"]', '2020');
    await this.page.selectOption('select[data-testid="graduation-year-end"]', '2022');
    
    // Add skills filter
    for (const skill of testNetworkingData.filters.skills) {
      await this.page.fill('input[data-testid="skills-filter-input"]', skill);
      await this.page.click('button[data-testid="add-skill-filter"]');
    }
    
    // Apply industry filter
    await this.page.selectOption('select[data-testid="industry-filter"]', testNetworkingData.filters.industry);
    
    // Apply filters
    await this.page.click('button[data-testid="apply-member-filters"]');
    
    // Wait for filtered results
    await this.page.waitForResponse(response => 
      response.url().includes('/api/members') && response.status() === 200
    );
  }

  async viewMemberProfile(memberIndex = 0) {
    const memberCards = this.page.locator('[data-testid="member-card"]');
    await memberCards.nth(memberIndex).click();
    
    // Should navigate to member profile
    await expect(this.page).toHaveURL(/\/es\/members\/[^\/]+$/);
    
    // Wait for profile to load
    await this.page.waitForSelector('[data-testid="member-profile-name"]');
  }

  async sendConnectionRequest() {
    // Click connect button
    await this.page.click('button[data-testid="connect-member"]');
    
    // Should open connection modal
    await expect(this.page.locator('h3:has-text("Enviar solicitud de conexión")')).toBeVisible();
    
    // Fill connection message
    await this.page.fill('textarea[name="connectionMessage"]', testNetworkingData.connectionMessage);
    
    // Send request
    await this.page.click('button[data-testid="send-connection-request"]');
    
    // Should show success message
    await expect(this.page.locator('text=¡Solicitud de conexión enviada!')).toBeVisible();
  }

  async viewMyConnections() {
    await this.page.goto('/es/dashboard/connections');
    
    // Should show connections dashboard
    await expect(this.page.locator('h1:has-text("Mis Conexiones")')).toBeVisible();
    
    // Should have tabs for different connection states
    await expect(this.page.locator('button[data-testid="connections-tab"]')).toBeVisible();
    await expect(this.page.locator('button[data-testid="pending-tab"]')).toBeVisible();
    await expect(this.page.locator('button[data-testid="requests-tab"]')).toBeVisible();
  }

  async acceptConnectionRequest() {
    await this.viewMyConnections();
    
    // Switch to requests tab
    await this.page.click('button[data-testid="requests-tab"]');
    
    // Should see pending requests
    await expect(this.page.locator('[data-testid="connection-request"]')).toBeVisible();
    
    // Accept first request
    await this.page.click('button[data-testid="accept-request"]');
    
    // Should show success message
    await expect(this.page.locator('text=Solicitud aceptada')).toBeVisible();
  }

  async startDirectMessage() {
    // From member profile, start a conversation
    await this.page.click('button[data-testid="message-member"]');
    
    // Should open messaging interface
    await expect(this.page.locator('[data-testid="message-composer"]')).toBeVisible();
    
    // Type and send message
    await this.page.fill('textarea[data-testid="message-input"]', 'Hello! Nice to connect with you.');
    await this.page.click('button[data-testid="send-message"]');
    
    // Should show sent message
    await expect(this.page.locator('[data-testid="sent-message"]')).toContainText('Hello! Nice to connect with you.');
  }

  async joinMemberGroup() {
    await this.page.goto('/es/groups');
    
    // Should show available groups
    await expect(this.page.locator('[data-testid="group-card"]')).toBeVisible();
    
    // Join first group
    await this.page.click('button[data-testid="join-group"]');
    
    // Should show success message
    await expect(this.page.locator('text=Te has unido al grupo')).toBeVisible();
  }

  async participateInGroupDiscussion() {
    // View group details
    await this.page.click('[data-testid="group-card"]');
    await expect(this.page).toHaveURL(/\/es\/groups\/[^\/]+$/);
    
    // Should show group discussions
    await expect(this.page.locator('[data-testid="group-discussion"]')).toBeVisible();
    
    // Post in group
    await this.page.fill('textarea[data-testid="group-post-input"]', testNetworkingData.groupMessage);
    await this.page.click('button[data-testid="post-message"]');
    
    // Should show posted message
    await expect(this.page.locator('[data-testid="group-message"]')).toContainText(testNetworkingData.groupMessage);
  }

  async attendNetworkingEvent() {
    await this.page.goto('/es/events');
    
    // Filter for networking events
    await this.page.selectOption('select[data-testid="event-type-filter"]', 'networking');
    
    // Should show networking events
    await expect(this.page.locator('[data-testid="event-card"]')).toBeVisible();
    
    // Register for first event
    await this.page.click('button[data-testid="register-event"]');
    
    // Should show registration success
    await expect(this.page.locator('text=¡Registrado exitosamente!')).toBeVisible();
  }

  async createNetworkingPost() {
    await this.page.goto('/es/dashboard');
    
    // Create new post
    await this.page.click('button[data-testid="create-post"]');
    
    // Fill post content
    await this.page.fill('textarea[name="postContent"]', 'Looking for advice on transitioning from academia to industry in data science. Anyone with experience?');
    
    // Add tags
    await this.page.fill('input[data-testid="post-tags"]', 'career-advice,data-science');
    
    // Publish post
    await this.page.click('button[data-testid="publish-post"]');
    
    // Should show success message
    await expect(this.page.locator('text=Publicación creada')).toBeVisible();
  }
}

test.describe('Member Networking and Community Flow', () => {
  let networkingFlow: MemberNetworkingFlow;

  test.beforeEach(async ({ page }) => {
    networkingFlow = new MemberNetworkingFlow(page);
    
    // Mock authentication - logged in user
    await page.addInitScript(() => {
      window.localStorage.setItem('user', JSON.stringify({
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: true,
      }));
    });
    
    // Mock API responses for members
    await page.route('**/api/members**', async (route) => {
      const url = route.request().url();
      if (url.includes('search')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            members: [
              {
                id: 'member-1',
                firstName: 'Ana',
                lastName: 'García',
                currentJob: 'Data Scientist',
                company: 'Tech Corp',
                location: 'Mexico City',
                skills: ['Python', 'Machine Learning', 'Data Science'],
                graduationYear: 2021,
                profileImage: 'https://via.placeholder.com/150',
                isConnected: false,
                connectionStatus: null,
              },
              {
                id: 'member-2',
                firstName: 'Carlos',
                lastName: 'López',
                currentJob: 'ML Engineer',
                company: 'AI Startup',
                location: 'Guadalajara',
                skills: ['TensorFlow', 'Python', 'Deep Learning'],
                graduationYear: 2020,
                profileImage: 'https://via.placeholder.com/150',
                isConnected: true,
                connectionStatus: 'connected',
              },
            ],
            total: 2,
            page: 1,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUsers.regularUser),
        });
      }
    });
    
    // Mock connections API
    await page.route('**/api/connections**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'sent', id: 'conn-123' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            connections: [mockUsers.regularUser],
            pending: [],
            requests: [
              {
                id: 'req-1',
                from: mockUsers.adminUser,
                message: 'Hi! Would love to connect.',
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }
    });
    
    // Mock groups API
    await page.route('**/api/groups**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          groups: [
            {
              id: 'group-1',
              name: 'Machine Learning México',
              description: 'Grupo para discutir ML y AI en México',
              memberCount: 156,
              isJoined: false,
              category: 'Technical',
            },
            {
              id: 'group-2',
              name: 'Data Science Career Tips',
              description: 'Consejos y experiencias sobre carreras en data science',
              memberCount: 89,
              isJoined: true,
              category: 'Career',
            },
          ],
        }),
      });
    });
    
    // Mock messaging API
    await page.route('**/api/messages**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'msg-123',
            content: 'Hello! Nice to connect with you.',
            sentAt: new Date().toISOString(),
          }),
        });
      }
    });
  });

  test('complete member networking journey', async ({ page }) => {
    // Step 1: Navigate to member directory
    await networkingFlow.navigateToMemberDirectory();
    
    // Verify member directory is loaded
    await expect(page.locator('h1:has-text("Directorio de Miembros")')).toBeVisible();
    
    // Step 2: Search for members
    await networkingFlow.searchMembers(testNetworkingData.searchQuery);
    
    // Verify search results
    await expect(page.locator('[data-testid="member-card"]')).toHaveCount(2);
    
    // Step 3: Apply member filters
    await networkingFlow.applyMemberFilters();
    
    // Step 4: View member profile
    await networkingFlow.viewMemberProfile(0);
    
    // Verify profile details
    await expect(page.locator('[data-testid="member-profile-name"]')).toContainText('Ana García');
    await expect(page.locator('[data-testid="member-current-job"]')).toContainText('Data Scientist');
    
    // Step 5: Send connection request
    await networkingFlow.sendConnectionRequest();
    
    // Step 6: View connections dashboard
    await networkingFlow.viewMyConnections();
    
    // Step 7: Accept a connection request
    await networkingFlow.acceptConnectionRequest();
    
    // Step 8: Start direct messaging
    await networkingFlow.viewMemberProfile(1);
    await networkingFlow.startDirectMessage();
    
    // Step 9: Join member groups
    await networkingFlow.joinMemberGroup();
    
    // Step 10: Participate in group discussions
    await networkingFlow.participateInGroupDiscussion();
  });

  test('member search and filtering', async ({ page }) => {
    await networkingFlow.navigateToMemberDirectory();
    
    // Test empty search shows all members
    await networkingFlow.searchMembers('');
    await expect(page.locator('[data-testid="member-card"]')).toHaveCount(2);
    
    // Test specific skill search
    await networkingFlow.searchMembers('Python');
    await expect(page.locator('[data-testid="search-results-count"]')).toContainText('2 miembros encontrados');
    
    // Test location filter
    await page.click('button[data-testid="open-member-filters"]');
    await page.fill('input[data-testid="location-filter"]', 'Mexico City');
    await page.click('button[data-testid="apply-member-filters"]');
    
    // Should filter results
    await expect(page.locator('[data-testid="member-card"]')).toHaveCount(1);
    
    // Test clearing filters
    await page.click('button[data-testid="clear-all-filters"]');
    await expect(page.locator('[data-testid="member-card"]')).toHaveCount(2);
  });

  test('connection management', async ({ page }) => {
    await networkingFlow.viewMyConnections();
    
    // Test connection states
    await expect(page.locator('button[data-testid="connections-tab"]')).toBeVisible();
    await expect(page.locator('button[data-testid="pending-tab"]')).toBeVisible();
    await expect(page.locator('button[data-testid="requests-tab"]')).toBeVisible();
    
    // View connection requests
    await page.click('button[data-testid="requests-tab"]');
    await expect(page.locator('[data-testid="connection-request"]')).toBeVisible();
    
    // Test declining request
    await page.click('button[data-testid="decline-request"]');
    await expect(page.locator('text=Solicitud rechazada')).toBeVisible();
    
    // View active connections
    await page.click('button[data-testid="connections-tab"]');
    await expect(page.locator('[data-testid="connection-item"]')).toBeVisible();
    
    // Test removing connection
    await page.click('button[data-testid="connection-options"]');
    await page.click('button[data-testid="remove-connection"]');
    await page.click('button[data-testid="confirm-remove"]');
    await expect(page.locator('text=Conexión eliminada')).toBeVisible();
  });

  test('direct messaging functionality', async ({ page }) => {
    await page.goto('/es/dashboard/messages');
    
    // Should show conversations list
    await expect(page.locator('[data-testid="conversations-list"]')).toBeVisible();
    
    // Start new conversation
    await page.click('button[data-testid="new-conversation"]');
    
    // Search for member to message
    await page.fill('input[data-testid="member-search"]', 'Ana García');
    await page.click('[data-testid="member-result"]');
    
    // Send message
    await page.fill('textarea[data-testid="message-input"]', 'Hi Ana! Great to connect with you.');
    await page.click('button[data-testid="send-message"]');
    
    // Should show sent message
    await expect(page.locator('[data-testid="sent-message"]')).toContainText('Hi Ana! Great to connect with you.');
    
    // Test message reactions
    await page.hover('[data-testid="sent-message"]');
    await page.click('button[data-testid="react-message"]');
    await page.click('[data-testid="thumbs-up-reaction"]');
    
    // Should show reaction
    await expect(page.locator('[data-testid="message-reaction"]')).toBeVisible();
  });

  test('member groups functionality', async ({ page }) => {
    await page.goto('/es/groups');
    
    // Should show available groups
    await expect(page.locator('[data-testid="group-card"]')).toHaveCount(2);
    
    // Filter groups by category
    await page.selectOption('select[data-testid="group-category-filter"]', 'Technical');
    await expect(page.locator('[data-testid="group-card"]')).toHaveCount(1);
    
    // Join group
    await page.click('button[data-testid="join-group"]');
    await expect(page.locator('text=Te has unido al grupo')).toBeVisible();
    
    // View group details
    await page.click('[data-testid="group-card"]');
    
    // Should show group information
    await expect(page.locator('[data-testid="group-name"]')).toContainText('Machine Learning México');
    await expect(page.locator('[data-testid="group-member-count"]')).toContainText('156 miembros');
    
    // Test posting in group
    await page.fill('textarea[data-testid="group-post-input"]', 'Excited to join this group!');
    await page.click('button[data-testid="post-message"]');
    
    // Should show posted message
    await expect(page.locator('[data-testid="group-message"]')).toContainText('Excited to join this group!');
    
    // Test leaving group
    await page.click('button[data-testid="group-options"]');
    await page.click('button[data-testid="leave-group"]');
    await page.click('button[data-testid="confirm-leave"]');
    await expect(page.locator('text=Has salido del grupo')).toBeVisible();
  });

  test('networking event participation', async ({ page }) => {
    await networkingFlow.attendNetworkingEvent();
    
    // View registered events
    await page.goto('/es/dashboard/events');
    await expect(page.locator('[data-testid="registered-event"]')).toBeVisible();
    
    // Check in to event (simulate QR code scan)
    await page.click('button[data-testid="checkin-event"]');
    await expect(page.locator('text=Check-in exitoso')).toBeVisible();
    
    // View event attendees
    await page.click('[data-testid="view-attendees"]');
    await expect(page.locator('[data-testid="attendee-list"]')).toBeVisible();
    
    // Connect with other attendees
    await page.click('button[data-testid="connect-attendee"]');
    await expect(page.locator('text=Solicitud enviada')).toBeVisible();
  });

  test('community posts and interactions', async ({ page }) => {
    await networkingFlow.createNetworkingPost();
    
    // View community feed
    await page.goto('/es/community');
    
    // Should show community posts
    await expect(page.locator('[data-testid="community-post"]')).toBeVisible();
    
    // Interact with posts
    await page.click('button[data-testid="like-post"]');
    await expect(page.locator('[data-testid="like-count"]')).toContainText('1');
    
    // Comment on post
    await page.fill('textarea[data-testid="comment-input"]', 'Great question! I can share my experience.');
    await page.click('button[data-testid="post-comment"]');
    
    // Should show comment
    await expect(page.locator('[data-testid="post-comment"]')).toContainText('Great question! I can share my experience.');
    
    // Share post
    await page.click('button[data-testid="share-post"]');
    await expect(page.locator('text=Publicación compartida')).toBeVisible();
  });

  test('profile visibility and privacy settings', async ({ page }) => {
    await page.goto('/es/dashboard/profile/privacy');
    
    // Test profile visibility settings
    await page.check('input[name="publicProfile"]');
    await expect(page.locator('text=Perfil visible públicamente')).toBeVisible();
    
    // Test connection privacy
    await page.selectOption('select[name="connectionVisibility"]', 'connections-only');
    
    // Test contact information privacy
    await page.uncheck('input[name="showEmail"]');
    await page.uncheck('input[name="showPhone"]');
    
    // Save privacy settings
    await page.click('button[data-testid="save-privacy-settings"]');
    await expect(page.locator('text=Configuración guardada')).toBeVisible();
    
    // Verify changes are reflected in profile
    await page.goto('/es/members/test-user-id');
    await expect(page.locator('[data-testid="email-contact"]')).not.toBeVisible();
  });
});

// Mobile networking tests
test.describe('Mobile Member Networking', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile member directory and search', async ({ page }) => {
    const networkingFlow = new MemberNetworkingFlow(page);
    await networkingFlow.navigateToMemberDirectory();
    
    // Mobile member cards should be properly sized
    const memberCard = page.locator('[data-testid="member-card"]').first();
    await expect(memberCard).toBeVisible();
    
    // Mobile search should work
    await page.fill('input[data-testid="member-search-input"]', 'Python');
    await page.click('button[data-testid="search-members"]');
    
    // Mobile filters should be in a drawer
    await page.click('button[data-testid="open-member-filters"]');
    await expect(page.locator('[data-testid="filters-drawer"]')).toBeVisible();
  });

  test('mobile messaging interface', async ({ page }) => {
    await page.goto('/es/dashboard/messages');
    
    // Mobile messaging should be optimized
    await expect(page.locator('[data-testid="conversations-list"]')).toBeVisible();
    
    // Touch interactions should work
    await page.locator('[data-testid="conversation-item"]').first().tap();
    
    // Mobile message composer
    const messageInput = page.locator('textarea[data-testid="message-input"]');
    await expect(messageInput).toHaveCSS('font-size', '16px'); // Prevents zoom
    
    await messageInput.fill('Mobile message test');
    await page.click('button[data-testid="send-message"]');
    
    // Should show sent message
    await expect(page.locator('[data-testid="sent-message"]')).toContainText('Mobile message test');
  });
});

// Visual regression tests
test.describe('Networking Visual Tests', () => {
  test('member directory layout consistency', async ({ page }) => {
    const networkingFlow = new MemberNetworkingFlow(page);
    await networkingFlow.navigateToMemberDirectory();
    
    // Screenshot of member directory
    await expect(page).toHaveScreenshot('member-directory-initial.png');
    
    // Screenshot with search results
    await networkingFlow.searchMembers('Data Science');
    await expect(page).toHaveScreenshot('member-directory-search.png');
    
    // Screenshot with filters applied
    await page.click('button[data-testid="open-member-filters"]');
    await expect(page).toHaveScreenshot('member-directory-filters.png');
  });

  test('member profile consistency', async ({ page }) => {
    const networkingFlow = new MemberNetworkingFlow(page);
    await networkingFlow.navigateToMemberDirectory();
    await networkingFlow.searchMembers('Ana');
    await networkingFlow.viewMemberProfile(0);
    
    // Screenshot of member profile
    await expect(page).toHaveScreenshot('member-profile-view.png');
    
    // Screenshot of connection modal
    await page.click('button[data-testid="connect-member"]');
    await expect(page).toHaveScreenshot('connection-request-modal.png');
  });
});

// Accessibility tests
test.describe('Networking Accessibility', () => {
  test('member directory accessibility', async ({ page }) => {
    const networkingFlow = new MemberNetworkingFlow(page);
    await networkingFlow.navigateToMemberDirectory();
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[data-testid="member-search-input"]')).toBeFocused();
    
    // Check ARIA labels
    await expect(page.locator('button[data-testid="search-members"]')).toHaveAttribute('aria-label', 'Search members');
    
    // Check screen reader friendly elements
    await expect(page.locator('[data-testid="member-card"]')).toHaveAttribute('role', 'article');
    
    // Check color contrast and focus indicators
    const searchButton = page.locator('button[data-testid="search-members"]');
    await searchButton.focus();
    await expect(searchButton).toHaveCSS('outline-width', '2px');
  });

  test('messaging accessibility', async ({ page }) => {
    await page.goto('/es/dashboard/messages');
    
    // Check message composer accessibility
    const messageInput = page.locator('textarea[data-testid="message-input"]');
    await expect(messageInput).toHaveAttribute('aria-label', 'Type your message');
    
    // Check keyboard shortcuts work
    await messageInput.fill('Test message');
    await page.keyboard.press('Control+Enter'); // Send with keyboard shortcut
    
    // Should send message
    await expect(page.locator('[data-testid="sent-message"]')).toContainText('Test message');
  });
});