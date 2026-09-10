# Shadow

Shadow is a pre-deployment evaluation environment for autonomous scheduling
agents. It tests whether an agent should act, ask for clarification, or stop
before a decision reaches a real calendar.

The current `main` branch contains the new web foundation. The earlier Python
evaluation prototype is preserved on `archive/eval-harness-prototype`.

## Current status

Phase 0 establishes the application foundation, development tooling, visual
direction, and repository boundaries. Scheduling domain logic begins in Phase 1.

See [PROJECT_VELA.md](./PROJECT_VELA.md) for the phased implementation plan.

## Local development

Requires Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Project boundaries

This repository uses synthetic conversations and calendar data. It does not
connect to Vela, real calendars, email accounts, or production user data.

Shadow is an independent technical exploration inspired by publicly described
autonomous-scheduling reliability problems. It does not claim knowledge of
Vela's internal architecture or implementation.
