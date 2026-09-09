# Sloty 🎯

> **Adversarial Evaluation & Regression Testing Framework for Autonomous Scheduling Agents**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-green.svg)
![Status](https://img.shields.io/badge/status-active--development-orange.svg)

---

## 📌 Project Intent

**Sloty** is an adversarial evaluation and reliability prototype for autonomous scheduling agents. It is built as a **technical proof-of-work** to demonstrate how to test context-aware AI agents systematically before their decisions reach real users.

### The Core Problem
Finding overlapping open slots on two calendar APIs is straightforward. However, an **autonomous scheduling agent** must reason over real-world human complexity:
- **Timezone ambiguity** (e.g., candidate says *"Tuesday at 9 AM"* without specifying a timezone—did the agent guess or ask for clarification?).
- **Conflicting priorities & roles** (e.g., executive vs. recruiter convenience).
- **Calendar collisions & rescheduling constraints**.
- **Context changes mid-conversation**.

Sloty tests whether an agent makes the **correct, safe, and context-aware decision** under these chaotic conditions.

---

## 🏗️ System Architecture

```text
┌─────────────────────────┐
│   Scenario Dataset JSON │ (Adversarial test cases)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Target Scheduling Agent │ (LLM Decision Engine)
└───────────┬─────────────┘
            │ Structured Proposed Action
            ▼
┌─────────────────────────┐
│  Safety Guardrail Layer │ (ALLOW / BLOCK / REQUIRE_CLARIFICATION)
└───────────┬─────────────┘
            │ Safe Executions
            ▼
┌─────────────────────────┐
│ Simulated Tools (Mock)  │ (Calendar & Messaging State)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Hybrid Evaluator Engine │ (Deterministic Assertions + Semantic Rubric)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ PASS / FAIL & Regression│ (JSON Run Storage & CLI Reports)
└─────────────────────────┘
```

---

## 🛠️ Key Components

### 1. Adversarial Scenario Dataset
Scenarios represent real-world edge cases with explicit evaluation criteria:
- **Timezone Ambiguity**: Unspecified, conflicting, or DST edge cases.
- **Calendar Conflicts**: Overlapping meetings, insufficient buffers.
- **Role Hierarchy**: Balancing executive preferences vs. standard participants.
- **Tool Safety**: Preventing premature booking, unwarranted event cancellation, or duplicate invites.

### 2. Hybrid Evaluator Engine
- **Deterministic Checks**: Fast Python assertions verifying slot availability, duration match, timezone presence, and prohibited actions.
- **Semantic Checks**: LLM rubric evaluator checking context comprehension and preference resolution.

### 3. Action Safety Layer
Intercepts proposed agent actions before execution and assigns a safety verdict (`ALLOW`, `BLOCK`, `REQUIRE_CLARIFICATION`).

### 4. Regression Engine
Compares run benchmarks (e.g., `run_001` vs `run_002`) to flag regressions (`PASS → FAIL`) and fixes (`FAIL → PASS`) whenever prompts or model versions change.

---

## 🚀 Quickstart & Usage

### 1. Installation
Clone the repository and install dependencies:
```bash
pip install -e .
```

### 2. Running Scenarios
Run all scenarios:
```bash
sloty run
```

Run a specific category:
```bash
sloty run --category timezone_ambiguity
```

Run a single scenario:
```bash
sloty run --scenario timezone_001
```

### 3. Regression Comparison
Compare two evaluation runs:
```bash
sloty compare run_001 run_002
```

---

## 📂 Repository Structure

```text
Slotly/
├── README.md                 # Project Documentation
├── PROJECT.md                # Comprehensive Product & Engineering Spec
├── pyproject.toml            # Python build & dependency configuration
├── sloty/
│   ├── __init__.py           # Package initialization
│   ├── config.py             # Configuration & environment loader
│   ├── schemas/              # Pydantic data schemas
│   │   ├── actions.py        # Action & safety check schemas
│   │   └── scenario.py       # Scenario & participant schemas
│   ├── tools/                # Simulated calendar & messaging tools
│   ├── agent/                # Reference scheduling agent & prompts
│   ├── evaluator/            # Hybrid evaluation engine & guardrails
│   ├── regression.py         # Run comparison & regression tracking
│   └── cli.py                # Typer CLI application
└── scenarios/                # JSON adversarial scenario test suite
    ├── timezone_001.json
    └── conflict_001.json
```

---

## ⚖️ Core Thesis

> **Autonomous AI agents should be evaluated like production software, not like chatbots.**

Instead of asking *"Did the LLM give a plausible response?"*, Sloty asks:
- Did it satisfy hard calendar constraints?
- Did it resolve participant preferences correctly?
- Did it recognize ambiguity and ask for clarification?
- Did it avoid taking unsafe actions?
- Did a prompt tweak introduce regressions?