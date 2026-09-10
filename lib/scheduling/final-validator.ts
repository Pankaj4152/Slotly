import {
  schedulingDecisionSchema,
  type CandidateReason,
  type ScenarioInput,
  type SchedulingDecision,
} from '../domain';
import { evaluateScenarioCandidates } from './constraints';
import { scoreCandidateSlot } from './ranking';
import type { SlotGenerationOptions } from './slot-generator';

export type FinalValidationFailure = {
  code:
    | 'candidate_not_generated'
    | 'candidate_state_changed'
    | 'hard_constraint_violation'
    | 'move_not_authorized';
  message: string;
};

export type FinalValidationResult = {
  status: 'VALID' | 'BLOCKED';
  decision: SchedulingDecision;
  failures: FinalValidationFailure[];
};

export function validateSchedulingDecision(
  proposedDecision: SchedulingDecision,
  scenario: ScenarioInput,
  options: SlotGenerationOptions = {},
): FinalValidationResult {
  const decision = schedulingDecisionSchema.parse(proposedDecision);
  if (decision.action !== 'ACT') {
    return { status: 'VALID', decision, failures: [] };
  }

  const proposedSlot = decision.selectedSlot;
  if (!proposedSlot) {
    throw new Error('Validated ACT decision is missing its selected slot');
  }

  const independentlyEvaluated = evaluateScenarioCandidates(scenario, options);
  const verifiedSlot = independentlyEvaluated.find(
    (candidate) =>
      candidate.startsAt === proposedSlot.startsAt &&
      candidate.endsAt === proposedSlot.endsAt,
  );

  if (!verifiedSlot) {
    return blockedStop(
      {
        code: 'candidate_not_generated',
        message:
          'The selected slot was not produced by deterministic candidate generation.',
      },
      proposedSlot.reasons,
    );
  }

  if (verifiedSlot.status === 'rejected') {
    return blockedStop(
      {
        code: 'hard_constraint_violation',
        message:
          'The selected slot fails independent hard-constraint validation.',
      },
      verifiedSlot.reasons,
    );
  }

  if (proposedSlot.status !== verifiedSlot.status) {
    return blockedStop(
      {
        code: 'candidate_state_changed',
        message:
          'The proposed candidate status does not match independently evaluated state.',
      },
      verifiedSlot.reasons,
    );
  }

  if (
    verifiedSlot.status === 'requires_move' &&
    !verifiedSlot.reasons.some(({ code }) => code === 'preference_match')
  ) {
    return {
      status: 'BLOCKED',
      failures: [
        {
          code: 'move_not_authorized',
          message:
            'The selected slot requires moving an event without explicit authorization.',
        },
      ],
      decision: schedulingDecisionSchema.parse({
        action: 'ASK',
        clarificationTopic: 'move_permission',
        clarificationQuestion:
          'Can the conflicting event be moved for this meeting?',
        reason:
          'Final validation requires explicit permission before moving the conflict.',
        evidence: evidenceForFailure(verifiedSlot.reasons),
      }),
    };
  }

  const sanitizedSlot = scoreCandidateSlot(verifiedSlot);
  return {
    status: 'VALID',
    failures: [],
    decision: schedulingDecisionSchema.parse({
      ...decision,
      selectedSlot: sanitizedSlot,
      evidence: sanitizedSlot.reasons.length
        ? sanitizedSlot.reasons
        : decision.evidence,
    }),
  };
}

function blockedStop(
  failure: FinalValidationFailure,
  evidence: readonly CandidateReason[],
): FinalValidationResult {
  return {
    status: 'BLOCKED',
    failures: [failure],
    decision: schedulingDecisionSchema.parse({
      action: 'STOP',
      reason: failure.message,
      evidence: evidenceForFailure(evidence),
    }),
  };
}

function evidenceForFailure(
  evidence: readonly CandidateReason[],
): CandidateReason[] {
  return evidence.length
    ? [...evidence]
    : [
        {
          code: 'final_validation_failed',
          message: 'Final validation blocked the proposed action.',
        },
      ];
}
