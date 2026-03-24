import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingSearch } from '@components/listing/ListingSearch';

describe.sequential('ListingSearch', () => {
  it('renders search input with placeholder', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders Spanish placeholder', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="es" />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    const onChange = vi.fn();
    render(<ListingSearch query="" onQueryChange={onChange} lang="en" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('shows clear button when query has value', () => {
    render(<ListingSearch query="test" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ListingSearch query="" onQueryChange={vi.fn()} lang="en" />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
