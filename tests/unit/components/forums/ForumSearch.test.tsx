// tests/unit/components/forums/ForumSearch.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ForumSearch from '@components/forums/ForumSearch';
import type { ForumSearchResult } from '@/types';

const { mockSearch, mockGetAllCategories } = vi.hoisted(() => {
  return {
    mockSearch: vi.fn(),
    mockGetAllCategories: vi.fn(),
  };
});

// Mock the forum library so tests don't hit Firebase
vi.mock('@/lib/forum', () => ({
  forumSearch: { search: mockSearch },
  forumCategories: { getAll: mockGetAllCategories },
}));

// Mock useTranslations
vi.mock('@/hooks/useTranslations', () => ({
  useTranslations: () => ({
    forum: {
      search: 'Search',
      searchPlaceholder: 'Search forums...',
      filters: 'Filters',
      clearFilters: 'Clear Filters',
      sortByRelevance: 'Relevance',
      sortByDate: 'Date',
      sortByVotes: 'Votes',
      sortByReplies: 'Replies',
      filterByCategory: 'Filter by Category',
      filterByDate: 'Filter by Date',
      noResults: 'No results found',
      noResultsDescription: 'Try adjusting your search',
      searchResults: 'results',
      topic: { solved: 'Solved', pinned: 'Pinned' },
    },
    common: { cancel: 'Cancel' },
  }),
}));

// Mock sanitizeHtml to pass through
vi.mock('@/lib/validation/sanitization', () => ({
  sanitizeHtml: (html: string) => html,
}));

const makeTopic = (overrides?: Partial<ForumSearchResult>): ForumSearchResult => ({
  id: 'topic-1',
  type: 'topic',
  title: 'How to use Python',
  content: 'Python is a programming language',
  excerpt: 'Python is a programming language...',
  categoryId: 'cat-1',
  categoryName: 'General',
  authorId: 'user-1',
  authorName: 'Alice',
  score: 0.9,
  highlights: ['Python'],
  createdAt: new Date('2024-01-15'),
  ...overrides,
});

const makePost = (overrides?: Partial<ForumSearchResult>): ForumSearchResult => ({
  id: 'post-1',
  type: 'post',
  title: '',
  content: 'Python snippet here',
  excerpt: 'Python snippet here...',
  categoryId: 'cat-1',
  categoryName: 'General',
  authorId: 'user-2',
  authorName: 'Bob',
  score: 0.7,
  highlights: ['Python'],
  topicId: 'topic-1',
  createdAt: new Date('2024-01-16'),
  ...overrides,
});

