/**
AGGREGATE SCORES
 *
 * "Let C = {c1, c2, c3....cM} be the universal set of M submitted entries/ideas
 * for a certain voting sesh. Let N be the total number of ballots cast.
 * Each ballot is an ordered tuple vi = (ci,1, ci,2, ci,3).
 * Weight vector is w = [3, 2, 1]^T
 * Aggregate score Sj for entry j is computed through an entry function I(.)
 * If ballot i placed idea j in slot k, the indicator function returns 1
 * (multiplying by that slot’s points). Else, it returns 0.
 * N or 6N is 3+2+1 = 6 points that go into the system. So if 100 ppl vote,
 * there are exactly 600 points distributed across all entries, since they cannot
 * be created or destroyed, only reallocated (conservation of mass sounding ahh)." — Yan
 *
 * What this code actually does:
 * - We loop through all ballots and count up 1st, 2nd, and 3rd place votes for every idea.
 * - We compute S_j = 3*n_1 + 2*n_2 + 1*n_3 for each entry.
 * - We check that sum(S_j) == 6 * N. If it doesn't match, we know something leaked!
 */

import type { Ballot, EntryId, EntryScoreBreakdown } from './types.js';
import { POINTS_PER_BALLOT, RANK_WEIGHTS } from './types.js';

export interface AggregationResult {
  readonly scores: ReadonlyMap<EntryId, EntryScoreBreakdown>;
  readonly totalBallots: number;
  readonly totalPointsAwarded: number;
  readonly expectedPoints: number;
  readonly isConserved: boolean;
  readonly leaderboard: readonly EntryScoreBreakdown[];
}

/**
 * Tallies up all the points from every ballot in the voting round.
 */
export function aggregate_scores(
  entryIds: readonly EntryId[],
  ballots: readonly Ballot[]
): AggregationResult {
  // Step 1: Initialize counters for all entries in the universe
  // Note: Even if an idea got 0 votes, it still needs to be in our map with 0 points
  const counterMap = new Map<EntryId, {
    rank1Count: number;
    rank2Count: number;
    rank3Count: number;
  }>();

  for (const entryId of entryIds) {
    counterMap.set(entryId, {
      rank1Count: 0,
      rank2Count: 0,
      rank3Count: 0,
    });
  }

  // Step 2: Loop through each ballot and drop the points into the right bucket
  // Indicator function in code form:
  // Slot 1 -> 3 points
  // Slot 2 -> 2 points
  // Slot 3 -> 1 point
  for (const ballot of ballots) {
    const { rank1, rank2, rank3 } = ballot;

    // Slot 1: Rank 1 (3 points)
    const stats1 = counterMap.get(rank1);
    if (stats1) {
      stats1.rank1Count += 1;
    } else {
      counterMap.set(rank1, { rank1Count: 1, rank2Count: 0, rank3Count: 0 });
    }

    // Slot 2: Rank 2 (2 points)
    const stats2 = counterMap.get(rank2);
    if (stats2) {
      stats2.rank2Count += 1;
    } else {
      counterMap.set(rank2, { rank1Count: 0, rank2Count: 1, rank3Count: 0 });
    }

    // Slot 3: Rank 3 (1 point)
    const stats3 = counterMap.get(rank3);
    if (stats3) {
      stats3.rank3Count += 1;
    } else {
      counterMap.set(rank3, { rank1Count: 0, rank2Count: 0, rank3Count: 1 });
    }
  }

  // Step 3: Compute final raw scores: S_j = 3*n1 + 2*n2 + 1*n3
  const scores = new Map<EntryId, EntryScoreBreakdown>();
  let totalPointsAwarded = 0;

  for (const [entryId, counts] of counterMap.entries()) {
    const rawScore =
      counts.rank1Count * RANK_WEIGHTS[1] +
      counts.rank2Count * RANK_WEIGHTS[2] +
      counts.rank3Count * RANK_WEIGHTS[3];

    const appearanceCount = counts.rank1Count + counts.rank2Count + counts.rank3Count;
    totalPointsAwarded += rawScore; // accumulating total points in the system

    scores.set(entryId, {
      entryId,
      rank1Count: counts.rank1Count,
      rank2Count: counts.rank2Count,
      rank3Count: counts.rank3Count,
      appearanceCount,
      rawScore,
    });
  }

  // Step 4: The Conservation of Mass Check
  // If 100 people voted, there MUST be exactly 600 points total in the pool.
  const totalBallots = ballots.length;
  const expectedPoints = totalBallots * POINTS_PER_BALLOT;
  const isConserved = totalPointsAwarded === expectedPoints;

  // Step 5: Sort leaderboard descending by raw score for a quick preview
  const leaderboard = Array.from(scores.values()).sort(
    (a, b) => b.rawScore - a.rawScore
  );

  return {
    scores,
    totalBallots,
    totalPointsAwarded,
    expectedPoints,
    isConserved,
    leaderboard,
  };
}

export const aggregateScores = aggregate_scores;
