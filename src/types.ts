/**
 * 
 * Yo! These are the core types for our Minecraft movie voting system.
 * 
 * Quick reminder for Matt and Lunasa:
 * We don't want runtime surprises or weird NaN values polluting our leaderboards
 * when 10,000 community members start dropping votes at the exact same time.
 * Everything here is strictly typed so both the Adonis backend and the Next.js
 * frontend speak the exact same mathematical language.
 */

// Unique ID of a movie idea / submission (e.g. "scene-pitch-42")
export type EntryId = string;

// Unique ID of a community voter (Discord snowflake ID)
export type VoterId = string;

// The 3 ballot slots: Rank 1 (3pts), Rank 2 (2pts), Rank 3 (1pt)
export type RankPosition = 1 | 2 | 3;

// Point payoff vector w = [3, 2, 1]^T
// Rank 1 gets 3 pts, Rank 2 gets 2 pts, Rank 3 gets 1 pt
export const RANK_WEIGHTS: Record<RankPosition, number> = {
  1: 3,
  2: 2,
  3: 1,
} as const;

// 3 + 2 + 1 = 6 credits total injected per ballot
export const POINTS_PER_BALLOT = 6;

/**
 * A single ballot cast by a verified Discord user.
 * 
 * Rules:
 * - Must rank 3 DISTINCT entries (no stacking all 6 points on your own pitch).
 * - Must spend all 6 points (no partial ballots).
 */
export interface Ballot {
  readonly id?: string;
  readonly voterId: VoterId;
  readonly rank1: EntryId; // 3 credits
  readonly rank2: EntryId; // 2 credits
  readonly rank3: EntryId; // 1 credit
  readonly timestamp?: number;
}

/**
 * Raw score breakdown per entry.
 * Just basic counts of how many 1st, 2nd, and 3rd place votes it picked up.
 */
export interface EntryScoreBreakdown {
  readonly entryId: EntryId;
  readonly rank1Count: number; // n_j,1
  readonly rank2Count: number; // n_j,2
  readonly rank3Count: number; // n_j,3
  readonly appearanceCount: number; // total ballots that mentioned this entry
  readonly rawScore: number; // S_j = 3*n1 + 2*n2 + 1*n3
}

/**
 * Statistical moments for an entry.
 * 
 * This is where we track variance to see if an entry is an organic community
 * favorite (consistent 1s and 2s) or a polarized mess (random 3s and 0s).
 */
export interface EntryMoments {
  readonly entryId: EntryId;
  readonly p1: number; // probability of Rank 1: n1 / N
  readonly p2: number; // probability of Rank 2: n2 / N
  readonly p3: number; // probability of Rank 3: n3 / N
  readonly p0: number; // probability of getting ignored (0 pts): 1 - (p1+p2+p3)
  readonly expectedScorePerVoter: number; // E[X] = mu_j
  readonly secondMoment: number; // E[X^2] = 9*p1 + 4*p2 + p3 (weights squared!)
  readonly singleBallotVariance: number; // Var(X_ij) = E[X^2] - mu^2
  readonly totalVariance: number; // Var(S_j) = N * Var(X_ij)
  readonly standardDeviation: number; // sqrt(Var(S_j))
}

/**
 * Result of evaluating whether a point gap between Idea A and Idea B
 * is a genuine community preference or just a statistical wobble.
 */
export interface PairwiseSeparation {
  readonly entryA: EntryId;
  readonly entryB: EntryId;
  readonly deltaScore: number; // S_a - S_b
  readonly varianceA: number;
  readonly varianceB: number;
  readonly covarianceAB: number; // Cov(S_a, S_b) - naturally negative!
  readonly deltaVariance: number; // Var(Delta) = Var(A) + Var(B) - 2*Cov(A, B)
  readonly standardError: number; // sqrt(Var(Delta))
  readonly zScore: number; // Z = Delta / SE
  readonly pValue: number; // two-tailed p-value
  readonly status: 'DECISIVE_LEAD' | 'STATISTICAL_TIE';
  readonly recommendedAction: 'DECLARE_WINNER' | 'TIERED_RUNOFF';
  readonly explanation: string;
}

/**
 * Regularized score after Bayesian Shrinkage.
 * Pulls low-exposure entries towards the site-wide average until they get enough votes.
 */
export interface BayesianShrinkageResult {
  readonly entryId: EntryId;
  readonly rawScore: number;
  readonly appearances: number;
  readonly priorK: number; // e.g. 30 dummy votes
  readonly globalMean: number; // mu_0 = 6 / M
  readonly regularizedMeanScore: number; // (S_j + K*mu_0) / (n_j + K)
  readonly regularizedTotalScore: number; // scaled to total community size
}

export type RaidSeverity = 'NORMAL' | 'SUSPICIOUS' | 'CRITICAL_RAID';

/**
 * Batman Contingent Protocol Telemetry!
 * Tracks if someone is raiding an entry with their Twitch/YouTube audience.
 */
export interface RaidTelemetry {
  readonly entryId: EntryId;
  readonly skewRatio: number; // (3*n1 + eps) / (2*n2 + 1*n3 + eps)
  readonly rankEntropy: number; // 0 to 1 (low = everyone voting only rank 1)
  readonly velocityZScore: number; // sudden vote spikes
  readonly compositeScore: number; // 0.0 (safe) to 1.0 (obvious raid)
  readonly severity: RaidSeverity;
  readonly flags: string[];
  readonly breakdown: {
    readonly rank1Points: number;
    readonly lowerRankPoints: number;
    readonly rank1ToTotalRatio: number;
  };
}
