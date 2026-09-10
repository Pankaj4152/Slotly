import {
  createDeterministicIntent,
  extractMeetingIntent,
  runModelAssistedScheduling,
  type ExtractedMeetingIntent,
  type ModelProvider,
} from '../ai';
import type { ScenarioInput, SchedulingDecision } from '../domain';
import {
  runSchedulingDecision,
  validateSchedulingDecision,
  type FinalValidationResult,
} from '../scheduling';

export type ShadowRun = {
  intent: ExtractedMeetingIntent;
  candidates: ReturnType<typeof runSchedulingDecision>['candidates'];
  decision: SchedulingDecision;
  validation: FinalValidationResult;
  mode: 'model' | 'deterministic_fallback';
  notice?: string;
};

export async function runShadowScenario(
  scenario: ScenarioInput,
  provider?: ModelProvider,
): Promise<ShadowRun> {
  if (!provider)
    return deterministicRun(scenario, 'Running deterministic demo mode.');

  try {
    const intent = await extractMeetingIntent(provider, scenario);
    const assisted = await runModelAssistedScheduling(provider, scenario);
    return {
      intent,
      candidates: assisted.candidates,
      decision: assisted.decision,
      validation: assisted.validation,
      mode: assisted.source === 'model' ? 'model' : 'deterministic_fallback',
      ...(assisted.source === 'deterministic_fallback'
        ? {
            notice:
              'Model recommendation failed; deterministic safety path used.',
          }
        : {}),
    };
  } catch {
    return deterministicRun(
      scenario,
      'Intent extraction failed; deterministic safety path used.',
    );
  }
}

function deterministicRun(scenario: ScenarioInput, notice: string): ShadowRun {
  const run = runSchedulingDecision(scenario);
  const validation = validateSchedulingDecision(run.decision, scenario);
  return {
    intent: createDeterministicIntent(scenario),
    candidates: run.candidates,
    decision: validation.decision,
    validation,
    mode: 'deterministic_fallback',
    notice,
  };
}
