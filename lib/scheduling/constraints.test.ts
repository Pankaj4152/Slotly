import { describe, expect, it } from 'vitest';

import flightBufferFixture from '../../data/scenarios/flight_buffer.json';
import { candidateSlotSchema, loadScenarioFixture } from '../domain';
import {
  applyHardConstraints,
  evaluateCandidate,
  evaluateScenarioCandidates,
} from './constraints';

const scenario = loadScenarioFixture(
  flightBufferFixture,
  'flight_buffer.json',
).input;

function candidate(startsAt: string, endsAt: string) {
  return candidateSlotSchema.parse({
    startsAt,
    endsAt,
    status: 'available',
    score: 0,
    reasons: [],
  });
}

describe('hard scheduling constraints', () => {
  it('rejects a slot inside a post-travel buffer', () => {
    const result = evaluateCandidate(
      candidate('2026-09-17T14:15:00-04:00', '2026-09-17T14:45:00-04:00'),
      scenario,
    );

    expect(result.status).toBe('rejected');
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'travel_buffer', eventId: 'flight_001' }),
    );
  });

  it('attaches policy evidence to an authorized movable conflict', () => {
    const result = evaluateCandidate(
      candidate('2026-09-17T15:30:00-04:00', '2026-09-17T16:00:00-04:00'),
      scenario,
    );

    expect(result.status).toBe('requires_move');
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'movable_event',
      'preference_match',
    ]);
  });

  it('rejects a protected event even when its calendar flag says movable', () => {
    const clientEvent = scenario.calendarEvents.find(
      ({ id }) => id === 'client_call_001',
    );
    if (!clientEvent) throw new Error('Missing core client event');

    const modifiedScenario = {
      ...scenario,
      calendarEvents: scenario.calendarEvents.map((event) =>
        event.id === clientEvent.id ? { ...event, movable: true } : event,
      ),
    };
    const result = evaluateCandidate(
      candidate('2026-09-17T16:15:00-04:00', '2026-09-17T16:45:00-04:00'),
      modifiedScenario,
    );

    expect(result.status).toBe('rejected');
    expect(result.reasons).toContainEqual(
      expect.objectContaining({
        code: 'protected_event',
        eventId: 'client_call_001',
      }),
    );
  });

  it('rejects candidates with the wrong duration or outside the request window', () => {
    const result = applyHardConstraints(
      candidate('2026-09-17T13:45:00-04:00', '2026-09-17T14:00:00-04:00'),
      scenario,
    );

    expect(result.status).toBe('rejected');
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'outside_meeting_window',
      'duration_mismatch',
    ]);
  });

  it('enforces working hours in the participant timezone', () => {
    const workingHoursScenario = {
      ...scenario,
      meetingRequest: {
        ...scenario.meetingRequest,
        windowStartsAt: '2026-09-17T10:00:00.000Z',
        windowEndsAt: '2026-09-18T02:00:00.000Z',
      },
      preferences: [
        ...scenario.preferences,
        {
          id: 'jane_working_hours',
          type: 'working_hours' as const,
          description: 'Jane works from 9 AM to 5 PM.',
          participantId: 'jane_partner',
          startLocalTime: '09:00',
          endLocalTime: '17:00',
        },
      ],
    };
    const result = applyHardConstraints(
      candidate('2026-09-17T17:15:00-04:00', '2026-09-17T17:45:00-04:00'),
      workingHoursScenario,
    );

    expect(result.status).toBe('rejected');
    expect(result.reasons).toContainEqual(
      expect.objectContaining({
        code: 'outside_working_hours',
        participantId: 'jane_partner',
      }),
    );
  });

  it('supports working-hour windows that cross midnight', () => {
    const overnightScenario = {
      ...scenario,
      meetingRequest: {
        ...scenario.meetingRequest,
        windowStartsAt: '2026-09-18T00:00:00.000Z',
        windowEndsAt: '2026-09-18T12:00:00.000Z',
      },
      preferences: [
        {
          id: 'jane_working_hours',
          type: 'working_hours' as const,
          description: 'Jane works overnight.',
          participantId: 'jane_partner',
          startLocalTime: '22:00',
          endLocalTime: '06:00',
        },
      ],
    };
    const result = applyHardConstraints(
      candidate('2026-09-18T01:30:00-04:00', '2026-09-18T02:00:00-04:00'),
      overnightScenario,
    );

    expect(result.status).toBe('available');
  });
});

describe('core scenario pipeline', () => {
  it('produces the three headline candidate outcomes', () => {
    const candidates = evaluateScenarioCandidates(scenario);
    const byStart = new Map(candidates.map((slot) => [slot.startsAt, slot]));

    expect(byStart.get('2026-09-17T18:15:00.000Z')).toMatchObject({
      status: 'rejected',
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: 'travel_buffer' }),
      ]),
    });
    expect(byStart.get('2026-09-17T19:30:00.000Z')).toMatchObject({
      status: 'requires_move',
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: 'preference_match' }),
      ]),
    });
    expect(byStart.get('2026-09-17T20:15:00.000Z')).toMatchObject({
      status: 'rejected',
      reasons: expect.arrayContaining([
        expect.objectContaining({ code: 'protected_event' }),
      ]),
    });
  });
});
