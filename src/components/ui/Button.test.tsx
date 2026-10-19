import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

// Every test renders into the shared document and queries by role, which is
// incompatible with the suite's per-file concurrent execution (vitest
// sequence.concurrent) — run sequentially.
describe.sequential('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);

    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument();
  });

  it('defaults to the primary variant, medium size and type="button"', () => {
    render(<Button>Default</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-purple-600', 'px-4', 'py-2', 'text-base');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'bg-purple-600',
      'border-purple-600',
      'text-white'
    );

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'bg-gray-100',
      'border-gray-300',
      'text-gray-900'
    );

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'bg-transparent',
      'border-purple-600',
      'text-purple-600'
    );

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'bg-transparent',
      'border-transparent',
      'text-purple-600'
    );

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'bg-red-600',
      'border-red-600',
      'text-white'
    );
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'px-3',
      'py-1.5',
      'text-sm',
      'rounded-md'
    );

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'px-4',
      'py-2',
      'text-base',
      'rounded-md'
    );

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass(
      'px-6',
      'py-3',
      'text-lg',
      'rounded-lg'
    );
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button and ignores clicks when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Styling is delegated to Tailwind's disabled: variants.
    expect(button).toHaveClass(
      'disabled:opacity-50',
      'disabled:cursor-not-allowed'
    );

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows a spinner and disables the button while loading', () => {
    const { container } = render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading');
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('does not render a spinner when not loading', () => {
    const { container } = render(<Button>Idle</Button>);

    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/test">Link Button</Button>);

    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toHaveAttribute('href', '/test');
    expect(link).not.toHaveAttribute('target');
    expect(link).toHaveClass('bg-purple-600');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens external links in a new tab with an icon', () => {
    const { container } = render(
      <Button href="https://example.com" external>
        External
      </Button>
    );

    const link = screen.getByRole('link', { name: 'External' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });

  it('shows the spinner instead of the external icon on a loading link', () => {
    const { container } = render(
      <Button href="https://example.com" external loading>
        External
      </Button>
    );

    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('handles button types correctly', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');

    rerender(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
