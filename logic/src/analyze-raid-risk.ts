/**
 *
 * How our Multi-Factor Raid Engine catches raids:
 * Instead of just checking one number, we combine 3 separate attack vectors:
 * 1. Skew Ratio (45% weight): Is Rank 1 points >> Rank 2 + Rank 3 points?
 * 2. Rank Entropy (35% weight): Did the rank probability distribution collapse to slot 1?
 * 3. Velocity Z-Score (20% weight): Did an influx of votes arrive in a 5-minute burst?
 * 
 * Severity Levels:
 * - NORMAL (< 0.40): Clean, organic voting.
 * - SUSPICIOUS (0.40 - 0.74): Flagged for internal moderation dashboard.
 * - CRITICAL_RAID (>= 0.75): Blatant streamer raid or bot attack detected!
 */

import type { EntryScoreBreakdown, RaidSeverity, RaidTelemetry } from './types.ts';
import { RANK_WEIGHTS } from './types.ts';
import { calculate_skew_ratio } from './calculate-skew-ratio.ts';
import { calculate_rank_entropy } from './calculate-rank-entropy.ts';

// Don't flag entries with fewer than 10 votes to avoid false positives on early testers
export const MIN_APPEARANCES_FOR_RAID_FLAG = 10;

export const SEVERITY_THRESHOLDS = {
  SUSPICIOUS: 0.40,
  CRITICAL_RAID: 0.75,
} as const;

/**
 * Analyzes an entry for streamer raids and brigading patterns.
 */
export function analyze_raid_risk(
  breakdown: EntryScoreBreakdown,
  velocityZScore: number = 0,
  minAppearances: number = MIN_APPEARANCES_FOR_RAID_FLAG
): RaidTelemetry {
  const skewRatio = calculate_skew_ratio(breakdown);
  const rankEntropy = calculate_rank_entropy(breakdown);
  const rank1Points = breakdown.rank1Count * RANK_WEIGHTS[1];
  const lowerRankPoints =
    breakdown.rank2Count * RANK_WEIGHTS[2] +
    breakdown.rank3Count * RANK_WEIGHTS[3];

  const totalAppearances = breakdown.appearanceCount;
  const rank1ToTotalRatio = totalAppearances > 0 ? breakdown.rank1Count / totalAppearances : 0;

  const flags: string[] = [];

  // If entry is brand new with few votes, don't scream raid yet
  if (totalAppearances < minAppearances) {
    return {
      entryId: breakdown.entryId,
      skewRatio,
      rankEntropy,
      velocityZScore,
      compositeScore: 0.0,
      severity: 'NORMAL',
      flags: ['INSUFFICIENT_SAMPLE_SIZE'],
      breakdown: {
        rank1Points,
        lowerRankPoints,
        rank1ToTotalRatio,
      },
    };
  }

  // Factor 1: Skew component [0.0, 1.0] (R > 1.5 starts ramping up penalty)
  let skewComponent = 0.0;
  if (skewRatio > 1.5) {
    skewComponent = Math.min(1.0, (skewRatio - 1.5) / 3.5);
  }
  if (skewRatio >= 3.0) {
    flags.push('UNNATURAL_RANK1_HYPER_SKEW');
  }

  // Factor 2: Collapsed entropy [0.0, 1.0] (Inverted: 1 - H)
  const entropyComponent = Math.max(0.0, 1.0 - rankEntropy);
  if (rankEntropy < 0.65 && rank1ToTotalRatio > 0.70) {
    flags.push('COLLAPSED_RANK_ENTROPY');
  }

  // Factor 3: Sudden velocity spike [0.0, 1.0]
  let velocityComponent = 0.0;
  if (velocityZScore > 1.0) {
    velocityComponent = Math.min(1.0, (velocityZScore - 1.0) / 3.0);
  }
  if (velocityZScore >= 2.5) {
    flags.push('ANOMALOUS_VELOCITY_BURST');
  }

  // Multi-factor weighted composite anomaly score
  const compositeScore = Math.min(
    1.0,
    0.45 * skewComponent + 0.35 * entropyComponent + 0.20 * velocityComponent
  );

  let severity: RaidSeverity = 'NORMAL';
  if (compositeScore >= SEVERITY_THRESHOLDS.CRITICAL_RAID) {
    severity = 'CRITICAL_RAID';
  } else if (compositeScore >= SEVERITY_THRESHOLDS.SUSPICIOUS) {
    severity = 'SUSPICIOUS';
  }

  return {
    entryId: breakdown.entryId,
    skewRatio,
    rankEntropy,
    velocityZScore,
    compositeScore,
    severity,
    flags,
    breakdown: {
      rank1Points,
      lowerRankPoints,
      rank1ToTotalRatio,
    },
  };
}

export const analyzeRaidRisk = analyze_raid_risk;
