# Slotly — Pre-Deployment Reliability Lab for Vela

> **Proof-of-work project built for Vela's Founding Engineer role.**  
> Investigates a core challenge in autonomous scheduling: _How can an AI agent make context-aware scheduling decisions, know when to abstain, and guarantee calendar safety before touching a real executive calendar?_

[Open Live Demo](https://shadow-scheduling-lab.sparshgaur639.chatgpt.site) · [Evaluation Suite (`/evals`)](https://shadow-scheduling-lab.sparshgaur639.chatgpt.site/evals)

---

## The Problem (Why Slotly Exists)

In autonomous scheduling, errors are catastrophic:

- Double-booking an executive after travel destroys trust immediately.
- Rescheduling a protected VIP client meeting without explicit permission is unacceptable.
- Unconstrained LLMs struggle with timezone boundaries, exact minute arithmetic, and hallucinated availability.

**Slotly** solves this by enforcing a strict boundary between probabilistic natural language understanding and deterministic calendar safety.

---

## Decision Taxonomy

Every incoming scheduling request resolves to one of three validated actions:

| Action     | Meaning             | Safety Behavior                                                                                                  |
| :--------- | :------------------ | :--------------------------------------------------------------------------------------------------------------- |
| **`ACT`**  | Safe to place       | All hard constraints, travel buffers, and movable-meeting policies passed independent safety checks.             |
| **`ASK`**  | Abstain & clarify   | Critical parameters are missing, ambiguous, or moving an internal meeting requires explicit stakeholder consent. |
| **`STOP`** | Infeasible / Unsafe | No safe slot exists without violating hard constraints (e.g., flight buffer, immovable client call).             |

---

## Key Architecture & Design Philosophy

```text
Natural Conversation + Calendar State
                 |
                 v
   [Structured Intent Extraction]       <-- LLM (Gemini) or Validated Fallback
                 |
                 v
   [Deterministic Slot Generation]      <-- Exact minute interval generation
                 |
                 v
   [Hard Constraint & Buffer Filter]    <-- Travel buffers, working hours, conflicts
                 |
                 v
   [Preference & Policy Ranking]        <-- Scoring with typed evidence attachment
                 |
                 v
   [ACT / ASK / STOP Decision]          <-- Contextual judgment with explicit rules
                 |
                 v
   [Independent Final Validator]        <-- Re-checks selected slot before execution
                 |
                 v
   [Decision Trace + Evaluation Result]
```

### Engineering Principles

1. **Never let an LLM do calendar arithmetic**: Timezone conversions, buffer math, and overlap detection are 100% deterministic TypeScript domain logic.
2. **Deterministic Offline Fallback**: Works immediately without an API key; when a `GEMINI_API_KEY` is provided, live intent extraction and candidate selection are enabled.
3. **Transparent Evidence**: The UI displays structured reasons and evidence badges—never opaque model stream tokens or private chain-of-thought.
4. **Interactive Sandbox**: Modify calendar events, toggle `Movable` vs `Fixed`, or inject conversation context to watch the engine adjust in real-time.

---

## Interactive Demo Flow for Vela Reviewers

1. **Test the Core Scenario (Flight Recovery Buffer)**:
   - Partner lands at 2:00 PM with a required 45-min post-flight buffer.
   - 2:15 PM is rejected with a `travel_buffer` reason code.
   - The 3:30 PM internal sync is identified as `Movable` based on recruiter priority policy, leading to a safe `ACT` recommendation.
2. **Interactive Calendar Editing**:
   - Click any event in the **Timeline View** or calendar list to change start/end times or switch category.
   - Click the `Movable` badge on the 3:30 PM sync to make it `Fixed` → Observe Slotly immediately switch from `ACT` to `STOP`.
3. **Adversarial Evaluation Suite (`/evals`)**:
   - Run the full suite across 8 adversarial scenarios covering DST boundaries, timezone confusion, protected client calls, and buffer regressions.

---

## Local Setup & Development

Requires Node.js 22.13+ and npm.

```bash
# Clone and install dependencies
git clone https://github.com/Pankaj4152/Slotly.git
cd Slotly
npm install

# (Optional) Add your Gemini API key for live LLM extraction
copy .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the scenario workspace and [http://localhost:3000/evals](http://localhost:3000/evals) for the evaluation harness.

---

## Verification & Quality Bar

```bash
npm run format:check     # Oxfmt formatting check
npm run lint             # Oxlint static analysis
npm run typecheck        # TypeScript strict verification
npm test                 # Vitest domain & scheduling tests (104 tests)
npm run test:evaluations # Scenario evaluation runner
npm run build            # Next.js / Vinext production build
```

---

## Scope & Intentional Boundaries

Slotly is built as a focused proof-of-work artifact demonstrating scheduling reliability algorithms, deterministic guardrails, and evaluation harnesses. It intentionally simulates synthetic calendar/chat data and omits authentication, databases, and real Google/Outlook calendar write integrations.
