import { describe, expect, it } from 'vitest';

import {
  calendarEventSchema,
  candidateSlotSchema,
  meetingRequestSchema,
  participantSchema,
  schedulingDecisionSchema,
} from './schema';

const availableSlot = {
  startsAt: '2026-09-17T15:30:00-04:00',
  endsAt: '2026-09-17T16:00:00-04:00',
  status: 'available',
  score: 100,
  reasons: [
    {
      code: 'preference_match',
      message: 'Candidate interview is inside the preferred window.',
    },
  ],
} as const;

describe('participantSchema', () => {
  it('accepts an IANA timezone and applies the required-attendee default', () => {
    const participant = participantSchema.parse({
      id: 'jane_partner',
      name: 'Jane Partner',
      role: 'interviewer',
      timezone: 'America/New_York',
    });

    expect(participant.required).toBe(true);
  });

  it('rejects invalid timezones and unstable identifiers', () => {
    expect(() =>
      participantSchema.parse({
        id: 'Jane Partner',
        name: 'Jane Partner',
        role: 'interviewer',
        timezone: 'Eastern Time',
      }),
    ).toThrow();
  });
});

describe('calendarEventSchema', () => {
  it('rejects events that do not have a positive duration', () => {
    const result = calendarEventSchema.safeParse({
      id: 'flight_001',
      participantId: 'jane_partner',
      title: 'Flight to New York',
      startsAt: '2026-09-17T14:00:00-04:00',
      endsAt: '2026-09-17T14:00:00-04:00',
      kind: 'travel',
    });

    expect(result.success).toBe(false);
  });
});

describe('meetingRequestSchema', () => {
  it('rejects duplicate participants and reversed windows', () => {
    const result = meetingRequestSchema.safeParse({
      id: 'candidate_interview_001',
      title: 'Candidate interview',
      participantIds: ['candidate', 'candidate'],
      durationMinutes: 30,
      windowStartsAt: '2026-09-17T17:00:00-04:00',
      windowEndsAt: '2026-09-17T12:00:00-04:00',
      meetingType: 'candidate_interview',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
    }
  });
});

describe('candidateSlotSchema', () => {
  it('requires rejected candidates to explain the rejection', () => {
    expect(
      candidateSlotSchema.safeParse({
        ...availableSlot,
        status: 'rejected',
        reasons: [],
      }).success,
    ).toBe(false);
  });
});

describe('schedulingDecisionSchema', () => {
  it('accepts an ACT decision with a valid selected slot', () => {
    expect(
      schedulingDecisionSchema.parse({
        action: 'ACT',
        selectedSlot: availableSlot,
        reason: 'The slot satisfies all hard constraints.',
        evidence: availableSlot.reasons,
      }).action,
    ).toBe('ACT');
  });

  it.each([
    {
      label: 'ACT without a selected slot',
      decision: {
        action: 'ACT',
        reason: 'A slot was selected.',
        evidence: availableSlot.reasons,
      },
    },
    {
      label: 'ASK without a clarification question',
      decision: {
        action: 'ASK',
        clarificationTopic: 'move_permission',
        reason: 'Permission is missing.',
        evidence: availableSlot.reasons,
      },
    },
    {
      label: 'STOP with a selected slot',
      decision: {
        action: 'STOP',
        selectedSlot: availableSlot,
        reason: 'No valid slot exists.',
        evidence: availableSlot.reasons,
      },
    },
  ])('rejects $label', ({ decision }) => {
    expect(schedulingDecisionSchema.safeParse(decision).success).toBe(false);
  });
});
