import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingPagination } from '@components/listing/ListingPagination';

describe.sequential('ListingPagination', () => {
  describe('offset mode', () => {
    it('renders page buttons', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('disables previous on first page', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('calls onPageChange on click', () => {
      const onChange = vi.fn();
      render(
        <ListingPagination
          page={1}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={onChange}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      fireEvent.click(screen.getByText('3'));
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('marks current page with aria-current', () => {
      render(
        <ListingPagination
          page={3}
          totalPages={5}
          hasMore={true}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('3')).toHaveAttribute('aria-current', 'page');
    });

    it('returns null for single page', () => {
      const { container } = render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={false}
          paginationMode="offset"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('cursor mode', () => {
    it('renders load more button', () => {
      render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={true}
          paginationMode="cursor"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
          lang="en"
        />
      );
      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('hides when no more items', () => {
      const { container } = render(
        <ListingPagination
          page={1}
          totalPages={1}
          hasMore={false}
          paginationMode="cursor"
          onPageChange={vi.fn()}
          onLoadMore={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe('');
    });
  });
});