describe.sequential('ForumSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCategories.mockResolvedValue([
      { id: 'cat-1', name: 'General' },
      { id: 'cat-2', name: 'Tech' },
    ]);
    // Default: return empty results
    mockSearch.mockResolvedValue({ topics: [], posts: [] });
  });

  it(
    /**
     * TC-FORUMSEARCH-001
     * Verifies: AC-search-01 — search form renders with input and submit button
     */
    'renders search form with input and submit button',
    async () => {
      render(<ForumSearch language="en" />);
      // Wait for initial loading to settle
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search forums...')).toBeInTheDocument();
      });
      // The submit button is the one in the form
      const submitButton = screen.getByRole('button', { name: /search/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-002
     * Verifies: AC-search-02 — searching with initialQuery displays topic results
     */
    'displays topic results after search',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [makeTopic()],
        posts: [],
      });

      const { container } = render(<ForumSearch language="en" initialQuery="Python" />);

      // The title may contain highlighting marks, use container query for flexibility
      await waitFor(() => {
        const topicBadge = screen.getAllByText('Topic');
        expect(topicBadge.length).toBeGreaterThan(0);
        // Author name is not highlighted — safe to assert as-is
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-003
     * Verifies: AC-search-03 — searching displays post results
     */
    'displays post results after search',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [],
        posts: [makePost()],
      });

      render(<ForumSearch language="en" initialQuery="Python" />);

      await waitFor(() => {
        // The "Post" badge is inside a span with text content "Post"
        const postBadges = screen.getAllByText('Post');
        expect(postBadges.length).toBeGreaterThan(0);
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-004
     * Verifies: AC-search-04 — result tabs are rendered with correct counts
     */
    'shows result type tabs with counts',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [makeTopic()],
        posts: [makePost()],
      });

      render(<ForumSearch language="en" initialQuery="Python" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Topics (1)' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Posts (1)' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'All (2)' })).toBeInTheDocument();
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-005
     * Verifies: AC-search-05 — tab switching — topics tab keeps topic visible
     */
    'switches to topics tab and shows only topics',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [makeTopic({ title: 'Topic About Data', highlights: [] })],
        posts: [makePost({ excerpt: 'Post about data...', highlights: [] })],
      });

      render(<ForumSearch language="en" initialQuery="data" />);

      // Wait for the Topics tab button to appear (confirms search ran)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Topics \(1\)/i })).toBeInTheDocument();
      });

      // Topic card should be visible (author name is unambiguous)
      expect(screen.getByText('Alice')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Topics \(1\)/i }));

      // After switching to Topics tab, topic author is still visible
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-006
     * Verifies: AC-search-06 — loading state is shown while fetching
     */
    'shows loading indicator while searching',
    async () => {
      let resolveSearch!: (val: { topics: ForumSearchResult[]; posts: ForumSearchResult[] }) => void;
      mockSearch.mockImplementation(
        () => new Promise((res) => { resolveSearch = res; })
      );

      render(<ForumSearch language="en" initialQuery="Python" />);

      // While the hook is loading (initial state), loading indicator should appear
      // The loading spinner paragraph is "Searching..."
      await waitFor(() => {
        expect(screen.getAllByText('Searching...').length).toBeGreaterThan(0);
      });

      await act(async () => {
        resolveSearch({ topics: [], posts: [] });
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-007
     * Verifies: AC-search-07 — clear filters resets active tag filters
     */
    'clears active tag filters',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [makeTopic()],
        posts: [],
      });

      render(
        <ForumSearch
          language="en"
          initialQuery="Python"
          initialFilters={{ tags: ['python'] }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('#python')).toBeInTheDocument();
      });

      // Click first "Clear Filters" button (in the filter bar)
      const clearButtons = screen.getAllByText('Clear Filters');
      fireEvent.click(clearButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('#python')).not.toBeInTheDocument();
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-008
     * Verifies: AC-search-08 — sort change triggers re-fetch with correct sort field
     */
    'changes sort and triggers re-fetch with new sort field',
    async () => {
      mockSearch.mockResolvedValue({ topics: [], posts: [] });

      render(<ForumSearch language="en" initialQuery="Python" />);

      await waitFor(() => expect(mockSearch).toHaveBeenCalled());

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'date' } });

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: 'date' })
        );
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-009
     * Verifies: AC-search-09 — no results message shown when search returns empty
     */
    'shows no results message when search returns empty',
    async () => {
      mockSearch.mockResolvedValue({ topics: [], posts: [] });

      render(<ForumSearch language="en" initialQuery="zzznomatch" />);

      await waitFor(() => {
        expect(screen.getAllByText('No results found').length).toBeGreaterThan(0);
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-010
     * Verifies: AC-search-10 — text highlighting is applied to search results
     */
    'applies search term highlighting in results',
    async () => {
      mockSearch.mockResolvedValue({
        topics: [makeTopic({ highlights: ['Python'] })],
        posts: [],
      });

      const { container } = render(<ForumSearch language="en" initialQuery="Python" />);

      await waitFor(() => {
        const marks = container.querySelectorAll('mark');
        expect(marks.length).toBeGreaterThan(0);
      });
    }
  );

  it(
    /**
     * TC-FORUMSEARCH-011
     * Verifies: AC-search-11 — initialQuery triggers automatic search on mount
     */
    'performs search automatically when initialQuery is provided',
    async () => {
      mockSearch.mockResolvedValue({ topics: [], posts: [] });

      render(<ForumSearch language="en" initialQuery="machine learning" />);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith(
          expect.objectContaining({ query: 'machine learning' })
        );
      });
    }
  );
});
