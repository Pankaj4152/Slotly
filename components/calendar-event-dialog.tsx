'use client';

import {
  CalendarDays,
  Clock3,
  Plane,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';

import type {
  CalendarEvent,
  EventKind,
  LocalDateTimeParts,
  Participant,
  ScenarioInput,
} from '../lib/domain';
import { getLocalDateTimeParts } from '../lib/domain';

export type CalendarEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  initialEvent?: CalendarEvent | null;
  scenario: ScenarioInput;
};

const EVENT_KINDS: {
  kind: EventKind;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { kind: 'internal', label: 'Internal Meeting', icon: CalendarDays },
  {
    kind: 'client',
    label: 'Client / External (Protected)',
    icon: CalendarDays,
  },
  { kind: 'interview', label: 'Interview', icon: UserRound },
  { kind: 'travel', label: 'Travel / Transit', icon: Plane },
  { kind: 'personal', label: 'Personal Focus', icon: Clock3 },
];

function convertInstantToTimeString(instant: string, timeZone: string): string {
  const parts = getLocalDateTimeParts(instant, timeZone);
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function convertTimeStringToInstant(
  timeStr: string,
  refParts: LocalDateTimeParts,
  offsetMs: number,
): string {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = Number(hourStr ?? '12');
  const minute = Number(minuteStr ?? '0');
  const targetLocalMs = Date.UTC(
    refParts.year,
    refParts.month - 1,
    refParts.day,
    hour,
    minute,
  );
  return new Date(targetLocalMs - offsetMs).toISOString();
}

function calculateTimezoneOffsetMs(
  windowRefInstant: string,
  refParts: LocalDateTimeParts,
): number {
  const computeUtc = Date.UTC;
  const refLocalMs = computeUtc(
    refParts.year,
    refParts.month - 1,
    refParts.day,
    refParts.hour,
    refParts.minute,
  );
  const refUtcMs = Date.parse(windowRefInstant);
  return refLocalMs - refUtcMs;
}

export function CalendarEventDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEvent,
  scenario,
}: CalendarEventDialogProps) {
  const isEditing = Boolean(initialEvent);
  const timeZone = scenario.displayTimezone;

  const windowRefInstant = scenario.meetingRequest.windowStartsAt;
  const refParts = getLocalDateTimeParts(windowRefInstant, timeZone);
  const offsetMs = calculateTimezoneOffsetMs(windowRefInstant, refParts);

  const defaultStartTime = initialEvent
    ? convertInstantToTimeString(initialEvent.startsAt, timeZone)
    : '14:00';
  const defaultEndTime = initialEvent
    ? convertInstantToTimeString(initialEvent.endsAt, timeZone)
    : '15:00';

  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [participantId, setParticipantId] = useState(
    initialEvent?.participantId ?? scenario.participants[0]?.id ?? '',
  );
  const [kind, setKind] = useState<EventKind>(initialEvent?.kind ?? 'internal');
  const [movable, setMovable] = useState<boolean>(
    initialEvent?.movable ?? false,
  );
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [validationError, setValidationError] = useState<string>();

  if (!isOpen) return null;

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(undefined);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Event title is required.');
      return;
    }

    if (!participantId) {
      setValidationError('Please select a participant.');
      return;
    }

    const startsAt = convertTimeStringToInstant(startTime, refParts, offsetMs);
    const endsAt = convertTimeStringToInstant(endTime, refParts, offsetMs);

    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      setValidationError('End time must be after start time.');
      return;
    }

    const eventId = initialEvent?.id ?? `custom_evt_${Date.now()}`;

    onSave({
      id: eventId,
      participantId,
      title: trimmedTitle,
      startsAt,
      endsAt,
      kind,
      movable,
    });
    onClose();
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <span className="section-label">Calendar management</span>
            <h2
              className="mt-1 text-lg font-semibold tracking-[-0.02em]"
              id="event-dialog-title"
            >
              {isEditing ? 'Edit Calendar Event' : 'Add Calendar Event'}
            </h2>
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {validationError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
              {validationError}
            </div>
          ) : null}

          <div>
            <label
              className="block text-xs font-semibold text-muted-foreground"
              htmlFor="event-title-input"
            >
              Event Title
            </label>
            <input
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              id="event-title-input"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flight Arrival, Leadership Sync, Client Meeting"
              required
              type="text"
              value={title}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block text-xs font-semibold text-muted-foreground"
                htmlFor="event-participant-select"
              >
                Participant
              </label>
              <select
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                id="event-participant-select"
                onChange={(e) => setParticipantId(e.target.value)}
                value={participantId}
              >
                {scenario.participants.map((p: Participant) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-muted-foreground"
                htmlFor="event-kind-select"
              >
                Category
              </label>
              <select
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                id="event-kind-select"
                onChange={(e) => setKind(e.target.value as EventKind)}
                value={kind}
              >
                {EVENT_KINDS.map((k) => (
                  <option key={k.kind} value={k.kind}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold text-muted-foreground"
                htmlFor="event-start-time-input"
              >
                Start Time ({timeZone.split('/').pop()})
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                id="event-start-time-input"
                onChange={(e) => setStartTime(e.target.value)}
                required
                type="time"
                value={startTime}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-muted-foreground"
                htmlFor="event-end-time-input"
              >
                End Time ({timeZone.split('/').pop()})
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                id="event-end-time-input"
                onChange={(e) => setEndTime(e.target.value)}
                required
                type="time"
                value={endTime}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label
                  className="block text-sm font-semibold cursor-pointer"
                  htmlFor="event-movable-checkbox"
                >
                  Movable Event
                </label>
                <p className="text-xs text-muted-foreground">
                  Can this event be rescheduled if higher priority meetings need
                  the slot?
                </p>
              </div>
              <input
                checked={movable}
                className="size-4.5 rounded border-border text-primary accent-primary focus:ring-ring"
                id="event-movable-checkbox"
                onChange={(e) => setMovable(e.target.checked)}
                type="checkbox"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            {isEditing && onDelete && initialEvent ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                onClick={() => {
                  onDelete(initialEvent.id);
                  onClose();
                }}
                type="button"
              >
                <Trash2 className="size-3.5" />
                Delete event
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                type="submit"
              >
                {isEditing ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
