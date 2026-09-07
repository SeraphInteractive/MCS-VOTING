import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate_bayesian_shrinkage, calculate_regularized_leaderboard } from '../src/calculate-bayesian-shrinkage.ts';
import type { EntryScoreBreakdown } from '../src/types.ts';

describe('Bayesian Shrinkage & Cold-Start Exposure Regularization', () => {
  it('should prevent a single 1st-place vote (avg 3.0) from outranking an established high-volume favorite', () => {
    const M = 20;
    const N = 200;

    const coldStartEntry: EntryScoreBreakdown = {
      entryId: 'cold-start-sniper',
      rank1Count: 1,
      rank2Count: 0,
      rank3Count: 0,
      appearanceCount: 1,
      rawScore: 3,
    };

    const establishedFavorite: EntryScoreBreakdown = {
      entryId: 'community-favorite',
      rank1Count: 100,
      rank2Count: 50,
      rank3Count: 0,
      appearanceCount: 150,
      rawScore: 100 * 3 + 50 * 2,
    };

    const K = 30;
    const shrunkCold = calculate_bayesian_shrinkage(coldStartEntry, M, N, K);
    const shrunkEstablished = calculate_bayesian_shrinkage(establishedFavorite, M, N, K);

    assert.equal(shrunkCold.globalMean, 0.30);
    assert.ok(shrunkCold.regularizedTotalScore < 80);
    assert.ok(shrunkEstablished.regularizedTotalScore > 400);

    assert.ok(
      shrunkEstablished.regularizedTotalScore > shrunkCold.regularizedTotalScore,
      'Established favorite must beat the cold-start 1-vote sniper after shrinkage'
    );
  });

  it('should generate a properly sorted regularized leaderboard', () => {
    const M = 10;
    const N = 100;
    const entries: EntryScoreBreakdown[] = [
      { entryId: 'e1', rank1Count: 1, rank2Count: 0, rank3Count: 0, appearanceCount: 1, rawScore: 3 },
      { entryId: 'e2', rank1Count: 50, rank2Count: 20, rank3Count: 10, appearanceCount: 80, rawScore: 200 },
      { entryId: 'e3', rank1Count: 20, rank2Count: 30, rank3Count: 20, appearanceCount: 70, rawScore: 140 },
    ];

    const leaderboard = calculate_regularized_leaderboard(entries, M, N, 30);
    assert.equal(leaderboard[0]!.entryId, 'e2');
    assert.equal(leaderboard[1]!.entryId, 'e3');
    assert.equal(leaderboard[2]!.entryId, 'e1');
  });
});
