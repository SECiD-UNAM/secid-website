import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import StatsCard from '@/components/mentorship/shared/StatsCard';

/**
 * TC-mentorship-shared-001
 * Verifies: StatsCard renders label and value correctly
 */
describe.sequential('StatsCard', () => {
  describe('basic rendering', () => {
    it('renders label and numeric value', () => {
      const { container } = render(
        <StatsCard label="Active Matches" value={12} />
      );
      const scope = within(container);

      expect(scope.getByText('Active Matches')).toBeInTheDocument();
      expect(scope.getByText('12')).toBeInTheDocument();
    });

    it('renders string value', () => {
      const { container } = render(<StatsCard label="Rating" value="4.5/5" />);
      const scope = within(container);

      expect(scope.getByText('Rating')).toBeInTheDocument();
      expect(scope.getByText('4.5/5')).toBeInTheDocument();
    });
  });

  /**
   * TC-mentorship-shared-002
   * Verifies: StatsCard applies correct accent color class
   */
  describe('accent colors', () => {
    it('applies primary accent by default', () => {
      const { container } = render(<StatsCard label="Primary" value={101} />);
      const valueEl = within(container).getByText('101');
      expect(valueEl.className).toContain('text-primary-600');
    });

    it('applies blue accent', () => {
      const { container } = render(
        <StatsCard label="Blue" value={202} accent="blue" />
      );
      const valueEl = within(container).getByText('202');
      expect(valueEl.className).toContain('text-blue-600');
    });

    it('applies green accent', () => {
      const { container } = render(
        <StatsCard label="Green" value={303} accent="green" />
      );
      const valueEl = within(container).getByText('303');
      expect(valueEl.className).toContain('text-green-600');
    });

    it('applies yellow accent', () => {
      const { container } = render(
        <StatsCard label="Yellow" value={404} accent="yellow" />
      );
      const valueEl = within(container).getByText('404');
      expect(valueEl.className).toContain('text-yellow-600');
    });

    it('applies purple accent', () => {
      const { container } = render(
        <StatsCard label="Purple" value={505} accent="purple" />
      );
      const valueEl = within(container).getByText('505');
      expect(valueEl.className).toContain('text-purple-600');
    });
  });

  /**
   * TC-mentorship-shared-003
   * Verifies: StatsCard renders trend indicator
   */
  describe('trend indicator', () => {
    it('renders trend text when provided', () => {
      const { container } = render(
        <StatsCard label="Sessions" value={20} trend="+5 this month" />
      );
      expect(within(container).getByText('+5 this month')).toBeInTheDocument();
    });

    it('does not render trend when not provided', () => {
      const { container } = render(<StatsCard label="No Trend" value={21} />);
      const trendEl = container.querySelector('[data-testid="stats-trend"]');
      expect(trendEl).toBeNull();
    });

    it('applies green color when trendUp is true', () => {
      const { container } = render(
        <StatsCard label="Up Trend" value={22} trend="+5" trendUp={true} />
      );
      const trendEl = within(container).getByText('+5');
      expect(trendEl.className).toContain('text-green');
    });

    it('applies red color when trendUp is false', () => {
      const { container } = render(
        <StatsCard label="Down Trend" value={23} trend="-3" trendUp={false} />
      );
      const trendEl = within(container).getByText('-3');
      expect(trendEl.className).toContain('text-red');
    });
  });

  /**
   * TC-mentorship-shared-004
   * Verifies: StatsCard renders optional icon
   */
  describe('icon', () => {
    it('renders icon when provided', () => {
      const { container } = render(
        <StatsCard
          label="With Icon"
          value={30}
          icon={<span data-testid="test-icon">Icon</span>}
        />
      );
      expect(within(container).getByTestId('test-icon')).toBeInTheDocument();
    });

    it('does not render icon container when icon not provided', () => {
      const { container } = render(<StatsCard label="No Icon" value={31} />);
      const iconContainer = container.querySelector(
        '[data-testid="stats-icon"]'
      );
      expect(iconContainer).toBeNull();
    });
  });

  /**
   * TC-mentorship-shared-005
   * Verifies: StatsCard has correct card styling
   */
  describe('card styling', () => {
    it('has rounded-xl shadow card classes', () => {
      const { container } = render(
        <StatsCard label="Styled Card" value={40} />
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('shadow-sm');
      expect(card.className).toContain('hover:-translate-y-0.5');
    });
  });
});
