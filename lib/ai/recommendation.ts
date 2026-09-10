import { z } from 'zod';

import {
  schedulingDecisionSchema,
  type CandidateReason,
  type CandidateSlot,
  type ScenarioInput,
  type SchedulingDecision,
} from '../domain';
import {
  evaluateScenarioCandidates,
  rankCandidateSlots,
  runSchedulingDecision,
  validateSchedulingDecision,
  type FinalValidationResult,
} from '../scheduling';
import { generateWithTimeout, type ModelProvider } from './provider';

const recommendationSchema = z
  .object({
    action: z.enum(['ACT', 'ASK', 'STOP']),
    candidateId: z
      .string()
      .regex(/^candidate_\d+$/)
      .optional(),
    clarificationTopic: z
      .string()
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    clarificationQuestion: z.string().trim().min(1).optional(),
    reason: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
    if (value.action === 'ACT' && !value.candidateId) {
      context.addIssue({ code: 'custom', message: 'ACT requires candidateId' });
    }
    if (
      value.action === 'ASK' &&
      (!value.clarificationTopic || !value.clarificationQuestion)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'ASK requires clarificationTopic and clarificationQuestion',
      });
    }
  });

export type ModelAssistedRun = {
  candidates: CandidateSlot[];
  decision: SchedulingDecision;
  validation: FinalValidationResult;
  source: 'model' | 'deterministic_fallback';
  fallbackReason?: string;
};

export async function runModelAssistedScheduling(
  provider: ModelProvider,
  scenario: ScenarioInput,
  timeoutMs = 10_000,
): Promise<ModelAssistedRun> {
  const candidates = evaluateScenarioCandidates(scenario);
  const ranked = rankCandidateSlots(candidates);

  try {
    const response = await generateWithTimeout(
      provider,
      {
        responseFormat: 'json',
        temperature: 0,
        messages: [
          { role: 'system', content: RECOMMENDATION_PROMPT },
          { role: 'user', content: serializeCandidateEvidence(ranked) },
        ],
      },
      timeoutMs,
    );
    const recommendation = parseRecommendation(response.text);
    const proposedDecision = recommendationToDecision(recommendation, ranked);
    const validation = validateSchedulingDecision(proposedDecision, scenario);
    return {
      candidates,
      decision: validation.decision,
      validation,
      source: 'model',
    };
  } catch (error) {
    const deterministic = runSchedulingDecision(scenario);
    const validation = validateSchedulingDecision(
      deterministic.decision,
      scenario,
    );
    return {
      candidates,
      decision: validation.decision,
      validation,
      source: 'deterministic_fallback',
      fallbackReason:
        error instanceof Error ? error.message : 'Unknown model failure',
    };
  }
}

function recommendationToDecision(
  recommendation: z.infer<typeof recommendationSchema>,
  candidates: readonly CandidateSlot[],
): SchedulingDecision {
  if (recommendation.action === 'ACT') {
    const index = Number(recommendation.candidateId?.replace('candidate_', ''));
    const selectedSlot = candidates[index];
    if (!selectedSlot)
      throw new Error('Model referenced an unknown candidate ID');
    return schedulingDecisionSchema.parse({
      action: 'ACT',
      selectedSlot,
      reason: recommendation.reason,
      evidence: evidenceFor(selectedSlot),
    });
  }

  if (recommendation.action === 'ASK') {
    return schedulingDecisionSchema.parse({
      action: 'ASK',
      clarificationTopic: recommendation.clarificationTopic,
      clarificationQuestion: recommendation.clarificationQuestion,
      reason: recommendation.reason,
      evidence: [{ code: 'no_valid_slot', message: recommendation.reason }],
    });
  }

  return schedulingDecisionSchema.parse({
    action: 'STOP',
    reason: recommendation.reason,
    evidence: [{ code: 'no_valid_slot', message: recommendation.reason }],
  });
}

function parseRecommendation(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const json = (fenced?.[1] ?? trimmed).trim();
  return recommendationSchema.parse(JSON.parse(json));
}

function serializeCandidateEvidence(
  candidates: readonly CandidateSlot[],
): string {
  return JSON.stringify(
    candidates.map((candidate, index) => ({
      candidateId: `candidate_${index}`,
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      status: candidate.status,
      score: candidate.score,
      reasons: candidate.reasons,
      scoreBreakdown: candidate.scoreBreakdown,
    })),
    null,
    2,
  );
}

function evidenceFor(candidate: CandidateSlot): CandidateReason[] {
  return candidate.reasons.length
    ? candidate.reasons
    : [
        {
          code: 'safe_candidate',
          message:
            'The selected candidate satisfies all deterministic constraints.',
        },
      ];
}

const RECOMMENDATION_PROMPT = `Choose among the supplied scheduling candidates.
Return JSON with action, candidateId, clarificationTopic, clarificationQuestion,
and reason. For ACT, use exactly one supplied candidateId. Never invent or alter
a timestamp. ASK when move permission is unclear. STOP when no candidate is safe.`;
