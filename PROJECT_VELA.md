# Shadow

## Pre-deployment evaluation for autonomous scheduling agents

Shadow is a focused proof-of-work project inspired by the reliability problems
described in Vela's public product and Founding Engineer role.

It is not a Vela clone. It demonstrates one question well:

> Can a scheduling agent make a context-aware decision, know when not to act,
> and show that the decision is safe before touching a real calendar?

## Demo outcome

The finished demo has one primary flow:

1. Open a realistic scheduling scenario.
2. See the conversation, calendars, roles, and preferences.
3. Run the scheduling agent.
4. Watch candidate slots pass through hard constraints and preference rules.
5. See the agent choose `ACT`, `ASK`, or `STOP` with concise evidence.
6. Run the same agent against 8-12 adversarial scenarios.
7. Open one failed result and understand exactly what regressed.

The project should be understandable in 15 seconds and technically defensible
in a longer interview discussion.

## Hard scope

### Build

- One polished scenario workspace
- 8-12 synthetic evaluation scenarios
- Structured intent extraction
- Deterministic candidate-slot generation
- Hard-constraint filtering
- Transparent preference ranking
- `ACT`, `ASK`, and `STOP` outcomes
- Deterministic final validation
- Evaluation summary and failure drilldown
- Automated tests for scheduling and safety rules
- One deployable web application

### Do not build

- Authentication or user accounts
- Real email, calendar, SMS, or WhatsApp integrations
- Database or evaluation history
- Scenario builder
- Multiple model providers
- Multi-agent orchestration
- Vector database or long-term memory system
- Generic workflow engine
- LLM-as-judge in the first version
- Agent-version comparison in the first version
- Analytics, billing, organizations, or permissions
- More than two application screens

## Technical shape

Use a single Next.js and TypeScript application.

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zod for all boundary validation
- JSON fixtures for scenarios
- Server-side model calls
- Vitest for domain tests
- Playwright for the primary demo flow if time permits

Keep the model provider behind one small interface. The application must still
be demonstrable with a deterministic fixture response when no API key exists.

## Decision pipeline

```text
Conversation and calendar state
              |
              v
Structured intent extraction
              |
              v
Deterministic candidate generation
              |
              v
Hard-constraint filtering
              |
              v
Preference evidence and ranking
              |
              v
ACT / ASK / STOP decision
              |
              v
Deterministic final validator
              |
              v
Decision trace and evaluation result
```

The LLM must not calculate timezone conversions, detect interval overlap, or
silently override hard constraints. Those operations belong in deterministic
code.

The runtime must never read expected evaluation outcomes. Expected results are
available only to the evaluation runner after the agent has produced a decision.

## Core scenario

A recruiter needs to schedule a 30-minute candidate interview with a partner.

- The partner's flight lands at 2:00 PM.
- A 45-minute post-flight buffer is required.
- The partner has a movable internal sync at 3:30 PM.
- Candidate interviews may displace internal meetings.
- Client calls must never be moved.
- The candidate is available only before 5:00 PM.

The interface should make the reasoning visible:

- `2:15 PM` rejected because it violates the travel buffer.
- `3:30 PM` can be considered because the internal sync is movable.
- The recommended slot is selected from valid evidence, not generated freely.
- If a required preference is missing, the result becomes `ASK` instead of
  inventing permission.

## Phased implementation plan

Each phase ends in a working, reviewable state. Do not begin optional work while
an earlier acceptance check is failing.

### Phase 0 - Reset and foundation

Goal: establish a minimal web application and remove ambiguity about the old
prototype.

Steps:

1. Replace the Python application on `main` with a Next.js TypeScript project.
2. Preserve the Python prototype only on `archive/eval-harness-prototype`.
3. Add formatting, linting, type-checking, and test commands.
4. Create folders for domain logic, fixtures, evaluation, and UI.
5. Add a concise README stating what is implemented, simulated, and omitted.

Acceptance:

- The app starts with one command.
- Lint and type-check pass.
- The repository contains no unused infrastructure.

### Phase 1 - Domain model and fixtures

Goal: make the scheduling problem explicit before building agent behavior.

Steps:

1. Define Zod schemas for participants, messages, calendar events, preferences,
   meeting requests, candidate slots, decisions, and expected outcomes.
2. Create the core flight-buffer scenario as a JSON fixture.
3. Validate fixtures when loaded and fail with useful errors.
4. Normalize timestamps internally while preserving display timezones.
5. Write schema and timezone normalization tests.

Acceptance:

- Invalid fixtures cannot enter the application.
- The core scenario loads deterministically.
- Timezone conversions have explicit tests.

### Phase 2 - Deterministic scheduling engine

Goal: produce and validate possible slots without using an LLM.

Steps:

1. Generate slots inside the requested window at a fixed interval.
2. Detect calendar overlap for every required participant.
3. Enforce duration, working hours, meeting window, and travel buffers.
4. Distinguish immovable conflicts from policy-approved movable events.
5. Return structured reason codes for every rejected candidate.
6. Test adjacent events, DST, and exact buffer limits.

Acceptance:

- The engine rejects `2:15 PM` for the correct reason.
- Every accepted slot satisfies all hard constraints.
- No expected-answer data is imported into runtime code.

