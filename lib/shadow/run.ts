import {
  applyExtractedIntent,
  createDeterministicIntent,
  extractMeetingIntent,
  runModelAssistedScheduling,
  type ExtractedMeetingIntent,
  type ModelProvider,
} from '../ai';
import {
  schedulingDecisionSchema,
  type ScenarioInput,
  type SchedulingDecision,
} from '../domain';
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
    let effectiveScenario: ScenarioInput;
    try {
      effectiveScenario = applyExtractedIntent(scenario, intent);
    } catch (error) {
      return clarificationRun(scenario, intent, error);
    }
    const assisted = await runModelAssistedScheduling(
      provider,
      effectiveScenario,
    );
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

function clarificationRun(
  scenario: ScenarioInput,
  intent: ExtractedMeetingIntent,
  error: unknown,
): ShadowRun {
  const message =
    error instanceof Error
      ? error.message
      : 'Conversation intent requires clarification.';
  const run = runSchedulingDecision(scenario);
  const decision = schedulingDecisionSchema.parse({
    action: 'ASK',
    clarificationTopic: intent.ambiguities[0] ?? 'date_window',
    clarificationQuestion:
      'Can you clarify the requested time within the verified calendar window?',
    reason: message,
    evidence: [{ code: 'no_valid_slot', message }],
  });
  return {
    intent,
    candidates: run.candidates,
    decision,
    validation: validateSchedulingDecision(decision, scenario),
    mode: 'deterministic_fallback',
    notice:
      'Shadow paused because the conversation could not be applied safely.',
  };
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
