import { describe, expect, it } from 'vitest';

import { meetingRequestSchema } from '../domain';

import { generateCandidateSlots } from './slot-generator';

function createRequest(overrides: Record<string, unknown> = {}) {
  return meetingRequestSchema.parse({
    id: 'meeting_001',
    title: 'Candidate interview',
    participantIds: ['candidate', 'interviewer'],
    durationMinutes: 30,
    windowStartsAt: '2026-09-17T14:15:00-04:00',
    windowEndsAt: '2026-09-17T15:30:00-04:00',
    meetingType: 'candidate_interview',
    ...overrides,
  });
}

describe('generateCandidateSlots', () => {
  it('generates candidates at the configured interval', () => {
    const slots = generateCandidateSlots(createRequest());

    expect(slots.map(({ startsAt }) => startsAt)).toEqual([
      '2026-09-17T18:15:00.000Z',
      '2026-09-17T18:30:00.000Z',
      '2026-09-17T18:45:00.000Z',
      '2026-09-17T19:00:00.000Z',
    ]);
  });

  it('includes a slot that ends exactly at the window boundary', () => {
    const slots = generateCandidateSlots(createRequest());

    expect(slots.at(-1)).toMatchObject({
      startsAt: '2026-09-17T19:00:00.000Z',
      endsAt: '2026-09-17T19:30:00.000Z',
    });
  });

  it('aligns a non-standard window start to the next interval boundary', () => {
    const slots = generateCandidateSlots(
      createRequest({ windowStartsAt: '2026-09-17T14:17:00-04:00' }),
    );

    expect(slots[0].startsAt).toBe('2026-09-17T18:30:00.000Z');
  });

  it('supports a custom interval', () => {
    const slots = generateCandidateSlots(createRequest(), {
      intervalMinutes: 30,
    });

    expect(slots).toHaveLength(2);
  });

  it('returns no candidates when the meeting cannot fit in the window', () => {
    const slots = generateCandidateSlots(
      createRequest({
        durationMinutes: 90,
        windowEndsAt: '2026-09-17T15:00:00-04:00',
      }),
    );

    expect(slots).toEqual([]);
  });

  it.each([0, -15, 1.5, 1441])(
    'rejects the invalid interval %s',
    (intervalMinutes) => {
      expect(() =>
        generateCandidateSlots(createRequest(), { intervalMinutes }),
      ).toThrow(RangeError);
    },
  );
});