### Phase 3 - Preference evidence and safe decisions

Goal: handle contextual judgment without hiding rules inside prompts.

Steps:

1. Convert explicit preferences into typed evidence attached to candidates.
2. Rank valid candidates with a small, documented scoring policy.
3. Implement `ACT`, `ASK`, and `STOP` decision rules.
4. Require `ASK` when permission to move an event is missing or ambiguous.
5. Add a final validator that independently rechecks the chosen action.
6. Test preference priority and abstention behavior.

Acceptance:

- The core scenario produces a defensible recommendation.
- Removing the movable-event policy changes the outcome to `ASK`.
- The final validator can block an invalid selected slot.

### Phase 4 - Structured LLM boundary

Goal: use the model only where language understanding or contextual selection
adds value.

Steps:

1. Add a small provider interface with one production implementation.
2. Use the model to extract a structured meeting request from conversation.
3. Validate model output with Zod before it reaches domain logic.
4. Give the decision step only precomputed candidates and evidence.
5. Add deterministic fallback responses for local demos and tests.
6. Handle malformed output, timeout, and provider failure visibly.

Acceptance:

- Model text never becomes trusted internal state without validation.
- The model never performs calendar arithmetic.
- The primary demo works without exposing an API key to the browser.

### Phase 5 - Primary scenario interface

Goal: make the architecture and product value visible in one screen.

Steps:

1. Build a three-column desktop workspace for conversation, calendar/context,
   and agent decision.
2. Add a clear `Run Shadow` interaction.
3. Show candidate slots with accepted/rejected states and reason labels.
4. Show the final `ACT`, `ASK`, or `STOP` result and compact evidence.
5. Add deliberate loading, empty, and provider-error states.
6. Keep the essential flow usable on narrow viewports.

Acceptance:

- A reviewer understands the scenario and result without reading the README.
- The interface exposes evidence, not hidden chain-of-thought.
- The primary flow has no dead controls.

### Phase 6 - Evaluation suite

Goal: prove reliability across a compact set of meaningful failures.

Steps:

1. Add 8-12 fixtures across timezone ambiguity, hard conflicts, travel buffers,
   role-sensitive preferences, changing constraints, and unsafe actions.
2. Run every scenario through the production decision pipeline.
3. Evaluate action category, constraints, forbidden behavior, selected slot when
   appropriate, and clarification topic.
4. Produce pass/fail results with structured failure reasons.
5. Add a summary view and one detailed failure drawer or page.
6. Add tests proving the evaluator does not leak answers into the agent.

Acceptance:

- One command runs all scenarios.
- A deliberately faulty policy produces a clear, attributable failure.
- Failed scenarios can be understood without inspecting raw JSON.

### Phase 7 - Verification and delivery

Goal: turn the working prototype into a credible application artifact.

Steps:

1. Run lint, type-check, unit tests, and the complete scenario suite.
2. Add one end-to-end test for the primary demo path if practical.
3. Verify loading, fallback, malformed-output, and small-screen behavior.
4. Rewrite the README around the demo, architecture, limitations, and setup.
5. Add screenshots and record a 60-90 second demo.
6. Deploy and verify the build from a clean browser session.

Acceptance:

- The documented setup works from a fresh clone.
- The deployed demo completes the primary flow.
- README claims match implemented behavior exactly.

## Initial evaluation scenarios

Start with these; replace weak scenarios instead of increasing the count.

1. Flight arrival requires a hard travel buffer.
2. Missing permission to move an internal meeting requires clarification.
3. Candidate interview may displace an internal sync.
4. Client meeting is immovable regardless of preference score.
5. Ambiguous `9 AM` across timezones requires clarification.
6. DST boundary conversion preserves requested local time.
7. No valid slot results in `STOP`, not fabricated availability.
8. A changed constraint invalidates a previously acceptable slot.
9. Optional attendee conflict does not block required participants.
10. A decision that fails final validation cannot execute.

## Build discipline

- Prefer typed functions over frameworks and abstraction layers.
- Add an abstraction only after two real callers require it.
- Keep domain decisions outside React components and prompts.
- Never display private chain-of-thought; show structured evidence and rules.
- Keep commits phase-sized and independently reviewable.
- Stop after Phase 7 unless a reviewer supplies a concrete reason to expand.

## Application positioning

One-line description:

> Shadow is a pre-deployment evaluation environment that tests whether an
> autonomous scheduling agent should act, ask for clarification, or stop.

Suggested application summary:

> I built Shadow to explore a reliability problem behind autonomous scheduling:
> how an agent can combine conversations, calendars, timezones, roles, and
> preferences without turning every decision into an unconstrained LLM call.
> It uses deterministic scheduling constraints, structured model outputs,
> explicit abstention, final validation, and an adversarial scenario suite to
> catch unsafe decisions before they reach a real calendar.

## Definition of done

Shadow is done when:

- The primary scenario is visually convincing and technically real.
- The same pipeline runs against 8-12 adversarial scenarios.
- Hard scheduling rules are deterministic and tested.
- Ambiguity produces `ASK` rather than fabricated certainty.
- Invalid decisions are stopped by final validation.
- The demo, tests, deployment, and README agree with one another.

Anything beyond this definition requires a specific reason, not just available
time.
