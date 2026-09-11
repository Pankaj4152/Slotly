import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';

import { evaluationFixtures, runEvaluationSuite } from '../../lib/evaluation';

export default function EvaluationsPage() {
  const report = runEvaluationSuite(evaluationFixtures);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-background/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="font-semibold tracking-[-0.025em]">Slotly</p>
              <p className="text-xs text-muted-foreground">Evaluation suite</p>
            </div>
          </div>
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Scenario workspace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <p className="section-label text-accent-foreground">
              Deterministic safety gate
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Scheduling behavior, tested before deployment.
            </h1>
            <p className="mt-4 leading-7 text-muted-foreground">
              Every scenario runs through the same candidate generation,
              constraint, ranking, decision, and final-validation pipeline used
              by the workspace.
            </p>
          </div>
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
              report.failed === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-red-200 bg-red-50 text-red-950'
            }`}
          >
            {report.failed === 0 ? (
              <ShieldCheck aria-hidden="true" className="size-6" />
            ) : (
              <CircleAlert aria-hidden="true" className="size-6" />
            )}
            <div>
              <p className="text-2xl font-semibold tracking-[-0.03em]">
                {Math.round(report.passRate * 100)}%
              </p>
              <p className="text-xs font-medium opacity-70">suite pass rate</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Metric label="Scenarios" value={report.total} />
          <Metric label="Passed" value={report.passed} tone="success" />
          <Metric label="Failed" value={report.failed} tone="danger" />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <p className="section-label">Scenario results</p>
          </div>
          <div className="divide-y divide-border">
            {report.results.map((result) => (
              <details className="group" key={result.scenarioId}>
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition hover:bg-secondary/50">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      result.passed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.passed ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <CircleAlert aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {result.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {result.scenarioId}
                    </span>
                  </span>
                  <span className="rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold">
                    {result.decision.action}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground group-open:hidden">
                    Inspect
                  </span>
                  <span className="hidden text-xs font-semibold text-muted-foreground group-open:block">
                    Close
                  </span>
                </summary>
                <div className="grid gap-5 border-t border-border bg-secondary/35 px-5 py-5 md:grid-cols-2">
                  <div>
                    <p className="section-label">Decision evidence</p>
                    <p className="mt-2 text-sm leading-6">
                      {result.decision.reason}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.decision.evidence.map((reason) => (
                        <span
                          className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs"
                          key={`${reason.code}-${reason.eventId ?? reason.participantId ?? ''}`}
                        >
                          {reason.code}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="section-label">Expected contract</p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Action</dt>
                      <dd className="font-mono font-semibold">
                        {result.expected.action}
                      </dd>
                      <dt className="text-muted-foreground">Required</dt>
                      <dd className="font-mono text-xs leading-6">
                        {result.expected.requiredReasonCodes.join(', ') ||
                          'none'}
                      </dd>
                      <dt className="text-muted-foreground">Result</dt>
                      <dd className="font-semibold">
                        {result.passed
                          ? 'All checks passed'
                          : result.failures
                              .map(({ message }) => message)
                              .join(' ')}
                      </dd>
                    </dl>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'danger' && value > 0
        ? 'text-red-700'
        : 'text-foreground';
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="section-label">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${color}`}>
        {value}
      </p>
    </div>
  );
}
