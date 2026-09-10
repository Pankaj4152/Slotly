import { describe, expect, it } from 'vitest';

import flightBufferFixture from '../../data/scenarios/flight_buffer.json';

import { loadScenarioFixture, ScenarioFixtureError } from './scenario-loader';

describe('loadScenarioFixture', () => {
  it('loads the core fixture with expectations isolated from runtime input', () => {
    const fixture = loadScenarioFixture(
      flightBufferFixture,
      'flight_buffer.json',
    );
    expect(fixture.input.id).toBe('flight_buffer');
    expect(fixture.input.participants).toHaveLength(3);
    expect(fixture.input.calendarEvents).toHaveLength(4);
    expect(fixture.expected).toMatchObject({
      action: 'ACT',
      selectedStartsAt: '2026-09-17T15:30:00-04:00',
    });
    expect(fixture.input).not.toHaveProperty('expected');
  });

  it.each([
    {
      label: 'conversation participant',
      mutate: (fixture: typeof flightBufferFixture) => {
        fixture.input.conversation[0].participantId = 'unknown_sender';
      },
      path: 'input.conversation.0.participantId',
    },
    {
      label: 'calendar participant',
      mutate: (fixture: typeof flightBufferFixture) => {
        fixture.input.calendarEvents[0].participantId = 'unknown_owner';
      },
      path: 'input.calendarEvents.0.participantId',
    },
    {
      label: 'meeting participant',
      mutate: (fixture: typeof flightBufferFixture) => {
        fixture.input.meetingRequest.participantIds[0] = 'unknown_attendee';
      },
      path: 'input.meetingRequest.participantIds.0',
    },
    {
      label: 'preference participant',
      mutate: (fixture: typeof flightBufferFixture) => {
        const preference = fixture.input.preferences[0];
        if ('participantId' in preference)
          preference.participantId = 'unknown_subject';
      },
      path: 'input.preferences.0.participantId',
    },
  ])('rejects an unknown $label reference', ({ mutate, path }) => {
    const brokenFixture = structuredClone(flightBufferFixture);
    mutate(brokenFixture);
    expect(() => loadScenarioFixture(brokenFixture, 'broken.json')).toThrow(
      expect.objectContaining<Partial<ScenarioFixtureError>>({
        name: 'ScenarioFixtureError',
        message: expect.stringContaining(path),
      }),
    );
  });

  it('reports duplicate IDs with their precise fixture path', () => {
    const brokenFixture = structuredClone(flightBufferFixture);
    brokenFixture.input.calendarEvents[1].id =
      brokenFixture.input.calendarEvents[0].id;
    expect(() => loadScenarioFixture(brokenFixture, 'duplicate.json')).toThrow(
      expect.objectContaining<Partial<ScenarioFixtureError>>({
        message: expect.stringContaining('input.calendarEvents.1.id'),
      }),
    );
  });
});
