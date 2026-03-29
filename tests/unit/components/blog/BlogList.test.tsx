// tests/unit/components/blog/BlogList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BlogList from '@/components/blog/BlogList';
import type { BlogPost } from '@/lib/blog';

// vi.mock calls are hoisted — never reference module-scope variables inside factories
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
  isDemoMode: false,
  isUsingMockAPI: () => true,
}));

vi.mock('@/lib/blog', () => ({
  getBlogPosts: vi.fn(),
  mergeBlogPosts: vi.fn(),
  filterByLocale: vi.fn(),
}));

// ListingSearch imports clsx in some environments
vi.mock('clsx', () => ({ clsx: (...args: unknown[]) => args.filter(Boolean).join(' ') }));

import { getBlogPosts, mergeBlogPosts, filterByLocale } from '@/lib/blog';

const mockGetBlogPosts = getBlogPosts as ReturnType<typeof vi.fn>;
const mockMergeBlogPosts = mergeBlogPosts as ReturnType<typeof vi.fn>;
const mockFilterByLocale = filterByLocale as ReturnType<typeof vi.fn>;

const samplePost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
  id: 'post-1',
  title: 'Test Article',
  slug: 'test-article',
  excerpt: 'A test excerpt',
  content: 'Test content',
  authorId: 'author-1',
  authorName: 'Test Author',
  publishedAt: new Date('2024-12-01'),
  tags: ['tag1', 'tag2'],
  category: 'Tutorial',
  featured: false,
  status: 'published',
  lang: 'es',
  source: 'firestore',
  ...overrides,
});

const featuredPost = samplePost({
  id: 'featured-1',
  title: 'Data Science Trends 2025',
  slug: 'data-science-trends',
  featured: true,
  category: 'Tendencias',
  authorName: 'Featured Author',
});

const regularPost = samplePost({
  id: 'regular-1',
  title: 'Regular Article',
  slug: 'regular-article',
  featured: false,
  category: 'Tutorial',
  authorName: 'Regular Author',
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBlogPosts.mockResolvedValue([]);
  mockMergeBlogPosts.mockImplementation((initial: BlogPost[], firestore: BlogPost[]) => [
    ...initial,
    ...firestore,
  ]);
  mockFilterByLocale.mockImplementation((posts: BlogPost[]) => posts);
});

describe.sequential('BlogList — rendering', () => {
  describe('TC-BLOG-001: renders category tabs', () => {
    /**
     * TC-BLOG-001
     * Verifies: AC-blog-01 — category filter tabs are rendered for all categories
     * Arrange-Act-Assert
     */
    it('shows all category tabs', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Trends')).toBeInTheDocument();
        expect(screen.getByText('Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Career')).toBeInTheDocument();
        expect(screen.getByText('Research')).toBeInTheDocument();
        expect(screen.getByText('Opinion')).toBeInTheDocument();
      });
    });
  });

  describe('TC-BLOG-002: renders search input', () => {
    /**
     * TC-BLOG-002
     * Verifies: AC-blog-02 — a search input is rendered in the filter bar
     */
    it('shows search box', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
    });
  });

  describe('TC-BLOG-003: loading skeleton shown on mount', () => {
    /**
     * TC-BLOG-003
     * Verifies: AC-blog-03 — loading state is displayed while data is being fetched
     */
    it('shows loading skeleton during fetch', () => {
      // Never resolves — keeps loading state active
      mockGetBlogPosts.mockReturnValue(new Promise(() => {}));

      render(<BlogList lang="en" initialPosts={[]} />);

      // Loading skeleton uses animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('TC-BLOG-004: empty state when no posts', () => {
    /**
     * TC-BLOG-004
     * Verifies: AC-blog-04 — empty state is shown when no posts match filters
     */
    it('shows empty state for no results', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByText('No results')).toBeInTheDocument();
      });
    });
  });

  describe('TC-BLOG-005: renders regular post cards', () => {
    /**
     * TC-BLOG-005
     * Verifies: AC-blog-05 — blog cards are rendered for each post
     */
    it('renders post title and author', async () => {
      mockFilterByLocale.mockReturnValue([regularPost]);

      render(<BlogList lang="en" initialPosts={[regularPost]} />);

      await waitFor(() => {
        expect(screen.getByText('Regular Article')).toBeInTheDocument();
        expect(screen.getByText('Regular Author')).toBeInTheDocument();
      });
    });
  });

  describe('TC-BLOG-006: renders newsletter CTA', () => {
    /**
     * TC-BLOG-006
     * Verifies: AC-blog-06 — newsletter CTA is always visible
     */
    it('shows newsletter section', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByText('Subscribe to Newsletter')).toBeInTheDocument();
      });
    });
  });
});

