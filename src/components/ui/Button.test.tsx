import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-600');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('border-gray-300');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size="md">Medium</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-2', 'text-base');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders as different element with as prop', () => {
    render(
      <Button as="a" href="/test">
        Link Button
      </Button>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref Button</Button>);

    expect(ref).toHaveBeenCalled();
  });

  it('handles button types correctly', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');

    rerender(<Button type="button">Button</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });
});
