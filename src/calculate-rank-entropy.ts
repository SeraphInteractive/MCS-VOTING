/**
 * - High Entropy (~1.0): Healthy distribution. The community gave it some 1s,
 *   some 2s, and some 3s (organic consensus).
 * - Low Entropy (~0.0): Extreme polarization / raid. 99% of votes are crammed
 *   into a single rank position (usually rank 1).
 */

import type { EntryScoreBreakdown } from './types.js';

/**
 * Computes normalized Shannon rank entropy in [0.0, 1.0].
 */
export function calculate_rank_entropy(
  breakdown: EntryScoreBreakdown
): number {
  const totalVotes = breakdown.appearanceCount;
  if (totalVotes === 0) return 1.0;

  const eps = 0.01;
  const n1 = breakdown.rank1Count + eps;
  const n2 = breakdown.rank2Count + eps;
  const n3 = breakdown.rank3Count + eps;
  const sumN = n1 + n2 + n3;

  const p1 = n1 / sumN;
  const p2 = n2 / sumN;
  const p3 = n3 / sumN;

  // Base 3 logarithm normalization: log3(x) = ln(x) / ln(3)
  const ln3 = Math.log(3);
  const rawEntropy = -(
    p1 * Math.log(p1) +
    p2 * Math.log(p2) +
    p3 * Math.log(p3)
  ) / ln3;

  return Math.min(1.0, Math.max(0.0, rawEntropy));
}

export const calculateRankEntropy = calculate_rank_entropy;
