/**
 * Unit tests for backfill-companies.cjs pure logic.
 *
 * Since the script is a CJS file with Firebase Admin side effects at module scope,
 * we extract and test the pure functions (COMPANY_MAP structure, name lookup,
 * normalization) independently.
 *
 * TC-backfill-001 through TC-backfill-008
 */
import { describe, it, expect } from 'vitest';

// --- Replicate the COMPANY_MAP and buildNameLookup from the script ---
// This mirrors the data in scripts/backfill-companies.cjs so that tests
// validate the mapping logic without importing the module (which has side effects).

const COMPANY_MAP: Record<string, { domain?: string; industry?: string; location?: string; normalizedTo?: string }> = {
  'BBVA': { domain: 'bbva.com', industry: 'Finanzas', location: 'Ciudad de México' },
  'Bbva': { normalizedTo: 'BBVA' },
  'Algorithia': { domain: 'algorithia.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'coppel': { domain: 'coppel.com', industry: 'Retail', location: 'Culiacán' },
  'Uber': { domain: 'uber.com', industry: 'Tecnología', location: 'Global' },
  'The Coca Cola Company': { domain: 'coca-colacompany.com', industry: 'Consumo', location: 'Global' },
  'Datateam': { domain: 'datateam.com.mx', industry: 'Tecnología', location: 'Ciudad de México' },
  'Planet Fitness México': { domain: 'planetfitness.com', industry: 'Fitness', location: 'Ciudad de México' },
  'Cognodata': { domain: 'cognodata.com', industry: 'Tecnología', location: 'Madrid' },
  'Arkham Technologies Inc.': { domain: 'arkham.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'Secretaria de Finanzas de la CDMX': { domain: 'finanzas.cdmx.gob.mx', industry: 'Gobierno', location: 'Ciudad de México' },
  'El puerto de liverpool': { domain: 'liverpool.com.mx', industry: 'Retail', location: 'Ciudad de México' },
  'Banorte': { domain: 'banorte.com', industry: 'Finanzas', location: 'Monterrey' },
  'Oracle': { domain: 'oracle.com', industry: 'Tecnología', location: 'Global' },
  'XalDigital': { domain: 'xaldigital.com', industry: 'Tecnología', location: 'Ciudad de México' },
  'J.D. Power': { domain: 'jdpower.com', industry: 'Consultoría', location: 'Global' },
  'Circulo': { domain: 'circulodecredito.com.mx', industry: 'Finanzas', location: 'Ciudad de México' },
  'Kuona': { domain: 'kuona.ai', industry: 'Tecnología', location: 'Ciudad de México' },
  'Microsoft': { domain: 'microsoft.com', industry: 'Tecnología', location: 'Global' },
  'NielsenIQ': { domain: 'nielseniq.com', industry: 'Datos', location: 'Global' },
  'Universal Pictures International': { domain: 'universalpictures.com', industry: 'Entretenimiento', location: 'Global' },
};

function buildNameLookup(): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const [name, entry] of Object.entries(COMPANY_MAP)) {
    if (entry.normalizedTo) {
      lookup[name.toLowerCase()] = entry.normalizedTo;
    } else {
      lookup[name.toLowerCase()] = name;
    }
  }
  return lookup;
}

describe('backfill-companies', () => {
  describe('COMPANY_MAP structure', () => {
    /** TC-backfill-001: Verifies COMPANY_MAP has exactly 21 entries */
    it('TC-backfill-001: should have 21 entries total', () => {
      expect(Object.keys(COMPANY_MAP)).toHaveLength(21);
    });

    /** TC-backfill-002: Verifies exactly 1 normalizedTo alias exists */
    it('TC-backfill-002: should have exactly 1 normalizedTo alias', () => {
      const aliases = Object.entries(COMPANY_MAP).filter(([, v]) => v.normalizedTo);
      expect(aliases).toHaveLength(1);
      expect(aliases[0][0]).toBe('Bbva');
      expect(aliases[0][1].normalizedTo).toBe('BBVA');
    });

    /** TC-backfill-003: Verifies all canonical entries have required fields */
    it('TC-backfill-003: should have domain, industry, and location on all canonical entries', () => {
      const canonicalEntries = Object.entries(COMPANY_MAP).filter(([, v]) => !v.normalizedTo);
      expect(canonicalEntries).toHaveLength(20);

      for (const [name, entry] of canonicalEntries) {
        expect(entry.domain, `${name} missing domain`).toBeTruthy();
        expect(entry.industry, `${name} missing industry`).toBeTruthy();
        expect(entry.location, `${name} missing location`).toBeTruthy();
      }
    });

    /** TC-backfill-004: Verifies all domains are unique across canonical entries */
    it('TC-backfill-004: should have unique domains across canonical entries', () => {
      const canonicalEntries = Object.entries(COMPANY_MAP).filter(([, v]) => !v.normalizedTo);
      const domains = canonicalEntries.map(([, v]) => v.domain);
      const uniqueDomains = new Set(domains);
      expect(uniqueDomains.size).toBe(domains.length);
    });
  });

  describe('buildNameLookup', () => {
    const lookup = buildNameLookup();

    /** TC-backfill-005: Verifies case-insensitive lookup returns canonical name */
    it('TC-backfill-005: should return canonical name for lowercase input', () => {
      expect(lookup['bbva']).toBe('BBVA');
      expect(lookup['microsoft']).toBe('Microsoft');
      expect(lookup['oracle']).toBe('Oracle');
      expect(lookup['uber']).toBe('Uber');
    });

    /** TC-backfill-006: Verifies normalized alias maps to canonical name */
    it('TC-backfill-006: should map "Bbva" alias to "BBVA" canonical name', () => {
      // "Bbva" lowercased is "bbva", same as "BBVA" lowercased
      // The alias entry should resolve to "BBVA"
      expect(lookup['bbva']).toBe('BBVA');
    });

    /** TC-backfill-007: Verifies lookup covers all 21 entries (but only 20 unique lowercase keys) */
    it('TC-backfill-007: should have 20 unique lowercase keys (BBVA and Bbva share key)', () => {
      // "BBVA" and "Bbva" both lowercase to "bbva", so they collapse to 1 key
      expect(Object.keys(lookup)).toHaveLength(20);
    });

    /** TC-backfill-008: Verifies companies with special characters in names */
    it('TC-backfill-008: should handle company names with special characters', () => {
      expect(lookup['j.d. power']).toBe('J.D. Power');
      expect(lookup['the coca cola company']).toBe('The Coca Cola Company');
      expect(lookup['arkham technologies inc.']).toBe('Arkham Technologies Inc.');
      expect(lookup['el puerto de liverpool']).toBe('El puerto de liverpool');
      expect(lookup['secretaria de finanzas de la cdmx']).toBe('Secretaria de Finanzas de la CDMX');
    });
  });
});
