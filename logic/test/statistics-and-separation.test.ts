import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate_moments_and_variance } from '../src/calculate-moments-and-variance.ts';
import { calculate_pairwise_covariance } from '../src/calculate-pairwise-covariance.ts';
import { evaluate_rank_separation } from '../src/evaluate-rank-separation.ts';
import type { Ballot, EntryScoreBreakdown } from '../src/types.ts';

describe('Statistical Moments, Negative Covariance & Z-Score Rank Separation', () => {
  it('should accurately compute variance and second moments with squared payoffs', () => {
    const breakdown: EntryScoreBreakdown = {
      entryId: 'idea-X',
      rank1Count: 40,
      rank2Count: 30,
      rank3Count: 10,
      appearanceCount: 80,
      rawScore: 40 * 3 + 30 * 2 + 10 * 1,
    };

    const N = 100;
    const moments = calculate_moments_and_variance(breakdown, N);

    assert.ok(Math.abs(moments.p1 - 0.4) < 1e-9);
    assert.ok(Math.abs(moments.p2 - 0.3) < 1e-9);
    assert.ok(Math.abs(moments.p3 - 0.1) < 1e-9);
    assert.ok(Math.abs(moments.p0 - 0.2) < 1e-9);

    assert.ok(Math.abs(moments.expectedScorePerVoter - 1.9) < 1e-9);
    assert.ok(Math.abs(moments.secondMoment - 4.9) < 1e-9);
    assert.ok(Math.abs(moments.singleBallotVariance - 1.29) < 1e-9);
    assert.ok(Math.abs(moments.totalVariance - 129) < 1e-9);
  });

  it('should prove negative covariance when entries compete for top spots on the same ballots', () => {
    const ballots: Ballot[] = [
      { voterId: 'v1', rank1: 'entryA', rank2: 'entryB', rank3: 'entryC' },
      { voterId: 'v2', rank1: 'entryB', rank2: 'entryA', rank3: 'entryC' },
      { voterId: 'v3', rank1: 'entryA', rank2: 'entryC', rank3: 'entryB' },
      { voterId: 'v4', rank1: 'entryB', rank2: 'entryC', rank3: 'entryA' },
    ];

    const cov = calculate_pairwise_covariance('entryA', 'entryB', ballots);
    assert.ok(cov.singleBallotCovariance < 0, `Expected negative covariance, got ${cov.singleBallotCovariance}`);
    assert.ok(cov.totalCovariance < 0);
  });

  it('should detect a 2-point score wobble (102 vs 100) at high volume and recommend TIERED_RUNOFF', () => {
    const N = 100;
    const ballots: Ballot[] = [];

    for (let i = 0; i < N; i++) {
      if (i < 20) {
        ballots.push({ voterId: `v${i}`, rank1: 'entryA', rank2: 'entryB', rank3: 'entryC' });
      } else if (i < 40) {
        ballots.push({ voterId: `v${i}`, rank1: 'entryB', rank2: 'entryA', rank3: 'entryC' });
      } else if (i < 70) {
        ballots.push({ voterId: `v${i}`, rank1: 'entryC', rank2: 'entryA', rank3: 'entryB' });
      } else {
        ballots.push({ voterId: `v${i}`, rank1: 'entryC', rank2: 'entryB', rank3: 'entryA' });
      }
    }

    const breakdownA: EntryScoreBreakdown = {
      entryId: 'entryA',
      rank1Count: 20,
      rank2Count: 50,
      rank3Count: 30,
      appearanceCount: 100,
      rawScore: 20 * 3 + 50 * 2 + 30 * 1,
    };

    const breakdownB: EntryScoreBreakdown = {
      entryId: 'entryB',
      rank1Count: 20,
      rank2Count: 50,
      rank3Count: 28,
      appearanceCount: 98,
      rawScore: 20 * 3 + 50 * 2 + 28 * 1,
    };

    const result = evaluate_rank_separation(breakdownA, breakdownB, ballots);
    assert.equal(result.deltaScore, 2);
    assert.ok(Math.abs(result.zScore) < 1.96);
    assert.equal(result.status, 'STATISTICAL_TIE');
    assert.equal(result.recommendedAction, 'TIERED_RUNOFF');
    assert.ok(result.explanation.includes('Score wobble detected'));
  });

  it('should declare a DECISIVE_LEAD when point gap significantly exceeds standard error', () => {
    const N = 100;
    const ballots: Ballot[] = [];
    for (let i = 0; i < N; i++) {
      ballots.push({ voterId: `v${i}`, rank1: 'dominantIdea', rank2: 'otherIdea', rank3: 'filler' });
    }

    const dominantBreakdown: EntryScoreBreakdown = {
      entryId: 'dominantIdea',
      rank1Count: 90,
      rank2Count: 10,
      rank3Count: 0,
      appearanceCount: 100,
      rawScore: 90 * 3 + 10 * 2,
    };

    const weakBreakdown: EntryScoreBreakdown = {
      entryId: 'weakIdea',
      rank1Count: 0,
      rank2Count: 5,
      rank3Count: 15,
      appearanceCount: 20,
      rawScore: 0 * 3 + 5 * 2 + 15 * 1,
    };

    const result = evaluate_rank_separation(dominantBreakdown, weakBreakdown, ballots);
    assert.ok(result.zScore > 5.0);
    assert.equal(result.status, 'DECISIVE_LEAD');
    assert.equal(result.recommendedAction, 'DECLARE_WINNER');
  });
});
