import { useState, useEffect } from 'react';
import {
  isBetaEnvironment,
  isFeatureEnabled,
  type BetaFeatureId,
} from '@/lib/beta';

/**
 * Hook to check if current session is on a beta environment.
 * Returns false during SSR, resolves client-side.
 */
export function useBeta(): boolean {
  const [isBeta, setIsBeta] = useState(false);

  useEffect(() => {
    setIsBeta(isBetaEnvironment());
  }, []);

  return isBeta;
}

/**
 * Hook to check if a specific beta feature is enabled.
 * On production: returns false for beta-flagged features.
 * On beta: returns true for all features.
 */
export function useFeatureFlag(featureId: BetaFeatureId): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isFeatureEnabled(featureId));
  }, [featureId]);

  return enabled;
}