describe.sequential('BlogList — featured post', () => {
  describe('TC-BLOG-007: featured post shown on all-category view', () => {
    /**
     * TC-BLOG-007
     * Verifies: AC-blog-07 — featured post hero is shown when category is "all" and no search
     */
    it('renders featured badge and title for featured post', async () => {
      mockFilterByLocale.mockReturnValue([featuredPost, regularPost]);

      render(<BlogList lang="en" initialPosts={[featuredPost, regularPost]} />);

      await waitFor(() => {
        expect(screen.getByText('Featured Article')).toBeInTheDocument();
        expect(screen.getByText('Data Science Trends 2025')).toBeInTheDocument();
      });
      expect(document.querySelector('.secid-blog__featured-badge')).toBeInTheDocument();
    });
  });

  describe('TC-BLOG-008: featured post hidden when category filter active', () => {
    /**
     * TC-BLOG-008
     * Verifies: AC-blog-08 — featured hero is hidden when a category filter is active
     */
    it('hides featured hero on category change', async () => {
      mockFilterByLocale.mockReturnValue([featuredPost, regularPost]);

      render(<BlogList lang="en" initialPosts={[featuredPost, regularPost]} />);

      await waitFor(() => {
        expect(document.querySelector('.secid-blog__featured-badge')).toBeInTheDocument();
      });

      // Click Tutorial category
      const tutorialBtn = screen.getByRole('button', { name: 'Tutorial' });
      act(() => { fireEvent.click(tutorialBtn); });

      await waitFor(() => {
        expect(document.querySelector('.secid-blog__featured-badge')).not.toBeInTheDocument();
      });
    });
  });
});

describe.sequential('BlogList — category filtering', () => {
  describe('TC-BLOG-009: "All" tab is active by default', () => {
    /**
     * TC-BLOG-009
     * Verifies: AC-blog-09 — "All" category is active on initial render
     */
    it('marks All tab as active', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        const allBtn = screen.getByRole('button', { name: 'All' });
        expect(allBtn.className).toContain('active');
      });
    });
  });

  describe('TC-BLOG-010: clicking category activates it', () => {
    /**
     * TC-BLOG-010
     * Verifies: AC-blog-10 — clicking a category tab marks it as active
     */
    it('activates clicked category tab', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="en" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Tutorial' })).toBeInTheDocument();
      });

      const tutorialBtn = screen.getByRole('button', { name: 'Tutorial' });
      act(() => { fireEvent.click(tutorialBtn); });

      expect(tutorialBtn.className).toContain('active');
      const allBtn = screen.getByRole('button', { name: 'All' });
      expect(allBtn.className).not.toContain('active');
    });
  });
});

describe.sequential('BlogList — Spanish translations', () => {
  describe('TC-BLOG-011: Spanish category labels', () => {
    /**
     * TC-BLOG-011
     * Verifies: AC-blog-11 — Spanish labels are shown when lang="es"
     */
    it('renders Spanish category tabs', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="es" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByText('Todos')).toBeInTheDocument();
        expect(screen.getByText('Tendencias')).toBeInTheDocument();
        expect(screen.getByText('Tutorial')).toBeInTheDocument();
        expect(screen.getByText('Carrera')).toBeInTheDocument();
      });
    });
  });

  describe('TC-BLOG-012: Spanish newsletter CTA', () => {
    /**
     * TC-BLOG-012
     * Verifies: AC-blog-12 — newsletter CTA shows Spanish text when lang="es"
     */
    it('renders Spanish newsletter button', async () => {
      mockFilterByLocale.mockReturnValue([]);

      render(<BlogList lang="es" initialPosts={[]} />);

      await waitFor(() => {
        expect(screen.getByText('Suscribirse al Newsletter')).toBeInTheDocument();
      });
    });
  });
});

describe.sequential('BlogList — graceful degradation', () => {
  describe('TC-BLOG-013: fallback to initialPosts on fetch error', () => {
    /**
     * TC-BLOG-013
     * Verifies: AC-blog-13 — shows initialPosts when Firestore fetch fails
     */
    it('displays initial posts when fetch throws', async () => {
      mockGetBlogPosts.mockRejectedValue(new Error('Network error'));
      // filterByLocale returns the initialPosts on fallback path
      mockFilterByLocale.mockReturnValue([regularPost]);

      render(<BlogList lang="en" initialPosts={[regularPost]} />);

      await waitFor(() => {
        expect(screen.getByText('Regular Article')).toBeInTheDocument();
      });
    });
  });
});
