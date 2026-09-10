import { describe, expect, it } from 'vitest';

import {
  differenceInMinutes,
  formatInstantInTimeZone,
  getLocalDateTimeParts,
  normalizeInstant,
} from './time';

describe('normalizeInstant', () => {
  it('canonicalizes equivalent offset timestamps to UTC', () => {
    expect(normalizeInstant('2026-09-17T15:30:00-04:00')).toBe(
      '2026-09-17T19:30:00.000Z',
    );
    expect(normalizeInstant('2026-09-17T14:30:00-05:00')).toBe(
      '2026-09-17T19:30:00.000Z',
    );
  });

  it('rejects a local timestamp without an explicit offset', () => {
    expect(() => normalizeInstant('2026-09-17T15:30:00')).toThrow();
  });
});

describe('timezone presentation', () => {
  it('preserves the intended local display time', () => {
    expect(
      getLocalDateTimeParts('2026-09-17T19:30:00.000Z', 'America/New_York'),
    ).toEqual({
      year: 2026,
      month: 9,
      day: 17,
      hour: 15,
      minute: 30,
      second: 0,
    });

    expect(
      formatInstantInTimeZone(
        '2026-09-17T19:30:00.000Z',
        'America/New_York',
        'en-US',
      ),
    ).toContain('3:30 PM');
  });

  it('uses elapsed time rather than wall-clock time across DST', () => {
    const beforeSpringForward = '2026-03-08T01:30:00-05:00';
    const afterSpringForward = '2026-03-08T03:30:00-04:00';

    expect(differenceInMinutes(beforeSpringForward, afterSpringForward)).toBe(
      60,
    );
  });

  it('rejects informal timezone labels', () => {
    expect(() =>
      getLocalDateTimeParts('2026-09-17T19:30:00.000Z', 'Eastern Time'),
    ).toThrow();
  });
});
