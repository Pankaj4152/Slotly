import {
  schedulingDecisionSchema,
  type CandidateReason,
  type CandidateSlot,
  type ScenarioInput,
  type SchedulingDecision,
} from '../domain';
import { evaluateScenarioCandidates } from './constraints';
import { rankCandidateSlots } from './ranking';
import type { SlotGenerationOptions } from './slot-generator';

export type SchedulingRun = {
  candidates: CandidateSlot[];
  rankedCandidates: CandidateSlot[];
  decision: SchedulingDecision;
};

export function runSchedulingDecision(
  scenario: ScenarioInput,
  options: SlotGenerationOptions = {},
): SchedulingRun {
  const candidates = evaluateScenarioCandidates(scenario, options);
  const rankedCandidates = rankCandidateSlots(candidates);
  return {
    candidates,
    rankedCandidates,
    decision: decideFromCandidates(candidates),
  };
}

export function decideFromCandidates(
  candidates: readonly CandidateSlot[],
): SchedulingDecision {
  const rankedCandidates = rankCandidateSlots(candidates);
  const bestCandidate = rankedCandidates[0];

  if (!bestCandidate) {
    const rejectedEvidence = candidates.flatMap(({ reasons }) => reasons);
    return schedulingDecisionSchema.parse({
      action: 'STOP',
      reason: 'No candidate satisfies the scheduling constraints.',
      evidence:
        rejectedEvidence.length > 0
          ? rejectedEvidence
          : [
              {
                code: 'no_valid_slot',
                message:
                  'The requested window contains no viable candidate slot.',
              },
            ],
    });
  }

  if (
    bestCandidate.status === 'requires_move' &&
    !hasAuthorizedMove(bestCandidate)
  ) {
    const movableConflict = bestCandidate.reasons.find(
      ({ code }) => code === 'movable_event',
    );
    return schedulingDecisionSchema.parse({
      action: 'ASK',
      clarificationTopic: 'move_permission',
      clarificationQuestion: movableConflict?.eventId
        ? `Can ${movableConflict.eventId} be moved for this meeting?`
        : 'Can the conflicting event be moved for this meeting?',
      reason:
        'The best candidate requires moving an event without explicit policy authorization.',
      evidence: evidenceFor(bestCandidate),
    });
  }

  return schedulingDecisionSchema.parse({
    action: 'ACT',
    selectedSlot: bestCandidate,
    reason:
      bestCandidate.status === 'requires_move'
        ? 'The best candidate is safe and an explicit policy authorizes the required move.'
        : 'The best candidate is available and satisfies the scheduling constraints.',
    evidence: evidenceFor(bestCandidate),
  });
}

function hasAuthorizedMove(candidate: CandidateSlot): boolean {
  return candidate.reasons.some(({ code }) => code === 'preference_match');
}

function evidenceFor(candidate: CandidateSlot): CandidateReason[] {
  return candidate.reasons.length > 0
    ? candidate.reasons
    : [
        {
          code: 'safe_candidate',
          message: 'The candidate satisfies all scheduling constraints.',
        },
      ];
}
