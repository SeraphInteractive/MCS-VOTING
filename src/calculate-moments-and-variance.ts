/**
 * The Math Breakdown:
 * For any voter i and idea j, the points awarded is a random variable X_ij in {3, 2, 1, 0}.
 *
 * Empirical probabilities:
 *   p_1 = n_1 / N   (proportion of ballots ranking idea j in 1st place)
 *   p_2 = n_2 / N   (proportion of ballots ranking idea j in 2nd place)
 *   p_3 = n_3 / N   (proportion of ballots ranking idea j in 3rd place)
 *   p_0 = 1 - (p1 + p2 + p3)  (proportion of ballots ignoring this idea completely)
 *
 * Moments:
 *   E[X]   = 3*p_1 + 2*p_2 + 1*p_3 = mu_j  (average points per voter)
 *   E[X^2] = (3^2)*p_1 + (2^2)*p_2 + (1^2)*p_3 = 9*p_1 + 4*p_2 + p_3  (squared payoffs!)
 *   Var(X) = E[X^2] - (E[X])^2
 *   Var(S) = N * Var(X)  (total score variance across all N voters)
 */

import type { EntryMoments, EntryScoreBreakdown } from './types.js';
import { RANK_WEIGHTS } from './types.js';

/**
 * Calculates empirical probabilities, first & second moments, and total score variance.
 */
export function calculate_moments_and_variance(
  breakdown: EntryScoreBreakdown,
  totalBallots: number
): EntryMoments {
  // Edge case: If no one has voted yet, return safe zeroed moments
  if (totalBallots <= 0) {
    return {
      entryId: breakdown.entryId,
      p1: 0,
      p2: 0,
      p3: 0,
      p0: 1.0,
      expectedScorePerVoter: 0,
      secondMoment: 0,
      singleBallotVariance: 0,
      totalVariance: 0,
      standardDeviation: 0,
    };
  }

  const N = totalBallots;

  // Step 1: Compute empirical probabilities for each rank
  const p1 = breakdown.rank1Count / N;
  const p2 = breakdown.rank2Count / N;
  const p3 = breakdown.rank3Count / N;
  // p0 is the chance a voter gave this idea 0 points
  const p0 = Math.max(0, 1.0 - (p1 + p2 + p3));

  // Step 2: First moment E[X] (Expected score per voter)
  // E[X] = 3*p1 + 2*p2 + 1*p3
  const expectedScorePerVoter =
    RANK_WEIGHTS[1] * p1 +
    RANK_WEIGHTS[2] * p2 +
    RANK_WEIGHTS[3] * p3;

  // Step 3: Second moment E[X^2] (Why we square the weights!)
  // Payoff is 3, 2, 1 -> Payoffs squared are 9, 4, 1
  // E[X^2] = 9*p1 + 4*p2 + 1*p3
  const secondMoment =
    Math.pow(RANK_WEIGHTS[1], 2) * p1 +
    Math.pow(RANK_WEIGHTS[2], 2) * p2 +
    Math.pow(RANK_WEIGHTS[3], 2) * p3;

  // Step 4: Single-ballot variance: Var(X) = E[X^2] - (E[X])^2
  // Note: Clamp to 0 against IEEE 754 micro-precision floating point underflow
  const singleBallotVariance = Math.max(
    0,
    secondMoment - Math.pow(expectedScorePerVoter, 2)
  );

  // Step 5: Scale to total score variance across all N ballots
  // Var(S) = N * Var(X)
  const totalVariance = N * singleBallotVariance;
  const standardDeviation = Math.sqrt(totalVariance);

  return {
    entryId: breakdown.entryId,
    p1,
    p2,
    p3,
    p0,
    expectedScorePerVoter,
    secondMoment,
    singleBallotVariance,
    totalVariance,
    standardDeviation,
  };
}

export const calculateMomentsAndVariance = calculate_moments_and_variance;
