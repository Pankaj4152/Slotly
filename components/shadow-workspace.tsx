'use client';

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  FlaskConical,
  LoaderCircle,
  MapPin,
  Plane,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';

import type { ConversationMessage, ScenarioInput } from '../lib/domain';
import type { ShadowRun } from '../lib/shadow';

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
          }
        : undefined,
    [baseScenario, customMessages],
  );
  if (!scenario) throw new Error('Shadow requires at least one scenario.');
  const scenarioId = scenario.id;

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
        caught instanceof Error ? caught.message : 'Unable to run Shadow.',
      );
    } finally {
      setRunning(false);
    }
  }

  function selectScenario(id: string) {
    setSelectedScenarioId(id);
    const nextScenario = scenarios.find((scenario) => scenario.id === id);
    setSpeakerId(nextScenario?.participants[0]?.id ?? '');
    setDraft('');
    setRun(undefined);
    setError(undefined);
  }

  function addCustomMessage(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !speakerId) return;
    const message: ConversationMessage = {
      id: `custom_message_${Date.now()}`,
      participantId: speakerId,
      sentAt: new Date().toISOString(),
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

  function clearCustomMessages() {
    setCustomMessages((current) => ({ ...current, [scenarioId]: [] }));
    setRun(undefined);
    setError(undefined);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FlaskConical aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="font-semibold tracking-[-0.025em]">Shadow</p>
              <p className="text-xs text-muted-foreground">
                Scheduling reliability lab
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
              {running ? 'Evaluating…' : run ? 'Run again' : 'Run Shadow'}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground">
              <CircleDot aria-hidden="true" className="size-3.5" />
              Interactive scenario
            </div>
            <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              {scenario.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an example, review what Shadow knows, then run the safety
              check.
            </p>
          </div>
          <label className="min-w-[260px] sm:ml-auto">
            <span className="sr-only">Choose a scheduling scenario</span>
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
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Pill icon={Clock3}>
              {scenario.meetingRequest.durationMinutes} minutes
            </Pill>
            <Pill icon={MapPin}>{scenario.displayTimezone}</Pill>
            <Pill icon={UserRound}>
              {scenario.meetingRequest.participantIds.length} participants
            </Pill>
          </div>
        </section>

        <ol className="mb-5 grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3">
          {[
            ['1', 'Read the request', 'Conversation'],
            ['2', 'Check constraints', 'Calendar + policies'],
            ['3', 'Explain the outcome', 'Act, ask, or stop'],
          ].map(([number, title, detail], index) => (
            <li
              className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : ''}`}
              key={number}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                {number}
              </span>
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.12fr_1.06fr]">
          <Panel title="Conversation" eyebrow="Input">
            <div className="space-y-5">
              {scenario.conversation.map((message) => {
                const person = scenario.participants.find(
                  ({ id }) => id === message.participantId,
                );
                return (
                  <article className="flex gap-3" key={message.id}>
                    <Avatar name={person?.name ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold">{person?.name}</p>
                        <time className="shrink-0 text-xs text-muted-foreground">
                          {formatTime(message.sentAt, scenario.displayTimezone)}
                        </time>
                      </div>
                      <p className="mt-1.5 rounded-r-xl rounded-bl-xl bg-secondary px-3.5 py-3 text-sm leading-6 text-secondary-foreground">
                        {message.body}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            <details className="group mt-6 overflow-hidden rounded-xl border border-border bg-secondary/45">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-semibold">
                Add or clarify the conversation
                <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                  Optional
                </span>
                <span className="hidden text-xs font-medium text-muted-foreground group-open:block">
                  Close
                </span>
              </summary>
              <form
                className="border-t border-border p-3.5"
                onSubmit={addCustomMessage}
              >
                <div className="mb-2 flex items-center justify-end gap-3">
                  {(customMessages[scenario.id]?.length ?? 0) > 0 ? (
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-destructive"
                      onClick={clearCustomMessages}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      Clear added
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
                      {participant.name} · {humanize(participant.role)}
                    </option>
                  ))}
                </select>
                <textarea
                  className="mt-2 min-h-20 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground focus:border-ring"
                  maxLength={500}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Add availability, a preference, or clarification…"
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
                    Add to chat
                  </button>
                </div>
              </form>
            </details>

            <details className="group mt-5 border-t border-border pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                Policies checked
                <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
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

          <Panel
            title={formatDate(
              scenario.meetingRequest.windowStartsAt,
              scenario.displayTimezone,
            )}
            eyebrow="Calendar context"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {scenario.participants.slice(0, 3).map((person) => (
                  <Avatar key={person.id} name={person.name} small />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {scenario.displayTimezone}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border bg-background">
              {scenario.calendarEvents.map((event) => (
                <div
                  className={`border-b border-border/70 px-4 py-3 last:border-b-0 ${event.kind === 'travel' ? 'bg-sky-50/70' : event.kind === 'client' ? 'bg-rose-50/60' : 'bg-card'}`}
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
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatTime(event.startsAt, scenario.displayTimezone)}
                          –{formatTime(event.endsAt, scenario.displayTimezone)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${event.movable ? 'bg-amber-100 text-amber-800' : 'bg-secondary text-muted-foreground'}`}
                    >
                      {event.movable ? 'Movable' : 'Protected'}
                    </span>
                  </div>
                </div>
              ))}
              {scenario.calendarEvents.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No calendar events in this scenario.
                </p>
              ) : null}
            </div>

            {run ? (
              <div className="mt-5">
                <p className="section-label">Candidate trace</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {headlineCandidates(run).map((candidate) => (
                    <div
                      className={`rounded-xl border p-3 ${candidate.status === 'rejected' ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}
                      key={candidate.startsAt}
                    >
                      <p className="text-sm font-semibold">
                        {formatTime(
                          candidate.startsAt,
                          scenario.displayTimezone,
                        )}
                      </p>
                      <p
                        className={`mt-1 text-xs font-medium ${candidate.status === 'rejected' ? 'text-rose-700' : 'text-emerald-700'}`}
                      >
                        {candidate.status === 'rejected'
                          ? 'Rejected'
                          : 'Eligible'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Agent decision" eyebrow="Validated output">
            {error ? <ErrorState message={error} onRetry={execute} /> : null}
            {!error && !run && !running ? <ReadyState /> : null}
            {!error && running ? <RunningState /> : null}
            {!error && run && !running ? (
              <DecisionState run={run} timezone={scenario.displayTimezone} />
            ) : null}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
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
      </div>
      {children}
    </section>
  );
}

function ReadyState() {
  return (
    <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary">
        <ShieldCheck className="size-6 text-accent-foreground" />
      </span>
      <h3 className="mt-5 text-lg font-semibold">Ready to evaluate</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        Run the scenario to generate candidates, apply policies, and validate
        the final action.
      </p>
      <div className="mt-6 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        ACT <ChevronRight className="size-3" /> ASK{' '}
        <ChevronRight className="size-3" /> STOP
      </div>
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
            className={`size-4 ${index === 0 ? 'animate-spin text-accent-foreground' : 'text-muted-foreground/40'}`}
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
            <ShieldCheck className="size-3.5" /> {run.validation.status}
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

      <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-xs">
        <span className="text-muted-foreground">Execution mode</span>
        <span className="font-mono font-semibold">
          {run.mode === 'model'
            ? 'MODEL + GUARDRAILS'
            : 'DETERMINISTIC FALLBACK'}
        </span>
      </div>
      {run.notice ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {run.notice}
        </p>
      ) : null}
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
      className={`grid shrink-0 place-items-center rounded-full border-2 border-card bg-primary font-semibold text-primary-foreground ${small ? 'size-8 text-[10px]' : 'size-9 text-xs'}`}
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
