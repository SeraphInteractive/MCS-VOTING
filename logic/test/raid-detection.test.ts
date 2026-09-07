import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate_skew_ratio } from '../src/calculate-skew-ratio.ts';
import { calculate_rank_entropy } from '../src/calculate-rank-entropy.ts';
import { analyze_raid_risk } from '../src/analyze-raid-risk.ts';
import type { EntryScoreBreakdown } from '../src/types.ts';

describe('Raid Detection & Skew Analysis (Batman Protocol)', () => {
  it('should confirm organic favorites have skew ratio near ~1.0 and high entropy', () => {
    const organicBreakdown: EntryScoreBreakdown = {
      entryId: 'organic-film-pitch',
      rank1Count: 30,
      rank2Count: 35,
      rank3Count: 25,
      appearanceCount: 90,
      rawScore: 30 * 3 + 35 * 2 + 25 * 1,
    };

    const skew = calculate_skew_ratio(organicBreakdown);
    assert.ok(Math.abs(skew - 1.0) < 0.2, `Expected skew near 1.0, got ${skew}`);

    const entropy = calculate_rank_entropy(organicBreakdown);
    assert.ok(entropy > 0.90, `Expected high entropy, got ${entropy}`);

    const telemetry = analyze_raid_risk(organicBreakdown, 0.2);
    assert.equal(telemetry.severity, 'NORMAL');
    assert.ok(telemetry.compositeScore < 0.20);
    assert.equal(telemetry.flags.length, 0);
  });

  it('should detect a streamer raid profile and flag CRITICAL_RAID with anomaly tags', () => {
    const raidBreakdown: EntryScoreBreakdown = {
      entryId: 'streamer-brigaded-entry',
      rank1Count: 200,
      rank2Count: 2,
      rank3Count: 1,
      appearanceCount: 203,
      rawScore: 200 * 3 + 2 * 2 + 1 * 1,
    };

    const skew = calculate_skew_ratio(raidBreakdown);
    assert.ok(skew > 50, `Expected extreme skew, got ${skew}`);

    const entropy = calculate_rank_entropy(raidBreakdown);
    assert.ok(entropy < 0.25, `Expected collapsed entropy, got ${entropy}`);

    const telemetry = analyze_raid_risk(raidBreakdown, 3.5);
    assert.equal(telemetry.severity, 'CRITICAL_RAID');
    assert.ok(telemetry.compositeScore >= 0.75);
    assert.ok(telemetry.flags.includes('UNNATURAL_RANK1_HYPER_SKEW'));
    assert.ok(telemetry.flags.includes('COLLAPSED_RANK_ENTROPY'));
    assert.ok(telemetry.flags.includes('ANOMALOUS_VELOCITY_BURST'));
  });
});
