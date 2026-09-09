/**
 * 
 * Shrinkage:
 * (Total_Score_j + K * Global_Mean) / (Votes_Count_j + K).
 * (https://en.wikipedia.org/wiki/Shrinkage_(statistics))
 *
 * The Bayesian Logic:
 * Until an entry gets enough votes to prove itself to the community, we give it
 * K dummy votes at the global average mu_0 = 6 / M.
 * 
 * - If an entry has 1 vote (3 pts): the 30 dummy votes dilute it so it can't snipe #1.
 * - If an entry has 300 votes (600 pts): the 30 dummy votes barely matter (< 10%),
 *   so its real score shines through.
 */

import type { BayesianShrinkageResult, EntryScoreBreakdown } from './types.js';
import { POINTS_PER_BALLOT } from './types.js';

// Default K: 30 dummy votes at the site-wide average
export const DEFAULT_SHRINKAGE_K = 30;

/**
 * Applies Bayesian shrinkage to an entry's score to prevent cold-start snipers.
 */
export function calculate_bayesian_shrinkage(
  breakdown: EntryScoreBreakdown,
  totalEntries: number,
  totalBallots: number,
  priorK: number = DEFAULT_SHRINKAGE_K
): BayesianShrinkageResult {
  const M = Math.max(1, totalEntries);
  const N = Math.max(0, totalBallots);
  const K = Math.max(0, priorK);

  // Global mean score expected per entry per voter: mu_0 = 6 / M
  const globalMean = POINTS_PER_BALLOT / M;

  const rawScore = breakdown.rawScore;
  const appearances = breakdown.appearanceCount;

  // If K == 0, shrinkage is disabled (pure raw score)
  if (K === 0) {
    const rawMean = appearances > 0 ? rawScore / appearances : 0;
    return {
      entryId: breakdown.entryId,
      rawScore,
      appearances,
      priorK: 0,
      globalMean,
      regularizedMeanScore: rawMean,
      regularizedTotalScore: rawScore,
    };
  }

  // Regularized Bayesian compute formula: (Total_Score_j + K * Global_Mean) / (Votes_Count_j + K)
  const regularizedMeanScore = (rawScore + K * globalMean) / (appearances + K);

  // Scaled regularized total score across the community size
  const regularizedTotalScore = N > 0 ? regularizedMeanScore * N : 0;

  return {
    entryId: breakdown.entryId,
    rawScore,
    appearances,
    priorK: K,
    globalMean,
    regularizedMeanScore,
    regularizedTotalScore,
  };
}

/**
 * Builds a shrinkage-adjusted leaderboard sorted descending by regularized score.
 */
export function calculate_regularized_leaderboard(
  breakdowns: readonly EntryScoreBreakdown[],
  totalEntries: number,
  totalBallots: number,
  priorK: number = DEFAULT_SHRINKAGE_K
): readonly BayesianShrinkageResult[] {
  const results = breakdowns.map((b) =>
    calculate_bayesian_shrinkage(b, totalEntries, totalBallots, priorK)
  );

  return results.sort((a, b) => b.regularizedTotalScore - a.regularizedTotalScore);
}

export const calculateBayesianShrinkage = calculate_bayesian_shrinkage;
export const calculateRegularizedLeaderboard = calculate_regularized_leaderboard;
