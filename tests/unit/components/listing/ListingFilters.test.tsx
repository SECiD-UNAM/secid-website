import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingFilters } from '@components/listing/ListingFilters';

const definitions = [
  { key: 'category', label: 'Category', type: 'select' as const, options: [{ value: 'tech', label: 'Tech' }] },
  { key: 'active', label: 'Active Only', type: 'toggle' as const },
];

describe.sequential('ListingFilters', () => {
  it('renders collapsible by default (toggle button visible)', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('expands on click in collapsible mode', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders visible mode without toggle button', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        filterMode="visible"
        lang="en"
      />
    );
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('calls onFilterChange when select changes', () => {
    const onChange = vi.fn();
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{}}
        onFilterChange={onChange}
        onClearAll={vi.fn()}
        filterMode="visible"
        lang="en"
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tech' } });
    expect(onChange).toHaveBeenCalledWith('category', 'tech');
  });

  it('shows active filter count badge', () => {
    render(
      <ListingFilters
        definitions={definitions}
        activeFilters={{ category: 'tech' }}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('returns null when no definitions', () => {
    const { container } = render(
      <ListingFilters
        definitions={[]}
        activeFilters={{}}
        onFilterChange={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
