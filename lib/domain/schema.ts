import { z } from 'zod';

const identifier = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use a lowercase snake_case identifier');

export const instantSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Use a valid IANA timezone' },
  );

export const participantRoleSchema = z.enum([
  'candidate',
  'recruiter',
  'executive',
  'interviewer',
  'assistant',
  'optional_attendee',
]);

export const participantSchema = z.object({
  id: identifier,
  name: z.string().trim().min(1),
  role: participantRoleSchema,
  timezone: timeZoneSchema,
  required: z.boolean().default(true),
});

export const conversationMessageSchema = z.object({
  id: identifier,
  participantId: identifier,
  sentAt: instantSchema,
  body: z.string().trim().min(1),
});

export const eventKindSchema = z.enum([
  'internal',
  'client',
  'interview',
  'travel',
  'personal',
]);

export const calendarEventSchema = z
  .object({
    id: identifier,
    participantId: identifier,
    title: z.string().trim().min(1),
    startsAt: instantSchema,
    endsAt: instantSchema,
    kind: eventKindSchema,
    movable: z.boolean().default(false),
  })
  .refine((event) => Date.parse(event.endsAt) > Date.parse(event.startsAt), {
    message: 'Event must end after it starts',
    path: ['endsAt'],
  });

export const meetingTypeSchema = z.enum([
  'candidate_interview',
  'client_call',
  'internal_meeting',
  'other',
]);

export const meetingRequestSchema = z
  .object({
    id: identifier,
    title: z.string().trim().min(1),
    participantIds: z.array(identifier).min(2),
    durationMinutes: z.number().int().positive().max(480),
    windowStartsAt: instantSchema,
    windowEndsAt: instantSchema,
    meetingType: meetingTypeSchema,
  })
  .refine(
    (request) =>
      Date.parse(request.windowEndsAt) > Date.parse(request.windowStartsAt),
    {
      message: 'Meeting window must end after it starts',
      path: ['windowEndsAt'],
    },
  )
  .refine(
    (request) =>
      new Set(request.participantIds).size === request.participantIds.length,
    {
      message: 'Meeting participants must be unique',
      path: ['participantIds'],
    },
  );

const preferenceBaseSchema = z.object({
  id: identifier,
  description: z.string().trim().min(1),
});

export const preferenceSchema = z.discriminatedUnion('type', [
  preferenceBaseSchema.extend({
    type: z.literal('travel_buffer'),
    participantId: identifier,
    afterEventKind: z.literal('travel'),
    minutes: z.number().int().nonnegative().max(480),
  }),
  preferenceBaseSchema.extend({
    type: z.literal('event_priority'),
    preferredMeetingType: meetingTypeSchema,
    displaceableEventKind: eventKindSchema,
  }),
  preferenceBaseSchema.extend({
    type: z.literal('working_hours'),
    participantId: identifier,
    startLocalTime: z.iso.time({ precision: -1 }),
    endLocalTime: z.iso.time({ precision: -1 }),
  }),
  preferenceBaseSchema.extend({
    type: z.literal('protected_event'),
    eventKind: eventKindSchema,
  }),
]);

export const candidateStatusSchema = z.enum([
  'available',
  'rejected',
  'requires_move',
]);

export const candidateReasonSchema = z.object({
  code: z.enum([
    'calendar_conflict',
    'outside_working_hours',
    'travel_buffer',
    'outside_meeting_window',
    'duration_mismatch',
    'movable_event',
    'optional_attendee_conflict',
    'preference_match',
    'protected_event',
    'safe_candidate',
    'no_valid_slot',
    'final_validation_failed',
  ]),
  message: z.string().trim().min(1),
  participantId: identifier.optional(),
  eventId: identifier.optional(),
});

export const scoreComponentSchema = z.object({
  code: z.enum([
    'base_availability',
    'movable_event',
    'preference_match',
    'optional_attendee_conflict',
  ]),
  impact: z.number(),
  message: z.string().trim().min(1),
});

export const candidateSlotSchema = z
  .object({
    startsAt: instantSchema,
    endsAt: instantSchema,
    status: candidateStatusSchema,
    score: z.number(),
    scoreBreakdown: z.array(scoreComponentSchema).default([]),
    reasons: z.array(candidateReasonSchema),
  })
  .refine((slot) => Date.parse(slot.endsAt) > Date.parse(slot.startsAt), {
    message: 'Candidate slot must end after it starts',
    path: ['endsAt'],
  })
  .refine((slot) => slot.status !== 'rejected' || slot.reasons.length > 0, {
    message: 'Rejected candidates require at least one reason',
    path: ['reasons'],
  });

export const decisionActionSchema = z.enum(['ACT', 'ASK', 'STOP']);

export const schedulingDecisionSchema = z
  .object({
    action: decisionActionSchema,
    selectedSlot: candidateSlotSchema.optional(),
    clarificationQuestion: z.string().trim().min(1).optional(),
    clarificationTopic: identifier.optional(),
    reason: z.string().trim().min(1),
    evidence: z.array(candidateReasonSchema).min(1),
  })
  .superRefine((decision, context) => {
    if (decision.action === 'ACT' && !decision.selectedSlot) {
      context.addIssue({
        code: 'custom',
        message: 'ACT requires a selected slot',
        path: ['selectedSlot'],
      });
    }

    if (
      decision.action === 'ACT' &&
      decision.selectedSlot?.status === 'rejected'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'ACT cannot select a rejected slot',
        path: ['selectedSlot'],
      });
    }

    if (decision.action === 'ASK' && !decision.clarificationQuestion) {
      context.addIssue({
        code: 'custom',
        message: 'ASK requires a clarification question',
        path: ['clarificationQuestion'],
      });
    }

    if (decision.action === 'ASK' && !decision.clarificationTopic) {
      context.addIssue({
        code: 'custom',
        message: 'ASK requires a clarification topic',
        path: ['clarificationTopic'],
      });
    }

    if (decision.action !== 'ACT' && decision.selectedSlot) {
      context.addIssue({
        code: 'custom',
        message: `${decision.action} cannot include a selected slot`,
        path: ['selectedSlot'],
      });
    }
  });

