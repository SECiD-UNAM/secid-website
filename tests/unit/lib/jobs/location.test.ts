/**
 * Job board "Ubicación" filter (ROADMAP G26).
 *
 * Source: src/lib/jobs/location.ts
 *
 * JobFilters offers fixed city slugs (cdmx, guadalajara, monterrey,
 * queretaro, remote) while jobs store free text such as "Guadalajara,
 * Jalisco" or "Ciudad de México, CDMX", so the match is a normalised
 * keyword test on the stored value (accents and punctuation ignored),
 * not an equality query.
 */
import { describe, it, expect } from 'vitest';
import { matchesLocation, normalizeLocation } from '@/lib/jobs/location';

describe('normalizeLocation', () => {
  it('lower-cases, strips accents and collapses punctuation', () => {
    expect(normalizeLocation('Querétaro, Qro.')).toBe('queretaro qro');
    expect(normalizeLocation('  Ciudad de México,  CDMX ')).toBe(
      'ciudad de mexico cdmx'
    );
  });
});

describe('matchesLocation', () => {
  const job = (location: string, locationType = 'onsite') => ({
    location,
    locationType,
  });

  it('matches the seeded free-text locations against the filter slugs', () => {
    expect(matchesLocation(job('Guadalajara, Jalisco'), 'guadalajara')).toBe(
      true
    );
    expect(matchesLocation(job('Ciudad de México, CDMX'), 'cdmx')).toBe(true);
    expect(matchesLocation(job('CDMX'), 'cdmx')).toBe(true);
    expect(matchesLocation(job('Mexico City'), 'cdmx')).toBe(true);
    expect(matchesLocation(job('Monterrey, N.L.'), 'monterrey')).toBe(true);
    expect(matchesLocation(job('Querétaro'), 'queretaro')).toBe(true);
    expect(matchesLocation(job('Remote'), 'remote')).toBe(true);
    expect(matchesLocation(job('Remoto (México)'), 'remote')).toBe(true);
  });

  it('treats remote-mode jobs as matching the Remoto option', () => {
    expect(matchesLocation(job('Monterrey', 'remote'), 'remote')).toBe(true);
    expect(matchesLocation(job('Monterrey', 'remote'), 'monterrey')).toBe(true);
  });

  it('does not match other cities or partial words', () => {
    expect(matchesLocation(job('Guadalajara, Jalisco'), 'monterrey')).toBe(
      false
    );
    expect(matchesLocation(job('Remote'), 'cdmx')).toBe(false);
    // "df" is a CDMX keyword only as a whole word.
    expect(matchesLocation(job('Dfw, Texas'), 'cdmx')).toBe(false);
  });

  it('an empty slug matches everything; an unknown slug compares normalised text', () => {
    expect(matchesLocation(job('Anywhere'), '')).toBe(true);
    expect(matchesLocation(job('Puebla'), 'puebla')).toBe(true);
    expect(matchesLocation(job('Puebla'), 'toluca')).toBe(false);
  });
});
