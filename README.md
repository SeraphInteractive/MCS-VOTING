# MCS-VOTING Internal Logic Engine (`@vote-internals/logic`)

Zero-dependency TypeScript calculation engine for the Minecraft Community Movie voting system. Implements the 6-credit Borda variant economy, statistical variance & negative covariance matrices, paired Z-score rank separation (score wobble detection), Empirical Bayesian Shrinkage, and the Batman Contingent Protocol for streamer raid detection.

---

## Installation

In any service repository (`MCS-VOTING-api`, `MCS-VOTING-frontend`), add this repo directly to your `package.json`:

```json
{
  "dependencies": {
    "@vote-internals/logic": "github:SeraphInteractive/MCS-VOTING-internal-logic#main"
  }
}
```

Or install via npm:
```bash
npm install github:SeraphInteractive/MCS-VOTING-internal-logic
```

---

## Quick Usage Example

```typescript
import {
  validate_ballot,
  aggregate_scores,
  evaluate_rank_separation,
  calculate_bayesian_shrinkage,
  analyze_raid_risk,
  type Ballot,
} from '@vote-internals/logic';

// 1. Validate incoming ballot (Enforces 3-2-1 complete expenditure & anti-stacking)
const ballot: Ballot = {
  voterId: 'discord-snowflake-123456',
  rank1: 'scene-idea-a', // 3 points
  rank2: 'scene-idea-b', // 2 points
  rank3: 'scene-idea-c', // 1 point
};
const validation = validate_ballot(ballot);

// 2. Aggregate scores across all ballots with 6N conservation check
const { scores, isConserved, leaderboard } = aggregate_scores(
  ['scene-idea-a', 'scene-idea-b', 'scene-idea-c'],
  [ballot]
);

// 3. Test for statistical score wobbles between two ideas
const separation = evaluate_rank_separation(
  scores.get('scene-idea-a')!,
  scores.get('scene-idea-b')!,
  [ballot]
);
if (separation.status === 'STATISTICAL_TIE') {
  console.log('Score wobble detected! Trigger tiered runoff re-vote.');
}

// 4. Bayesian Shrinkage (Cold-start smoothing with K=30 dummy votes)
const shrunkScore = calculate_bayesian_shrinkage(
  scores.get('scene-idea-a')!,
  20, // Total candidate entries in universe
  100 // Total ballots cast
);

// 5. Batman Contingent Protocol (Streamer raid & skew telemetry)
const raidTelemetry = analyze_raid_risk(scores.get('scene-idea-a')!);
if (raidTelemetry.severity === 'CRITICAL_RAID') {
  console.warn('Raid anomaly flagged for internal dashboard review!');
}
```

---

## Testing

Run the built-in Node native test suite:
```bash
npm test
```
