# @vote-internals/logic

Mathematical and statistical calculation engine for ranked ballot voting systems. Implements 3-2-1 weighted Borda scoring, paired covariance and variance estimators, Z-score hypothesis testing for rank separation, Empirical Bayesian shrinkage for exposure regularization, and multi-factor rank skew anomaly detection.

---

## Installation

Add the dependency to `package.json`:

```json
{
  "dependencies": {
    "@vote-internals/logic": "github:SeraphInteractive/MCS-internal-logic#main"
  }
}
```

Or install via npm:
```bash
npm install github:SeraphInteractive/MCS-internal-logic
```

---

## API Reference & Usage

```typescript
import {
  validate_ballot,
  aggregate_scores,
  evaluate_rank_separation,
  calculate_bayesian_shrinkage,
  analyze_raid_risk,
  type Ballot,
} from '@vote-internals/logic';

// 1. Ballot validation (3-2-1 allocation, uniqueness, completeness)
const ballot: Ballot = {
  voterId: 'user_123',
  rank1: 'entry_a', // 3 points
  rank2: 'entry_b', // 2 points
  rank3: 'entry_c', // 1 point
};
const validation = validate_ballot(ballot);

// 2. Score aggregation & 6N conservation verification
const { scores, isConserved, leaderboard } = aggregate_scores(
  ['entry_a', 'entry_b', 'entry_c'],
  [ballot]
);

// 3. Paired Z-score rank separation test
const separation = evaluate_rank_separation(
  scores.get('entry_a')!,
  scores.get('entry_b')!,
  [ballot]
);

// 4. Empirical Bayesian shrinkage
const shrunkScore = calculate_bayesian_shrinkage(
  scores.get('entry_a')!,
  20, // Total entries in universe
  100 // Total ballots cast
);

// 5. Rank skew anomaly analysis
const telemetry = analyze_raid_risk(scores.get('entry_a')!);
```

---

## Testing

Execute the test suite:
```bash
npm test
```
