import type {
  CandidateReason,
  ExpectedOutcome,
  ScenarioFixture,
  SchedulingDecision,
} from '../domain';
import {
  runSchedulingDecision,
  validateSchedulingDecision,
} from '../scheduling';

export type EvaluationFailure = {
  check:
    | 'action'
    | 'selected_slot'
    | 'clarification'
    | 'evidence'
    | 'forbidden_action';
  message: string;
};

export type EvaluationResult = {
  scenarioId: string;
  title: string;
  passed: boolean;
  decision: SchedulingDecision;
  expected: ExpectedOutcome;
  failures: EvaluationFailure[];
};

export type EvaluationReport = {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: EvaluationResult[];
};

export function evaluateFixture(fixture: ScenarioFixture): EvaluationResult {
  const run = runSchedulingDecision(fixture.input);
  const decision = validateSchedulingDecision(
    run.decision,
    fixture.input,
  ).decision;
  const failures = compareOutcome(decision, fixture.expected);
  return {
    scenarioId: fixture.input.id,
    title: fixture.input.title,
    passed: failures.length === 0,
    decision,
    expected: fixture.expected,
    failures,
  };
}

export function runEvaluationSuite(
  fixtures: readonly ScenarioFixture[],
): EvaluationReport {
  const results = fixtures.map(evaluateFixture);
  const passed = results.filter((result) => result.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length === 0 ? 1 : passed / results.length,
    results,
  };
}

function compareOutcome(
  decision: SchedulingDecision,
  expected: ExpectedOutcome,
): EvaluationFailure[] {
  const failures: EvaluationFailure[] = [];
  if (decision.action !== expected.action) {
    failures.push({
      check: 'action',
      message: `Expected ${expected.action}, received ${decision.action}.`,
    });
  }
  if (
    expected.selectedStartsAt &&
    decision.selectedSlot?.startsAt !== expected.selectedStartsAt
  ) {
    failures.push({
      check: 'selected_slot',
      message: `Expected ${expected.selectedStartsAt}, received ${decision.selectedSlot?.startsAt ?? 'no slot'}.`,
    });
  }
  if (
    expected.clarificationTopic &&
    decision.clarificationTopic !== expected.clarificationTopic
  ) {
    failures.push({
      check: 'clarification',
      message: `Expected clarification topic ${expected.clarificationTopic}, received ${decision.clarificationTopic ?? 'none'}.`,
    });
  }
  const evidenceCodes = new Set(
    decision.evidence.map((reason: CandidateReason) => reason.code),
  );
  for (const code of expected.requiredReasonCodes) {
    if (!evidenceCodes.has(code)) {
      failures.push({
        check: 'evidence',
        message: `Required evidence code ${code} was missing.`,
      });
    }
  }
  if (expected.forbiddenActions.includes(decision.action)) {
    failures.push({
      check: 'forbidden_action',
      message: `${decision.action} is forbidden for this scenario.`,
    });
  }
  return failures;
}
