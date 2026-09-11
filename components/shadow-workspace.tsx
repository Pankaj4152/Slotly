'use client';

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDot,
  Clock3,
  Edit2,
  FlaskConical,
  LoaderCircle,
  MapPin,
  Plane,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';

import type {
  CalendarEvent,
  ConversationMessage,
  ScenarioInput,
} from '../lib/domain';
import type { ShadowRun } from '../lib/shadow';
import { CalendarEventDialog } from './calendar-event-dialog';
import { CalendarTimeline } from './calendar-timeline';

type ShadowWorkspaceProps = { scenarios: readonly ScenarioInput[] };

export function ShadowWorkspace({ scenarios }: ShadowWorkspaceProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    scenarios[0]?.id,
  );
  const [run, setRun] = useState<ShadowRun>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState('');
  const [speakerId, setSpeakerId] = useState(
    scenarios[0]?.participants[0]?.id ?? '',
  );
  const [customMessages, setCustomMessages] = useState<
    Record<string, ConversationMessage[]>
  >({});
  const [customEvents, setCustomEvents] = useState<
    Record<string, CalendarEvent[]>
  >({});

  // Dialog state for add/edit calendar event
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const baseScenario = scenarios.find(({ id }) => id === selectedScenarioId);
  const scenario = useMemo(
    () =>
      baseScenario
        ? {
            ...baseScenario,
            conversation: [
              ...baseScenario.conversation,
              ...(customMessages[baseScenario.id] ?? []),
            ],
            calendarEvents:
              customEvents[baseScenario.id] ?? baseScenario.calendarEvents,
          }
        : undefined,
    [baseScenario, customMessages, customEvents],
  );
  if (!scenario) throw new Error('Slotly requires at least one scenario.');
  const scenarioId = scenario.id;

  const hasCustomMessages = (customMessages[scenarioId]?.length ?? 0) > 0;
  const hasCustomEvents = Boolean(customEvents[scenarioId]);
  const hasModifications = hasCustomMessages || hasCustomEvents;

  async function execute() {
    setRunning(true);
    setError(undefined);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (!response.ok)
        throw new Error('The evaluation service did not respond.');
      setRun((await response.json()) as ShadowRun);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to run Slotly.',
      );
    } finally {
      setRunning(false);
    }
  }

  function selectScenario(id: string) {
    setSelectedScenarioId(id);
    const nextScenario = scenarios.find((s) => s.id === id);
    setSpeakerId(nextScenario?.participants[0]?.id ?? '');
    setDraft('');
    setRun(undefined);
    setError(undefined);
  }

  function addMessageWithText(bodyText: string, participantId?: string) {
    if (!baseScenario) return;
    const body = bodyText.trim();
    const speaker = participantId || speakerId;
    if (!body || !speaker) return;
    const messageIndex = (customMessages[scenarioId]?.length ?? 0) + 1;
    const message: ConversationMessage = {
      id: `custom_msg_${scenarioId}_${messageIndex}`,
      participantId: speaker,
      sentAt: baseScenario.meetingRequest.windowStartsAt,
      body,
    };
    setCustomMessages((current) => ({
      ...current,
      [scenarioId]: [...(current[scenarioId] ?? []), message],
    }));
    setDraft('');
    setRun(undefined);
    setError(undefined);
  }

  function addCustomMessage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    addMessageWithText(draft);
  }

  function removeCustomMessage(messageId: string) {
    setCustomMessages((current) => ({
      ...current,
      [scenarioId]: (current[scenarioId] ?? []).filter(
        (m) => m.id !== messageId,
      ),
    }));
    setRun(undefined);
    setError(undefined);
  }

  function clearCustomMessages() {
    setCustomMessages((current) => ({ ...current, [scenarioId]: [] }));
    setRun(undefined);
    setError(undefined);
  }

  function handleSaveEvent(event: CalendarEvent) {
    const currentEvents = customEvents[scenarioId] ?? [
      ...(baseScenario?.calendarEvents ?? []),
    ];
    const exists = currentEvents.some((e) => e.id === event.id);

    const updated = exists
      ? currentEvents.map((e) => (e.id === event.id ? event : e))
      : [...currentEvents, event];

    setCustomEvents((curr) => ({
      ...curr,
      [scenarioId]: updated,
    }));
    setRun(undefined);
    setError(undefined);
  }

  function handleDeleteEvent(eventId: string) {
    const currentEvents = customEvents[scenarioId] ?? [
      ...(baseScenario?.calendarEvents ?? []),
    ];
    setCustomEvents((curr) => ({
      ...curr,
      [scenarioId]: currentEvents.filter((e) => e.id !== eventId),
    }));
    setRun(undefined);
    setError(undefined);
  }

  function handleToggleMovable(eventId: string) {
    const currentEvents = customEvents[scenarioId] ?? [
      ...(baseScenario?.calendarEvents ?? []),
    ];
    const updated = currentEvents.map((e) =>
      e.id === eventId ? { ...e, movable: !e.movable } : e,
    );
    setCustomEvents((curr) => ({
      ...curr,
      [scenarioId]: updated,
    }));
    setRun(undefined);
    setError(undefined);
  }

  function handleResetScenario() {
    setCustomMessages((curr) => {
      const next = { ...curr };
      delete next[scenarioId];
      return next;
    });
    setCustomEvents((curr) => {
      const next = { ...curr };
      delete next[scenarioId];
      return next;
    });
    setDraft('');
    setRun(undefined);
    setError(undefined);
  }

  function openAddEventDialog() {
    setEditingEvent(null);
    setIsEventDialogOpen(true);
  }

  function openEditEventDialog(event: CalendarEvent) {
    setEditingEvent(event);
    setIsEventDialogOpen(true);
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-12">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FlaskConical aria-hidden="true" className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold tracking-[-0.025em]">Slotly</p>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  Vela Reliability Lab
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pre-deployment evaluation for autonomous scheduling agents
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block"
              href="/evals"
            >
              Evaluation suite
            </Link>
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Synthetic environment
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
              disabled={running}
              onClick={execute}
              type="button"
            >
              {running ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Sparkles aria-hidden="true" className="size-4" />
              )}
              {running ? 'Checking…' : run ? 'Run again' : 'Evaluate request'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6">
        {/* Scenario Header Info Banner */}
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground">
              <CircleDot aria-hidden="true" className="size-3.5" />
              Interactive scenario
              {hasModifications ? (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                  <Sparkles className="size-3" /> Modified
                </span>
              ) : null}
            </div>
            <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              {scenario.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tweak calendars, inject dialogue, and test how Slotly makes safe,
              context-aware decisions.
            </p>
          </div>

          <label className="min-w-[260px] sm:ml-auto">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Try an example
            </span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              onChange={(event) => selectScenario(event.target.value)}
              value={scenario.id}
            >
              {scenarios.map((option, index) => (
                <option key={option.id} value={option.id}>
                  {index + 1}. {option.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {hasModifications ? (
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 font-semibold text-amber-900 transition hover:bg-amber-100"
                onClick={handleResetScenario}
                title="Restore scenario to preset defaults"
                type="button"
              >
                <RotateCcw className="size-3.5" /> Reset
              </button>
            ) : null}
            <Pill icon={Clock3}>
              {scenario.meetingRequest.durationMinutes} minutes
            </Pill>
            <Pill icon={MapPin}>{scenario.displayTimezone}</Pill>
            <Pill icon={UserRound}>
              {scenario.participants.length} participants
            </Pill>
          </div>
        </section>

        {/* 3-Column Pipeline Workspace */}
        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.12fr_1.06fr]">
          {/* Panel 1: Conversation & Intent */}
          <Panel eyebrow="1 · Conversation" title="Request & Dialogue">
            <div className="space-y-4">
              {scenario.conversation.map((message) => {
                const person = scenario.participants.find(
                  ({ id }) => id === message.participantId,
                );
                const isCustom = message.id.startsWith('custom_msg_');
                return (
                  <article className="flex gap-3" key={message.id}>
                    <Avatar name={person?.name ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {person?.name}
                          </p>
                          {isCustom && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <time className="shrink-0 text-xs text-muted-foreground">
                            {formatTime(
                              message.sentAt,
                              scenario.displayTimezone,
                            )}
                          </time>
                          {isCustom && (
                            <button
                              aria-label="Delete added message"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeCustomMessage(message.id)}
                              type="button"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p
                        className={`mt-1.5 rounded-r-xl rounded-bl-xl px-3.5 py-3 text-sm leading-6 ${
                          isCustom
                            ? 'border border-primary/20 bg-primary/5 text-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {message.body}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Add Conversation Form */}
            <details className="group mt-4 overflow-hidden rounded-xl border border-border bg-secondary/45">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-semibold">
                Add to conversation
                <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                  Optional
                </span>
                <span className="hidden text-xs font-medium text-muted-foreground group-open:block">
                  Collapse
                </span>
              </summary>
              <form
                className="border-t border-border p-3.5"
                onSubmit={addCustomMessage}
              >
                <div className="mb-2 flex items-center justify-between">
                  <label
                    className="text-xs font-semibold text-muted-foreground"
                    htmlFor="custom-speaker"
                  >
                    Speak as:
                  </label>
                  {hasCustomMessages ? (
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-destructive"
                      onClick={clearCustomMessages}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Clear all added
                    </button>
                  ) : null}
                </div>
                <select
                  className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm outline-none focus:border-ring"
                  id="custom-speaker"
                  onChange={(event) => setSpeakerId(event.target.value)}
                  value={speakerId}
                >
                  {scenario.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name} ({humanize(participant.role)})
                    </option>
                  ))}
                </select>
                <textarea
                  className="mt-2 min-h-20 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground focus:border-ring"
                  maxLength={500}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type an availability constraint, preference change, or response…"
                  value={draft}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {draft.length}/500
                  </span>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!draft.trim()}
                    type="submit"
                  >
                    <Send aria-hidden="true" className="size-3.5" />
                    Send message
                  </button>
                </div>
              </form>
            </details>

            {/* Policies Checked */}
            <details className="group mt-5 border-t border-border pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                Active policies & rules
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {scenario.preferences.length}
                </span>
              </summary>
              <div className="mt-3 space-y-2.5">
                {scenario.preferences.map((preference) => (
                  <div className="flex gap-2.5 text-sm" key={preference.id}>
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span className="leading-5 text-muted-foreground">
                      {preference.description}
                    </span>
                  </div>
                ))}
                {scenario.preferences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No additional policies are active for this scenario.
                  </p>
                ) : null}
              </div>
            </details>
          </Panel>

          {/* Panel 2: Calendar, Events & Timeline */}
          <Panel
            action={
              <button
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:border-primary hover:bg-secondary"
                onClick={openAddEventDialog}
                type="button"
              >
                <Plus className="size-3.5" /> Add event
              </button>
            }
            eyebrow="2 · Verify"
            title="Calendar & Timeline"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {formatDate(
                    scenario.meetingRequest.windowStartsAt,
                    scenario.displayTimezone,
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Target window ·{' '}
                  {formatTime(
                    scenario.meetingRequest.windowStartsAt,
                    scenario.displayTimezone,
                  )}
                  –
                  {formatTime(
                    scenario.meetingRequest.windowEndsAt,
                    scenario.displayTimezone,
                  )}
                </p>
              </div>
              <div className="flex -space-x-2">
                {scenario.participants.slice(0, 3).map((person) => (
                  <Avatar key={person.id} name={person.name} small />
                ))}
              </div>
            </div>

            {/* Visual Day Timeline */}
            <CalendarTimeline
              candidates={run?.candidates}
              onEditEvent={openEditEventDialog}
              scenario={scenario}
              selectedSlot={run?.decision.selectedSlot}
            />

            {/* Calendar Events List */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="section-label">Calendar events</span>
                <span className="text-xs text-muted-foreground">
                  Click badge to toggle Movable
                </span>
              </div>
              <div className="relative overflow-hidden rounded-xl border border-border bg-background">
                {scenario.calendarEvents.map((event) => {
                  const person = scenario.participants.find(
                    (p) => p.id === event.participantId,
                  );
                  return (
                    <div
                      className={`border-b border-border/70 px-4 py-3 last:border-b-0 transition hover:bg-secondary/40 ${
                        event.kind === 'travel'
                          ? 'bg-sky-50/70'
                          : event.kind === 'client'
                            ? 'bg-rose-50/60'
                            : 'bg-card'
                      }`}
                      key={event.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <span className="mt-0.5 grid size-8 place-items-center rounded-lg border border-border bg-card">
                            {event.kind === 'travel' ? (
                              <Plane className="size-4 text-sky-700" />
                            ) : (
                              <CalendarDays className="size-4 text-muted-foreground" />
                            )}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">
                                {event.title}
                              </p>
                              {person && (
                                <span className="text-xs text-muted-foreground">
                                  ({person.name.split(' ')[0]})
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatTime(
                                event.startsAt,
                                scenario.displayTimezone,
                              )}
                              –
                              {formatTime(
                                event.endsAt,
                                scenario.displayTimezone,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer hover:opacity-85 ${
                              event.movable
                                ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => handleToggleMovable(event.id)}
                            title="Click to toggle Movable / Fixed"
                            type="button"
                          >
                            {event.movable
                              ? 'Movable ✓'
                              : isProtectedEvent(event.kind, scenario)
                                ? 'Protected'
                                : 'Fixed'}
                          </button>
                          <button
                            aria-label="Edit event details"
                            className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            onClick={() => openEditEventDialog(event)}
                            type="button"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {scenario.calendarEvents.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No calendar events in this scenario.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Candidate Trace */}
            {run ? (
              <div className="mt-5">
                <p className="section-label">Evaluated Candidates</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {headlineCandidates(run).map((candidate) => (
                    <div
                      className={`rounded-xl border p-3 ${
                        candidate.status === 'rejected'
                          ? 'border-rose-200 bg-rose-50'
                          : 'border-emerald-200 bg-emerald-50'
                      }`}
                      key={candidate.startsAt}
                    >
                      <p className="text-sm font-semibold">
                        {formatTime(
                          candidate.startsAt,
                          scenario.displayTimezone,
                        )}
                      </p>
                      <p
                        className={`mt-1 text-xs font-medium ${
                          candidate.status === 'rejected'
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {candidate.status === 'rejected'
                          ? 'Rejected'
                          : 'Eligible'}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {candidate.reasons[0]
                          ? humanize(candidate.reasons[0].code)
                          : 'All checks passed'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          {/* Panel 3: Decision Result */}
          <Panel eyebrow="3 · Result" title="Agent Decision">
            {error ? <ErrorState message={error} onRetry={execute} /> : null}
            {!error && !run && !running ? <ReadyState /> : null}
            {!error && running ? <RunningState /> : null}
            {!error && run && !running ? (
              <DecisionState run={run} timezone={scenario.displayTimezone} />
            ) : null}
          </Panel>
        </div>
      </div>

      {/* Calendar Event Modal Dialog */}
      <CalendarEventDialog
        initialEvent={editingEvent}
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        onDelete={handleDeleteEvent}
        onSave={handleSaveEvent}
        scenario={scenario}
      />
    </main>
  );
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[560px] rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
        <div>
          <p className="section-label">{eyebrow}</p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

function ReadyState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary">
        <ShieldCheck className="size-6 text-accent-foreground" />
      </span>
      <h3 className="mt-5 text-lg font-semibold">Should Slotly schedule it?</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        Evaluate the request to get one clear, safety-checked outcome.
      </p>
      <dl className="mt-6 grid w-full max-w-xs grid-cols-3 gap-2 text-left">
        {[
          ['ACT', 'Safe to schedule'],
          ['ASK', 'Needs clarification'],
          ['STOP', 'No safe option'],
        ].map(([action, meaning]) => (
          <div className="rounded-lg bg-secondary p-2.5" key={action}>
            <dt className="font-mono text-xs font-bold">{action}</dt>
            <dd className="mt-1 text-xs leading-4 text-muted-foreground">
              {meaning}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RunningState() {
  const stages = [
    'Extracting intent',
    'Checking calendars',
    'Applying policies',
    'Final validation',
  ];
  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
          key={stage}
        >
          <LoaderCircle
            className={`size-4 ${
              index === 0
                ? 'animate-spin text-accent-foreground'
                : 'text-muted-foreground/40'
            }`}
          />
          <span className="text-sm font-medium">{stage}</span>
        </div>
      ))}
    </div>
  );
}

function DecisionState({
  run,
  timezone,
}: {
  run: ShadowRun;
  timezone: string;
}) {
  const selected = run.decision.selectedSlot;
  const isAct = run.decision.action === 'ACT';
  const isAsk = run.decision.action === 'ASK';
  const tone = isAct
    ? 'border-emerald-200 bg-emerald-50'
    : isAsk
      ? 'border-amber-200 bg-amber-50'
      : 'border-rose-200 bg-rose-50';
  const badge = isAct
    ? 'bg-emerald-700'
    : isAsk
      ? 'bg-amber-700'
      : 'bg-rose-700';
  return (
    <div>
      <div className={`rounded-2xl border p-5 ${tone}`}>
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold text-white ${badge}`}
          >
            {run.decision.action}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="size-3.5" /> Safety checked
          </span>
        </div>
        {selected ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-emerald-800">
              Recommended
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
              {formatTime(selected.startsAt, timezone)}–
              {formatTime(selected.endsAt, timezone)}
            </p>
            <p className="mt-1 text-sm text-emerald-900/70">
              {formatDate(selected.startsAt, timezone)}
            </p>
          </div>
        ) : null}
        {!selected ? (
          <p className="mt-4 text-sm leading-6 text-foreground/75">
            {run.decision.clarificationQuestion ?? run.decision.reason}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="section-label">Decision evidence</p>
        <div className="mt-3 space-y-2.5">
          {run.decision.evidence.map((evidence, index) => (
            <div
              className="flex gap-3 rounded-xl border border-border bg-background p-3.5"
              key={`${evidence.code}-${index}`}
            >
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">{humanize(evidence.code)}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {evidence.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="group mt-5 rounded-xl bg-secondary px-4 py-3 text-xs">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="font-semibold">How this ran</span>
          <span className="text-muted-foreground group-open:hidden">
            Details
          </span>
          <span className="hidden text-muted-foreground group-open:block">
            Close
          </span>
        </summary>
        <div className="mt-3 border-t border-border pt-3">
          <p className="font-mono font-semibold">
            {run.mode === 'model'
              ? 'MODEL + DETERMINISTIC GUARDRAILS'
              : 'DETERMINISTIC FALLBACK'}
          </p>
          {run.notice ? (
            <p className="mt-2 leading-5 text-muted-foreground">{run.notice}</p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="size-5 shrink-0 text-rose-700" />
        <div>
          <p className="text-sm font-semibold">Evaluation failed</p>
          <p className="mt-1 text-sm text-rose-800/80">{message}</p>
          <button
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rose-800"
            onClick={onRetry}
            type="button"
          >
            Try again <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: typeof Clock3;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  return (
    <span
      aria-label={name}
      className={`grid shrink-0 place-items-center rounded-full border-2 border-card bg-primary font-semibold text-primary-foreground ${
        small ? 'size-8 text-[10px]' : 'size-9 text-xs'
      }`}
    >
      {initials}
    </span>
  );
}

function formatTime(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(instant));
}

function formatDate(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(instant));
}

function humanize(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isProtectedEvent(
  kind: ScenarioInput['calendarEvents'][number]['kind'],
  scenario: ScenarioInput,
) {
  return scenario.preferences.some(
    (preference) =>
      preference.type === 'protected_event' && preference.eventKind === kind,
  );
}

function headlineCandidates(run: ShadowRun) {
  const selectedStart = run.decision.selectedSlot?.startsAt;
  const selected = run.candidates.find(
    ({ startsAt }) => startsAt === selectedStart,
  );
  const rejected = run.candidates.find(({ status }) => status === 'rejected');
  const alternatives = run.candidates.filter(
    (candidate) => candidate !== selected && candidate !== rejected,
  );
  return [rejected, selected, ...alternatives]
    .filter(
      (candidate): candidate is ShadowRun['candidates'][number] =>
        candidate !== undefined,
    )
    .slice(0, 3);
}
