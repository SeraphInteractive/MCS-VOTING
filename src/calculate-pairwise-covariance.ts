/**
 * 
 * That mutual exclusion creates negative correlation / covariance:
 *   Cov(X_ia, X_ib) <= 0
 */

import type { Ballot, EntryId } from './types.js';

export interface PairwiseCovarianceResult {
  readonly singleBallotCovariance: number;
  readonly totalCovariance: number;
  readonly jointExpectation: number;
  readonly coOccurrenceCount: number;
}

/**
 * Computes empirical covariance between Idea A and Idea B across all cast ballots.
 */
export function calculate_pairwise_covariance(
  entryA: EntryId,
  entryB: EntryId,
  ballots: readonly Ballot[]
): PairwiseCovarianceResult {
  const N = ballots.length;

  if (N === 0) {
    return {
      singleBallotCovariance: 0,
      totalCovariance: 0,
      jointExpectation: 0,
      coOccurrenceCount: 0,
    };
  }

  let sumScoreA = 0;
  let sumScoreB = 0;
  let sumCrossProduct = 0;
  let coOccurrenceCount = 0;

  // Loop through every single ballot and see what score A and B got on that ballot
  for (let i = 0; i < N; i++) {
    const ballot = ballots[i]!;
    let scoreA = 0;
    let scoreB = 0;

    // What did this voter award to Entry A?
    if (ballot.rank1 === entryA) scoreA = 3;
    else if (ballot.rank2 === entryA) scoreA = 2;
    else if (ballot.rank3 === entryA) scoreA = 1;

    // What did this voter award to Entry B?
    if (ballot.rank1 === entryB) scoreB = 3;
    else if (ballot.rank2 === entryB) scoreB = 2;
    else if (ballot.rank3 === entryB) scoreB = 1;

    sumScoreA += scoreA;
    sumScoreB += scoreB;
    // Cross product X_ia * X_ib for this specific voter
    sumCrossProduct += scoreA * scoreB;

    // Did both ideas show up on this ballot?
    if (scoreA > 0 && scoreB > 0) {
      coOccurrenceCount += 1;
    }
  }

  // Joint expectation: E[X_a * X_b]
  const jointExpectation = sumCrossProduct / N;

  // Individual means: E[X_a] and E[X_b]
  const meanA = sumScoreA / N;
  const meanB = sumScoreB / N;

  // Cov(X_a, X_b) = E[X_a * X_b] - E[X_a] * E[X_b]
  const singleBallotCovariance = jointExpectation - (meanA * meanB);

  // Total covariance across all N voters: Cov(S_a, S_b) = N * Cov(X_a, X_b)
  const totalCovariance = N * singleBallotCovariance;

  return {
    singleBallotCovariance,
    totalCovariance,
    jointExpectation,
    coOccurrenceCount,
  };
}

export const calculatePairwiseCovariance = calculate_pairwise_covariance;
