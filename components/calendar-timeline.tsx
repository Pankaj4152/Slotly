'use client';

import { CalendarDays, Clock3, Plane } from 'lucide-react';
import type {
  CalendarEvent,
  CandidateSlot,
  Participant,
  ScenarioInput,
} from '../lib/domain';
import { getLocalDateTimeParts } from '../lib/domain';

export type CalendarTimelineProps = {
  scenario: ScenarioInput;
  candidates?: CandidateSlot[];
  selectedSlot?: CandidateSlot | null;
  onEditEvent?: (event: CalendarEvent) => void;
};

export function CalendarTimeline({
  scenario,
  candidates = [],
  selectedSlot,
  onEditEvent,
}: CalendarTimelineProps) {
  const timeZone = scenario.displayTimezone;

  const windowStartParts = getLocalDateTimeParts(
    scenario.meetingRequest.windowStartsAt,
    timeZone,
  );
  const windowEndParts = getLocalDateTimeParts(
    scenario.meetingRequest.windowEndsAt,
    timeZone,
  );

  let minMinute = windowStartParts.hour * 60 + windowStartParts.minute;
  let maxMinute = windowEndParts.hour * 60 + windowEndParts.minute;

  for (const event of scenario.calendarEvents) {
    const sParts = getLocalDateTimeParts(event.startsAt, timeZone);
    const eParts = getLocalDateTimeParts(event.endsAt, timeZone);
    const sMin = sParts.hour * 60 + sParts.minute;
    const eMin = eParts.hour * 60 + eParts.minute;
    if (sMin < minMinute) minMinute = sMin;
    if (eMin > maxMinute) maxMinute = eMin;
  }

  const startHour = Math.max(0, Math.floor(minMinute / 60) - 1);
  const endHour = Math.min(24, Math.ceil(maxMinute / 60) + 1);
  const timelineStartMinutes = startHour * 60;
  const timelineEndMinutes = endHour * 60;
  const totalMinutes = Math.max(60, timelineEndMinutes - timelineStartMinutes);

  function getPositionPercent(instant: string): number {
    const parts = getLocalDateTimeParts(instant, timeZone);
    const minuteOfDay = parts.hour * 60 + parts.minute;
    const clamped = Math.max(
      timelineStartMinutes,
      Math.min(timelineEndMinutes, minuteOfDay),
    );
    return ((clamped - timelineStartMinutes) / totalMinutes) * 100;
  }

  function getWidthPercent(startsAt: string, endsAt: string): number {
    const sPercent = getPositionPercent(startsAt);
    const ePercent = getPositionPercent(endsAt);
    return Math.max(1.5, ePercent - sPercent);
  }

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const windowLeft = getPositionPercent(scenario.meetingRequest.windowStartsAt);
  const windowWidth = getWidthPercent(
    scenario.meetingRequest.windowStartsAt,
    scenario.meetingRequest.windowEndsAt,
  );

  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Clock3 className="size-3.5 text-accent-foreground" />
          <span>Timeline View</span>
          <span className="text-muted-foreground font-normal">
            ({scenario.displayTimezone.split('/').pop()})
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-primary/20 border border-primary/40" />
            Window
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-sky-200 border border-sky-400" />
            Travel
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-amber-200 border border-amber-400" />
            Movable
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-rose-200 border border-rose-400" />
            Protected
          </span>
        </div>
      </div>

      {/* Time Header Scale */}
      <div className="relative mb-2 h-5 w-full select-none text-[10px] text-muted-foreground">
        {hours.map((h) => {
          const leftPercent =
            ((h * 60 - timelineStartMinutes) / totalMinutes) * 100;
          if (leftPercent < 0 || leftPercent > 100) return null;
          const displayHour = h % 12 === 0 ? 12 : h % 12;
          const ampm = h >= 12 ? 'PM' : 'AM';
          return (
            <div
              className="absolute -translate-x-1/2"
              key={h}
              style={{ left: `${leftPercent}%` }}
            >
              <div className="h-1.5 w-px bg-border mx-auto" />
              <span>
                {displayHour}
                {ampm}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeline Grid Container */}
      <div className="relative space-y-2 rounded-lg bg-card/60 p-2">
        {/* Requested Window Background Overlay */}
        <div
          aria-label="Requested scheduling window"
          className="pointer-events-none absolute top-0 bottom-0 z-0 rounded border border-dashed border-primary/40 bg-primary/5"
          style={{
            left: `${windowLeft}%`,
            width: `${windowWidth}%`,
          }}
        />

        {/* Participant tracks */}
        {scenario.participants.map((p: Participant) => {
          const participantEvents = scenario.calendarEvents.filter(
            (e) => e.participantId === p.id,
          );

          return (
            <div
              className="relative z-10 flex items-center gap-2 py-1"
              key={p.id}
            >
              <div
                className="w-24 shrink-0 truncate text-xs font-semibold text-foreground"
                title={`${p.name} (${p.role})`}
              >
                {p.name.split(' ')[0]}
                <span className="block text-[10px] font-normal text-muted-foreground capitalize">
                  {p.role.replace('_', ' ')}
                </span>
              </div>

              <div className="relative h-8 flex-1 rounded-md bg-secondary/30">
                {participantEvents.map((event) => {
                  const left = getPositionPercent(event.startsAt);
                  const width = getWidthPercent(event.startsAt, event.endsAt);
                  const isTravel = event.kind === 'travel';
                  const isClient = event.kind === 'client';
                  const isMovable = event.movable;

                  const colorClass = isTravel
                    ? 'border-sky-300 bg-sky-100/90 text-sky-950'
                    : isClient
                      ? 'border-rose-300 bg-rose-100/90 text-rose-950'
                      : isMovable
                        ? 'border-amber-300 bg-amber-100/90 text-amber-950'
                        : 'border-border bg-card text-foreground';

                  return (
                    <button
                      aria-label={`Edit ${event.title}`}
                      className={`group absolute top-0.5 bottom-0.5 flex cursor-pointer items-center justify-between overflow-hidden rounded border px-1.5 text-[11px] font-medium shadow-xs transition hover:z-20 hover:ring-2 hover:ring-primary ${colorClass}`}
                      key={event.id}
                      onClick={() => onEditEvent?.(event)}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                      }}
                      title={`${event.title} (${isMovable ? 'Movable' : 'Fixed'}) - Click to edit`}
                      type="button"
                    >
                      <span className="flex items-center gap-1 truncate">
                        {isTravel ? (
                          <Plane className="size-3 shrink-0 text-sky-700" />
                        ) : (
                          <CalendarDays className="size-3 shrink-0 opacity-70" />
                        )}
                        <span className="truncate">{event.title}</span>
                      </span>
                      {isMovable && (
                        <span className="hidden shrink-0 rounded bg-amber-200/80 px-1 text-[9px] font-bold sm:inline-block">
                          M
                        </span>
                      )}
                    </button>
                  );
                })}

                {participantEvents.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/60 italic">
                    Free all window
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Candidate Slots Row (if evaluated) */}
        {candidates.length > 0 && (
          <div className="relative z-10 flex items-center gap-2 border-t border-border/60 pt-2">
            <div className="w-24 shrink-0 text-[11px] font-semibold text-accent-foreground">
              Candidates
            </div>
            <div className="relative h-6 flex-1">
              {candidates.map((candidate) => {
                const left = getPositionPercent(candidate.startsAt);
                const width = getWidthPercent(
                  candidate.startsAt,
                  candidate.endsAt,
                );
                const isSelected =
                  selectedSlot?.startsAt === candidate.startsAt;
                const isRejected = candidate.status === 'rejected';

                const chipClass = isSelected
                  ? 'border-emerald-500 bg-emerald-600 text-white font-bold ring-2 ring-emerald-300'
                  : isRejected
                    ? 'border-rose-300 bg-rose-200/70 text-rose-800'
                    : 'border-emerald-300 bg-emerald-100 text-emerald-900';

                return (
                  <div
                    className={`absolute top-0 bottom-0 flex items-center justify-center rounded border text-[10px] shadow-2xs transition hover:z-20 ${chipClass}`}
                    key={candidate.startsAt}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    title={`${candidate.status === 'rejected' ? 'Rejected' : 'Eligible'}: ${candidate.reasons[0]?.code ?? 'Available'}`}
                  >
                    <span className="truncate px-0.5">
                      {isSelected ? '✓ Pick' : isRejected ? '✕' : '●'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
