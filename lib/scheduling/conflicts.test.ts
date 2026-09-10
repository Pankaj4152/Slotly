import { describe, expect, it } from 'vitest';

import {
  calendarEventSchema,
  candidateSlotSchema,
  participantSchema,
  type CalendarEvent,
  type Participant,
} from '../domain';
import { evaluateCalendarConflicts, intervalsOverlap } from './conflicts';

const candidate = candidateSlotSchema.parse({
  startsAt: '2026-09-17T15:30:00-04:00',
  endsAt: '2026-09-17T16:00:00-04:00',
  status: 'available',
  score: 0,
  reasons: [],
});

function participant(id: string, required = true, name = id): Participant {
  return participantSchema.parse({
    id,
    name,
    role: required ? 'interviewer' : 'optional_attendee',
    timezone: 'America/New_York',
    required,
  });
}

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return calendarEventSchema.parse({
    id: 'event_001',
    participantId: 'interviewer',
    title: 'Existing meeting',
    startsAt: '2026-09-17T15:30:00-04:00',
    endsAt: '2026-09-17T16:00:00-04:00',
    kind: 'internal',
    movable: false,
    ...overrides,
  });
}

describe('intervalsOverlap', () => {
  it('detects partial and containing overlaps', () => {
    expect(
      intervalsOverlap(
        candidate,
        event({ startsAt: '2026-09-17T15:45:00-04:00' }),
      ),
    ).toBe(true);
    expect(
      intervalsOverlap(
        candidate,
        event({
          startsAt: '2026-09-17T15:00:00-04:00',
          endsAt: '2026-09-17T16:30:00-04:00',
        }),
      ),
    ).toBe(true);
  });

  it('treats adjacent intervals as non-overlapping', () => {
    expect(
      intervalsOverlap(
        candidate,
        event({
          startsAt: '2026-09-17T15:00:00-04:00',
          endsAt: '2026-09-17T15:30:00-04:00',
        }),
      ),
    ).toBe(false);
    expect(
      intervalsOverlap(
        candidate,
        event({
          startsAt: '2026-09-17T16:00:00-04:00',
          endsAt: '2026-09-17T16:30:00-04:00',
        }),
      ),
    ).toBe(false);
  });
});

describe('evaluateCalendarConflicts', () => {
  it('rejects an immovable conflict for a required participant', () => {
    const result = evaluateCalendarConflicts(candidate, {
      participantIds: ['interviewer'],
      participants: [participant('interviewer', true, 'Jane')],
      calendarEvents: [event()],
    });
    expect(result.status).toBe('rejected');
    expect(result.reasons[0]).toMatchObject({
      code: 'calendar_conflict',
      participantId: 'interviewer',
      eventId: 'event_001',
    });
  });

  it('classifies a movable required conflict without approving the move', () => {
    const result = evaluateCalendarConflicts(candidate, {
      participantIds: ['interviewer'],
      participants: [participant('interviewer')],
      calendarEvents: [event({ movable: true })],
    });
    expect(result.status).toBe('requires_move');
    expect(result.reasons[0].code).toBe('movable_event');
  });

  it('keeps a slot available when only an optional attendee conflicts', () => {
    const result = evaluateCalendarConflicts(candidate, {
      participantIds: ['candidate', 'observer'],
      participants: [
        participant('candidate'),
        participant('observer', false, 'Alex'),
      ],
      calendarEvents: [event({ participantId: 'observer' })],
    });
    expect(result.status).toBe('available');
    expect(result.reasons[0].code).toBe('optional_attendee_conflict');
  });

  it('gives an immovable conflict precedence over a movable conflict', () => {
    const result = evaluateCalendarConflicts(candidate, {
      participantIds: ['interviewer'],
      participants: [participant('interviewer')],
      calendarEvents: [
        event({ id: 'movable_event', movable: true }),
        event({ id: 'fixed_event', movable: false }),
      ],
    });
    expect(result.status).toBe('rejected');
    expect(result.reasons.map(({ code }) => code)).toEqual([
      'movable_event',
      'calendar_conflict',
    ]);
  });

  it('ignores events belonging to people outside the request', () => {
    const result = evaluateCalendarConflicts(candidate, {
      participantIds: ['candidate'],
      participants: [participant('candidate'), participant('interviewer')],
      calendarEvents: [event()],
    });
    expect(result).toEqual(candidate);
  });
});
