/**
 * The Skew Math:
 * - 1st place points = 3 * n1
 * - Lower rank points = 2 * n2 + 1 * n3
 * - Skew Ratio R = (3*n1 + eps) / (2*n2 + 1*n3 + eps)
 */

import type { EntryScoreBreakdown } from './types.js';
import { RANK_WEIGHTS } from './types.js';

export const DEFAULT_SKEW_EPSILON = 1.0;

/**
 * Computes the smoothed Rank Skew Ratio for an entry.
 * R ≈ 1.0 -> Organic favorite with natural decay curve.
 * R > 3.0 -> Suspicious hyper-concentration at Rank 1!
 */
export function calculate_skew_ratio(
  breakdown: EntryScoreBreakdown,
  epsilon: number = DEFAULT_SKEW_EPSILON
): number {
  const rank1Points = breakdown.rank1Count * RANK_WEIGHTS[1];
  const lowerRankPoints =
    breakdown.rank2Count * RANK_WEIGHTS[2] +
    breakdown.rank3Count * RANK_WEIGHTS[3];

  return (rank1Points + epsilon) / (lowerRankPoints + epsilon);
}

export const calculateSkewRatio = calculate_skew_ratio;
