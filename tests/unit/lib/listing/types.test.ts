import { describe, it, expect } from 'vitest';
import { isViewMode } from '@lib/listing/types';

describe('isViewMode', () => {
  it('returns true for valid view modes', () => {
    expect(isViewMode('grid')).toBe(true);
    expect(isViewMode('list')).toBe(true);
    expect(isViewMode('compact')).toBe(true);
    expect(isViewMode('table')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isViewMode('calendar')).toBe(false);
    expect(isViewMode('landscape')).toBe(false);
    expect(isViewMode('')).toBe(false);
  });
});
