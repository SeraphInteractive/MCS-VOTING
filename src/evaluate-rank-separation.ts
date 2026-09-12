/**
 * How we evaluate the lead:
 * 1. Point difference: Delta = S_a - S_b
 * 2. Combined Variance: Var(Delta) = Var(S_a) + Var(S_b) - 2*Cov(S_a, S_b)
 * 3. Standard Error: SE = sqrt(Var(Delta))
 * 4. Test statistic: Z = Delta / SE
 * 
 * If |Z| >= 1.96 (95% confidence, p <= 0.05):
 *   -> "DECISIVE_LEAD" -> Declare the true winner!
 * If |Z| < 1.96 (p > 0.05):
 *   -> "STATISTICAL_TIE" -> Score wobble! Trigger a tiered runoff re-vote.
 */

import type { Ballot, EntryScoreBreakdown, PairwiseSeparation } from './types.js';
import { calculate_moments_and_variance } from './calculate-moments-and-variance.js';
import { calculate_pairwise_covariance } from './calculate-pairwise-covariance.js';

// Standard 95% two-tailed cutoff (|Z| >= 1.96 -> p <= 0.05)
export const DEFAULT_Z_THRESHOLD = 1.96;

/**
 * Checks if the lead between two entries is a real community choice or just random noise.
 */
export function evaluate_rank_separation(
  breakdownA: EntryScoreBreakdown,
  breakdownB: EntryScoreBreakdown,
  ballots: readonly Ballot[],
  zThreshold: number = DEFAULT_Z_THRESHOLD
): PairwiseSeparation {
  const N = ballots.length;

  // Step 1: Calculate individual variances
  const momentsA = calculate_moments_and_variance(breakdownA, N);
  const momentsB = calculate_moments_and_variance(breakdownB, N);

  // Raw point gap: Delta = Sa - Sb
  const deltaScore = breakdownA.rawScore - breakdownB.rawScore;

  // Step 2: Calculate ballot covariance
  const { totalCovariance } = calculate_pairwise_covariance(
    breakdownA.entryId,
    breakdownB.entryId,
    ballots
  );

  // Step 3: Combined variance of difference
  // Var(Delta) = Var(Sa) + Var(Sb) - 2*Cov(Sa, Sb)
  const deltaVariance = Math.max(
    0,
    momentsA.totalVariance + momentsB.totalVariance - 2 * totalCovariance
  );

  // Standard Error
  const standardError = Math.sqrt(deltaVariance);

  // Step 4: Compute Z-Score (Z = Delta / SE)
  let zScore = 0;
  if (standardError > 1e-9) {
    zScore = deltaScore / standardError;
  }

  // Two-tailed p-value calculation
  const pValue = approximate_two_tailed_p_value(Math.abs(zScore));
  const isSignificant = Math.abs(zScore) >= zThreshold;

  // Step 5: Classify outcome (Decisive Lead vs Statistical Wobble Tie)
  const status: 'DECISIVE_LEAD' | 'STATISTICAL_TIE' = isSignificant
    ? 'DECISIVE_LEAD'
    : 'STATISTICAL_TIE';

  const recommendedAction: 'DECLARE_WINNER' | 'TIERED_RUNOFF' = isSignificant
    ? 'DECLARE_WINNER'
    : 'TIERED_RUNOFF';

  let explanation: string;
  if (isSignificant) {
    const leader = deltaScore > 0 ? breakdownA.entryId : breakdownB.entryId;
    const margin = Math.abs(deltaScore);
    explanation = `Entry "${leader}" holds a statistically decisive lead of ${margin} points (Z = ${zScore.toFixed(3)}, p = ${pValue.toFixed(4)} < 0.05). This lead clearly exceeds the error margin!`;
  } else {
    explanation = `Score wobble detected! The ${Math.abs(deltaScore)}-point gap between "${breakdownA.entryId}" and "${breakdownB.entryId}" has Z = ${zScore.toFixed(3)} (p = ${pValue.toFixed(4)} > 0.05). This difference is within random wobble territory. Recommend a tiered runoff re-vote between these entries.`;
  }

  return {
    entryA: breakdownA.entryId,
    entryB: breakdownB.entryId,
    deltaScore,
    varianceA: momentsA.totalVariance,
    varianceB: momentsB.totalVariance,
    covarianceAB: totalCovariance,
    deltaVariance,
    standardError,
    zScore,
    pValue,
    status,
    recommendedAction,
    explanation,
  };
}

/**
 * Calculates a confidence interval [lower, upper] for the point gap Delta.
 */
export function calculate_confidence_interval(
  deltaScore: number,
  standardError: number,
  zThreshold: number = DEFAULT_Z_THRESHOLD
): { readonly lower: number; readonly upper: number } {
  const margin = zThreshold * standardError;
  return {
    lower: deltaScore - margin,
    upper: deltaScore + margin,
  };
}

/**
 * Polynomial approximation of two-tailed p-value from standard normal Z (erfc).
 */
export function approximate_two_tailed_p_value(absZ: number): number {
  if (absZ < 0) absZ = Math.abs(absZ);
  if (absZ > 8.0) return 0.0;

  const x = absZ / Math.SQRT2;
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * x);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  const erfc = poly * Math.exp(-x * x);

  return Math.min(1.0, Math.max(0.0, erfc));
}

export const evaluateRankSeparation = evaluate_rank_separation;
export const calculateConfidenceInterval = calculate_confidence_interval;
export const approximateTwoTailedPValue = approximate_two_tailed_p_value;
