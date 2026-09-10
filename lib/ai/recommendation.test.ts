import { describe, expect, it } from 'vitest';

import fixtureJson from '../../data/scenarios/flight_buffer.json';
import { loadScenarioFixture } from '../domain';
import { FakeModelProvider } from './fake-provider';
import { runModelAssistedScheduling } from './recommendation';

const scenario = loadScenarioFixture(fixtureJson, 'flight_buffer.json').input;

function providerWith(value: unknown) {
  return new FakeModelProvider({
    replies: [{ text: JSON.stringify(value), model: 'fake' }],
  });
}

describe('runModelAssistedScheduling', () => {
  it('allows a model to choose only a verified candidate', async () => {
    const result = await runModelAssistedScheduling(
      providerWith({
        action: 'ACT',
        candidateId: 'candidate_0',
        reason: 'This is the highest-ranked policy-approved candidate.',
      }),
      scenario,
    );

    expect(result).toMatchObject({
      source: 'model',
      validation: { status: 'VALID' },
      decision: {
        action: 'ACT',
        selectedSlot: { startsAt: '2026-09-17T19:30:00.000Z' },
      },
    });
  });

  it('falls back when the model invents a candidate ID', async () => {
    const result = await runModelAssistedScheduling(
      providerWith({
        action: 'ACT',
        candidateId: 'candidate_999',
        reason: 'Invented option.',
      }),
      scenario,
    );

    expect(result.source).toBe('deterministic_fallback');
    expect(result.fallbackReason).toContain('unknown candidate ID');
    expect(result.decision.selectedSlot?.startsAt).toBe(
      '2026-09-17T19:30:00.000Z',
    );
  });

  it('falls back on malformed or unavailable model output', async () => {
    const malformed = new FakeModelProvider({
      replies: [{ text: 'not json', model: 'fake' }],
    });
    const unavailable = new FakeModelProvider({
      replies: [new Error('provider offline')],
    });

    await expect(
      runModelAssistedScheduling(malformed, scenario),
    ).resolves.toMatchObject({ source: 'deterministic_fallback' });
    await expect(
      runModelAssistedScheduling(unavailable, scenario),
    ).resolves.toMatchObject({ source: 'deterministic_fallback' });
  });

  it('passes model ASK decisions through without an executable slot', async () => {
    const result = await runModelAssistedScheduling(
      providerWith({
        action: 'ASK',
        clarificationTopic: 'move_permission',
        clarificationQuestion: 'Can the internal sync move?',
        reason: 'Move authorization is ambiguous.',
      }),
      scenario,
    );

    expect(result).toMatchObject({
      source: 'model',
      decision: { action: 'ASK', clarificationTopic: 'move_permission' },
      validation: { status: 'VALID' },
    });
  });

  it('lets final validation downgrade an unauthorized model action', async () => {
    const scenarioWithoutPermission = {
      ...scenario,
      preferences: scenario.preferences.filter(
        ({ type }) => type !== 'event_priority',
      ),
    };
    const result = await runModelAssistedScheduling(
      providerWith({
        action: 'ACT',
        candidateId: 'candidate_0',
        reason: 'Move the conflict.',
      }),
      scenarioWithoutPermission,
    );

    expect(result).toMatchObject({
      source: 'model',
      validation: { status: 'BLOCKED' },
      decision: { action: 'ASK' },
    });
  });
});
