import { instantSchema, timeZoneSchema } from './schema';

export type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function normalizeInstant(value: string): string {
  return instantSchema.parse(value);
}

export function differenceInMinutes(start: string, end: string): number {
  const startInstant = normalizeInstant(start);
  const endInstant = normalizeInstant(end);
  return (Date.parse(endInstant) - Date.parse(startInstant)) / 60_000;
}

export function getLocalDateTimeParts(
  instant: string,
  timeZone: string,
): LocalDateTimeParts {
  const normalizedInstant = normalizeInstant(instant);
  const validatedTimeZone = timeZoneSchema.parse(timeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validatedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(normalizedInstant))
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

export function formatInstantInTimeZone(
  instant: string,
  timeZone: string,
  locale = 'en-US',
): string {
  const normalizedInstant = normalizeInstant(instant);
  const validatedTimeZone = timeZoneSchema.parse(timeZone);

  return new Intl.DateTimeFormat(locale, {
    timeZone: validatedTimeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(normalizedInstant));
}
