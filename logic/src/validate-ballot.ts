import type { Ballot, EntryId } from './types.ts';

export interface BallotValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validates a single ballot before letting it touch the database.
 */
export function validate_ballot(
  ballot: Ballot,
  validEntrySet?: Set<EntryId>
): BallotValidationResult {
  const errors: string[] = [];

  // --- Step 1: Check who is voting ---
  // Every ballot has to be tied to a legit voter (Discord snowflake ID)
  if (!ballot.voterId || typeof ballot.voterId !== 'string' || ballot.voterId.trim() === '') {
    errors.push('Missing voterId. Who cast this ballot? Needs a valid Discord user ID.');
  }

  const { rank1, rank2, rank3 } = ballot;

  // --- Step 2: Ensure all 3 slots are filled (Must expend all 6 points!) ---
  // We can't let voters hoard or waste points, otherwise the total system score won't equal 6N.
  if (!rank1 || typeof rank1 !== 'string' || rank1.trim() === '') {
    errors.push('1st place (3-point slot) is empty. You gotta pick a 1st place idea!');
  }
  if (!rank2 || typeof rank2 !== 'string' || rank2.trim() === '') {
    errors.push('2nd place (2-point slot) is empty. You gotta pick a 2nd place idea!');
  }
  if (!rank3 || typeof rank3 !== 'string' || rank3.trim() === '') {
    errors.push('3rd place (1-point slot) is empty. You gotta pick a 3rd place idea!');
  }

  // If any slot is missing, stop here so we don't throw weird duplicate errors on undefined
  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // --- Step 3: Anti-Stacking Check (No self-stacking the same idea) ---
  // If someone tries to vote for "Idea A" in slot 1 AND slot 2, catch them red-handed.
  if (rank1 === rank2) {
    errors.push(`Anti-stacking violation: "${rank1}" is in both 1st and 2nd place. All 3 picks must be different!`);
  }
  if (rank1 === rank3) {
    errors.push(`Anti-stacking violation: "${rank1}" is in both 1st and 3rd place. All 3 picks must be different!`);
  }
  if (rank2 === rank3) {
    errors.push(`Anti-stacking violation: "${rank2}" is in both 2nd and 3rd place. All 3 picks must be different!`);
  }

  // --- Step 4: Verify entries actually exist in our movie pitch catalog ---
  // Prevents people from POSTing random fake IDs that don't belong to the active round.
  if (validEntrySet) {
    if (!validEntrySet.has(rank1)) {
      errors.push(`Entry "${rank1}" in 1st place is not in the active entries list for this round.`);
    }
    if (!validEntrySet.has(rank2)) {
      errors.push(`Entry "${rank2}" in 2nd place is not in the active entries list for this round.`);
    }
    if (!validEntrySet.has(rank3)) {
      errors.push(`Entry "${rank3}" in 3rd place is not in the active entries list for this round.`);
    }
  }

  // If errors is empty, ballot is 100% valid and ready to be counted!
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export const validateBallot = validate_ballot;
