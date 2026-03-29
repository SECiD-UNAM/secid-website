import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingViewToggle } from '@components/listing/ListingViewToggle';

describe.sequential('ListingViewToggle', () => {
  it('renders buttons for available modes', () => {
    render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid', 'list', 'compact']}
        onViewModeChange={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByLabelText('Grid')).toBeInTheDocument();
    expect(screen.getByLabelText('List')).toBeInTheDocument();
    expect(screen.getByLabelText('Compact')).toBeInTheDocument();
  });

  it('marks current mode as checked', () => {
    render(
      <ListingViewToggle
        viewMode="list"
        availableModes={['grid', 'list']}
        onViewModeChange={vi.fn()}
        lang="en"
      />
    );
    expect(screen.getByLabelText('List')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Grid')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onViewModeChange on click', () => {
    const onChange = vi.fn();
    render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid', 'list']}
        onViewModeChange={onChange}
        lang="en"
      />
    );
    fireEvent.click(screen.getByLabelText('List'));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('returns null when only one mode available', () => {
    const { container } = render(
      <ListingViewToggle
        viewMode="grid"
        availableModes={['grid']}
        onViewModeChange={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
