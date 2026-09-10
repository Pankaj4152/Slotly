import { describe, expect, it } from 'vitest';

import flightBufferFixture from '../../data/scenarios/flight_buffer.json';
import {
  candidateSlotSchema,
  loadScenarioFixture,
  type CandidateReason,
} from '../domain';
import { decideFromCandidates, runSchedulingDecision } from './decision';

const coreScenario = loadScenarioFixture(
  flightBufferFixture,
  'flight_buffer.json',
).input;

function candidate(
  startsAt: string,
  status: 'available' | 'rejected' | 'requires_move',
  reasons: CandidateReason[],
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

describe('runSchedulingDecision', () => {
  it('selects the expected 3:30 PM candidate in the core scenario', () => {
    const run = runSchedulingDecision(coreScenario);

    expect(run.decision).toMatchObject({
      action: 'ACT',
      selectedSlot: { startsAt: '2026-09-17T19:30:00.000Z' },
    });
    expect(run.decision.evidence.map(({ code }) => code)).toEqual([
      'movable_event',
      'preference_match',
    ]);
  });

  it('asks before moving an event when explicit permission is absent', () => {
    const scenarioWithoutMovePolicy = {
      ...coreScenario,
      preferences: coreScenario.preferences.filter(
        ({ type }) => type !== 'event_priority',
      ),
    };
    const run = runSchedulingDecision(scenarioWithoutMovePolicy);

    expect(run.decision).toMatchObject({
      action: 'ASK',
      clarificationTopic: 'move_permission',
    });
    expect(run.decision.clarificationQuestion).toContain('internal_sync_001');
  });

  it('stops when every candidate violates a hard constraint', () => {
    const scenarioWithoutMovableSync = {
      ...coreScenario,
      calendarEvents: coreScenario.calendarEvents.map((event) =>
        event.id === 'internal_sync_001' ? { ...event, movable: false } : event,
      ),
    };
    const run = runSchedulingDecision(scenarioWithoutMovableSync);

    expect(run.decision.action).toBe('STOP');
    expect(run.decision.selectedSlot).toBeUndefined();
  });
});

describe('decideFromCandidates', () => {
  it('acts on a fully available candidate with explicit safety evidence', () => {
    const decision = decideFromCandidates([
      candidate('2026-09-17T19:30:00.000Z', 'available', []),
    ]);

    expect(decision.action).toBe('ACT');
    expect(decision.evidence[0].code).toBe('safe_candidate');
  });

  it('stops cleanly when candidate generation returns no slots', () => {
    const decision = decideFromCandidates([]);

    expect(decision).toMatchObject({
      action: 'STOP',
      evidence: [{ code: 'no_valid_slot' }],
    });
  });

  it('prefers a safe candidate over a higher-disruption alternative', () => {
    const decision = decideFromCandidates([
      candidate('2026-09-17T19:30:00.000Z', 'requires_move', [
        { code: 'movable_event', message: 'Move an internal sync.' },
        { code: 'preference_match', message: 'Policy permits the move.' },
      ]),
      candidate('2026-09-17T20:00:00.000Z', 'available', []),
    ]);

    expect(decision.selectedSlot?.startsAt).toBe('2026-09-17T20:00:00.000Z');
  });
});
