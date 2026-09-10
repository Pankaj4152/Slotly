import {
  candidateSlotSchema,
  type CalendarEvent,
  type CandidateReason,
  type CandidateSlot,
  type Participant,
} from '../domain';

export type CalendarConflictContext = {
  participantIds: readonly string[];
  participants: readonly Participant[];
  calendarEvents: readonly CalendarEvent[];
};

export function intervalsOverlap(
  first: Pick<CandidateSlot, 'startsAt' | 'endsAt'>,
  second: Pick<CalendarEvent, 'startsAt' | 'endsAt'>,
): boolean {
  return (
    Date.parse(first.startsAt) < Date.parse(second.endsAt) &&
    Date.parse(second.startsAt) < Date.parse(first.endsAt)
  );
}

export function evaluateCalendarConflicts(
  candidate: CandidateSlot,
  context: CalendarConflictContext,
): CandidateSlot {
  const validatedCandidate = candidateSlotSchema.parse(candidate);
  const requestedParticipants = new Set(context.participantIds);
  const participantsById = new Map(
    context.participants.map((participant) => [participant.id, participant]),
  );
  const reasons: CandidateReason[] = [...validatedCandidate.reasons];
  let hasRequiredConflict = false;
  let requiresMove = false;

  for (const event of context.calendarEvents) {
    if (
      !requestedParticipants.has(event.participantId) ||
      !intervalsOverlap(validatedCandidate, event)
    )
      continue;

    const participant = participantsById.get(event.participantId);
    if (!participant)
      throw new Error(`Unknown calendar participant: ${event.participantId}`);

    if (!participant.required) {
      reasons.push({
        code: 'optional_attendee_conflict',
        message: `${participant.name} is optional and unavailable during this slot.`,
        participantId: participant.id,
        eventId: event.id,
      });
      continue;
    }

    if (event.movable) {
      requiresMove = true;
      reasons.push({
        code: 'movable_event',
        message: `${event.title} must move before this slot can be scheduled.`,
        participantId: participant.id,
        eventId: event.id,
      });
      continue;
    }

    hasRequiredConflict = true;
    reasons.push({
      code: 'calendar_conflict',
      message: `${participant.name} is unavailable because of ${event.title}.`,
      participantId: participant.id,
      eventId: event.id,
    });
  }

  return candidateSlotSchema.parse({
    ...validatedCandidate,
    status: hasRequiredConflict
      ? 'rejected'
      : requiresMove
        ? 'requires_move'
        : validatedCandidate.status,
    reasons,
  });
}
