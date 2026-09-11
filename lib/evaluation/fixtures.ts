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
      setScenarioIdentity(scenario, {
        title: 'Schedule a leadership briefing on an open calendar',
        meetingTitle: 'Priya and Noah leadership briefing',
        meetingType: 'internal_meeting',
        candidateName: 'Priya Rao',
        interviewerName: 'Noah Kim',
        recruiterName: 'Nina Patel',
      });
      setConversation(
        scenario,
        'Priya and Noah are both open between 10 and 11 AM Eastern tomorrow. Can you schedule the first available 30-minute briefing?',
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
      setScenarioIdentity(scenario, {
        title: 'Protect an investor update from being displaced',
        meetingTitle: 'Leadership planning session',
        meetingType: 'internal_meeting',
        candidateName: 'Omar Hassan',
        interviewerName: 'Elena Torres',
        recruiterName: 'Sam Rivera',
      });
      setConversation(
        scenario,
        'Could we place the leadership planning session at 4:15 PM Eastern tomorrow?',
        'That overlaps my investor update. External calls are protected and cannot move.',
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
      setScenarioIdentity(scenario, {
        title: 'Respect recovery time before an executive debrief',
        meetingTitle: 'Post-flight executive debrief',
        meetingType: 'internal_meeting',
        candidateName: 'Daniel Cho',
        interviewerName: 'Avery Brooks',
        recruiterName: 'Morgan Lee',
      });
      setConversation(
        scenario,
        'Can we schedule the executive debrief for 2:15 PM Eastern, just after your flight?',
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
      setScenarioIdentity(scenario, {
        title: 'Honor working hours across New York and London',
        meetingTitle: 'London client handoff',
        meetingType: 'client_call',
        candidateName: 'Grace Wilson',
        interviewerName: 'Theo Martin',
        recruiterName: 'Iris Chen',
      });
      scenario.displayTimezone = 'Europe/London';
      scenario.participants[0].timezone = 'America/New_York';
      scenario.participants[1].timezone = 'Europe/London';
      setConversation(
        scenario,
        'Grace can join the client handoff at 11 PM London time. Should I put it on the calendar?',
        'My configured London working hours end at 5 PM, so please do not schedule outside them.',
      );
      scenario.calendarEvents = [];
      scenario.preferences = [
        {
          id: 'jane_working_hours',
          type: 'working_hours',
          description: 'Theo works from 9 AM to 5 PM London time.',
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
      setScenarioIdentity(scenario, {
        title: 'Ask before moving a design review',
        meetingTitle: 'Candidate portfolio review',
        meetingType: 'candidate_interview',
        candidateName: 'Sofia Alvarez',
        interviewerName: 'Marcus Green',
        recruiterName: 'Taylor Reed',
      });
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
      setScenarioIdentity(scenario, {
        title: 'Schedule a product kickoff without an optional observer',
        meetingTitle: 'Product kickoff',
        meetingType: 'internal_meeting',
        candidateName: 'Rina Das',
        interviewerName: 'Ben Carter',
        recruiterName: 'Casey Park',
      });
      setConversation(
        scenario,
        'Rina and Ben are available for the kickoff at 5 PM Eastern. I am optional and may be in another meeting.',
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
      setScenarioIdentity(scenario, {
        title: 'Recover a customer discovery call after a conflict',
        meetingTitle: 'Customer discovery call',
        meetingType: 'client_call',
        candidateName: 'Lena Ortiz',
        interviewerName: 'Chris Evans',
        recruiterName: 'Jordan Bell',
      });
      setConversation(
        scenario,
        'Please find the first safe customer discovery time between 10 and 11 AM Eastern.',
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
      setScenarioIdentity(scenario, {
        title: 'Keep the full duration of a board preparation session',
        meetingTitle: 'Board preparation session',
        meetingType: 'internal_meeting',
        candidateName: 'Amara Okafor',
        interviewerName: 'Jack Liu',
        recruiterName: 'Robin Shah',
      });
      setConversation(
        scenario,
        'We need 45 minutes for board preparation, but the only window is 10 to 10:30 AM Eastern.',
        'Keep the full 45-minute duration. Do not shorten the session to make it fit.',
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

function setScenarioIdentity(
  scenario: ScenarioInput,
  identity: {
    title: string;
    meetingTitle: string;
    meetingType: ScenarioInput['meetingRequest']['meetingType'];
    candidateName: string;
    interviewerName: string;
    recruiterName: string;
  },
) {
  scenario.title = identity.title;
  scenario.description = `${identity.meetingTitle}: a synthetic scheduling safety scenario.`;
  scenario.meetingRequest.title = identity.meetingTitle;
  scenario.meetingRequest.meetingType = identity.meetingType;
  scenario.participants[0].name = identity.candidateName;
  scenario.participants[1].name = identity.interviewerName;
  scenario.participants[2].name = identity.recruiterName;
}

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
