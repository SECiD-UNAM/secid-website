import React from 'react';
import { useFeatureFlag } from '@/hooks/useBeta';
import type { BetaFeatureId } from '@/lib/beta';

interface BetaGateProps {
  feature: BetaFeatureId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children only when the specified beta feature is enabled.
 * On production: renders fallback (or nothing).
 * On beta: renders children.
 */
export const BetaGate: React.FC<BetaGateProps> = ({ feature, children, fallback = null }) => {
  const enabled = useFeatureFlag(feature);
  return <>{enabled ? children : fallback}</>;
};