export const expectedOutcomeSchema = z
  .object({
    action: decisionActionSchema,
    selectedStartsAt: instantSchema.optional(),
    clarificationTopic: identifier.optional(),
    requiredReasonCodes: z.array(candidateReasonSchema.shape.code).default([]),
    forbiddenActions: z.array(decisionActionSchema).default([]),
  })
  .superRefine((outcome, context) => {
    if (outcome.action === 'ACT' && !outcome.selectedStartsAt) {
      context.addIssue({
        code: 'custom',
        message: 'An expected ACT outcome requires selectedStartsAt',
        path: ['selectedStartsAt'],
      });
    }
    if (outcome.action === 'ASK' && !outcome.clarificationTopic) {
      context.addIssue({
        code: 'custom',
        message: 'An expected ASK outcome requires a clarification topic',
        path: ['clarificationTopic'],
      });
    }
    if (outcome.forbiddenActions.includes(outcome.action)) {
      context.addIssue({
        code: 'custom',
        message: 'The expected action cannot also be forbidden',
        path: ['forbiddenActions'],
      });
    }
  });

const scenarioInputBaseSchema = z.object({
  id: identifier,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  displayTimezone: timeZoneSchema,
  participants: z.array(participantSchema).min(2),
  conversation: z.array(conversationMessageSchema).min(1),
  calendarEvents: z.array(calendarEventSchema),
  meetingRequest: meetingRequestSchema,
  preferences: z.array(preferenceSchema),
});

export const scenarioInputSchema = scenarioInputBaseSchema.superRefine(
  (scenario, context) => {
    const participantIds = new Set(scenario.participants.map(({ id }) => id));

    addDuplicateIdIssues(
      scenario.participants,
      'Participant IDs must be unique',
      ['participants'],
      context,
    );
    addDuplicateIdIssues(
      scenario.conversation,
      'Conversation message IDs must be unique',
      ['conversation'],
      context,
    );
    addDuplicateIdIssues(
      scenario.calendarEvents,
      'Calendar event IDs must be unique',
      ['calendarEvents'],
      context,
    );
    addDuplicateIdIssues(
      scenario.preferences,
      'Preference IDs must be unique',
      ['preferences'],
      context,
    );

    scenario.conversation.forEach((message, index) => {
      if (!participantIds.has(message.participantId)) {
        addMissingReferenceIssue(
          `Unknown conversation participant: ${message.participantId}`,
          ['conversation', index, 'participantId'],
          context,
        );
      }
    });

    scenario.calendarEvents.forEach((event, index) => {
      if (!participantIds.has(event.participantId)) {
        addMissingReferenceIssue(
          `Unknown calendar participant: ${event.participantId}`,
          ['calendarEvents', index, 'participantId'],
          context,
        );
      }
    });

    scenario.meetingRequest.participantIds.forEach((participantId, index) => {
      if (!participantIds.has(participantId)) {
        addMissingReferenceIssue(
          `Unknown meeting participant: ${participantId}`,
          ['meetingRequest', 'participantIds', index],
          context,
        );
      }
    });

    scenario.preferences.forEach((preference, index) => {
      if (
        'participantId' in preference &&
        !participantIds.has(preference.participantId)
      ) {
        addMissingReferenceIssue(
          `Unknown preference participant: ${preference.participantId}`,
          ['preferences', index, 'participantId'],
          context,
        );
      }
    });
  },
);

export const scenarioFixtureSchema = z.object({
  input: scenarioInputSchema,
  expected: expectedOutcomeSchema,
});

function addDuplicateIdIssues(
  values: ReadonlyArray<{ id: string }>,
  message: string,
  path: PropertyKey[],
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach(({ id }, index) => {
    if (seen.has(id)) {
      context.addIssue({
        code: 'custom',
        message,
        path: [...path, index, 'id'],
      });
    }
    seen.add(id);
  });
}

function addMissingReferenceIssue(
  message: string,
  path: PropertyKey[],
  context: z.RefinementCtx,
) {
  context.addIssue({ code: 'custom', message, path });
}

export type EventKind = z.infer<typeof eventKindSchema>;
export type MeetingType = z.infer<typeof meetingTypeSchema>;
export type ParticipantRole = z.infer<typeof participantRoleSchema>;
export type Participant = z.infer<typeof participantSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type MeetingRequest = z.infer<typeof meetingRequestSchema>;
export type Preference = z.infer<typeof preferenceSchema>;
export type CandidateSlot = z.infer<typeof candidateSlotSchema>;
export type CandidateReason = z.infer<typeof candidateReasonSchema>;
export type ScoreComponent = z.infer<typeof scoreComponentSchema>;
export type SchedulingDecision = z.infer<typeof schedulingDecisionSchema>;
export type ExpectedOutcome = z.infer<typeof expectedOutcomeSchema>;
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type ScenarioFixture = z.infer<typeof scenarioFixtureSchema>;
