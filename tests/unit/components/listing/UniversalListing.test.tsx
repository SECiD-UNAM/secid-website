// tests/unit/components/listing/UniversalListing.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UniversalListing } from '@components/listing/UniversalListing';
import type { DataAdapter } from '@lib/listing/adapters/types';

interface TestItem {
  id: string;
  name: string;
  category: string;
}

const items: TestItem[] = [
  { id: '1', name: 'Alpha', category: 'tech' },
  { id: '2', name: 'Beta', category: 'science' },
  { id: '3', name: 'Gamma', category: 'tech' },
];

const mockAdapter: DataAdapter<TestItem> = {
  fetch: vi.fn().mockResolvedValue({
    items,
    totalCount: 3,
    hasMore: false,
  }),
};

describe.sequential('UniversalListing', () => {
  it('renders items after loading', async () => {
    /**
     * TC-UNIVERSAL-001
     * Verifies: AC-wrapper-01 — wrapper renders fetched items via renderItem
     */
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  it('renders search input', async () => {
    /**
     * TC-UNIVERSAL-002
     * Verifies: AC-wrapper-02 — search input is visible by default
     */
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  it('hides search when showSearch=false', async () => {
    /**
     * TC-UNIVERSAL-003
     * Verifies: AC-wrapper-03 — showSearch=false removes the search input
     */
    render(
      <UniversalListing
        adapter={mockAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        showSearch={false}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no items', async () => {
    /**
     * TC-UNIVERSAL-004
     * Verifies: AC-wrapper-04 — empty state is shown when adapter returns zero items
     */
    const emptyAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockResolvedValue({ items: [], totalCount: 0, hasMore: false }),
    };

    render(
      <UniversalListing
        adapter={emptyAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });

  it('shows error state with retry', async () => {
    /**
     * TC-UNIVERSAL-005
     * Verifies: AC-wrapper-05 — error state shown with retry button when adapter rejects
     */
    const failAdapter: DataAdapter<TestItem> = {
      fetch: vi.fn().mockRejectedValue(new Error('Failed')),
    };

    render(
      <UniversalListing
        adapter={failAdapter}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        lang="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
