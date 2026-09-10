import {
  candidateSlotSchema,
  meetingRequestSchema,
  type CandidateSlot,
  type MeetingRequest,
} from '../domain';

const MINUTES_PER_DAY = 24 * 60;

export type SlotGenerationOptions = {
  intervalMinutes?: number;
};

export function generateCandidateSlots(
  request: MeetingRequest,
  options: SlotGenerationOptions = {},
): CandidateSlot[] {
  const validatedRequest = meetingRequestSchema.parse(request);
  const intervalMinutes = options.intervalMinutes ?? 15;

  if (
    !Number.isInteger(intervalMinutes) ||
    intervalMinutes <= 0 ||
    intervalMinutes > MINUTES_PER_DAY
  ) {
    throw new RangeError(
      'intervalMinutes must be an integer between 1 and 1440',
    );
  }

  const intervalMilliseconds = intervalMinutes * 60_000;
  const durationMilliseconds = validatedRequest.durationMinutes * 60_000;
  const windowStart = Date.parse(validatedRequest.windowStartsAt);
  const windowEnd = Date.parse(validatedRequest.windowEndsAt);
  const firstStart = alignUp(windowStart, intervalMilliseconds);
  const slots: CandidateSlot[] = [];

  for (
    let startsAt = firstStart;
    startsAt + durationMilliseconds <= windowEnd;
    startsAt += intervalMilliseconds
  ) {
    slots.push(
      candidateSlotSchema.parse({
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(startsAt + durationMilliseconds).toISOString(),
        status: 'available',
        score: 0,
        reasons: [],
      }),
    );
  }

  return slots;
}

function alignUp(value: number, interval: number): number {
  return Math.ceil(value / interval) * interval;
}
