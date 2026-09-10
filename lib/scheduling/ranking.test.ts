import { describe, expect, it } from 'vitest';

import { candidateSlotSchema, type CandidateReason } from '../domain';
import { rankCandidateSlots, scoreCandidateSlot } from './ranking';

function candidate(
  startsAt: string,
  status: 'available' | 'rejected' | 'requires_move' = 'available',
  reasons: CandidateReason[] = [],
) {
  const start = Date.parse(startsAt);
  return candidateSlotSchema.parse({
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 30 * 60_000).toISOString(),
    status,
    score: 0,
    reasons,
  });
}

describe('scoreCandidateSlot', () => {
  it('returns a transparent score breakdown', () => {
    const result = scoreCandidateSlot(
      candidate('2026-09-17T19:30:00.000Z', 'requires_move', [
        { code: 'movable_event', message: 'Move internal sync.' },
        {
          code: 'preference_match',
          message: 'Candidate interviews take priority.',
        },
      ]),
    );

    expect(result.score).toBe(90);
    expect(result.scoreBreakdown).toEqual([
      expect.objectContaining({ code: 'base_availability', impact: 100 }),
      expect.objectContaining({ code: 'movable_event', impact: -20 }),
      expect.objectContaining({ code: 'preference_match', impact: 10 }),
    ]);
  });

  it('does not assign a suitability score to rejected candidates', () => {
    const rejected = candidate('2026-09-17T18:15:00.000Z', 'rejected', [
      { code: 'travel_buffer', message: 'Inside travel buffer.' },
    ]);

    expect(scoreCandidateSlot(rejected)).toEqual(rejected);
  });
});

describe('rankCandidateSlots', () => {
  it('excludes rejected candidates and prefers an undisrupted slot', () => {
    const ranked = rankCandidateSlots([
      candidate('2026-09-17T18:15:00.000Z', 'rejected', [
        { code: 'travel_buffer', message: 'Inside travel buffer.' },
      ]),
      candidate('2026-09-17T19:30:00.000Z', 'requires_move', [
        { code: 'movable_event', message: 'Move internal sync.' },
        { code: 'preference_match', message: 'Policy permits the move.' },
      ]),
      candidate('2026-09-17T20:00:00.000Z'),
    ]);

    expect(ranked.map(({ startsAt }) => startsAt)).toEqual([
      '2026-09-17T20:00:00.000Z',
      '2026-09-17T19:30:00.000Z',
    ]);
  });

  it('uses fewer disruptions and then earlier time as stable tie-breakers', () => {
    const ranked = rankCandidateSlots([
      candidate('2026-09-17T20:00:00.000Z'),
      candidate('2026-09-17T19:30:00.000Z'),
      candidate('2026-09-17T19:00:00.000Z', 'available', [
        {
          code: 'optional_attendee_conflict',
          message: 'Observer A is unavailable.',
        },
        {
          code: 'optional_attendee_conflict',
          message: 'Observer B is unavailable.',
        },
        { code: 'preference_match', message: 'Preferred slot.' },
      ]),
    ]);

    expect(ranked.map(({ startsAt }) => startsAt)).toEqual([
      '2026-09-17T19:30:00.000Z',
      '2026-09-17T20:00:00.000Z',
      '2026-09-17T19:00:00.000Z',
    ]);
  });

  it('does not mutate the source candidates', () => {
    const source = [candidate('2026-09-17T20:00:00.000Z')];
    const snapshot = structuredClone(source);

    rankCandidateSlots(source);

    expect(source).toEqual(snapshot);
  });
});
