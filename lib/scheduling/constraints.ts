import {
  candidateSlotSchema,
  differenceInMinutes,
  getLocalDateTimeParts,
  type CandidateReason,
  type CandidateSlot,
  type ScenarioInput,
} from '../domain';
import { evaluateCalendarConflicts, intervalsOverlap } from './conflicts';
import {
  generateCandidateSlots,
  type SlotGenerationOptions,
} from './slot-generator';

const MINUTES_PER_DAY = 24 * 60;

export function evaluateScenarioCandidates(
  scenario: ScenarioInput,
  options: SlotGenerationOptions = {},
): CandidateSlot[] {
  return generateCandidateSlots(scenario.meetingRequest, options).map(
    (candidate) => evaluateCandidate(candidate, scenario),
  );
}

export function evaluateCandidate(
  candidate: CandidateSlot,
  scenario: ScenarioInput,
): CandidateSlot {
  const conflictChecked = evaluateCalendarConflicts(candidate, {
    participantIds: scenario.meetingRequest.participantIds,
    participants: scenario.participants,
    calendarEvents: scenario.calendarEvents,
  });
  return applyHardConstraints(conflictChecked, scenario);
}

export function applyHardConstraints(
  candidate: CandidateSlot,
  scenario: ScenarioInput,
): CandidateSlot {
  const validatedCandidate = candidateSlotSchema.parse(candidate);
  const reasons: CandidateReason[] = [...validatedCandidate.reasons];
  let rejected = validatedCandidate.status === 'rejected';
  const candidateStart = Date.parse(validatedCandidate.startsAt);
  const candidateEnd = Date.parse(validatedCandidate.endsAt);
  const requestStart = Date.parse(scenario.meetingRequest.windowStartsAt);
  const requestEnd = Date.parse(scenario.meetingRequest.windowEndsAt);

  if (candidateStart < requestStart || candidateEnd > requestEnd) {
    rejected = true;
    reasons.push({
      code: 'outside_meeting_window',
      message: 'The candidate falls outside the requested meeting window.',
    });
  }

  if (
    differenceInMinutes(
      validatedCandidate.startsAt,
      validatedCandidate.endsAt,
    ) !== scenario.meetingRequest.durationMinutes
  ) {
    rejected = true;
    reasons.push({
      code: 'duration_mismatch',
      message: `The candidate must be ${scenario.meetingRequest.durationMinutes} minutes long.`,
    });
  }

  const requestedParticipants = new Set(scenario.meetingRequest.participantIds);
  const participantsById = new Map(
    scenario.participants.map((participant) => [participant.id, participant]),
  );

  for (const preference of scenario.preferences) {
    if (preference.type === 'travel_buffer') {
      if (!requestedParticipants.has(preference.participantId)) continue;

      const blockingTravel = scenario.calendarEvents.find((event) => {
        if (
          event.participantId !== preference.participantId ||
          event.kind !== preference.afterEventKind
        ) {
          return false;
        }
        const bufferEndsAt =
          Date.parse(event.endsAt) + preference.minutes * 60_000;
        return (
          candidateStart >= Date.parse(event.endsAt) &&
          candidateStart < bufferEndsAt
        );
      });

      if (blockingTravel) {
        rejected = true;
        reasons.push({
          code: 'travel_buffer',
          message: `The slot starts inside the required ${preference.minutes}-minute post-travel buffer.`,
          participantId: preference.participantId,
          eventId: blockingTravel.id,
        });
      }
    }

    if (preference.type === 'working_hours') {
      if (!requestedParticipants.has(preference.participantId)) continue;

      const participant = participantsById.get(preference.participantId);
      if (!participant) {
        throw new Error(
          `Unknown preference participant: ${preference.participantId}`,
        );
      }

      if (
        !isWithinWorkingHours(
          validatedCandidate,
          participant.timezone,
          preference.startLocalTime,
          preference.endLocalTime,
        )
      ) {
        rejected = true;
        reasons.push({
          code: 'outside_working_hours',
          message: `${participant.name} is outside configured working hours.`,
          participantId: participant.id,
        });
      }
    }

    if (preference.type === 'protected_event') {
      const protectedConflict = scenario.calendarEvents.find(
        (event) =>
          requestedParticipants.has(event.participantId) &&
          event.kind === preference.eventKind &&
          intervalsOverlap(validatedCandidate, event),
      );

      if (protectedConflict) {
        rejected = true;
        reasons.push({
          code: 'protected_event',
          message: `${protectedConflict.title} is protected and cannot be displaced.`,
          participantId: protectedConflict.participantId,
          eventId: protectedConflict.id,
        });
      }
    }
  }

  if (!rejected && validatedCandidate.status === 'requires_move') {
    const movableEventIds = new Set(
      reasons
        .filter(({ code, eventId }) => code === 'movable_event' && eventId)
        .map(({ eventId }) => eventId),
    );
    const movableEvents = scenario.calendarEvents.filter((event) =>
      movableEventIds.has(event.id),
    );
    const allMovesAuthorized = movableEvents.every((event) =>
      scenario.preferences.some(
        (preference) =>
          preference.type === 'event_priority' &&
          preference.preferredMeetingType ===
            scenario.meetingRequest.meetingType &&
          preference.displaceableEventKind === event.kind,
      ),
    );

    if (movableEvents.length > 0 && allMovesAuthorized) {
      reasons.push({
        code: 'preference_match',
        message:
          'Explicit policy allows this meeting to displace the conflicting event.',
      });
    }
  }

  return candidateSlotSchema.parse({
    ...validatedCandidate,
    status: rejected ? 'rejected' : validatedCandidate.status,
    reasons: deduplicateReasons(reasons),
  });
}

function isWithinWorkingHours(
  candidate: Pick<CandidateSlot, 'startsAt' | 'endsAt'>,
  timeZone: string,
  workingStart: string,
  workingEnd: string,
): boolean {
  const start = getLocalDateTimeParts(candidate.startsAt, timeZone);
  const end = getLocalDateTimeParts(candidate.endsAt, timeZone);
  const candidateStart = localMinuteCoordinate(start);
  const candidateEnd = localMinuteCoordinate(end);
  const windowStartMinute = parseLocalTime(workingStart);
  const windowEndMinute = parseLocalTime(workingEnd);
  const startDay = Math.floor(candidateStart / MINUTES_PER_DAY);

  return [startDay - 1, startDay].some((day) => {
    const windowStart = day * MINUTES_PER_DAY + windowStartMinute;
    const windowEnd =
      day * MINUTES_PER_DAY +
      windowEndMinute +
      (windowEndMinute <= windowStartMinute ? MINUTES_PER_DAY : 0);
    return candidateStart >= windowStart && candidateEnd <= windowEnd;
  });
}

function localMinuteCoordinate(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): number {
  const day = Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
  return day * MINUTES_PER_DAY + parts.hour * 60 + parts.minute;
}

function parseLocalTime(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function deduplicateReasons(
  reasons: readonly CandidateReason[],
): CandidateReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = `${reason.code}:${reason.participantId ?? ''}:${reason.eventId ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
