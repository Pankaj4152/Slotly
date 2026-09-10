import { describe, expect, it } from 'vitest';

import fixtureJson from '../../data/scenarios/flight_buffer.json';
import { FakeModelProvider } from '../ai';
import { loadScenarioFixture } from '../domain';
import { runShadowScenario } from './run';

const scenario = loadScenarioFixture(fixtureJson, 'flight_buffer.json').input;
const intent = {
  title: 'Maya Chen candidate interview',
  participantIds: ['maya_candidate', 'jane_partner'],
  durationMinutes: 30,
  windowStartsAt: '2026-09-17T14:15:00-04:00',
  windowEndsAt: '2026-09-17T17:00:00-04:00',
  meetingType: 'candidate_interview',
  ambiguities: [],
  confidence: 'high',
};

describe('runShadowScenario', () => {
  it('runs deterministically when no provider is configured', async () => {
    await expect(runShadowScenario(scenario)).resolves.toMatchObject({
      mode: 'deterministic_fallback',
      decision: {
        action: 'ACT',
        selectedSlot: { startsAt: '2026-09-17T19:30:00.000Z' },
      },
      validation: { status: 'VALID' },
    });
  });

  it('uses the provider for extraction and constrained recommendation', async () => {
    const provider = new FakeModelProvider({
      replies: [
        { text: JSON.stringify(intent), model: 'fake' },
        {
          text: JSON.stringify({
            action: 'ACT',
            candidateId: 'candidate_0',
            reason: 'Highest-ranked verified candidate.',
          }),
          model: 'fake',
        },
      ],
    });
    const result = await runShadowScenario(scenario, provider);

    expect(result.mode).toBe('model');
    expect(provider.requests).toHaveLength(2);
    expect(result.validation.status).toBe('VALID');
  });

  it('falls back safely when intent extraction fails', async () => {
    const provider = new FakeModelProvider({
      replies: [{ text: 'invalid', model: 'fake' }],
    });
    const result = await runShadowScenario(scenario, provider);

    expect(result.mode).toBe('deterministic_fallback');
    expect(result.notice).toContain('Intent extraction failed');
    expect(result.decision.action).toBe('ACT');
  });
});
