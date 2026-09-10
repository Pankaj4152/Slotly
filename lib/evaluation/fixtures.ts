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
      setConversation(
        scenario,
        'Maya and Jane are both open between 10 and 11 AM Eastern tomorrow. Can you schedule the first available 30-minute slot?',
        'Yes, the first available time works for me.',
      );
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
      setConversation(
        scenario,
        'Could we place Maya’s interview at 4:15 PM Eastern tomorrow?',
        'That overlaps my client update. Client calls are protected and cannot move.',
      );
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
      setConversation(
        scenario,
        'Can we schedule Maya for 2:15 PM Eastern, just after your flight?',
        'My flight lands at 2 PM. Please keep the full 45-minute recovery buffer.',
      );
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
      setConversation(
        scenario,
        'Maya can meet at 6 PM Eastern tomorrow. Should I put it on the calendar?',
        'My configured working hours end at 5 PM, so do not schedule outside them.',
      );
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
      setConversation(
        scenario,
        'The only opening is 3:30 PM Eastern, during your internal sync. Can Shadow use it?',
        'The sync is marked movable, but I have not said whether it may move for this interview.',
      );
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
      setConversation(
        scenario,
        'Maya and Jane are available at 5 PM Eastern. I am optional and may be in another meeting.',
        'Please schedule it if all required participants are free.',
      );
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
      setConversation(
        scenario,
        'Please find the first safe interview time between 10 and 11 AM Eastern.',
        'I am busy until 10:30, but the rest of that window is available.',
      );
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
      setConversation(
        scenario,
        'We need 45 minutes for Maya’s interview, but the only window is 10 to 10:30 AM Eastern.',
        'Keep the full 45-minute duration. Do not shorten the interview to make it fit.',
      );
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

function setConversation(
  scenario: ScenarioInput,
  recruiterMessage: string,
  interviewerMessage: string,
) {
  scenario.conversation = [
    {
      id: 'message_001',
      participantId: 'alex_recruiter',
      sentAt: '2026-09-16T15:00:00.000Z',
      body: recruiterMessage,
    },
    {
      id: 'message_002',
      participantId: 'jane_partner',
      sentAt: '2026-09-16T15:20:00.000Z',
      body: interviewerMessage,
    },
  ];
}
