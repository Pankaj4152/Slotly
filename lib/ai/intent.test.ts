import { describe, expect, it } from 'vitest';

import fixtureJson from '../../data/scenarios/flight_buffer.json';
import { loadScenarioFixture } from '../domain';
import { FakeModelProvider } from './fake-provider';
import {
  applyExtractedIntent,
  createDeterministicIntent,
  extractMeetingIntent,
  type ExtractedMeetingIntent,
  IntentExtractionError,
  serializeIntentContext,
} from './intent';

const fixture = loadScenarioFixture(fixtureJson, 'flight_buffer.json');
const validIntent: ExtractedMeetingIntent = {
  title: 'Maya Chen candidate interview',
  participantIds: ['maya_candidate', 'jane_partner'],
  durationMinutes: 30,
  windowStartsAt: '2026-09-17T14:15:00-04:00',
  windowEndsAt: '2026-09-17T17:00:00-04:00',
  meetingType: 'candidate_interview',
  ambiguities: [],
  confidence: 'high',
};

describe('extractMeetingIntent', () => {
  it('accepts fenced, schema-valid JSON', async () => {
    const provider = new FakeModelProvider({
      replies: [
        {
          text: `\`\`\`json\n${JSON.stringify(validIntent)}\n\`\`\``,
          model: 'fake',
        },
      ],
    });
    await expect(
      extractMeetingIntent(provider, fixture.input),
    ).resolves.toEqual(validIntent);
  });

  it.each([
    { label: 'empty output', text: ' ', message: 'empty intent response' },
    { label: 'invalid JSON', text: '{nope}', message: 'invalid intent JSON' },
    { label: 'invalid shape', text: '{}', message: 'schema validation' },
  ])('rejects $label', async ({ text, message }) => {
    const provider = new FakeModelProvider({
      replies: [{ text, model: 'fake' }],
    });
    await expect(
      extractMeetingIntent(provider, fixture.input),
    ).rejects.toMatchObject({
      name: 'IntentExtractionError',
      message: expect.stringContaining(message),
    });
  });

  it('rejects hallucinated participants', async () => {
    const provider = new FakeModelProvider({
      replies: [
        {
          text: JSON.stringify({
            ...validIntent,
            participantIds: ['maya_candidate', 'invented_person'],
          }),
          model: 'fake',
        },
      ],
    });
    await expect(
      extractMeetingIntent(provider, fixture.input),
    ).rejects.toBeInstanceOf(IntentExtractionError);
  });

  it('preserves declared ambiguity rather than forcing certainty', async () => {
    const provider = new FakeModelProvider({
      replies: [
        {
          text: JSON.stringify({
            ...validIntent,
            ambiguities: ['move_permission'],
            confidence: 'medium',
          }),
          model: 'fake',
        },
      ],
    });
    await expect(
      extractMeetingIntent(provider, fixture.input),
    ).resolves.toMatchObject({
      ambiguities: ['move_permission'],
      confidence: 'medium',
    });
  });
});

describe('intent context isolation', () => {
  it('never serializes expected evaluation outcomes', () => {
    const serialized = serializeIntentContext(fixture.input);
    expect(serialized).not.toContain('expected');
    expect(serialized).not.toContain('selectedStartsAt');
  });

  it('provides a deterministic offline intent for the core scenario', () => {
    expect(createDeterministicIntent(fixture.input)).toEqual({
      ...validIntent,
      windowStartsAt: '2026-09-17T18:15:00.000Z',
      windowEndsAt: '2026-09-17T21:00:00.000Z',
    });
  });
});

describe('applyExtractedIntent', () => {
  it('updates only the meeting request used by scheduling', () => {
    const effective = applyExtractedIntent(fixture.input, {
      ...validIntent,
      title: 'Updated interview request',
      durationMinutes: 45,
      windowStartsAt: '2026-09-17T15:00:00-04:00',
      windowEndsAt: '2026-09-17T16:00:00-04:00',
    });

    expect(effective.meetingRequest).toMatchObject({
      title: 'Updated interview request',
      durationMinutes: 45,
      windowStartsAt: '2026-09-17T19:00:00.000Z',
      windowEndsAt: '2026-09-17T20:00:00.000Z',
    });
    expect(effective.calendarEvents).toEqual(fixture.input.calendarEvents);
    expect(effective.preferences).toEqual(fixture.input.preferences);
  });

  it('rejects an extracted window that cannot form a valid request', () => {
    expect(() =>
      applyExtractedIntent(fixture.input, {
        ...validIntent,
        windowStartsAt: '2026-09-17T16:00:00-04:00',
        windowEndsAt: '2026-09-17T15:00:00-04:00',
      }),
    ).toThrow();
  });

  it('rejects ambiguous intent before it changes scheduling', () => {
    expect(() =>
      applyExtractedIntent(fixture.input, {
        ...validIntent,
        ambiguities: ['timezone'],
        confidence: 'medium',
      }),
    ).toThrow('requires clarification');
  });

  it('does not widen scheduling beyond verified calendar coverage', () => {
    expect(() =>
      applyExtractedIntent(fixture.input, {
        ...validIntent,
        windowStartsAt: '2026-09-17T13:00:00-04:00',
      }),
    ).toThrow('outside the verified calendar window');
  });
});
