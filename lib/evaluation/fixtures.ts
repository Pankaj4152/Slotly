import fixtureJson from '../../data/scenarios/flight_buffer.json';
import {
  loadScenarioFixture,
  type ScenarioFixture,
  type ScenarioInput,
} from '../domain';

type ScenarioMutation = (scenario: ScenarioInput) => void;

const coreFixture = loadScenarioFixture(fixtureJson, 'flight_buffer.json');

function fixture(
  id: string,
  title: string,
  mutate: ScenarioMutation,
  expected: ScenarioFixture['expected'],
): ScenarioFixture {
  const input = structuredClone(coreFixture.input);
  input.id = id;
  input.title = title;
  mutate(input);
  return loadScenarioFixture({ input, expected }, `${id}.generated`);
}

export const evaluationFixtures: readonly ScenarioFixture[] = [
  coreFixture,
  fixture(
    'open_calendar',
    'Choose the first fully open slot',
    (scenario) => {
      scenario.calendarEvents = [];
      scenario.preferences = [];
      scenario.meetingRequest.windowStartsAt = '2026-09-17T14:00:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T15:00:00.000Z';
    },
    {
      action: 'ACT',
      selectedStartsAt: '2026-09-17T14:00:00.000Z',
      requiredReasonCodes: ['safe_candidate'],
      forbiddenActions: ['STOP'],
    },
  ),
  fixture(
    'protected_client_call',
    'Stop when a protected client call occupies the window',
    (scenario) => {
      scenario.meetingRequest.windowStartsAt = '2026-09-17T20:15:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T20:45:00.000Z';
    },
    {
      action: 'STOP',
      requiredReasonCodes: ['calendar_conflict', 'protected_event'],
      forbiddenActions: ['ACT'],
    },
  ),
  fixture(
    'travel_buffer_only',
    'Stop inside a required post-flight buffer',
    (scenario) => {
      scenario.meetingRequest.windowStartsAt = '2026-09-17T18:15:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T18:45:00.000Z';
    },
    {
      action: 'STOP',
      requiredReasonCodes: ['travel_buffer'],
      forbiddenActions: ['ACT'],
    },
  ),
  fixture(
    'outside_working_hours',
    'Stop outside a participant working-hours policy',
    (scenario) => {
      scenario.calendarEvents = [];
      scenario.preferences = [
        {
          id: 'jane_working_hours',
          type: 'working_hours',
          description: 'Jane works from 9 AM to 5 PM Eastern.',
          participantId: 'jane_partner',
          startLocalTime: '09:00',
          endLocalTime: '17:00',
        },
      ];
      scenario.meetingRequest.windowStartsAt = '2026-09-17T22:00:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T22:30:00.000Z';
    },
    {
      action: 'STOP',
      requiredReasonCodes: ['outside_working_hours'],
      forbiddenActions: ['ACT'],
    },
  ),
  fixture(
    'move_requires_permission',
    'Ask before moving an event without policy permission',
    (scenario) => {
      scenario.preferences = scenario.preferences.filter(
        ({ type }) => type !== 'event_priority',
      );
      scenario.meetingRequest.windowStartsAt = '2026-09-17T19:30:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T20:00:00.000Z';
    },
    {
      action: 'ASK',
      clarificationTopic: 'move_permission',
      requiredReasonCodes: ['movable_event'],
      forbiddenActions: ['ACT'],
    },
  ),
  fixture(
    'optional_attendee_conflict',
    'Act despite an optional attendee conflict',
    (scenario) => {
      scenario.calendarEvents = [
        {
          id: 'recruiter_conflict',
          participantId: 'alex_recruiter',
          title: 'Recruiting operations review',
          startsAt: '2026-09-17T21:00:00.000Z',
          endsAt: '2026-09-17T21:30:00.000Z',
          kind: 'internal',
          movable: false,
        },
      ];
      scenario.preferences = [];
      scenario.meetingRequest.participantIds = [
        'maya_candidate',
        'jane_partner',
        'alex_recruiter',
      ];
      scenario.meetingRequest.windowStartsAt = '2026-09-17T21:00:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T21:30:00.000Z';
    },
    {
      action: 'ACT',
      selectedStartsAt: '2026-09-17T21:00:00.000Z',
      requiredReasonCodes: ['optional_attendee_conflict'],
      forbiddenActions: ['STOP'],
    },
  ),
  fixture(
    'recover_after_conflict',
    'Choose the next slot after a hard conflict',
    (scenario) => {
      scenario.calendarEvents = [
        {
          id: 'opening_conflict',
          participantId: 'jane_partner',
          title: 'Opening conflict',
          startsAt: '2026-09-17T14:00:00.000Z',
          endsAt: '2026-09-17T14:30:00.000Z',
          kind: 'client',
          movable: false,
        },
      ];
      scenario.preferences = [];
      scenario.meetingRequest.windowStartsAt = '2026-09-17T14:00:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T15:00:00.000Z';
    },
    {
      action: 'ACT',
      selectedStartsAt: '2026-09-17T14:30:00.000Z',
      requiredReasonCodes: ['safe_candidate'],
      forbiddenActions: ['STOP'],
    },
  ),
  fixture(
    'window_too_short',
    'Stop when the requested duration cannot fit',
    (scenario) => {
      scenario.calendarEvents = [];
      scenario.preferences = [];
      scenario.meetingRequest.durationMinutes = 45;
      scenario.meetingRequest.windowStartsAt = '2026-09-17T14:00:00.000Z';
      scenario.meetingRequest.windowEndsAt = '2026-09-17T14:30:00.000Z';
    },
    {
      action: 'STOP',
      requiredReasonCodes: ['no_valid_slot'],
      forbiddenActions: ['ACT'],
    },
  ),
];
