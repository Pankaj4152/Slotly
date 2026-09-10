import { scenarioFixtureSchema, type ScenarioFixture } from './schema';

export class ScenarioFixtureError extends Error {
  constructor(source: string, issues: readonly string[]) {
    super(`Invalid scenario fixture "${source}":\n${issues.join('\n')}`);
    this.name = 'ScenarioFixtureError';
  }
}

export function loadScenarioFixture(
  value: unknown,
  source = 'unknown',
): ScenarioFixture {
  const result = scenarioFixtureSchema.safeParse(value);
  if (result.success) return result.data;

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `- ${path}: ${issue.message}`;
  });
  throw new ScenarioFixtureError(source, issues);
}
