import { describe, expect, it } from 'vitest';

import { evaluationFixtures } from './fixtures';
import { evaluateFixture, runEvaluationSuite } from './runner';

describe('evaluation runner', () => {
  it('passes the adversarial scenario suite', () => {
    const report = runEvaluationSuite(evaluationFixtures);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(evaluationFixtures.length);
  });

  it('reports actionable mismatches', () => {
    const fixture = structuredClone(evaluationFixtures[0]);
    fixture.expected.action = 'STOP';
    fixture.expected.forbiddenActions = ['ACT'];

    const result = evaluateFixture(fixture);
    expect(result.passed).toBe(false);
    expect(result.failures.map(({ check }) => check)).toEqual([
      'action',
      'forbidden_action',
    ]);
  });

  it('returns a perfect empty-suite score', () => {
    expect(runEvaluationSuite([])).toMatchObject({
      total: 0,
      passed: 0,
      failed: 0,
      passRate: 1,
    });
  });
});
