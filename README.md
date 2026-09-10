# Shadow

Shadow is a pre-deployment reliability lab for autonomous scheduling agents. It
tests whether an agent should act, ask for clarification, or stop before a
decision reaches a real calendar.

The demo combines a realistic scheduling conversation with deterministic slot
generation, hard constraints, explicit preference evidence, a final safety
validator, and an adversarial evaluation suite. The interface shows decision
evidence—not private model reasoning.

## What to try

1. Open the scenario workspace and review the conversation, calendars, and
   active policies.
2. Select **Run Shadow** to evaluate the flight-buffer scenario.
3. Inspect why early slots are rejected and why the internal sync may move.
4. Add custom conversation context and run again to refine the meeting request.
5. Open **Evaluation suite** to inspect all eight ACT, ASK, and STOP cases.

The app works without an API key using its deterministic fallback. When a
Gemini key is configured, language extraction and candidate selection use the
model behind a validated provider boundary; calendar arithmetic and final
safety checks remain deterministic.

Custom natural-language context changes scheduling only when Gemini is
configured. In offline mode, Shadow returns `ASK` instead of silently ignoring
the added message or guessing its meaning.

## Architecture

```text
Conversation + calendar context
            |
            v
Validated intent extraction
            |
            v
Candidate generation and hard constraints
            |
            v
Preference ranking and ACT / ASK / STOP
            |
            v
Independent final validator
            |
            v
Decision trace + evaluation contract
```

Key boundaries:

- `lib/domain` owns validated scheduling types and timezone normalization.
- `lib/scheduling` owns deterministic candidate, constraint, ranking, decision,
  and final-validation logic.
- `lib/ai` owns structured model I/O and the Gemini/fallback implementations.
- `lib/evaluation` owns expected outcomes and never feeds them into runtime
  decisions.
- `app/api/run` keeps provider credentials on the server.

## Local setup

Requires Node.js 22.13 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

`GEMINI_API_KEY` is optional. Leave it blank for the deterministic demo.

Open `http://localhost:3000` for the scenario and
`http://localhost:3000/evals` for the evaluation suite.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:evaluations
npm run build
```

The suite covers travel buffers, protected events, working hours, permission to
move meetings, optional attendees, recovery after conflict, and impossible
windows. Provider failures and malformed responses are also covered by unit
tests.

## Scope and limitations

All conversations and calendar events are synthetic. Shadow does not connect to
Vela, real calendars, email accounts, or production user data, and it does not
execute calendar mutations. The project intentionally excludes authentication,
databases, workflow infrastructure, and multiple model providers.

The earlier Python evaluation prototype is preserved on
`archive/eval-harness-prototype`. See [PROJECT_VELA.md](./PROJECT_VELA.md) for
the implementation rationale and phased plan.
