import { describe, it, expect } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import SessionCard from '@/components/mentorship/shared/SessionCard';
import type { MentorshipSession } from '@/types/mentorship';

function createMockSession(
  overrides: Partial<MentorshipSession> = {}
): MentorshipSession {
  return {
    id: 'session-1',
    matchId: 'match-1',
    mentorId: 'mentor-1',
    menteeId: 'mentee-1',
    title: 'Career Growth Strategy',
    description: 'Discuss career path options',
    scheduledAt: new Date('2026-04-01T14:00:00Z'),
    duration: 60,
    type: 'video',
    meetingLink: 'https://meet.example.com/abc',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * TC-mentorship-shared-010
 * Verifies: SessionCard renders session info correctly
 */
describe.sequential('SessionCard', () => {
  describe('basic rendering', () => {
    it('renders session title and partner name', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession()}
          partnerName="Ana Garcia"
          partnerInitials="AG"
        />
      );
      const scope = within(container);

      expect(scope.getByText('Career Growth Strategy')).toBeInTheDocument();
      expect(scope.getByText(/Ana Garcia/)).toBeInTheDocument();
    });

    it('renders partner initials in avatar', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession()}
          partnerName="Ana Garcia"
          partnerInitials="AG"
        />
      );
      expect(within(container).getByText('AG')).toBeInTheDocument();
    });
  });

  /**
   * TC-mentorship-shared-011
   * Verifies: SessionCard renders type badges with correct colors
   */
  describe('type badges', () => {
    it('renders video badge with blue styling', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ type: 'video' })}
          partnerName="Ana"
          partnerInitials="A"
        />
      );
      const badge = within(container).getByText('video');
      expect(badge.className).toContain('blue');
    });

    it('renders voice badge with purple styling', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ type: 'voice' })}
          partnerName="Ana"
          partnerInitials="A"
        />
      );
      const badge = within(container).getByText('voice');
      expect(badge.className).toContain('purple');
    });

    it('renders chat badge with green styling', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ type: 'chat' })}
          partnerName="Ana"
          partnerInitials="A"
        />
      );
      const badge = within(container).getByText('chat');
      expect(badge.className).toContain('green');
    });

    it('renders in-person badge with amber styling', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ type: 'in-person' })}
          partnerName="Ana"
          partnerInitials="A"
        />
      );
      const badge = within(container).getByText('in-person');
      expect(badge.className).toContain('amber');
    });
  });

  /**
   * TC-mentorship-shared-012
   * Verifies: SessionCard renders Join button when session is upcoming
   */
  describe('actions', () => {
    it('renders Join button when onJoin provided and session is scheduled', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ status: 'scheduled' })}
          partnerName="Ana"
          partnerInitials="A"
          onJoin={() => {}}
        />
      );
      const scope = within(container);
      expect(scope.getByRole('button', { name: /join/i })).toBeInTheDocument();
    });

    it('does not render Join button when compact', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ status: 'scheduled' })}
          partnerName="Ana"
          partnerInitials="A"
          onJoin={() => {}}
          compact
        />
      );
      const scope = within(container);
      expect(scope.queryByRole('button', { name: /join/i })).toBeNull();
    });

    it('calls onJoin when Join button is clicked', () => {
      let joinCalled = false;
      const onJoin = () => {
        joinCalled = true;
      };

      const { container } = render(
        <SessionCard
          session={createMockSession({ status: 'scheduled' })}
          partnerName="Ana"
          partnerInitials="A"
          onJoin={onJoin}
        />
      );
      const scope = within(container);
      fireEvent.click(scope.getByRole('button', { name: /join/i }));
      expect(joinCalled).toBe(true);
    });

    it('does not render Join button for completed sessions', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession({ status: 'completed' })}
          partnerName="Ana"
          partnerInitials="A"
          onJoin={() => {}}
        />
      );
      const scope = within(container);
      expect(scope.queryByRole('button', { name: /join/i })).toBeNull();
    });
  });

  /**
   * TC-mentorship-shared-013
   * Verifies: SessionCard row styling
   */
  describe('styling', () => {
    it('has correct row classes', () => {
      const { container } = render(
        <SessionCard
          session={createMockSession()}
          partnerName="Ana"
          partnerInitials="A"
        />
      );
      const row = container.firstElementChild as HTMLElement;
      expect(row.className).toContain('rounded-lg');
      expect(row.className).toContain('bg-gray-50');
    });
  });
});
