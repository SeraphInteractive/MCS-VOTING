import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate_ballot } from '../src/validate-ballot.ts';
import { aggregate_scores } from '../src/aggregate-scores.ts';
import { build_score_matrix } from '../src/build-score-matrix.ts';
import type { Ballot } from '../src/types.ts';
import { POINTS_PER_BALLOT } from '../src/types.ts';

describe('Scoring & Conservation Invariants', () => {
  it('should validate complete, unique ballots and reject invalid ones', () => {
    const validBallot: Ballot = {
      voterId: 'discord-user-1',
      rank1: 'idea-A',
      rank2: 'idea-B',
      rank3: 'idea-C',
    };
    const res = validate_ballot(validBallot);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);

    const stackingBallot: Ballot = {
      voterId: 'discord-user-2',
      rank1: 'idea-A',
      rank2: 'idea-A',
      rank3: 'idea-B',
    };
    const stackRes = validate_ballot(stackingBallot);
    assert.equal(stackRes.isValid, false);
    assert.ok(stackRes.errors[0]?.includes('Anti-stacking violation'));

    const partialBallot: Ballot = {
      voterId: 'discord-user-3',
      rank1: 'idea-A',
      rank2: '',
      rank3: 'idea-B',
    };
    const partRes = validate_ballot(partialBallot);
    assert.equal(partRes.isValid, false);
  });

  it('should strictly conserve the 6N total points invariant across N=1000 ballots', () => {
    const entries = ['idea-1', 'idea-2', 'idea-3', 'idea-4', 'idea-5', 'idea-6'];
    const N = 1000;
    const ballots: Ballot[] = [];

    for (let i = 0; i < N; i++) {
      const shuffled = [...entries].sort(() => Math.random() - 0.5);
      ballots.push({
        voterId: `voter-${i}`,
        rank1: shuffled[0]!,
        rank2: shuffled[1]!,
        rank3: shuffled[2]!,
      });
    }

    const result = aggregate_scores(entries, ballots);
    assert.equal(result.totalBallots, N);
    assert.equal(result.expectedPoints, N * POINTS_PER_BALLOT);
    assert.equal(result.totalPointsAwarded, 6000);
    assert.equal(result.isConserved, true);
  });

  it('should generate an accurate N x M numerical matrix', () => {
    const entries = ['idea-A', 'idea-B', 'idea-C', 'idea-D'];
    const ballots: Ballot[] = [
      { voterId: 'u1', rank1: 'idea-A', rank2: 'idea-B', rank3: 'idea-C' },
      { voterId: 'u2', rank1: 'idea-B', rank2: 'idea-C', rank3: 'idea-D' },
    ];

    const { matrix, entryToIndex } = build_score_matrix(entries, ballots);
    assert.equal(matrix.length, 2);
    assert.equal(matrix[0]!.length, 4);

    const idxA = entryToIndex.get('idea-A')!;
    const idxB = entryToIndex.get('idea-B')!;
    const idxC = entryToIndex.get('idea-C')!;
    const idxD = entryToIndex.get('idea-D')!;

    assert.equal(matrix[0]![idxA], 3);
    assert.equal(matrix[0]![idxB], 2);
    assert.equal(matrix[0]![idxC], 1);
    assert.equal(matrix[0]![idxD], 0);

    const rowSum0 = matrix[0]!.reduce((a, b) => a + b, 0);
    const rowSum1 = matrix[1]!.reduce((a, b) => a + b, 0);
    assert.equal(rowSum0, 6);
    assert.equal(rowSum1, 6);
  });
});
