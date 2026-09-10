import { describe, expect, it } from 'vitest';

import flightBufferFixture from '../../data/scenarios/flight_buffer.json';
import {
  candidateSlotSchema,
  loadScenarioFixture,
  schedulingDecisionSchema,
  type ScenarioInput,
} from '../domain';
import { runSchedulingDecision } from './decision';
import { validateSchedulingDecision } from './final-validator';

const scenario = loadScenarioFixture(
  flightBufferFixture,
  'flight_buffer.json',
).input;

function proposedAct(
  startsAt: string,
  endsAt: string,
  status: 'available' | 'requires_move' = 'available',
) {
  return schedulingDecisionSchema.parse({
    action: 'ACT',
    selectedSlot: candidateSlotSchema.parse({
      startsAt,
      endsAt,
      status,
      score: 999,
      reasons: [
        {
          code: 'safe_candidate',
          message: 'The caller claims this slot is safe.',
        },
      ],
    }),
    reason: 'Caller-proposed action.',
    evidence: [
      {
        code: 'safe_candidate',
        message: 'The caller claims this slot is safe.',
      },
    ],
  });
}

describe('validateSchedulingDecision', () => {
  it('independently validates and sanitizes the core decision', () => {
    const proposed = runSchedulingDecision(scenario).decision;
    const result = validateSchedulingDecision(proposed, scenario);

    expect(result.status).toBe('VALID');
    expect(result.failures).toEqual([]);
    expect(result.decision).toMatchObject({
      action: 'ACT',
      selectedSlot: {
        startsAt: '2026-09-17T19:30:00.000Z',
        status: 'requires_move',
        score: 90,
      },
    });
  });

  it('blocks a slot that was not generated on the configured grid', () => {
    const result = validateSchedulingDecision(
      proposedAct('2026-09-17T15:31:00-04:00', '2026-09-17T16:01:00-04:00'),
      scenario,
    );

    expect(result).toMatchObject({
      status: 'BLOCKED',
      decision: { action: 'STOP' },
      failures: [{ code: 'candidate_not_generated' }],
    });
  });

  it('blocks a modified duration', () => {
    const result = validateSchedulingDecision(
      proposedAct('2026-09-17T15:30:00-04:00', '2026-09-17T15:45:00-04:00'),
      scenario,
    );

    expect(result.failures[0].code).toBe('candidate_not_generated');
    expect(result.decision.action).toBe('STOP');
  });

  it('blocks a selected slot that violates a protected event', () => {
    const result = validateSchedulingDecision(
      proposedAct('2026-09-17T16:15:00-04:00', '2026-09-17T16:45:00-04:00'),
      scenario,
    );

    expect(result.failures[0].code).toBe('hard_constraint_violation');
    expect(result.decision.action).toBe('STOP');
    expect(result.decision.evidence).toContainEqual(
      expect.objectContaining({ code: 'protected_event' }),
    );
  });

  it('blocks a caller that hides the independently evaluated candidate state', () => {
    const result = validateSchedulingDecision(
      proposedAct(
        '2026-09-17T15:30:00-04:00',
        '2026-09-17T16:00:00-04:00',
        'available',
      ),
      scenario,
    );

    expect(result.failures[0].code).toBe('candidate_state_changed');
    expect(result.decision.action).toBe('STOP');
  });

  it('downgrades an unauthorized move to ASK', () => {
    const scenarioWithoutPermission: ScenarioInput = {
      ...scenario,
      preferences: scenario.preferences.filter(
        ({ type }) => type !== 'event_priority',
      ),
    };
    const result = validateSchedulingDecision(
      proposedAct(
        '2026-09-17T15:30:00-04:00',
        '2026-09-17T16:00:00-04:00',
        'requires_move',
      ),
      scenarioWithoutPermission,
    );

    expect(result).toMatchObject({
      status: 'BLOCKED',
      decision: {
        action: 'ASK',
        clarificationTopic: 'move_permission',
      },
      failures: [{ code: 'move_not_authorized' }],
    });
  });

  it.each(['ASK', 'STOP'] as const)(
    'passes through a non-executing %s decision',
    (action) => {
      const decision = schedulingDecisionSchema.parse({
        action,
        ...(action === 'ASK'
          ? {
              clarificationTopic: 'move_permission',
              clarificationQuestion: 'Can this event move?',
            }
          : {}),
        reason: 'No external action will execute.',
        evidence: [
          { code: 'no_valid_slot', message: 'No executable slot exists.' },
        ],
      });

      expect(validateSchedulingDecision(decision, scenario)).toEqual({
        status: 'VALID',
        decision,
        failures: [],
      });
    },
  );
});
