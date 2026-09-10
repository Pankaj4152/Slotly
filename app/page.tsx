import { ArrowRight, CalendarDays, Check, FlaskConical } from 'lucide-react';

const phases = [
  'Conversation context',
  'Candidate generation',
  'Constraint validation',
  'Safe decision',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="font-semibold tracking-[-0.02em]">Shadow</p>
              <p className="text-xs text-muted-foreground">
                Scheduling reliability lab
              </p>
            </div>
          </div>
          <span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            Foundation · Phase 0
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
        <div className="flex max-w-xl flex-col justify-center">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            Pre-deployment evaluation
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl">
            Know when a scheduling agent should act—and when it should stop.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Shadow tests scheduling decisions against calendars, timezones,
            preferences, and safety rules before an action reaches a real user.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              Core scenario coming next
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium">
              <Check
                aria-hidden="true"
                className="size-4 text-accent-foreground"
              />
              Foundation verified
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-42px_rgba(5,31,27,0.45)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <CalendarDays
                aria-hidden="true"
                className="size-4 text-accent-foreground"
              />
              <p className="text-sm font-semibold">
                Candidate interview · Thursday
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Synthetic scenario
            </span>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Context
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-sm font-medium">
                    Flight arrives at 2:00 PM
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    45-minute travel buffer required
                  </p>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-sm font-medium">
                    Internal sync at 3:30 PM
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Movable for candidate interviews
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Decision pipeline
              </p>
              <ol className="mt-5 space-y-4">
                {phases.map((phase, index) => (
                  <li className="flex items-center gap-3" key={phase}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{phase}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-secondary/70 px-5 py-4">
            <div>
              <p className="text-xs text-muted-foreground">Decision model</p>
              <p className="mt-0.5 font-mono text-sm font-semibold">
                ACT · ASK · STOP
              </p>
            </div>
            <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground">
              No live calendar access
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
