import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import MentorCard from '@/components/mentorship/shared/MentorCard';

/**
 * TC-mentorship-shared-020
 * Verifies: MentorCard renders name and title
 */
describe.sequential('MentorCard', () => {
  describe('basic rendering', () => {
    it('renders display name', () => {
      const { container } = render(<MentorCard displayName="Maria Lopez" />);
      expect(within(container).getByText('Maria Lopez')).toBeInTheDocument();
    });

    it('renders title and company', () => {
      const { container } = render(
        <MentorCard
          displayName="Maria Lopez"
          title="Data Scientist"
          company="Google"
        />
      );
      const scope = within(container);
      expect(scope.getByText('Data Scientist')).toBeInTheDocument();
      expect(scope.getByText('Google')).toBeInTheDocument();
    });

    it('renders initials when no profile image', () => {
      const { container } = render(<MentorCard displayName="Maria Lopez" />);
      expect(within(container).getByText('ML')).toBeInTheDocument();
    });

    it('renders profile image when provided', () => {
      const { container } = render(
        <MentorCard
          displayName="Maria Lopez"
          profileImage="https://example.com/photo.jpg"
        />
      );
      const scope = within(container);
      const img = scope.getByAltText('Maria Lopez');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });
  });

  /**
   * TC-mentorship-shared-021
   * Verifies: MentorCard getInitials helper
   */
  describe('initials generation', () => {
    it('generates initials from single word name', () => {
      const { container } = render(<MentorCard displayName="Maria" />);
      expect(within(container).getByText('M')).toBeInTheDocument();
    });

    it('generates max 2 initials from multi-word name', () => {
      const { container } = render(
        <MentorCard displayName="Maria Elena Lopez Garcia" />
      );
      expect(within(container).getByText('ME')).toBeInTheDocument();
    });

    it('handles empty name gracefully', () => {
      const { container } = render(<MentorCard displayName="" />);
      // Should not crash; no initials rendered
      expect(within(container).queryByText('undefined')).toBeNull();
    });
  });

  /**
   * TC-mentorship-shared-022
   * Verifies: MentorCard renders session count
   */
  describe('session count', () => {
    it('renders session count when provided', () => {
      const { container } = render(
        <MentorCard displayName="Carlos Ruiz" sessionCount={15} />
      );
      expect(within(container).getByText(/15/)).toBeInTheDocument();
    });

    it('does not render session count when not provided', () => {
      const { container } = render(<MentorCard displayName="Carlos Ruiz" />);
      const sessionEl = container.querySelector(
        '[data-testid="session-count"]'
      );
      expect(sessionEl).toBeNull();
    });
  });

  /**
   * TC-mentorship-shared-023
   * Verifies: MentorCard renders match score
   */
  describe('match score', () => {
    it('renders match score as percentage', () => {
      const { container } = render(
        <MentorCard displayName="Sofia Hernandez" matchScore={85} />
      );
      expect(within(container).getByText('85%')).toBeInTheDocument();
    });

    it('does not render match score when not provided', () => {
      const { container } = render(
        <MentorCard displayName="Sofia Hernandez" />
      );
      const scoreEl = container.querySelector('[data-testid="match-score"]');
      expect(scoreEl).toBeNull();
    });
  });

  /**
   * TC-mentorship-shared-024
   * Verifies: MentorCard renders status badges with correct colors
   */
  describe('status badges', () => {
    it('renders active status with green colors', () => {
      const { container } = render(
        <MentorCard displayName="Active User" status="active" />
      );
      const badge = within(container).getByText('active');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-700');
    });

    it('renders pending status with yellow colors', () => {
      const { container } = render(
        <MentorCard displayName="Pending User" status="pending" />
      );
      const badge = within(container).getByText('pending');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-700');
    });

    it('renders completed status with gray colors', () => {
      const { container } = render(
        <MentorCard displayName="Completed User" status="completed" />
      );
      const badge = within(container).getByText('completed');
      expect(badge.className).toContain('bg-gray-100');
      expect(badge.className).toContain('text-gray-600');
    });

    it('renders cancelled status with red colors', () => {
      const { container } = render(
        <MentorCard displayName="Cancelled User" status="cancelled" />
      );
      const badge = within(container).getByText('cancelled');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-600');
    });
  });

  /**
   * TC-mentorship-shared-025
   * Verifies: MentorCard is clickable when onClick provided
   */
  describe('interactivity', () => {
    it('adds cursor-pointer and role=button when onClick provided', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MentorCard displayName="Clickable User" onClick={onClick} />
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card).toHaveAttribute('role', 'button');
      expect(card.className).toContain('cursor-pointer');
    });

    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MentorCard displayName="Click Me" onClick={onClick} />
      );
      fireEvent.click(container.firstElementChild as HTMLElement);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not have button role when no onClick', () => {
      const { container } = render(<MentorCard displayName="Not Clickable" />);
      const card = container.firstElementChild as HTMLElement;
      expect(card).not.toHaveAttribute('role', 'button');
    });

    it('handles keyboard Enter activation', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MentorCard displayName="Keyboard User" onClick={onClick} />
      );
      fireEvent.keyDown(container.firstElementChild as HTMLElement, {
        key: 'Enter',
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard Space activation', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MentorCard displayName="Space User" onClick={onClick} />
      );
      fireEvent.keyDown(container.firstElementChild as HTMLElement, {
        key: ' ',
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
