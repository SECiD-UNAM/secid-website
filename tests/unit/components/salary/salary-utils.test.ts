/**
 * Tests for SalaryInsights business logic: safeAggregate privacy helper.
 *
 * TC-salary-001 through TC-salary-010
 * Verifies: AC-SALARY-ANALYTICS-001 (privacy: minimum 3 data points per group)
 */
import { describe, it, expect } from 'vitest';
import { safeAggregate } from '../../../../src/components/salary/salary-utils';

describe('safeAggregate', () => {
  describe('TC-salary-001: returns null when fewer than minCount values', () => {
    it('returns null for empty array', () => {
      // Arrange
      const values: number[] = [];
      // Act
      const result = safeAggregate(values);
      // Assert
      expect(result).toBeNull();
    });

    it('returns null for 1 value', () => {
      const result = safeAggregate([100]);
      expect(result).toBeNull();
    });

    it('returns null for 2 values', () => {
      const result = safeAggregate([100, 200]);
      expect(result).toBeNull();
    });
  });

  describe('TC-salary-002: returns stats for exactly minCount (3) values', () => {
    it('returns non-null for exactly 3 values', () => {
      // Arrange
      const values = [100, 200, 300];
      // Act
      const result = safeAggregate(values);
      // Assert
      expect(result).not.toBeNull();
      expect(result!.count).toBe(3);
    });
  });

  describe('TC-salary-003: median is correctly computed', () => {
    it('median of [10, 20, 30] is 20', () => {
      // Arrange / Act
      const result = safeAggregate([10, 20, 30]);
      // Assert
      expect(result!.median).toBe(20);
    });

    it('median of [30, 10, 20] (unsorted) is 20 — verifies internal sort', () => {
      const result = safeAggregate([30, 10, 20]);
      expect(result!.median).toBe(20);
    });

    it('median of 5 values picks middle index', () => {
      // sorted: [1,2,3,4,5], floor(5/2)=2 → value at index 2 = 3
      const result = safeAggregate([5, 3, 1, 4, 2]);
      expect(result!.median).toBe(3);
    });
  });

  describe('TC-salary-004: p10 is computed correctly', () => {
    it('p10 of 10 values — index = floor(10 * 0.1) = 1', () => {
      // sorted: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      // p10 index = floor(10 * 0.1) = 1 → value = 20
      const values = [70, 10, 50, 30, 90, 20, 80, 60, 40, 100];
      const result = safeAggregate(values);
      expect(result!.p10).toBe(20);
    });
  });

  describe('TC-salary-005: p90 is computed correctly', () => {
    it('p90 of 10 values — index = floor(10 * 0.9) = 9', () => {
      // sorted: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      // p90 index = floor(10 * 0.9) = 9 → value = 100
      const values = [70, 10, 50, 30, 90, 20, 80, 60, 40, 100];
      const result = safeAggregate(values);
      expect(result!.p90).toBe(100);
    });
  });

  describe('TC-salary-006: custom minCount respected', () => {
    it('returns null for 4 values with minCount=5', () => {
      const result = safeAggregate([1, 2, 3, 4], 5);
      expect(result).toBeNull();
    });

    it('returns stats for 5 values with minCount=5', () => {
      const result = safeAggregate([1, 2, 3, 4, 5], 5);
      expect(result).not.toBeNull();
      expect(result!.count).toBe(5);
    });
  });

  describe('TC-salary-007: count matches input length', () => {
    it('count equals number of values provided', () => {
      const values = [10, 20, 30, 40, 50];
      const result = safeAggregate(values);
      expect(result!.count).toBe(5);
    });
  });

  describe('TC-salary-008: original array is not mutated', () => {
    it('input array order is unchanged after calling safeAggregate', () => {
      const values = [30, 10, 20];
      const original = [...values];
      safeAggregate(values);
      expect(values).toEqual(original);
    });
  });
});
