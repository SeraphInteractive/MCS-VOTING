import type { Ballot, EntryId } from './types.js';

export interface ScoreMatrixResult {
  readonly entryToIndex: ReadonlyMap<EntryId, number>;
  readonly indexToEntry: readonly EntryId[];
  readonly matrix: readonly (readonly number[])[];
}

export function build_score_matrix(
  entryIds: readonly EntryId[],
  ballots: readonly Ballot[]
): ScoreMatrixResult {
  const entryToIndex = new Map<EntryId, number>();
  const indexToEntry = [...entryIds];

  entryIds.forEach((id, index) => {
    entryToIndex.set(id, index);
  });

  const matrix: number[][] = [];
  const columnCount = entryIds.length;

  for (let i = 0; i < ballots.length; i++) {
    const ballot = ballots[i]!;
    const row = new Array<number>(columnCount).fill(0);

    const idx1 = entryToIndex.get(ballot.rank1);
    if (idx1 !== undefined) row[idx1] = 3;

    const idx2 = entryToIndex.get(ballot.rank2);
    if (idx2 !== undefined) row[idx2] = 2;

    const idx3 = entryToIndex.get(ballot.rank3);
    if (idx3 !== undefined) row[idx3] = 1;

    matrix.push(row);
  }

  return {
    entryToIndex,
    indexToEntry,
    matrix,
  };
}

export const buildScoreMatrix = build_score_matrix;
